import { normalizeCategory, slugify } from './taxonomy';

export interface HistoricalTopicEntry {
  title: string;
  excerpt?: string | null;
  category?: string;
  date?: Date;
}

export interface DuplicateCandidate {
  topic: string;
  title: string;
  excerpt?: string;
  category?: string;
}

export interface DuplicateMatch {
  score: number;
  reason: string;
  matched: HistoricalTopicEntry;
}

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'into',
  'over',
  'under',
  'between',
  'about',
  'across',
  'this',
  'that',
  'these',
  'those',
  'year',
  'years',
  'perspective',
  'future',
  'tech',
  'technology',
  'analysis',
  'deep',
  'dive',
  'brief',
  'guide',
  'build',
  'explainer',
  'opinion',
  'new',
  'modern',
  'latest',
  'week',
  '2024',
  '2025',
  '2026',
  '2027',
]);

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string) {
  return normalizeText(text)
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length > 2 && !STOPWORDS.has(token));
}

function toSet(values: string[]) {
  return new Set(values);
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

function makeBigrams(tokens: string[]) {
  if (tokens.length < 2) return new Set<string>();
  const values = new Set<string>();
  for (let index = 0; index < tokens.length - 1; index += 1) {
    values.add(`${tokens[index]}_${tokens[index + 1]}`);
  }
  return values;
}

function daysSince(date: Date | undefined) {
  if (!date) return 9999;
  const deltaMs = Date.now() - date.getTime();
  return Math.max(0, Math.floor(deltaMs / (1000 * 60 * 60 * 24)));
}

function hasSameAnchor(tokensA: string[], tokensB: string[]) {
  const longTokensA = tokensA.filter(token => token.length >= 6);
  const longTokensB = new Set(tokensB.filter(token => token.length >= 6));
  return longTokensA.some(token => longTokensB.has(token));
}

function explainReasons(scoreParts: string[]) {
  if (scoreParts.length === 0) return 'no strong overlap';
  return scoreParts.join(', ');
}

export function findDuplicateCandidate(
  candidate: DuplicateCandidate,
  history: HistoricalTopicEntry[],
  threshold = 0.78
): DuplicateMatch | null {
  const candidateTitle = candidate.title || candidate.topic;
  const candidateTitleSlug = slugify(candidateTitle);
  const candidateTopicSlug = slugify(candidate.topic);
  const candidateTitleTokens = tokenize(candidateTitle);
  const candidateTopicTokens = tokenize(candidate.topic);
  const candidateExcerptTokens = tokenize(candidate.excerpt || '');

  const candidateTitleSet = toSet(candidateTitleTokens);
  const candidateTopicSet = toSet(candidateTopicTokens);
  const candidateExcerptSet = toSet(candidateExcerptTokens);
  const candidateBigramSet = makeBigrams(candidateTitleTokens);

  let best: DuplicateMatch | null = null;

  for (const existing of history) {
    const existingTitle = existing.title || '';
    if (!existingTitle) continue;

    const existingTitleSlug = slugify(existingTitle);
    if (candidateTitleSlug && candidateTitleSlug === existingTitleSlug) {
      return {
        score: 1,
        reason: 'exact normalized title match',
        matched: existing,
      };
    }

    if (
      candidateTopicSlug &&
      existingTitleSlug &&
      (existingTitleSlug.includes(candidateTopicSlug) || candidateTopicSlug.includes(existingTitleSlug))
    ) {
      return {
        score: 0.98,
        reason: 'topic slug containment match',
        matched: existing,
      };
    }

    const existingTitleTokens = tokenize(existingTitle);
    const existingExcerptTokens = tokenize(existing.excerpt || '');
    const existingTitleSet = toSet(existingTitleTokens);
    const existingExcerptSet = toSet(existingExcerptTokens);
    const existingBigramSet = makeBigrams(existingTitleTokens);

    const titleTokenOverlap = jaccard(candidateTitleSet, existingTitleSet);
    const topicTokenOverlap = jaccard(candidateTopicSet, existingTitleSet);
    const titleBigramOverlap = jaccard(candidateBigramSet, existingBigramSet);
    const excerptOverlap =
      candidateExcerptSet.size > 0 && existingExcerptSet.size > 0
        ? jaccard(candidateExcerptSet, existingExcerptSet)
        : 0;

    let score =
      titleTokenOverlap * 0.46 +
      topicTokenOverlap * 0.26 +
      titleBigramOverlap * 0.2 +
      excerptOverlap * 0.08;

    const reasons: string[] = [];
    if (titleTokenOverlap >= 0.45) reasons.push(`title tokens ${(titleTokenOverlap * 100).toFixed(0)}%`);
    if (titleBigramOverlap >= 0.25) reasons.push(`title bigrams ${(titleBigramOverlap * 100).toFixed(0)}%`);
    if (excerptOverlap >= 0.35) reasons.push(`excerpt tokens ${(excerptOverlap * 100).toFixed(0)}%`);
    if (topicTokenOverlap >= 0.45) reasons.push(`topic tokens ${(topicTokenOverlap * 100).toFixed(0)}%`);

    if (hasSameAnchor(candidateTitleTokens, existingTitleTokens)) {
      score += 0.05;
      reasons.push('shared anchor phrase');
    }

    const sameCategory =
      candidate.category &&
      existing.category &&
      normalizeCategory(candidate.category) === normalizeCategory(existing.category);
    if (sameCategory) score += 0.05;

    const ageDays = daysSince(existing.date);
    if (ageDays <= 30) score += 0.06;
    else if (ageDays <= 90) score += 0.03;

    if (score >= threshold && (!best || score > best.score)) {
      best = {
        score,
        reason: explainReasons(reasons),
        matched: existing,
      };
    }
  }

  return best;
}
