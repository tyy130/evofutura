export const POST_TYPES = [
  'Deep Dive',
  'Signal Brief',
  'Explainer',
  'Opinion',
  'Build Guide',
] as const;

export type PostType = (typeof POST_TYPES)[number];

export const CATEGORY_META: Record<string, { description: string; accent: string }> = {
  AI: {
    description: 'Model capability, agents, evaluation, and deployment strategy.',
    accent: '#06b6d4',
  },
  ML: {
    description: 'Pipelines, model optimization, and practical machine learning systems.',
    accent: '#0284c7',
  },
  Cloud: {
    description: 'Infrastructure, platform architecture, and distributed runtime design.',
    accent: '#0ea5e9',
  },
  DevOps: {
    description: 'Reliability, delivery automation, and engineering operations patterns.',
    accent: '#0891b2',
  },
  WebDev: {
    description: 'Frontend performance, browser capabilities, and modern web architecture.',
    accent: '#2563eb',
  },
  Security: {
    description: 'Threat modeling, hardening, and resilience against modern attack surfaces.',
    accent: '#dc2626',
  },
  Data: {
    description: 'Data infrastructure, analytics patterns, and information architecture.',
    accent: '#14b8a6',
  },
  Mobile: {
    description: 'Cross-platform systems, edge inference, and mobile engineering strategy.',
    accent: '#4f46e5',
  },
};

export const DEFAULT_CATEGORY = 'AI';
export const DEFAULT_POST_TYPE: PostType = 'Deep Dive';

export const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const titleFromSlug = (slug: string) =>
  slug
    .split('-')
    .filter(Boolean)
    .map(word => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');

export const normalizePostType = (value: string | null | undefined): PostType => {
  const incoming = (value || '').trim().toLowerCase();
  const matched = POST_TYPES.find(type => type.toLowerCase() === incoming);
  return matched || DEFAULT_POST_TYPE;
};

export const typeToSlug = (type: string) => slugify(type);

export const normalizeCategory = (value: string | null | undefined) => {
  if (!value) return DEFAULT_CATEGORY;
  const exact = Object.keys(CATEGORY_META).find(key => key.toLowerCase() === value.toLowerCase());
  return exact || DEFAULT_CATEGORY;
};

export const normalizeTag = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

export const normalizeTags = (tags: string[] | string | null | undefined): string[] => {
  if (!tags) return [];
  const list = Array.isArray(tags) ? tags : tags.split(',');
  const deduped = new Set<string>();

  list.forEach(raw => {
    const clean = normalizeTag(raw);
    if (clean.length > 1) deduped.add(clean);
  });

  return Array.from(deduped).slice(0, 8);
};

// Delimiter-wrapped storage to allow precise SQL contains matching.
// Example: |ai|agentic-ai|safety|
export const serializeTags = (tags: string[] | string | null | undefined) => {
  const normalized = normalizeTags(tags);
  if (normalized.length === 0) return '';
  return `|${normalized.join('|')}|`;
};

export const parseSerializedTags = (serialized: string | null | undefined): string[] => {
  if (!serialized) return [];
  return serialized
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)
    .map(normalizeTag)
    .filter(Boolean);
};

export const hasTag = (serialized: string | null | undefined, tagSlug: string) => {
  const normalized = normalizeTag(tagSlug);
  if (!normalized || !serialized) return false;
  return serialized.includes(`|${normalized}|`);
};
