import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';
import { format, getISOWeek, getISOWeekYear, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';

const DIGEST_POST_COUNT = 5;
const EXCLUSIVE_CADENCE_WEEKS = 4;
const MAX_ERROR_LENGTH = 500;
const SEND_RETRY_ATTEMPTS = 3;
const SEND_RETRY_DELAY_MS = 900;
const WELCOME_SUBJECT_NEW = 'Welcome to EvoFutura Weekly Tech Intelligence';
const WELCOME_SUBJECT_RETURNING = 'Welcome back to EvoFutura Weekly Tech Intelligence';

interface RankedPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  type: string;
  date: Date;
  views: number;
}

interface ExclusiveSection {
  title: string;
  content: string;
}

interface NewsletterTemplateInput {
  subject: string;
  intro: string;
  posts: RankedPost[];
  exclusive: ExclusiveSection | null;
  unsubscribeUrl: string;
}

interface WelcomeTemplateInput {
  email: string;
  source: string;
  unsubscribeUrl: string;
  reactivated: boolean;
}

export interface WelcomeEmailResult {
  sent: boolean;
  reason?: string;
  error?: string;
}

export interface WeeklyDigestResult {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  issueId?: string;
  weekKey: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
}

function canUseRuntimeDatabase() {
  const databaseUrl = process.env.DATABASE_URL || '';
  const isLocalSqlite = databaseUrl.startsWith('file:');
  const isVercel = Boolean(process.env.VERCEL);

  if (isVercel && isLocalSqlite) return false;
  return true;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getSiteUrl() {
  const explicit = process.env.NEWSLETTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'https://evofutura.com';
}

function getUnsubscribeSecret() {
  return process.env.NEWSLETTER_TOKEN_SECRET || process.env.NEWSLETTER_AUTOMATION_SECRET || '';
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function createUnsubscribeToken(email: string) {
  const normalized = normalizeEmail(email);
  const secret = getUnsubscribeSecret();
  if (!secret) return '';

  return crypto.createHmac('sha256', secret).update(normalized).digest('hex');
}

export function verifyUnsubscribeToken(email: string, token: string) {
  const expected = createUnsubscribeToken(email);
  if (!expected || !token) return false;
  return safeEqual(expected, token);
}

export function buildUnsubscribeUrl(email: string) {
  const normalized = normalizeEmail(email);
  const token = createUnsubscribeToken(normalized);
  const siteUrl = getSiteUrl();
  if (!token) return `${siteUrl}/unsubscribe`;
  return `${siteUrl}/unsubscribe?email=${encodeURIComponent(normalized)}&token=${encodeURIComponent(token)}`;
}

export function buildOneClickUnsubscribeUrl(email: string) {
  const normalized = normalizeEmail(email);
  const token = createUnsubscribeToken(normalized);
  if (!token) return '';

  const siteUrl = getSiteUrl();
  return `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(normalized)}&token=${encodeURIComponent(token)}`;
}

export async function unsubscribeWithToken(rawEmail: string, token: string) {
  const email = normalizeEmail(rawEmail);
  if (!verifyUnsubscribeToken(email, token)) {
    return {
      success: false,
      message: 'Invalid unsubscribe link.',
    };
  }

  const result = await prisma.subscriber.updateMany({
    where: { email },
    data: { active: false },
  });

  if (result.count === 0) {
    return {
      success: false,
      message: 'Email not found in subscriber list.',
    };
  }

  return {
    success: true,
    message: 'You have been unsubscribed from weekly tech intelligence.',
  };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getWeekKey(now: Date) {
  const isoYear = getISOWeekYear(now);
  const isoWeek = String(getISOWeek(now)).padStart(2, '0');
  return `${isoYear}-W${isoWeek}`;
}

function shouldIncludeExclusive(now: Date) {
  return getISOWeek(now) % EXCLUSIVE_CADENCE_WEEKS === 0;
}

async function getTopPostsForDigest(windowStart: Date, windowEnd: Date): Promise<RankedPost[]> {
  const groupedViews = await prisma.postView.groupBy({
    by: ['postId'],
    where: {
      createdAt: {
        gte: windowStart,
        lt: windowEnd,
      },
    },
    _count: {
      postId: true,
    },
    orderBy: {
      _count: {
        postId: 'desc',
      },
    },
    take: DIGEST_POST_COUNT * 2,
  });

  const viewedPostIds = groupedViews.map(item => item.postId);
  const viewedPosts = viewedPostIds.length
    ? await prisma.post.findMany({
        where: {
          id: { in: viewedPostIds },
          published: true,
        },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          type: true,
          date: true,
        },
      })
    : [];

  const postMap = new Map(viewedPosts.map(post => [post.id, post]));
  const ranked: RankedPost[] = groupedViews
    .map(item => {
      const post = postMap.get(item.postId);
      if (!post) return null;

      return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        type: post.type,
        date: post.date,
        views: item._count.postId,
      };
    })
    .filter((item): item is RankedPost => Boolean(item));

  if (ranked.length >= DIGEST_POST_COUNT) {
    return ranked.slice(0, DIGEST_POST_COUNT);
  }

  const fallbackPosts = await prisma.post.findMany({
    where: {
      published: true,
      id: {
        notIn: ranked.map(post => post.id),
      },
    },
    orderBy: {
      date: 'desc',
    },
    take: DIGEST_POST_COUNT - ranked.length,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      type: true,
      date: true,
    },
  });

  const fallbackRanked = fallbackPosts.map(post => ({
    ...post,
    views: 0,
  }));

  return [...ranked, ...fallbackRanked];
}

async function buildExclusiveSection(now: Date, posts: RankedPost[]): Promise<ExclusiveSection | null> {
  if (!shouldIncludeExclusive(now)) return null;

  const fallback: ExclusiveSection = {
    title: 'Exclusive: Operator Signal',
    content:
      'This week we are seeing teams move from AI pilots to hardened production lanes. The winning pattern is pragmatic: narrow model scope, aggressive observability, and rollback-first deployment plans. Treat reliability and governance as first-class architecture, not post-launch patchwork.',
  };

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = [
      'Write a short exclusive note for a weekly tech intelligence newsletter.',
      'Tone: senior engineering strategist. Keep it specific and practical.',
      'Length: 90-140 words, one paragraph.',
      'No hype, no emojis, no marketing language.',
      'Mention one likely mistake teams will make this month and a concrete mitigation.',
      `Top stories this week: ${posts.map(post => post.title).join(' | ')}`,
    ].join('\n');

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.5,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 260,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return fallback;

    return {
      title: 'Exclusive: Operator Signal',
      content,
    };
  } catch (error) {
    console.error('[Newsletter] Exclusive generation failed:', error);
    return fallback;
  }
}

function buildIssueSubject(windowStart: Date, windowEnd: Date) {
  const start = format(windowStart, 'MMM d');
  const end = format(subDays(windowEnd, 1), 'MMM d, yyyy');
  return `EvoFutura Weekly Tech Intelligence | ${start} - ${end}`;
}

function buildIssueIntro(posts: RankedPost[]) {
  if (posts.some(post => post.views > 0)) {
    return 'This briefing ranks the week\'s most-read technical analysis from the EvoFutura network, plus operator-grade context for what to do next.';
  }

  return 'This week\'s intelligence briefing curates the most relevant technical reads from EvoFutura, selected for architecture signal and production relevance.';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderNewsletterTemplate(input: NewsletterTemplateInput) {
  const siteUrl = getSiteUrl();

  const postItems = input.posts
    .map((post, index) => {
      const postUrl = `${siteUrl}/blog/${post.slug}`;
      const popularity = post.views > 0 ? `${post.views} weekly reads` : 'Editor-selected';
      return `
        <tr>
          <td style="padding:0 0 18px 0;">
            <div style="font-size:11px;line-height:14px;text-transform:uppercase;letter-spacing:1.2px;color:#5f6b7a;font-weight:700;">#${index + 1} • ${escapeHtml(post.category)} • ${escapeHtml(popularity)}</div>
            <a href="${postUrl}" style="display:block;text-decoration:none;color:#0f172a;margin-top:4px;font-size:20px;line-height:26px;font-weight:700;">${escapeHtml(post.title)}</a>
            <div style="margin-top:6px;color:#334155;font-size:14px;line-height:21px;">${escapeHtml(post.excerpt)}</div>
          </td>
        </tr>
      `;
    })
    .join('');

  const exclusiveBlock = input.exclusive
    ? `
      <tr>
        <td style="padding:20px;border:1px solid #d7e2ea;background:#f8fbff;border-radius:12px;">
          <div style="font-size:12px;line-height:16px;text-transform:uppercase;letter-spacing:1.2px;color:#1d4ed8;font-weight:700;">${escapeHtml(input.exclusive.title)}</div>
          <div style="margin-top:8px;color:#0f172a;font-size:15px;line-height:24px;">${escapeHtml(input.exclusive.content)}</div>
        </td>
      </tr>
    `
    : '';

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef3f8;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f8;padding:20px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:16px;border:1px solid #dce6ef;padding:28px;">
            <tr>
              <td style="font-size:12px;line-height:16px;text-transform:uppercase;letter-spacing:1.2px;color:#334155;font-weight:700;">EvoFutura • Weekly Tech Intelligence</td>
            </tr>
            <tr>
              <td style="padding-top:8px;font-size:29px;line-height:35px;color:#0f172a;font-weight:800;">${escapeHtml(input.subject)}</td>
            </tr>
            <tr>
              <td style="padding-top:10px;padding-bottom:22px;color:#334155;font-size:15px;line-height:24px;">${escapeHtml(input.intro)}</td>
            </tr>
            ${postItems}
            ${exclusiveBlock}
            <tr>
              <td style="padding-top:18px;color:#64748b;font-size:12px;line-height:18px;border-top:1px solid #e2e8f0;">
                You are receiving this because you subscribed to EvoFutura updates.
                <a href="${input.unsubscribeUrl}" style="color:#1d4ed8;text-decoration:underline;">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textPosts = input.posts
    .map((post, index) => {
      const postUrl = `${siteUrl}/blog/${post.slug}`;
      const popularity = post.views > 0 ? `${post.views} weekly reads` : 'Editor-selected';
      return `${index + 1}. ${post.title} (${post.category}, ${popularity})\n${post.excerpt}\n${postUrl}`;
    })
    .join('\n\n');

  const text = [
    input.subject,
    '',
    input.intro,
    '',
    textPosts,
    '',
    input.exclusive ? `${input.exclusive.title}\n${input.exclusive.content}\n` : '',
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { html, text };
}

function renderWelcomeTemplate(input: WelcomeTemplateInput) {
  const siteUrl = getSiteUrl();
  const archiveUrl = `${siteUrl}/archive`;
  const aiUrl = `${siteUrl}/category/ai`;
  const signalBriefUrl = `${siteUrl}/type/signal-brief`;
  const headline = input.reactivated ? 'You are back in the signal loop.' : 'You are in. Weekly intelligence starts now.';
  const sourceLabel = input.source.replace(/[-_]+/g, ' ').trim() || 'website';

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef3f8;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f8;padding:20px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:16px;border:1px solid #dce6ef;padding:28px;">
            <tr>
              <td style="font-size:12px;line-height:16px;text-transform:uppercase;letter-spacing:1.2px;color:#334155;font-weight:700;">EvoFutura • Tech Intelligence</td>
            </tr>
            <tr>
              <td style="padding-top:8px;font-size:30px;line-height:36px;color:#0f172a;font-weight:800;">${escapeHtml(headline)}</td>
            </tr>
            <tr>
              <td style="padding-top:10px;color:#334155;font-size:15px;line-height:24px;">
                You subscribed with <strong>${escapeHtml(input.email)}</strong> from <strong>${escapeHtml(sourceLabel)}</strong>.
                Every week, we send high-signal analysis on AI, infrastructure, security, and systems strategy.
              </td>
            </tr>
            <tr>
              <td style="padding-top:18px;">
                <a href="${archiveUrl}" style="display:inline-block;background:#072f4a;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:999px;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:700;">Read the Archive</a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d7e2ea;border-radius:12px;background:#f8fbff;">
                  <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #d7e2ea;">
                      <a href="${aiUrl}" style="text-decoration:none;color:#0f172a;font-size:15px;font-weight:700;">AI Dispatches</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;">
                      <a href="${signalBriefUrl}" style="text-decoration:none;color:#0f172a;font-size:15px;font-weight:700;">Signal Brief Format</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top:18px;color:#64748b;font-size:12px;line-height:18px;border-top:1px solid #e2e8f0;">
                You can unsubscribe any time.
                <a href="${input.unsubscribeUrl}" style="color:#1d4ed8;text-decoration:underline;">Manage subscription</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    headline,
    '',
    `Subscribed email: ${input.email}`,
    `Source: ${sourceLabel}`,
    '',
    'Explore:',
    `- Archive: ${archiveUrl}`,
    `- AI Dispatches: ${aiUrl}`,
    `- Signal Briefs: ${signalBriefUrl}`,
    '',
    `Manage subscription: ${input.unsubscribeUrl}`,
  ].join('\n');

  return { html, text, subject: input.reactivated ? WELCOME_SUBJECT_RETURNING : WELCOME_SUBJECT_NEW };
}

function resolveMailConfig() {
  const host = process.env.NEWSLETTER_SMTP_HOST;
  const port = Number(process.env.NEWSLETTER_SMTP_PORT || 587);
  const user = process.env.NEWSLETTER_SMTP_USER;
  const pass = process.env.NEWSLETTER_SMTP_PASS;

  if (!host || !user || !pass) return null;

  const secure = process.env.NEWSLETTER_SMTP_SECURE === 'true' || port === 465;
  const from = process.env.NEWSLETTER_FROM || 'EvoFutura <newsletter@evofutura.com>';
  const replyTo = process.env.NEWSLETTER_REPLY_TO || from;

  return {
    host,
    port,
    user,
    pass,
    secure,
    from,
    replyTo,
  };
}

async function createTransport() {
  const config = resolveMailConfig();
  if (!config) return null;

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 8_000,
    socketTimeout: 20_000,
  });

  await transport.verify();

  return {
    transport,
    from: config.from,
    replyTo: config.replyTo,
  };
}

function getListUnsubscribeHeaders(email: string): Record<string, string> {
  const manageUrl = buildUnsubscribeUrl(email);
  const oneClickUrl = buildOneClickUnsubscribeUrl(email);
  const headers: Record<string, string> = {
    'List-Unsubscribe': `<${manageUrl}>`,
  };

  if (oneClickUrl) {
    headers['List-Unsubscribe'] = `<${manageUrl}>, <${oneClickUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  return headers;
}

async function sendMailWithRetry(
  send: () => Promise<unknown>,
  attempts = SEND_RETRY_ATTEMPTS
): Promise<{ ok: boolean; error?: string }> {
  let lastError = '';

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await send();
      return { ok: true };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < attempts) {
        await sleep(SEND_RETRY_DELAY_MS * attempt);
      }
    }
  }

  return { ok: false, error: lastError.slice(0, MAX_ERROR_LENGTH) };
}

export async function sendWelcomeEmail(params: {
  email: string;
  source: string;
  reactivated?: boolean;
}): Promise<WelcomeEmailResult> {
  const email = normalizeEmail(params.email);
  if (!email) {
    return { sent: false, reason: 'invalid_email' };
  }

  let mailer;
  try {
    mailer = await createTransport();
  } catch (error) {
    console.error('[Newsletter] Welcome email transport init failed:', error);
    return { sent: false, reason: 'transport_init_failed', error: error instanceof Error ? error.message : String(error) };
  }

  if (!mailer) {
    return { sent: false, reason: 'mailer_not_configured' };
  }

  const unsubscribeUrl = buildUnsubscribeUrl(email);
  const template = renderWelcomeTemplate({
    email,
    source: params.source,
    unsubscribeUrl,
    reactivated: Boolean(params.reactivated),
  });
  const sendResult = await sendMailWithRetry(() =>
    mailer.transport.sendMail({
      from: mailer.from,
      to: email,
      replyTo: mailer.replyTo,
      subject: template.subject,
      html: template.html,
      text: template.text,
      headers: getListUnsubscribeHeaders(email),
    })
  );

  if (!sendResult.ok) {
    console.error('[Newsletter] Welcome email send failed:', sendResult.error);
    return { sent: false, reason: 'send_failed', error: sendResult.error };
  }

  return { sent: true };
}

function getCronSecret() {
  return process.env.CRON_SECRET || process.env.NEWSLETTER_AUTOMATION_SECRET || '';
}

export function isAuthorizedCronCall(authorizationHeader: string | null) {
  const secret = getCronSecret();
  if (!secret) return false;
  return authorizationHeader === `Bearer ${secret}`;
}

export async function runWeeklyDigest(options?: { force?: boolean; now?: Date }): Promise<WeeklyDigestResult> {
  const now = options?.now || new Date();
  const force = Boolean(options?.force);
  const weekKey = getWeekKey(now);
  const windowStart = subDays(now, 7);
  const windowEnd = now;

  if (!canUseRuntimeDatabase()) {
    return {
      ok: false,
      skipped: false,
      reason: 'runtime_database_unavailable',
      weekKey,
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
    };
  }

  try {
    const subscribers = await prisma.subscriber.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });

    const topPosts = await getTopPostsForDigest(windowStart, windowEnd);
    const subject = buildIssueSubject(windowStart, windowEnd);
    const intro = buildIssueIntro(topPosts);
    const exclusive = await buildExclusiveSection(now, topPosts);

    const existingIssue = await prisma.newsletterIssue.findUnique({
      where: { weekKey },
    });

    if (existingIssue?.status === 'sent' && !force) {
      return {
        ok: true,
        skipped: true,
        reason: 'already_sent',
        issueId: existingIssue.id,
        weekKey,
        totalRecipients: existingIssue.totalRecipients,
        sentCount: existingIssue.sentCount,
        failedCount: existingIssue.failedCount,
      };
    }

    const issue = existingIssue
      ? await prisma.newsletterIssue.update({
          where: { id: existingIssue.id },
          data: {
            subject,
            intro,
            exclusiveTitle: exclusive?.title || null,
            exclusiveContent: exclusive?.content || null,
            status: 'running',
            totalRecipients: subscribers.length,
            sentCount: 0,
            failedCount: 0,
            sentAt: null,
          },
        })
      : await prisma.newsletterIssue.create({
          data: {
            weekKey,
            subject,
            intro,
            exclusiveTitle: exclusive?.title || null,
            exclusiveContent: exclusive?.content || null,
            status: 'running',
            totalRecipients: subscribers.length,
          },
        });

    if (subscribers.length === 0) {
      await prisma.newsletterIssue.update({
        where: { id: issue.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      return {
        ok: true,
        skipped: false,
        issueId: issue.id,
        weekKey,
        totalRecipients: 0,
        sentCount: 0,
        failedCount: 0,
      };
    }

    let mailer;
    try {
      mailer = await createTransport();
    } catch (error) {
      console.error('[Newsletter] SMTP initialization failed:', error);
      mailer = null;
    }

    if (!mailer) {
      await prisma.newsletterIssue.update({
        where: { id: issue.id },
        data: {
          status: 'blocked',
        },
      });

      return {
        ok: false,
        skipped: false,
        reason: 'mailer_not_configured',
        issueId: issue.id,
        weekKey,
        totalRecipients: subscribers.length,
        sentCount: 0,
        failedCount: subscribers.length,
      };
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const subscriber of subscribers) {
      const existingDelivery = await prisma.newsletterDelivery.findUnique({
        where: {
          issueId_subscriberId: {
            issueId: issue.id,
            subscriberId: subscriber.id,
          },
        },
      });

      if (existingDelivery?.status === 'sent' && !force) {
        sentCount += 1;
        continue;
      }

      const unsubscribeUrl = buildUnsubscribeUrl(subscriber.email);

      const template = renderNewsletterTemplate({
        subject,
        intro,
        posts: topPosts,
        exclusive,
        unsubscribeUrl,
      });

      await prisma.newsletterDelivery.upsert({
        where: {
          issueId_subscriberId: {
            issueId: issue.id,
            subscriberId: subscriber.id,
          },
        },
        update: {
          status: 'pending',
          error: null,
          sentAt: null,
        },
        create: {
          issueId: issue.id,
          subscriberId: subscriber.id,
          status: 'pending',
        },
      });

      try {
        const sendResult = await sendMailWithRetry(() =>
          mailer.transport.sendMail({
            from: mailer.from,
            to: subscriber.email,
            replyTo: mailer.replyTo,
            subject,
            html: template.html,
            text: template.text,
            headers: getListUnsubscribeHeaders(subscriber.email),
          })
        );

        if (!sendResult.ok) {
          throw new Error(sendResult.error || 'Send failed');
        }

        sentCount += 1;

        await prisma.newsletterDelivery.update({
          where: {
            issueId_subscriberId: {
              issueId: issue.id,
              subscriberId: subscriber.id,
            },
          },
          data: {
            status: 'sent',
            sentAt: new Date(),
            error: null,
          },
        });
      } catch (error) {
        failedCount += 1;
        const message = error instanceof Error ? error.message : 'Unknown send error';

        await prisma.newsletterDelivery.update({
          where: {
            issueId_subscriberId: {
              issueId: issue.id,
              subscriberId: subscriber.id,
            },
          },
          data: {
            status: 'failed',
            error: message.slice(0, MAX_ERROR_LENGTH),
          },
        });
      }
    }

    const finalStatus = failedCount === 0 ? 'sent' : sentCount > 0 ? 'partial' : 'failed';
    await prisma.newsletterIssue.update({
      where: { id: issue.id },
      data: {
        status: finalStatus,
        totalRecipients: subscribers.length,
        sentCount,
        failedCount,
        sentAt: finalStatus === 'sent' || finalStatus === 'partial' ? new Date() : null,
      },
    });

    return {
      ok: failedCount === 0,
      skipped: false,
      issueId: issue.id,
      weekKey,
      totalRecipients: subscribers.length,
      sentCount,
      failedCount,
    };
  } catch (error) {
    console.error('[Newsletter] Weekly digest failed:', error);
    return {
      ok: false,
      skipped: false,
      reason: 'unexpected_error',
      weekKey,
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
    };
  }
}
