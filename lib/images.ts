import { normalizeCategory } from './taxonomy';

const CATEGORY_FALLBACKS: Record<string, string> = {
  AI: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1600',
  ML: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&q=80&w=1600',
  Cloud: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1600',
  DevOps: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1600',
  WebDev: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=1600',
  Security: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1600',
  Data: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1600',
  Mobile: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=1600',
};

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=1600';

export function hasDisplayImage(image: string | null | undefined) {
  if (!image) return false;
  const value = image.trim();
  if (!value) return false;

  // Reject malformed values stored in legacy rows.
  if (value.startsWith('undefined')) return false;
  if (value.startsWith('null')) return false;

  // Accept local, absolute, and data URLs.
  if (value.startsWith('/')) return true;
  if (value.startsWith('http://') || value.startsWith('https://')) return true;
  if (value.startsWith('data:image/')) return true;

  return false;
}

export function getCategoryFallbackImage(category: string | null | undefined) {
  const normalized = normalizeCategory(category || '');
  return CATEGORY_FALLBACKS[normalized] || DEFAULT_FALLBACK;
}

export function getPostImageForDisplay(image: string | null | undefined, category: string | null | undefined) {
  if (hasDisplayImage(image)) return image!.trim();
  return getCategoryFallbackImage(category);
}
