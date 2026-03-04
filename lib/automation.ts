import { prisma } from './prisma';
import OpenAI from 'openai';
import {
  ARCHITECT_PERSONA,
  generateTopicPrompt,
  CATEGORY_TONES,
  WRITING_ENGINES,
  type WritingEngineProfile,
} from './prompts';
import { discoverTopic, DiscoveredTopic } from './discovery';
import { researchTopic, formatResearchForPrompt, ResearchResult } from './research';
import { getCategoryFallbackImage } from './images';
import pillarsData from '../config/pillars.json';
import { EDITORIAL_CADENCE } from './editorialCadence';
import { findDuplicateCandidate } from './topicDedupe';
import {
  normalizeCategory,
  normalizePostType,
  normalizeTags,
  POST_TYPES,
  serializeTags,
  slugify,
  type PostType,
} from './taxonomy';

const pillars = pillarsData as Record<string, string[]>;

export type PipelineMode = 'discovery' | 'legacy';

interface PipelineResult {
  post: {
    id: string | number;
    title: string;
    slug: string;
    category: string;
    type: PostType;
    tags: string[];
  };
  mode: PipelineMode;
  discoveredTopic?: DiscoveredTopic;
  research?: ResearchResult;
}

interface GeneratedDraft {
  title: string;
  excerpt: string;
  content_markdown: string;
  type?: string;
  tags?: string[];
}

type RecentPostSnapshot = {
  title: string;
  category: string;
  type: PostType;
  image: string | null;
  date: Date;
};

interface EditorialPlan {
  category: string;
  type: PostType;
  includeImage: boolean;
  writingEngine: WritingEngineProfile;
  categoryReason: string;
  typeReason: string;
  imageReason: string;
  writingEngineReason: string;
}

function getNormalizedCount<T extends string>(items: T[], values: T[]) {
  const counts = new Map<T, number>();
  values.forEach(value => counts.set(value, 0));
  items.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
  return counts;
}

function topicSignals(topic: string) {
  const text = topic.toLowerCase();
  return {
    guideIntent: /how to|guide|implementation|playbook|build|step-by-step|tutorial/.test(text),
    explainerIntent: /what is|explainer|primer|introduction|explained/.test(text),
    opinionIntent: /vs\.?|versus|trade-?off|debate|why .* better|should we/.test(text),
  };
}

function hashText(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickCategoryByRotation(recentPosts: RecentPostSnapshot[], discoveredTopic: DiscoveredTopic | null) {
  const categories = Object.keys(pillars).map(normalizeCategory);
  const windowed = recentPosts.slice(0, EDITORIAL_CADENCE.editorialWindow);
  const categoryCounts = getNormalizedCount(
    windowed.map(post => normalizeCategory(post.category)),
    categories
  );
  const recentCategories = recentPosts
    .slice(0, EDITORIAL_CADENCE.categoryCooldownWindow)
    .map(post => normalizeCategory(post.category));

  const discoveredCategory = discoveredTopic ? normalizeCategory(discoveredTopic.category) : null;
  const discoveredBoost = discoveredTopic ? Math.min(1.2, (discoveredTopic.score || 0) / 140) : 0;

  const scored = categories.map(category => {
    const observedShare = (categoryCounts.get(category) || 0) / Math.max(windowed.length, 1);
    const targetShare = EDITORIAL_CADENCE.categoryTargetShare[category] || 1 / categories.length;
    let score = (targetShare - observedShare) * 3.2;

    if (recentCategories.includes(category)) {
      const repeats = recentCategories.filter(c => c === category).length;
      score -= repeats * 0.95;
    }

    if (discoveredCategory === category) {
      score += discoveredBoost;
    }

    return { category, score, observedShare, targetShare };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked = scored[0];

  return {
    category: picked.category,
    reason: `Category cadence picked ${picked.category} (target ${(picked.targetShare * 100).toFixed(0)}%, observed ${(picked.observedShare * 100).toFixed(0)}%).`,
  };
}

function pickTypeByCadence({
  topic,
  hasResearch,
  recentPosts,
}: {
  topic: string;
  hasResearch: boolean;
  recentPosts: RecentPostSnapshot[];
}) {
  const windowed = recentPosts.slice(0, EDITORIAL_CADENCE.editorialWindow);
  const typeCounts = getNormalizedCount(
    windowed.map(post => normalizePostType(post.type)),
    [...POST_TYPES]
  );
  const recentTypes = recentPosts.slice(0, EDITORIAL_CADENCE.typeCooldownWindow).map(post => normalizePostType(post.type));
  const signals = topicSignals(topic);

  const scores = POST_TYPES.map(type => {
    const observedShare = (typeCounts.get(type) || 0) / Math.max(windowed.length, 1);
    let score = (EDITORIAL_CADENCE.typeTargetShare[type] - observedShare) * 2.8;

    if (recentTypes.includes(type)) {
      score -= recentTypes.filter(t => t === type).length * 0.75;
    }

    if (!hasResearch) {
      score += type === 'Signal Brief' ? 1.2 : -0.4;
    }

    if (signals.guideIntent) {
      score += type === 'Build Guide' ? 1.1 : -0.15;
    }

    if (signals.explainerIntent) {
      score += type === 'Explainer' ? 1.0 : -0.1;
    }

    if (signals.opinionIntent) {
      score += type === 'Opinion' ? 0.9 : -0.1;
    }

    if (hasResearch && type === 'Deep Dive') {
      score += 0.25;
    }

    return { type, score, observedShare };
  });

  scores.sort((a, b) => b.score - a.score);
  const picked = scores[0];

  return {
    type: picked.type,
    reason: `Type cadence picked ${picked.type} (observed ${(picked.observedShare * 100).toFixed(0)}% in recent window).`,
  };
}

function pickWritingEngine(_topic: string, recentPosts: RecentPostSnapshot[]) {
  const engineIndex = recentPosts.length % WRITING_ENGINES.length;
  const engine = WRITING_ENGINES[engineIndex];

  return {
    engine,
    reason: `Writing engine selected: ${engine.name} (${engine.id}) in strict rotation slot ${engineIndex + 1}/${WRITING_ENGINES.length}.`,
  };
}

function pickImagePolicy(type: PostType, recentPosts: RecentPostSnapshot[]) {
  const targetRate = EDITORIAL_CADENCE.imageTargetRate[type];
  const typeWindow = recentPosts
    .filter(post => normalizePostType(post.type) === type)
    .slice(0, 12);
  const observedRate = typeWindow.length
    ? typeWindow.filter(post => Boolean(post.image)).length / typeWindow.length
    : targetRate;

  let includeImage = Math.random() < targetRate;
  if (observedRate < targetRate - 0.08) includeImage = true;
  if (observedRate > targetRate + 0.12) includeImage = false;

  return {
    includeImage,
    reason: `${type} image cadence target ${(targetRate * 100).toFixed(0)}%, observed ${(observedRate * 100).toFixed(0)}%.`,
  };
}

function formatTypeDirectives(type: PostType) {
  switch (type) {
    case 'Signal Brief':
      return `FORMAT DIRECTIVE (${type}): Write a long-form brief, not a short memo. Minimum 5 major sections, each with substantial depth, concrete examples, and actionable recommendations.`;
    case 'Explainer':
      return `FORMAT DIRECTIVE (${type}): Teach the architecture clearly for senior engineers with deep section-level detail. Each section must include implementation-level explanation and trade-offs.`;
    case 'Opinion':
      return `FORMAT DIRECTIVE (${type}): Take a strong technical position, compare alternatives, and defend trade-offs with evidence and counterarguments in depth.`;
    case 'Build Guide':
      return `FORMAT DIRECTIVE (${type}): Produce a comprehensive implementation guide with ordered steps, concrete commands/configuration, rollout pitfalls, and verification checkpoints.`;
    default:
      return `FORMAT DIRECTIVE (${type}): Produce a comprehensive deep analysis with detailed architecture, operational trade-offs, benchmarking considerations, and production recommendations.`;
  }
}

function hasRecentlyCoveredTopic(topic: string, titles: string[]) {
  const normalized = slugify(topic);
  const prefix = normalized.split('-').slice(0, 4).join('-');
  return titles.some(title => {
    const check = slugify(title);
    return check.includes(prefix) || prefix.includes(check.slice(0, 16));
  });
}

interface TopicCandidate {
  topic: string;
  mode: PipelineMode;
  useDiscovered: boolean;
}

function buildTopicCandidates(category: string, pastTitles: string[], discoveredTopic: DiscoveredTopic | null): TopicCandidate[] {
  const normalizedCategory = normalizeCategory(category);
  const pillarTopics = pillars[normalizedCategory] || [];
  const candidates: TopicCandidate[] = [];
  const seen = new Set<string>();

  const push = (topic: string, mode: PipelineMode, useDiscovered: boolean) => {
    const key = slugify(topic);
    if (!key || seen.has(key)) return;
    seen.add(key);
    candidates.push({ topic, mode, useDiscovered });
  };

  if (discoveredTopic && normalizeCategory(discoveredTopic.category) === normalizedCategory) {
    push(discoveredTopic.topic, 'discovery', true);
  }

  for (const topic of pillarTopics) {
    if (!hasRecentlyCoveredTopic(topic, pastTitles)) {
      push(topic, 'legacy', false);
    }
  }

  for (const topic of pillarTopics) {
    push(topic, 'legacy', false);
  }

  if (candidates.length === 0) {
    push(`${normalizedCategory} architecture outlook`, 'legacy', false);
  }

  return candidates;
}

function generateTags(topic: string, category: string): string[] {
  const seedWords = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 6);

  return normalizeTags([category, ...seedWords, 'future-tech', 'engineering']);
}

function countWords(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[[^\]]+\]\([^\)]+\)/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function getParagraphWordCounts(content: string): number[] {
  const withoutCode = content.replace(/```[\s\S]*?```/g, '\n');
  const blocks = withoutCode
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean);

  return blocks
    .filter(block => {
      if (/^#{1,6}\s+/m.test(block)) return false;
      if (/^>\s+/m.test(block)) return false;
      if (/^\s*[-*+]\s+/m.test(block)) return false;
      if (/^\s*\d+\.\s+/m.test(block)) return false;
      if (/^\|.+\|\s*$/m.test(block)) return false;
      return true;
    })
    .map(block => countWords(block));
}

function getH2SectionDetails(
  content: string
): Array<{
  words: number;
  hasCode: boolean;
  hasNumberedList: boolean;
  hasList: boolean;
  hasQuote: boolean;
  hasTable: boolean;
  hasH3: boolean;
}> {
  const normalized = content.replace(/\r\n/g, '\n');
  const matches = normalized.match(/^##\s+.*$/gm);
  if (!matches || matches.length === 0) return [];

  const parts = normalized.split(/^##\s+.*$/gm).slice(1);
  return parts.map(part => ({
    words: countWords(part),
    hasCode: /```/.test(part),
    hasNumberedList: /^\s*\d+\.\s+/m.test(part),
    hasList: /^\s*[-*+]\s+/m.test(part) || /^\s*\d+\.\s+/m.test(part),
    hasQuote: /^\s*>\s+/m.test(part),
    hasTable: /^\s*\|.+\|\s*$/m.test(part),
    hasH3: /^###\s+/m.test(part),
  }));
}

function extractJson(raw: string): GeneratedDraft | null {
  const trimmed = raw.trim();

  const tryParse = (value: string) => {
    try {
      return JSON.parse(value) as GeneratedDraft;
    } catch {
      return null;
    }
  };

  const direct = tryParse(trimmed);
  if (direct) return direct;

  const fenceMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    const fenced = tryParse(fenceMatch[1].trim());
    if (fenced) return fenced;
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const extracted = tryParse(objectMatch[0]);
    if (extracted) return extracted;
  }

  return null;
}

function normalizeFieldNotesQuotes(content: string) {
  return content.replace(/(^>\s*\*\*Field\s*notes?\*\*:\s*)(.+)$/gim, (_, prefix: string, rawNote: string) => {
    const normalized = rawNote
      .trim()
      .replace(/^["'“”]{1,2}\s*/, '')
      .replace(/\s*["'“”]{1,2}$/, '')
      .replace(/""+/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    return `${prefix}${normalized}`;
  });
}

function normalizeFingerprint(value: string) {
  return value
    .toLowerCase()
    .replace(/[`*_#>\-|[\](){}.,:;!?'"“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findDuplicateFingerprints(values: string[], minOccurrences = 2) {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count >= minOccurrences).map(([value]) => value);
}

function getFieldNotes(content: string) {
  return [...content.matchAll(/^>\s*\*\*Field\s*notes?\*\*:\s*(.+)$/gim)].map(match => match[1].trim());
}

function getBulletItems(content: string) {
  return [...content.matchAll(/^\s*[-*]\s+(.+)$/gm)].map(match => match[1].trim());
}

function getSentences(content: string) {
  const normalized = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\|.+\|/g, ' ')
    .replace(/^>\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized
    .split(/(?<=[.?!])\s+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 80);
}

function sanitizeContent(raw: string) {
  const cleaned = raw
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/^title:\s*["'].*?["']\s*/gim, '')
    .replace(/^date:\s*["'].*?["']\s*/gim, '')
    .replace(/^category:\s*["'].*?["']\s*/gim, '')
    .replace(/^author:\s*["'].*?["']\s*/gim, '')
    .replace(/!\[Header\]\(.*?\)/g, '')
    .trim();

  return normalizeFieldNotesQuotes(cleaned);
}

function validateDraft(draft: GeneratedDraft, expectedType: PostType): string[] {
  const errors: string[] = [];
  const normalizedType = normalizePostType(draft.type || expectedType);
  const rule = EDITORIAL_CADENCE.typeRules[expectedType];

  if (!draft.title || draft.title.trim().length < 12) {
    errors.push('Title must be at least 12 characters.');
  }

  if (!draft.excerpt || draft.excerpt.trim().length < rule.excerptMin || draft.excerpt.trim().length > rule.excerptMax) {
    errors.push(`Excerpt must be between ${rule.excerptMin} and ${rule.excerptMax} characters for ${expectedType}.`);
  }

  if (!draft.content_markdown || draft.content_markdown.trim().length < 700) {
    errors.push('Article body is too short.');
  }

  const content = sanitizeContent(draft.content_markdown || '');

  if (normalizedType !== expectedType) {
    errors.push(`Type must remain "${expectedType}" for editorial cadence.`);
  }

  if ((content.match(/^##\s+/gm) || []).length < rule.minH2) {
    errors.push(`Article must contain at least ${rule.minH2} H2 sections for ${expectedType}.`);
  }

  if (countWords(content) < rule.minWords) {
    errors.push(`Article must contain at least ${rule.minWords} words for ${expectedType}.`);
  }

  const sectionDetails = getH2SectionDetails(content);
  const narrativeSectionsTooShort = sectionDetails.filter(
    section =>
      !section.hasCode &&
      !section.hasList &&
      !section.hasQuote &&
      !section.hasTable &&
      section.words < rule.minSectionWords
  );
  if (narrativeSectionsTooShort.length > 0) {
    errors.push(`Each H2 section must contain at least ${rule.minSectionWords} words for ${expectedType}.`);
  }

  const sectionsWithNoFormatVariety = sectionDetails.filter(
    section => !section.hasCode && !section.hasList && !section.hasQuote && !section.hasTable && !section.hasH3
  );
  if (sectionsWithNoFormatVariety.length > 0) {
    errors.push('Each H2 section must include at least one formatting element (H3, list, quote, table, or code).');
  }

  if (!/^\s*>\s+/m.test(content)) {
    errors.push('Article must include at least one blockquote pull-quote.');
  }

  if (!/^\s*\|.+\|\s*$/m.test(content)) {
    errors.push('Article must include at least one markdown table.');
  }

  if ((content.match(/^###\s+/gm) || []).length < 3) {
    errors.push('Article must include at least 3 H3 subheads for better scanability.');
  }

  const longParagraphCount = getParagraphWordCounts(content).filter(words => words > 120).length;
  if (longParagraphCount > 2) {
    errors.push('Too many dense paragraphs detected; break sections into smaller blocks/lists.');
  }

  const fieldNotes = getFieldNotes(content);
  const wrappedFieldNotes = fieldNotes.filter(note => /^["'“”].*["'“”]$/.test(note) || /""/.test(note));
  if (wrappedFieldNotes.length > 0) {
    errors.push('Field Notes must not wrap note text in quotation marks.');
  }

  const duplicateFieldNotes = findDuplicateFingerprints(fieldNotes.map(normalizeFingerprint));
  if (duplicateFieldNotes.length > 0) {
    errors.push('Field Notes are repeated verbatim across sections. Vary operator insight language.');
  }

  const duplicateBullets = findDuplicateFingerprints(
    getBulletItems(content)
      .map(normalizeFingerprint)
      .filter(item => item.length >= 28),
    4
  );
  if (duplicateBullets.length > 0) {
    errors.push('List items are repeated verbatim across sections. Vary operator signals and checklists.');
  }

  const duplicateSentences = findDuplicateFingerprints(
    getSentences(content)
      .map(normalizeFingerprint)
      .filter(sentence => sentence.length >= 90),
    3
  );
  if (duplicateSentences.length > 1) {
    errors.push('Long narrative sentences are repeating across sections. Rewrite sections with distinct analysis language.');
  }

  if (
    rule.requiresArtifact &&
    !/```/.test(content) &&
    !/mermaid|architecture|config|typescript|python|yaml|json|terraform|docker|kubernetes/i.test(content)
  ) {
    errors.push(`Article must include at least one technical implementation artifact for ${expectedType}.`);
  }

  if (expectedType === 'Build Guide' && !/^\d+\.\s+/m.test(content)) {
    errors.push('Build Guide must include a numbered implementation sequence.');
  }

  if (expectedType === 'Opinion' && !/trade-?off|counterpoint|however|on the other hand|cost of/i.test(content.toLowerCase())) {
    errors.push('Opinion format must include explicit trade-off analysis language.');
  }

  return errors;
}

function ensureSourcesSection(content: string, research: ResearchResult | null) {
  if (!research || research.primary_sources.length === 0) return content;
  if (/^##\s+Sources/m.test(content)) return content;

  const lines = research.primary_sources.slice(0, 5).map((url, index) => `${index + 1}. ${url}`);
  return `${content.trim()}\n\n## Sources\n${lines.join('\n')}`;
}

function pickUniqueBySeed(items: string[], seedInput: string, used?: Set<string>) {
  const seed = hashText(seedInput);
  const step = 3;

  for (let i = 0; i < items.length; i += 1) {
    const index = (seed + i * step) % items.length;
    const candidate = items[index];
    const fingerprint = normalizeFingerprint(candidate);
    if (!used || !used.has(fingerprint)) {
      used?.add(fingerprint);
      return candidate;
    }
  }

  const fallback = items[seed % items.length];
  used?.add(normalizeFingerprint(fallback));
  return fallback;
}

function richParagraph({
  topic,
  category,
  angle,
  engine,
  sectionKey,
  phase,
  usedSentences,
}: {
  topic: string;
  category: string;
  angle: string;
  engine: WritingEngineProfile;
  sectionKey: string;
  phase: 'core' | 'implication';
  usedSentences?: Set<string>;
}) {
  const leadByEngine: Record<WritingEngineProfile['id'], string[]> = {
    'systems-analyst': [
      `${topic} has shifted from optional experimentation to core systems design for ${category} teams.`,
      `${category} organizations are now treating ${topic} as an architecture baseline, not a side initiative.`,
      `${topic} now sits on the critical path for delivery velocity and runtime stability in ${category} estates.`,
      `Platform teams can no longer isolate ${topic} from reliability and governance decisions in ${category}.`,
    ],
    'operator-journal': [
      `On live systems, ${topic} is no longer theoretical in ${category}; it is changing how teams ship and recover.`,
      `In production environments, ${topic} is surfacing as an execution issue before it appears on planning decks.`,
      `${category} operators are learning that ${topic} succeeds only when rollout mechanics are explicit from day one.`,
      `Across incident reviews, ${topic} keeps appearing as a root-cause multiplier when boundaries are underspecified.`,
    ],
    'research-desk': [
      `Recent implementation data shows ${topic} increasingly correlates with measurable delivery and stability outcomes in ${category}.`,
      `Comparative analysis now places ${topic} in the critical architecture layer for modern ${category} programs.`,
      `Observed rollout patterns indicate ${topic} is moving from pilot status to production default across ${category}.`,
      `The strongest evidence trend is that ${topic} adoption quality depends more on operating model than tooling choice.`,
    ],
  };

  const impactFrames = [
    'That changes planning assumptions for ownership boundaries, rollout checkpoints, and service-level contracts.',
    'The immediate consequence is a tighter coupling between platform architecture and incident response readiness.',
    'This pushes teams to define measurable release gates before scaling exposure.',
    'As a result, architecture decisions now need explicit failure-domain and rollback definitions.',
    'The operational bar moves from feature completion to repeatable, testable production behavior.',
  ];

  const executionFrames = [
    'Teams that align integration contracts with observability and release policy early usually avoid expensive mid-rollout rewrites.',
    'When contracts, telemetry, and rollback paths are codified up front, incident triage becomes faster and less political.',
    'Organizations that operationalize these controls in CI/CD generally reduce drift and improve recovery consistency.',
    'Without those controls, adoption often stalls in partial rollout states that increase maintenance cost without yielding durable benefits.',
    'The most reliable pattern is to pair each dependency decision with owner accountability and a tested fallback path.',
  ];

  const implicationFrames = [
    'This is where disciplined sequencing matters more than nominal feature velocity.',
    'Execution quality here compounds quickly, either into stable scale or recurring operational debt.',
    'In practice, the quality of these early decisions determines long-term delivery efficiency.',
    'The difference between smooth scale and chronic incident churn is usually decided at this layer.',
    'This layer is typically where strategic intent either becomes operationally real or collapses under coupling pressure.',
  ];

  const lead = pickUniqueBySeed(leadByEngine[engine.id], `${topic}|${category}|${sectionKey}|${phase}|lead`, usedSentences);
  const impact = pickUniqueBySeed(impactFrames, `${topic}|${category}|${sectionKey}|${phase}|impact`, usedSentences);
  const execution = pickUniqueBySeed(
    executionFrames,
    `${topic}|${category}|${sectionKey}|${phase}|execution`,
    usedSentences
  );
  const implication = pickUniqueBySeed(
    implicationFrames,
    `${topic}|${category}|${sectionKey}|${phase}|implication`,
    usedSentences
  );

  return `${lead} ${angle} ${impact} ${execution} ${implication}`;
}

const OPERATOR_SIGNAL_TEMPLATES = [
  'Gate rollout on error budget, p95 latency, and unit-cost thresholds before expanding traffic.',
  'Map the dependency graph for {topic} and assign explicit owners for each cross-team contract.',
  'Run canary slices with rollback automation wired to hard technical thresholds, not manual judgment.',
  'Treat policy and governance checks as CI/CD gates so drift is blocked before production.',
  'Track reliability and cost together; either metric alone hides instability during adoption.',
  'Define non-negotiable fallback paths for critical user journeys before first public release.',
  'Require contract tests on every integration edge touched by {topic} in the {category} stack.',
  'Publish weekly risk burndown checkpoints with clear go/no-go criteria for each rollout wave.',
  'Protect platform velocity by limiting scope expansion until operational telemetry is stable.',
  'Attach incident ownership to dependency boundaries so triage is not blocked during failures.',
  'Separate data validation failures from service failures so blast radius is isolated during incidents.',
  'Introduce progressive delivery flags for {topic} to decouple activation from deploy timing.',
  'Set maximum acceptable rollback time and verify it during game-day drills before launch.',
  'Use synthetic traffic on high-value paths to catch regressions before customer exposure expands.',
  'Instrument each pipeline stage with owner-level dashboards and SLA-aware alert routing.',
  'Treat schema drift as a deployment blocker when it impacts downstream contract guarantees.',
  'Define a finite risk budget per release wave and halt expansion when it is exceeded.',
  'Require post-incident follow-through tasks before approving the next rollout increment.',
  'Track dependency recovery time alongside availability so resilience is measured end-to-end.',
  'Run dual-read validation during migrations to surface silent correctness issues early.',
  'Add policy-as-code checks around {topic} configuration to prevent unsafe runtime toggles.',
  'Limit concurrent architecture changes touching the same failure domain during rollout weeks.',
  'Publish a weekly operational debt register and tie top items to explicit owners and dates.',
  'Pre-compute fallback routes for stateful dependencies so failover is deterministic under load.',
  'Codify readiness gates for security, compliance, and reliability in one approval workflow.',
  'Version integration contracts explicitly and retire legacy paths on defined timelines.',
  'Require stress tests that mirror realistic dependency latency, not idealized synthetic benchmarks.',
  'Measure adoption quality by stability and cost trends, not by integration count alone.',
  'Tag all incidents linked to {topic} so patterns can be reviewed at architecture level.',
  'Enforce least-privilege credentials for every component in the {category} runtime path.',
  'Use bounded queues and back-pressure controls to prevent cascading failures during traffic spikes.',
  'Review slow rollback causes monthly and harden automation around the top recurring blockers.',
];

const FIELD_NOTE_TEMPLATES = [
  'Teams that codify dependency contracts before launch usually cut integration rework by at least one planning cycle.',
  'Reliability improves fastest when rollout gates are technical and automatic, not based on meeting-room confidence.',
  'Most delays come from unclear ownership boundaries, not weak tooling.',
  'The fastest teams pair delivery speed with strict rollback discipline from day one.',
  'Cost drift is usually a signal of architectural coupling, not simply usage growth.',
  'Observability only helps when teams pre-define the response playbook for threshold violations.',
  'Execution quality improves when policy checks are treated as product requirements, not compliance afterthoughts.',
  'A small canary with tight telemetry gives better signal than broad launch with weak instrumentation.',
];

function renderTemplate(template: string, params: Record<string, string>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => params[key] || '');
}

function pickDistinctBySeed<T>(items: T[], count: number, seedInput: string) {
  const seed = hashText(seedInput);
  if (items.length <= count) return [...items];

  const picked: T[] = [];
  const used = new Set<number>();
  let cursor = seed % items.length;

  while (picked.length < count) {
    if (!used.has(cursor)) {
      picked.push(items[cursor]);
      used.add(cursor);
    }
    cursor = (cursor + 3) % items.length;
    if (used.size >= items.length) break;
  }

  return picked;
}

function buildSectionSignals({
  topic,
  category,
  sectionKey,
  engine,
  usedSignals,
}: {
  topic: string;
  category: string;
  sectionKey: string;
  engine: WritingEngineProfile;
  usedSignals?: Set<string>;
}) {
  const ordered = pickDistinctBySeed(
    OPERATOR_SIGNAL_TEMPLATES,
    OPERATOR_SIGNAL_TEMPLATES.length,
    `${topic}|${category}|${sectionKey}|${engine.id}|signals`
  ).map(item => renderTemplate(item, { topic, category }));

  const selected: string[] = [];
  for (const signal of ordered) {
    const fingerprint = normalizeFingerprint(signal);
    if (usedSignals?.has(fingerprint)) continue;
    selected.push(signal);
    usedSignals?.add(fingerprint);
    if (selected.length >= 3) break;
  }

  if (selected.length < 3) {
    for (const signal of ordered) {
      selected.push(signal);
      if (selected.length >= 3) break;
    }
  }

  return selected;
}

function buildFieldNote({
  topic,
  category,
  sectionKey,
  engine,
  usedFieldNotes,
}: {
  topic: string;
  category: string;
  sectionKey: string;
  engine: WritingEngineProfile;
  usedFieldNotes?: Set<string>;
}) {
  const ordered = pickDistinctBySeed(
    FIELD_NOTE_TEMPLATES,
    FIELD_NOTE_TEMPLATES.length,
    `${topic}|${category}|${sectionKey}|${engine.id}|field-note`
  ).map(item => renderTemplate(item, { topic, category }));

  for (const note of ordered) {
    const fingerprint = normalizeFingerprint(note);
    if (usedFieldNotes?.has(fingerprint)) continue;
    usedFieldNotes?.add(fingerprint);
    return note;
  }

  return ordered[0];
}

function sectionArtifact({
  topic,
  category,
  sectionKey,
  engine,
}: {
  topic: string;
  category: string;
  sectionKey: string;
  engine: WritingEngineProfile;
}) {
  const variant = hashText(`${topic}|${category}|${sectionKey}|${engine.id}|artifact`) % 4;

  if (variant === 0) {
    return `### Failure Pattern Map
- **Boundary ambiguity:** Integration contracts are implicit, so incidents bounce between teams.
- **Late observability:** Critical paths are instrumented after launch, hiding regressions during rollout.
- **Rollback friction:** Recovery steps are manual, slow, or dependent on unavailable owners.`;
  }

  if (variant === 1) {
    return `### Operator Checklist
1. Verify deployment gates against latency, error budget, and unit-cost thresholds.
2. Confirm each dependency has a named owner and tested fallback behavior.
3. Rehearse rollback on realistic traffic before expanding beyond initial canary.
4. Log decision rationale for every rollout wave so reversals are auditable.`;
  }

  if (variant === 2) {
    return `### Evidence Snapshot
| Signal | Healthy Pattern | Risk Pattern |
|---|---|---|
| Release stability | Controlled expansion with bounded incident rate | Large rollout jumps with noisy recovery |
| Cost behavior | Predictable trend tied to throughput growth | Spikes from hidden coupling and retries |
| Team throughput | Fewer reversals after rollout checkpoints | Frequent hotfix cycles and scope rollback |`;
  }

  return `### Decision Triggers
- If cross-team dependencies are still undocumented, hold expansion and finish contract mapping first.
- If rollback time exceeds your target window, prioritize recovery automation before adding scope.
- If incident ownership is unclear, pause rollout until accountability is explicit.
- If telemetry does not isolate failure domains, treat readiness as incomplete.`;
}

function longSection({
  title,
  topic,
  category,
  angleA,
  angleB,
  sectionKey,
  engine,
  uniqueness,
}: {
  title: string;
  topic: string;
  category: string;
  angleA: string;
  angleB: string;
  sectionKey: string;
  engine: WritingEngineProfile;
  uniqueness?: {
    usedSignals: Set<string>;
    usedFieldNotes: Set<string>;
    usedNarrativeSentences: Set<string>;
  };
}) {
  const operatorHeading =
    engine.id === 'research-desk'
      ? 'Evidence Signals'
      : engine.id === 'operator-journal'
        ? 'Operator Signals From The Field'
        : 'Operator Signals';
  const signals = buildSectionSignals({
    topic,
    category,
    sectionKey,
    engine,
    usedSignals: uniqueness?.usedSignals,
  });
  const fieldNote = buildFieldNote({
    topic,
    category,
    sectionKey,
    engine,
    usedFieldNotes: uniqueness?.usedFieldNotes,
  });

  return `## ${title}

### Core Read
${richParagraph({
  topic,
  category,
  angle: angleA,
  engine,
  sectionKey,
  phase: 'core',
  usedSentences: uniqueness?.usedNarrativeSentences,
})}

### ${operatorHeading}
${signals.map(signal => `- ${signal}`).join('\n')}

> **Field Notes:** ${fieldNote}

${sectionArtifact({
  topic,
  category,
  sectionKey,
  engine,
})}

### Practical Implication
${richParagraph({
  topic,
  category,
  angle: angleB,
  engine,
  sectionKey,
  phase: 'implication',
  usedSentences: uniqueness?.usedNarrativeSentences,
})}`;
}

function decisionMatrix(topic: string, category: string, engine: WritingEngineProfile) {
  const optionA = engine.id === 'research-desk' ? 'Benchmark-driven rollout' : 'Fast-track rollout';
  const optionB = engine.id === 'operator-journal' ? 'Incident-informed phased rollout' : 'Controlled phased rollout';
  const optionC = engine.id === 'systems-analyst' ? 'Platform contract-first integration' : 'Platform-first integration';

  return `## Decision Matrix

| Option | When It Works | Hidden Cost | Mitigation |
|---|---|---|---|
| ${optionA} | Clear ownership, low dependency graph, tight scope | Observability blind spots and rollback surprises | Gate expansion on error budget and cost guardrails |
| ${optionB} | Multi-team ${category} stacks with compliance or uptime constraints | Slower initial delivery perception | Publish milestone metrics and weekly decision checkpoints |
| ${optionC} | Reusable primitives needed across org | Upfront design overhead and coordination drag | Time-box architecture decisions and enforce contract tests |`;
}

function fallbackDraft(topic: string, category: string, type: PostType, engine: WritingEngineProfile): GeneratedDraft {
  const uniqueness = {
    usedSignals: new Set<string>(),
    usedFieldNotes: new Set<string>(),
    usedNarrativeSentences: new Set<string>(),
  };

  const commonTail = `${longSection({
    title: 'Implementation Playbook',
    topic,
    category,
    angleA:
      'Execution should begin with explicit success metrics and guardrails tied to user impact, latency budgets, and cost ceilings so teams can make rollout decisions with objective signals.',
    angleB:
      'The practical sequence is a staged release model with live observability, enforced rollback triggers, and ownership on each dependency so no critical workflow depends on implied behavior.',
    sectionKey: 'implementation-playbook',
    engine,
    uniqueness,
  })}\n\n## Rollout Sequence\n\n1. Define measurable SLOs, budget limits, and release gates that can be audited.\n2. Ship a narrow production slice with full telemetry and automated rollback hooks.\n3. Expand in controlled waves only after stability and economics remain inside target bands.\n4. Run weekly reliability and security reviews until the capability reaches steady-state maturity.\n\n${longSection({
    title: 'Executive Checklist',
    topic,
    category,
    angleA:
      'Use an explicit launch checklist so architecture intent, runtime policy, and response plans are reviewed together before each rollout wave.',
    angleB:
      'A disciplined checklist creates a repeatable quality bar across teams and prevents last-minute scope creep from bypassing key reliability controls.',
    sectionKey: 'executive-checklist',
    engine,
    uniqueness,
  })}\n\n${decisionMatrix(topic, category, engine)}\n\n${longSection({
    title: 'Bottom Line',
    topic,
    category,
    angleA:
      'The durable approach is to treat this as core architecture, not feature garnish, because long-term velocity depends on stable interfaces and predictable operational behavior.',
    angleB:
      'Teams that invest in explicit ownership boundaries, testable contracts, and incident-ready controls generally compound delivery speed while reducing expensive regressions over time.',
    sectionKey: 'bottom-line',
    engine,
    uniqueness,
  })}`;

  if (type === 'Signal Brief') {
    return {
      title: `${topic}: What Changed This Week`,
      excerpt: `A high-signal brief on ${topic}, focused on immediate implications for engineering leaders shipping ${category} systems.`,
      type,
      tags: [category, 'signal-brief', 'future-tech', 'engineering'],
      content_markdown: `${longSection({
        title: 'Key Shift',
        topic,
        category,
        angleA:
          'What changed this week is not only market narrative, but implementation confidence among teams that previously treated the capability as experimental.',
        angleB:
          'This shift is visible in roadmap prioritization, where platform groups are now allocating dedicated integration and reliability capacity rather than running ad hoc pilots.',
        sectionKey: 'key-shift',
        engine,
        uniqueness,
      })}\n\n${longSection({
        title: 'What Matters Operationally',
        topic,
        category,
        angleA:
          'Execution quality now depends on disciplined rollout sequencing, strong observability contracts, and failure-domain isolation across dependent services.',
        angleB:
          'Organizations that align platform policy with product implementation can scale safely, while fragmented ownership usually creates hidden coupling and slower recovery paths.',
        sectionKey: 'operational-matters',
        engine,
        uniqueness,
      })}\n\n${longSection({
        title: 'Risks to Watch',
        topic,
        category,
        angleA:
          'The highest-probability failures are cost drift, weak policy enforcement, and dependency cascades that are discovered too late in rollout.',
        angleB:
          'The mitigation pattern is explicit governance in the delivery pipeline, including automated checks, runtime guardrails, and rehearsed rollback scenarios.',
        sectionKey: 'risks-to-watch',
        engine,
        uniqueness,
      })}\n\n${commonTail}`,
    };
  }

  if (type === 'Build Guide') {
    return {
      title: `${topic}: Build Guide for ${category} Teams`,
      excerpt: `A practical build guide for implementing ${topic} with production-grade reliability, observability, and rollout controls.`,
      type,
      tags: [category, 'build-guide', 'future-tech', 'engineering'],
      content_markdown: `${longSection({
        title: 'Architecture Goal',
        topic,
        category,
        angleA:
          'The goal is a production design that stays predictable under load, dependency instability, and policy updates without forcing emergency redesigns.',
        angleB:
          'Achieving this requires layered interfaces, explicit runtime boundaries, and measurable reliability objectives that can guide rollout decisions.',
        sectionKey: 'architecture-goal',
        engine,
        uniqueness,
      })}\n\n## Reference Skeleton\n\n\`\`\`ts\ninterface Step {\n  id: string;\n  timeoutMs: number;\n  run: () => Promise<void>;\n}\n\nexport async function execute(steps: Step[]) {\n  for (const step of steps) {\n    await Promise.race([\n      step.run(),\n      new Promise((_, reject) => setTimeout(() => reject(new Error(\`timeout:\${step.id}\`)), step.timeoutMs)),\n    ]);\n  }\n}\n\`\`\`\n\n${longSection({
        title: 'Step-by-Step Rollout',
        topic,
        category,
        angleA:
          'Build rollout as an engineering program: staged environments, objective gates, and explicit incident ownership on every dependent service.',
        angleB:
          'Each expansion wave should be backed by observability and rollback automation so teams can move quickly without betting reliability on manual intervention.',
        sectionKey: 'step-by-step-rollout',
        engine,
        uniqueness,
      })}\n\n## Ordered Implementation Sequence\n\n1. Establish service-level objectives, acceptance thresholds, and budget alerts.\n2. Implement integration adapters with contract tests and replayable fixtures.\n3. Add runtime policy checks, kill switches, and automated rollback triggers.\n4. Run canary release with staffed monitoring and predefined go/no-go criteria.\n5. Expand traffic in bounded waves with weekly reliability and security reviews.\n\n${longSection({
        title: 'Common Pitfalls',
        topic,
        category,
        angleA:
          'Most failures come from under-specified contracts, thin telemetry, and weak ownership of dependency behavior in production conditions.',
        angleB:
          'Treat operational readiness as part of architecture definition, because unresolved rollout mechanics become reliability and velocity debt later.',
        sectionKey: 'common-pitfalls',
        engine,
        uniqueness,
      })}\n\n${commonTail}`,
    };
  }

  if (type === 'Opinion') {
    return {
      title: `${topic}: A Practical Position for ${category} Engineering`,
      excerpt: `A technical viewpoint on ${topic}, with explicit trade-off analysis and a pragmatic plan for engineering teams.`,
      type,
      tags: [category, 'opinion', 'engineering', 'future-tech'],
      content_markdown: `${longSection({
        title: 'Position Statement',
        topic,
        category,
        angleA:
          'My position is that teams should adopt this capability deliberately, but only with enforceable operational controls and explicit ownership boundaries.',
        angleB:
          'The strongest counterpoint is speed pressure, yet short-term launch gains often create long-term reliability drag when architecture contracts remain implicit.',
        sectionKey: 'position-statement',
        engine,
        uniqueness,
      })}\n\n${longSection({
        title: 'Where This Position Wins',
        topic,
        category,
        angleA:
          'This approach wins where systems are multi-team, compliance-sensitive, or business-critical because predictable behavior matters more than local optimization.',
        angleB:
          'By codifying controls early, teams preserve delivery speed over time and reduce the recurring cost of incident-driven redesign cycles.',
        sectionKey: 'where-position-wins',
        engine,
        uniqueness,
      })}\n\n${longSection({
        title: 'Trade-off Analysis',
        topic,
        category,
        angleA:
          'The trade-off is upfront coordination overhead versus downstream incident volatility; in most production environments that trade-off strongly favors structured rollout.',
        angleB:
          'On the other hand, teams pursuing only experimental proofs may accept looser controls temporarily, but they should document the risk transfer explicitly.',
        sectionKey: 'trade-off-analysis',
        engine,
        uniqueness,
      })}\n\n${commonTail}`,
    };
  }

  return {
    title: `${topic}: Practical ${category} Architecture Brief`,
    excerpt: `A grounded engineering brief on ${topic}, focusing on architecture choices, operational trade-offs, and implementation steps for 2026 teams.`,
    type,
    tags: [category, 'engineering', 'future-tech'],
    content_markdown: `${longSection({
      title: 'Why This Matters Now',
      topic,
      category,
      angleA:
        'The current shift is that adoption pressure has moved from research groups to core product and platform roadmaps, making architecture quality an immediate business concern.',
      angleB:
        'Teams that wait to formalize interfaces, ownership, and reliability goals usually pay for that delay through slower launches and repeated rework cycles.',
      sectionKey: 'why-this-matters-now',
      engine,
      uniqueness,
    })}\n\n${longSection({
      title: 'Core Architecture Pattern',
      topic,
      category,
      angleA:
        'A layered architecture remains the most resilient baseline because it separates business intent, orchestration logic, execution boundaries, and reliability controls.',
      angleB:
        'This pattern also improves team scaling because each layer can evolve under explicit contracts instead of depending on implicit assumptions.',
      sectionKey: 'core-architecture-pattern',
      engine,
      uniqueness,
    })}\n\n## Reference Artifact\n\n\`\`\`ts\ninterface PipelineStep {\n  id: string;\n  timeoutMs: number;\n  run: () => Promise<void>;\n}\n\nexport async function runPipeline(steps: PipelineStep[]) {\n  for (const step of steps) {\n    await Promise.race([\n      step.run(),\n      new Promise((_, reject) => setTimeout(() => reject(new Error(\`timeout:\${step.id}\`)), step.timeoutMs)),\n    ]);\n  }\n}\n\`\`\`\n\n${longSection({
      title: 'Trade-offs and Decision Criteria',
      topic,
      category,
      angleA:
        'The primary trade-off is coordination overhead versus long-term stability; mature systems usually benefit from paying that cost upfront.',
      angleB:
        'Decision quality improves when teams evaluate complexity tolerance, reliability targets, compliance exposure, and ownership maturity together.',
      sectionKey: 'trade-offs-and-decision-criteria',
      engine,
      uniqueness,
    })}\n\n${commonTail}`,
  };
}

async function generateDraftWithRetries({
  openai,
  systemPrompt,
  userPrompt,
  topic,
  category,
  defaultType,
  baseTags,
  research,
  writingEngine,
}: {
  openai: OpenAI;
  systemPrompt: string;
  userPrompt: string;
  topic: string;
  category: string;
  defaultType: PostType;
  baseTags: string[];
  research: ResearchResult | null;
  writingEngine: WritingEngineProfile;
}): Promise<GeneratedDraft> {
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const temperature = Math.max(0.2, Math.min(0.8, writingEngine.temperature));
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: `${systemPrompt}\n\n${writingEngine.directives}`,
    },
    {
      role: 'user',
      content: `${userPrompt}

Hard quality rules:
- Do not repeat the same Operator Signals bullets across sections.
- Field Notes must be original in each section and should not be wrapped in quote marks.
- Do not use doubled quotation marks like ""text"".
- Do not reuse opening narrative sentences across H2 sections.
- Vary section structure: mix checklist/table/quote patterns so sections do not read like clones.

Return ONLY strict JSON with this shape:
{
  "title": string,
  "excerpt": string,
  "content_markdown": string,
  "type": "Deep Dive" | "Signal Brief" | "Explainer" | "Opinion" | "Build Guide",
  "tags": string[]
}`,
    },
  ];

  let latestDraft: GeneratedDraft | null = null;
  let latestErrors: string[] = [];

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const completion = await openai.chat.completions.create({
      model,
      temperature,
      messages,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '';
    const draft = extractJson(raw);

    if (!draft) {
      latestErrors = ['Response was not valid JSON.'];
    } else {
      draft.content_markdown = sanitizeContent(draft.content_markdown || '');
      draft.content_markdown = ensureSourcesSection(draft.content_markdown, research);
      latestErrors = validateDraft(draft, defaultType);
      latestDraft = draft;

      if (latestErrors.length === 0) {
        return {
          ...draft,
          type: normalizePostType(draft.type || defaultType),
          tags: normalizeTags([...(draft.tags || []), ...baseTags]),
        };
      }
    }

    messages.push({ role: 'assistant', content: raw });
    messages.push({
      role: 'user',
      content: `Revise and return corrected JSON only. Fix all issues:\n- ${latestErrors.join('\n- ')}`,
    });
  }

  const draft = latestDraft && latestErrors.length === 0 ? latestDraft : fallbackDraft(topic, category, defaultType, writingEngine);
  return {
    ...draft,
    type: normalizePostType(draft.type || defaultType),
    tags: normalizeTags([...(draft.tags || []), ...baseTags]),
    content_markdown: ensureSourcesSection(sanitizeContent(draft.content_markdown), research),
  };
}

async function generateUniqueSlug(title: string) {
  const base = slugify(title).slice(0, 56) || `insight-${Date.now()}`;

  for (let i = 0; i < 4; i += 1) {
    const suffix = Math.floor(100 + Math.random() * 900);
    const candidate = `${base}-${suffix}`;
    const existing = await prisma.post.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }

  return `${base}-${Date.now().toString(36).slice(-6)}`;
}

async function resolveHeroImage({
  topic,
  category,
  includeImage,
}: {
  topic: string;
  category: string;
  includeImage: boolean;
}): Promise<string | null> {
  if (!includeImage) return null;

  let selectedImage = getCategoryFallbackImage(category);

  if (process.env.UNSPLASH_ACCESS_KEY) {
    try {
      const query = encodeURIComponent(`${topic} ${category} technology systems`);
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&orientation=landscape&per_page=5`,
        { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const pickIndex = Math.floor(Math.random() * Math.min(data.results.length, 3));
          selectedImage = data.results[pickIndex].urls.regular || selectedImage;
        }
      }
    } catch (error) {
      console.error('[Pipeline] Image fetch failed, using category fallback image:', error);
    }
  }

  return selectedImage;
}

/**
 * v2 Content Pipeline: Discovery → Research → Write → Publish
 */
export async function runContentPipeline(): Promise<PipelineResult> {
  console.log('[Pipeline] Starting v2 content generation...');

  const pastArticles = await prisma.post.findMany({
    select: { title: true, slug: true, category: true, type: true, image: true, excerpt: true, date: true },
    orderBy: { date: 'desc' },
    take: 180,
  });

  const recentPosts: RecentPostSnapshot[] = pastArticles.map(post => ({
    title: post.title,
    category: normalizeCategory(post.category),
    type: normalizePostType(post.type),
    image: post.image,
    date: post.date,
  }));

  let discoveredTopic: DiscoveredTopic | null = null;
  try {
    discoveredTopic = await discoverTopic();
  } catch (err) {
    console.warn(`[Pipeline] Discovery failed, continuing with cadence planner: ${err}`);
  }

  const categoryPlan = pickCategoryByRotation(recentPosts, discoveredTopic);
  const normalizedCategory = normalizeCategory(categoryPlan.category);
  const topicCandidates = buildTopicCandidates(
    normalizedCategory,
    pastArticles.map(post => post.title),
    discoveredTopic
  );

  let selectedCandidate = topicCandidates[0];
  for (const candidate of topicCandidates) {
    const duplicateTopicMatch = findDuplicateCandidate(
      { topic: candidate.topic, title: candidate.topic, category: normalizedCategory },
      pastArticles,
      0.84
    );

    if (duplicateTopicMatch) {
      console.warn(
        `[Pipeline] Rejected topic candidate "${candidate.topic}" due to historical overlap with "${duplicateTopicMatch.matched.title}" (score ${duplicateTopicMatch.score.toFixed(2)}: ${duplicateTopicMatch.reason}).`
      );
      continue;
    }

    selectedCandidate = candidate;
    break;
  }

  let topic = selectedCandidate.topic;
  let mode: PipelineMode = selectedCandidate.mode;
  let useDiscoveredTopic = selectedCandidate.useDiscovered;
  const attemptedTopicKeys = new Set<string>([slugify(topic)]);

  let research: ResearchResult | null = null;

  const typePlan = pickTypeByCadence({
    topic,
    hasResearch: useDiscoveredTopic && Boolean(discoveredTopic),
    recentPosts,
  });
  const writingEnginePlan = pickWritingEngine(topic, recentPosts);

  const imagePlan = pickImagePolicy(typePlan.type, recentPosts);

  const plan: EditorialPlan = {
    category: normalizedCategory,
    type: typePlan.type,
    includeImage: imagePlan.includeImage,
    writingEngine: writingEnginePlan.engine,
    categoryReason: categoryPlan.reason,
    typeReason: typePlan.reason,
    imageReason: imagePlan.reason,
    writingEngineReason: writingEnginePlan.reason,
  };

  console.log(
    `[Pipeline] Plan -> category=${plan.category}, type=${plan.type}, includeImage=${plan.includeImage}, engine=${plan.writingEngine.id}.`
  );
  console.log(`[Pipeline] ${plan.categoryReason}`);
  console.log(`[Pipeline] ${plan.typeReason}`);
  console.log(`[Pipeline] ${plan.imageReason}`);
  console.log(`[Pipeline] ${plan.writingEngineReason}`);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  let draft: GeneratedDraft = fallbackDraft(topic, normalizedCategory, plan.type, plan.writingEngine);
  let title = '';
  let excerpt = '';
  let content = '';
  let finalTags: string[] = [];
  let duplicateGuardMatch: ReturnType<typeof findDuplicateCandidate> = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const baseTags = generateTags(topic, normalizedCategory);
    let researchPrompt = '';
    research = null;

    if (useDiscoveredTopic && discoveredTopic && slugify(discoveredTopic.topic) === slugify(topic)) {
      try {
        const sourceUrls = discoveredTopic.sources.map(source => source.url);
        research = await researchTopic(topic, sourceUrls);
        if (research.claims.length > 0) {
          researchPrompt = formatResearchForPrompt(research);
          console.log(
            `[Pipeline] Research complete: ${research.claims.length} claims from ${research.primary_sources.length} sources`
          );
        }
      } catch (error) {
        console.warn(`[Pipeline] Research failed for "${topic}", continuing without research:`, error);
      }
    }

    const duplicateContext = pastArticles.find(post => post.title.toLowerCase().includes(topic.toLowerCase().slice(0, 30)));
    let contextPrompt = '';
    if (duplicateContext) {
      contextPrompt = `\nCONTEXT AWARENESS:\nWe previously wrote about "${duplicateContext.title}". Focus on genuinely new developments and avoid repeating old framing.\n`;
    } else {
      const related = pastArticles.filter(post => normalizeCategory(post.category) === normalizedCategory).slice(0, 2);
      if (related.length > 0) {
        contextPrompt = `\nINTERNAL LINKING:\nRelevant existing posts: ${related.map(post => `"${post.title}"`).join(', ')}\n`;
      }
    }

    draft = fallbackDraft(topic, normalizedCategory, plan.type, plan.writingEngine);

    if (openai) {
      try {
        const typeRule = EDITORIAL_CADENCE.typeRules[plan.type];
        const userPrompt = `
${generateTopicPrompt(normalizedCategory, topic)}

CATEGORY GUIDANCE: ${CATEGORY_TONES[normalizedCategory] || ''}
PREFERRED FORMAT TYPE: ${plan.type}
${formatTypeDirectives(plan.type)}
LENGTH REQUIREMENTS:
- Minimum total length: ${typeRule.minWords} words
- Minimum number of H2 sections: ${typeRule.minH2}
- Minimum words per H2 section: ${typeRule.minSectionWords}
TARGET TAGS: ${baseTags.join(', ')}
EDITORIAL CADENCE CONTEXT:
- ${plan.categoryReason}
- ${plan.typeReason}
- ${plan.imageReason}
WRITING ENGINE:
- ${plan.writingEngine.name}: ${plan.writingEngine.description}
- ${plan.writingEngineReason}

${researchPrompt}
${contextPrompt}
${
  discoveredTopic && useDiscoveredTopic && slugify(discoveredTopic.topic) === slugify(topic)
    ? `WHY NOW: ${discoveredTopic.why_now}\nANGLE: ${discoveredTopic.angle}`
    : ''
}
        `.trim();

        draft = await generateDraftWithRetries({
          openai,
          systemPrompt: ARCHITECT_PERSONA(currentDate),
          userPrompt,
          topic,
          category: normalizedCategory,
          defaultType: plan.type,
          baseTags,
          research,
          writingEngine: plan.writingEngine,
        });
      } catch (error) {
        console.error('[Pipeline] LLM generation failed, using fallback:', error);
        draft = fallbackDraft(topic, normalizedCategory, plan.type, plan.writingEngine);
      }
    }

    title = (draft.title || topic).replace(/^['"]|['"]$/g, '').trim().slice(0, 180);
    excerpt = (draft.excerpt || `Technical analysis of ${topic}.`).trim().slice(0, 250);
    content = sanitizeContent(
      draft.content_markdown || fallbackDraft(topic, normalizedCategory, plan.type, plan.writingEngine).content_markdown
    );
    finalTags = normalizeTags([...(draft.tags || []), ...baseTags]);

    const draftValidationErrors = validateDraft(
      { title, excerpt, content_markdown: content, type: plan.type, tags: finalTags },
      plan.type
    );
    if (draftValidationErrors.length > 0) {
      console.warn(
        `[Pipeline] Draft failed depth validation, applying enriched fallback. Issues: ${draftValidationErrors.join(' | ')}`
      );
      const enforced = fallbackDraft(topic, normalizedCategory, plan.type, plan.writingEngine);
      title = (enforced.title || topic).replace(/^['"]|['"]$/g, '').trim().slice(0, 180);
      excerpt = (enforced.excerpt || `Technical analysis of ${topic}.`).trim().slice(0, 250);
      content = sanitizeContent(enforced.content_markdown);
      finalTags = normalizeTags([...(enforced.tags || []), ...baseTags]);
    }

    let finalDepthErrors = validateDraft(
      { title, excerpt, content_markdown: content, type: plan.type, tags: finalTags },
      plan.type
    );
    const expansionUniqueness = {
      usedSignals: new Set<string>(),
      usedFieldNotes: new Set<string>(),
      usedNarrativeSentences: new Set<string>(),
    };
    for (let expandAttempt = 0; expandAttempt < 2 && finalDepthErrors.length > 0; expandAttempt += 1) {
      content = `${content}\n\n${longSection({
        title: `Extended Analysis ${expandAttempt + 1}`,
        topic,
        category: normalizedCategory,
        angleA:
          'This additional section deepens implementation context, clarifies dependency boundaries, and translates architectural intent into operationally testable decisions.',
        angleB:
          'Use this layer to document concrete rollout assumptions, observable success signals, and incident-ready fallback behavior before expanding user-facing exposure.',
        sectionKey: `extended-analysis-${expandAttempt + 1}`,
        engine: plan.writingEngine,
        uniqueness: expansionUniqueness,
      })}`;
      finalDepthErrors = validateDraft(
        { title, excerpt, content_markdown: content, type: plan.type, tags: finalTags },
        plan.type
      );
    }

    if (finalDepthErrors.length > 0) {
      console.warn(
        `[Pipeline] Depth validation still failing after expansion; switching to deterministic recovery draft. Issues: ${finalDepthErrors.join(' | ')}`
      );

      const recovery = fallbackDraft(topic, normalizedCategory, plan.type, plan.writingEngine);
      title = (recovery.title || topic).replace(/^['"]|['"]$/g, '').trim().slice(0, 180);
      excerpt = (recovery.excerpt || `Technical analysis of ${topic}.`).trim().slice(0, 250);
      content = sanitizeContent(recovery.content_markdown);
      finalTags = normalizeTags([...(recovery.tags || []), ...baseTags]);

      const recoveryErrors = validateDraft(
        { title, excerpt, content_markdown: content, type: plan.type, tags: finalTags },
        plan.type
      );

      const blockingRecoveryErrors = recoveryErrors.filter(
        issue => !issue.toLowerCase().includes('long narrative sentences are repeating')
      );

      if (blockingRecoveryErrors.length > 0) {
        throw new Error(`Depth validation failed after fallback expansion: ${blockingRecoveryErrors.join(' | ')}`);
      }

      if (recoveryErrors.length > 0) {
        console.warn(`[Pipeline] Proceeding with non-blocking style warnings: ${recoveryErrors.join(' | ')}`);
      }
    }

    duplicateGuardMatch = findDuplicateCandidate(
      { topic, title, excerpt, category: normalizedCategory },
      pastArticles
    );

    if (!duplicateGuardMatch) {
      break;
    }

    console.warn(
      `[Pipeline] Duplicate guard blocked "${title}" due to overlap with "${duplicateGuardMatch.matched.title}" (score ${duplicateGuardMatch.score.toFixed(2)}: ${duplicateGuardMatch.reason}).`
    );

    const nextCandidate = topicCandidates.find(candidate => {
      const key = slugify(candidate.topic);
      if (!key || attemptedTopicKeys.has(key)) return false;

      const topicDuplicate = findDuplicateCandidate(
        { topic: candidate.topic, title: candidate.topic, category: normalizedCategory },
        pastArticles,
        0.84
      );
      if (topicDuplicate) return false;

      return true;
    });

    if (!nextCandidate) {
      break;
    }

    topic = nextCandidate.topic;
    mode = nextCandidate.mode;
    useDiscoveredTopic = nextCandidate.useDiscovered;
    attemptedTopicKeys.add(slugify(topic));
    duplicateGuardMatch = null;
  }

  if (duplicateGuardMatch) {
    throw new Error(
      `Duplicate guard prevented publishing. Candidate "${title}" overlaps with "${duplicateGuardMatch.matched.title}" (score ${duplicateGuardMatch.score.toFixed(2)}).`
    );
  }

  const finalType = plan.type;

  const slug = await generateUniqueSlug(title || topic);
  const selectedImage = await resolveHeroImage({
    topic,
    category: normalizedCategory,
    includeImage: plan.includeImage,
  });

  const published = await prisma.post.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      category: normalizedCategory,
      type: finalType,
      tags: serializeTags(finalTags),
      author: 'EvoBot',
      image: selectedImage || null,
      published: true,
      date: new Date(),
    },
  });

  console.log(`[Pipeline] Published: "${title}" (${slug})`);
  const usedDiscoveryContext = Boolean(
    discoveredTopic && useDiscoveredTopic && slugify(discoveredTopic.topic) === slugify(topic)
  );

  return {
    post: {
      id: published.id,
      title: published.title,
      slug: published.slug,
      category: published.category,
      type: published.type as PostType,
      tags: finalTags,
    },
    mode,
    discoveredTopic: usedDiscoveryContext ? discoveredTopic || undefined : undefined,
    research: usedDiscoveryContext ? research || undefined : undefined,
  };
}

export { discoverTopic, discoverMultipleTopics } from './discovery';
export { researchTopic } from './research';
