import { prisma } from './prisma';
import { cache } from 'react';
import {
  CATEGORY_META,
  DEFAULT_POST_TYPE,
  hasTag,
  normalizeCategory,
  normalizePostType,
  normalizeTag,
  parseSerializedTags,
  POST_TYPES,
  serializeTags,
  typeToSlug,
} from './taxonomy';
import { hasDisplayImage } from './images';

export interface PostMetadata {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  category: string;
  type: string;
  tags: string[];
  author: string;
  slug: string;
  image?: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

const mapPost = (post: {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  type: string;
  tags: string;
  author: string;
  image: string | null;
  date: Date;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PostMetadata => ({
  ...post,
  category: normalizeCategory(post.category),
  type: normalizePostType(post.type),
  tags: parseSerializedTags(post.tags),
  date: post.date.toISOString(),
  createdAt: post.createdAt.toISOString(),
  updatedAt: post.updatedAt.toISOString(),
  image: hasDisplayImage(post.image) ? post.image || undefined : undefined,
});

export const getSortedPostsData = cache(async () => {
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { date: 'desc' },
  });

  return posts.map(mapPost);
});

export const getPostData = cache(async (slug: string) => {
  const post = await prisma.post.findUnique({
    where: { slug },
  });

  if (!post) return null;
  return mapPost(post);
});

export const getPostsByCategory = cache(async (category: string) => {
  const normalizedCategory = normalizeCategory(category);
  const posts = await prisma.post.findMany({
    where: {
      published: true,
      category: {
        equals: normalizedCategory,
      },
    },
    orderBy: { date: 'desc' },
  });

  return posts.map(mapPost);
});

export const getPostsByTypeSlug = cache(async (typeSlug: string) => {
  const resolvedType = POST_TYPES.find(type => typeToSlug(type) === typeSlug) || DEFAULT_POST_TYPE;

  const posts = await prisma.post.findMany({
    where: {
      published: true,
      type: resolvedType,
    },
    orderBy: { date: 'desc' },
  });

  return {
    type: resolvedType,
    slug: typeSlug,
    posts: posts.map(mapPost),
  };
});

export const getPostsByTagSlug = cache(async (tagSlug: string) => {
  const normalizedTag = normalizeTag(tagSlug);
  if (!normalizedTag) return [];

  // SQLite-compatible fallback: coarse filter in SQL, exact filter in JS.
  const candidates = await prisma.post.findMany({
    where: {
      published: true,
      tags: {
        contains: normalizedTag,
      },
    },
    orderBy: { date: 'desc' },
  });

  return candidates
    .filter(post => hasTag(post.tags, normalizedTag))
    .map(mapPost);
});

export const getRelatedPosts = cache(async (category: string, currentSlug: string, limit = 3) => {
  const normalizedCategory = normalizeCategory(category);
  const posts = await prisma.post.findMany({
    where: {
      published: true,
      category: normalizedCategory,
      NOT: {
        slug: currentSlug,
      },
    },
    take: limit,
    orderBy: {
      date: 'desc',
    },
  });

  return posts.map(mapPost);
});

export const getTaxonomySnapshot = cache(async () => {
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: {
      category: true,
      type: true,
      tags: true,
    },
  });

  const categories = Object.entries(
    posts.reduce<Record<string, number>>((acc, post) => {
      const category = normalizeCategory(post.category);
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({
    name,
    slug: name.toLowerCase(),
    count,
    accent: CATEGORY_META[name]?.accent || '#06b6d4',
  }));

  const types = Object.entries(
    posts.reduce<Record<string, number>>((acc, post) => {
      const type = normalizePostType(post.type);
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({
    name,
    slug: typeToSlug(name),
    count,
  }));

  const tagCounts = posts.reduce<Record<string, number>>((acc, post) => {
    parseSerializedTags(post.tags).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  const tags = Object.entries(tagCounts)
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);

  return { categories, types, tags };
});

export const getTypeStaticParams = () => POST_TYPES.map(type => ({ slug: typeToSlug(type) }));

export const prepareAdminTags = (raw: string) => serializeTags(raw.split(',').map(item => item.trim()));
