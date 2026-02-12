import { prisma } from './prisma';
import { cache } from 'react';

export interface PostMetadata {
  title: string;
  date: string;
  excerpt: string;
  category: string;
  author: string;
  slug: string;
  coverImage?: string;
  image?: string;
  content: string;
}

// Cache the result for high performance
export const getSortedPostsData = cache(async () => {
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { date: 'desc' },
  });

  return posts.map(post => ({
    ...post,
    date: post.date.toISOString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    image: post.image || undefined
  }));
});

export const getPostData = cache(async (slug: string) => {
  const post = await prisma.post.findUnique({
    where: { slug },
  });

  if (!post) return null;

  return {
    ...post,
    date: post.date.toISOString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    image: post.image || undefined
  };
});

// New: Efficiently fetch posts by category
export const getPostsByCategory = cache(async (category: string) => {
  // Case-insensitive matching logic
  const posts = await prisma.post.findMany({
    where: { 
      published: true,
      category: {
        equals: category, 
      }
    },
    orderBy: { date: 'desc' },
  });

  return posts.map(post => ({
    ...post,
    date: post.date.toISOString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    image: post.image || undefined
  }));
});

export const getRelatedPosts = cache(async (category: string, currentSlug: string, limit = 3) => {
  const posts = await prisma.post.findMany({
    where: {
      published: true,
      category: category,
      NOT: {
        slug: currentSlug
      }
    },
    take: limit,
    orderBy: {
      date: 'desc'
    }
  });

  return posts.map(post => ({
    ...post,
    date: post.date.toISOString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    image: post.image || undefined
  }));
});
