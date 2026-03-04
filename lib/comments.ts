import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

const MAX_COMMENT_LENGTH = 2000;
const MIN_COMMENT_LENGTH = 12;
const MAX_NAME_LENGTH = 60;
const MIN_NAME_LENGTH = 2;
const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_COMMENTS = 3;
const DUPLICATE_WINDOW_HOURS = 24;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APPROVED_STATUS = 'approved';

export interface PublicComment {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

interface CreateCommentInput {
  slug: string;
  name: string;
  content: string;
  email?: string;
  source?: string;
  honeypot?: string;
  headers: Headers;
}

interface CommentResult {
  success: boolean;
  status: number;
  message: string;
  comment?: PublicComment;
}

const toPublicComment = (comment: {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
}): PublicComment => ({
  id: comment.id,
  name: comment.name,
  content: comment.content,
  createdAt: comment.createdAt.toISOString(),
});

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const sanitizeContent = (value: string) =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const getClientIp = (headers: Headers): string | null => {
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const first = xForwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp?.trim()) return xRealIp.trim();

  return null;
};

const hashIp = (ip: string | null) => {
  if (!ip) return null;
  const salt = process.env.COMMENT_IP_SALT || 'evofutura-comment-salt-v1';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
};

const isValidSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 180;

export async function getCommentsForSlug(slug: string): Promise<PublicComment[]> {
  if (!isValidSlug(slug)) return [];

  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, published: true },
  });

  if (!post?.published) return [];

  const comments = await prisma.comment.findMany({
    where: {
      postId: post.id,
      status: APPROVED_STATUS,
    },
    select: {
      id: true,
      name: true,
      content: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  });

  return comments.map(toPublicComment);
}

export async function createCommentForSlug(input: CreateCommentInput): Promise<CommentResult> {
  const slug = typeof input.slug === 'string' ? input.slug.trim().toLowerCase() : '';
  const name = typeof input.name === 'string' ? normalizeWhitespace(input.name) : '';
  const content = typeof input.content === 'string' ? sanitizeContent(input.content) : '';
  const email = typeof input.email === 'string' ? normalizeWhitespace(input.email).toLowerCase() : '';
  const source = typeof input.source === 'string' && input.source.trim().length > 0 ? input.source.trim() : 'web';
  const honeypot = typeof input.honeypot === 'string' ? input.honeypot.trim() : '';

  if (honeypot.length > 0) {
    return { success: true, status: 200, message: 'Comment received.' };
  }

  if (!isValidSlug(slug)) {
    return { success: false, status: 400, message: 'Invalid article reference.' };
  }

  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    return {
      success: false,
      status: 400,
      message: `Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`,
    };
  }

  if (content.length < MIN_COMMENT_LENGTH || content.length > MAX_COMMENT_LENGTH) {
    return {
      success: false,
      status: 400,
      message: `Comment must be between ${MIN_COMMENT_LENGTH} and ${MAX_COMMENT_LENGTH} characters.`,
    };
  }

  if (email && !EMAIL_REGEX.test(email)) {
    return { success: false, status: 400, message: 'Email format is invalid.' };
  }

  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, published: true },
  });

  if (!post?.published) {
    return { success: false, status: 404, message: 'Article not found.' };
  }

  const ipHash = hashIp(getClientIp(input.headers));
  const now = Date.now();

  if (ipHash) {
    const rateLimitStart = new Date(now - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const recentCount = await prisma.comment.count({
      where: {
        ipHash,
        createdAt: {
          gte: rateLimitStart,
        },
      },
    });

    if (recentCount >= RATE_LIMIT_MAX_COMMENTS) {
      return {
        success: false,
        status: 429,
        message: 'Too many comments submitted recently. Please wait a few minutes.',
      };
    }
  }

  const duplicateSince = new Date(now - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000);
  const duplicate = await prisma.comment.findFirst({
    where: {
      postId: post.id,
      name,
      content,
      createdAt: {
        gte: duplicateSince,
      },
    },
    select: { id: true },
  });

  if (duplicate) {
    return {
      success: false,
      status: 409,
      message: 'This comment looks like a duplicate of one you already submitted.',
    };
  }

  const created = await prisma.comment.create({
    data: {
      postId: post.id,
      name,
      email: email || null,
      content,
      source,
      ipHash,
      status: APPROVED_STATUS,
    },
    select: {
      id: true,
      name: true,
      content: true,
      createdAt: true,
    },
  });

  return {
    success: true,
    status: 201,
    message: 'Comment published.',
    comment: toPublicComment(created),
  };
}
