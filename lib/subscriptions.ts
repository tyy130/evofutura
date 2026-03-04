import { prisma } from './prisma';
import { sendWelcomeEmail } from './newsletter';

export interface SubscribeResult {
  success: boolean;
  message: string;
  provider: 'database' | 'webhook' | 'log' | 'none';
  welcomeEmailSent?: boolean;
  welcomeEmailReason?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBSCRIBE_SUCCESS_MESSAGE = 'Thanks for subscribing. You are now on the EvoFutura briefing list.';
const SUBSCRIBE_SUCCESS_WITH_WELCOME = 'Thanks for subscribing. Check your inbox for your EvoFutura welcome note.';
const SUBSCRIBE_SUCCESS_ACTIVE = 'Thanks for subscribing. Your weekly intelligence delivery is active.';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function canUseDatabase() {
  const databaseUrl = process.env.DATABASE_URL || '';
  const isLocalSqlite = databaseUrl.startsWith('file:');
  const isVercel = Boolean(process.env.VERCEL);

  // SQLite on Vercel serverless cannot be treated as persistent writable storage.
  if (isVercel && isLocalSqlite) return false;
  return true;
}

type DatabaseSubscribeState = 'created' | 'reactivated' | 'already_active';

async function subscribeWithDatabase(
  email: string,
  source: string
): Promise<{ ok: boolean; state?: DatabaseSubscribeState }> {
  if (!canUseDatabase()) return { ok: false };

  try {
    const existing = await prisma.subscriber.findUnique({
      where: { email },
      select: { id: true, active: true },
    });

    if (!existing) {
      await prisma.subscriber.create({
        data: { email, source, active: true },
      });
      return { ok: true, state: 'created' };
    }

    if (!existing.active) {
      await prisma.subscriber.update({
        where: { id: existing.id },
        data: { active: true, source },
      });
      return { ok: true, state: 'reactivated' };
    }

    await prisma.subscriber.update({
      where: { id: existing.id },
      data: { source },
    });
    return { ok: true, state: 'already_active' };
  } catch (error) {
    console.error('[Subscribe] Database provider failed:', error);
    return { ok: false };
  }
}

async function subscribeWithWebhook(email: string, source: string): Promise<boolean> {
  const webhookUrl = process.env.NEWSLETTER_WEBHOOK_URL;
  if (!webhookUrl) return false;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        source,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error(`[Subscribe] Webhook provider failed with status ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Subscribe] Webhook provider failed:', error);
    return false;
  }
}

export async function subscribeEmail(rawEmail: string, source: string): Promise<SubscribeResult> {
  const email = normalizeEmail(rawEmail);

  if (!EMAIL_REGEX.test(email)) {
    return {
      success: false,
      message: 'Please enter a valid email address.',
      provider: 'none',
    };
  }

  const dbResult = await subscribeWithDatabase(email, source);
  if (dbResult.ok) {
    let welcomeEmailSent = false;
    let welcomeEmailReason: string | undefined;

    if (dbResult.state === 'created' || dbResult.state === 'reactivated') {
      const welcomeResult = await sendWelcomeEmail({
        email,
        source,
        reactivated: dbResult.state === 'reactivated',
      });
      welcomeEmailSent = welcomeResult.sent;
      welcomeEmailReason = welcomeResult.reason;
    }

    const message =
      dbResult.state === 'already_active'
        ? 'You are already subscribed to EvoFutura weekly intelligence.'
        : welcomeEmailSent
          ? SUBSCRIBE_SUCCESS_WITH_WELCOME
          : SUBSCRIBE_SUCCESS_ACTIVE;

    return {
      success: true,
      message,
      provider: 'database',
      welcomeEmailSent,
      welcomeEmailReason,
    };
  }

  if (await subscribeWithWebhook(email, source)) {
    return {
      success: true,
      message: SUBSCRIBE_SUCCESS_MESSAGE,
      provider: 'webhook',
    };
  }

  console.info('[Subscribe][FallbackLog]', JSON.stringify({ email, source, timestamp: new Date().toISOString() }));
  return {
    success: true,
    message: SUBSCRIBE_SUCCESS_MESSAGE,
    provider: 'log',
  };
}
