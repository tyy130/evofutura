import cadenceDefaultsRaw from '../config/editorial-cadence.defaults.json';
import cadenceRaw from '../config/editorial-cadence.json';
import { CATEGORY_META, POST_TYPES, type PostType } from './taxonomy';

type RawTypeRule = Partial<{
  minWords: number;
  minH2: number;
  minSectionWords: number;
  requiresArtifact: boolean;
  excerptMin: number;
  excerptMax: number;
}>;

type RawCadenceConfig = Partial<{
  editorialWindow: number;
  categoryCooldownWindow: number;
  typeCooldownWindow: number;
  typeTargetShare: Partial<Record<PostType, number>>;
  imageTargetRate: Partial<Record<PostType, number>>;
  typeRules: Partial<Record<PostType, RawTypeRule>>;
  categoryTargetShare: Record<string, number>;
}>;

export interface TypeRule {
  minWords: number;
  minH2: number;
  minSectionWords: number;
  requiresArtifact: boolean;
  excerptMin: number;
  excerptMax: number;
}

export interface EditorialCadenceConfig {
  editorialWindow: number;
  categoryCooldownWindow: number;
  typeCooldownWindow: number;
  typeTargetShare: Record<PostType, number>;
  imageTargetRate: Record<PostType, number>;
  typeRules: Record<PostType, TypeRule>;
  categoryTargetShare: Record<string, number>;
}

const DEFAULTS = cadenceDefaultsRaw as RawCadenceConfig;
const CURRENT = cadenceRaw as RawCadenceConfig;

function toPositiveInt(value: unknown, fallback: number, min = 1, max = 365) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function toRate(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function normalizeShareMap<T extends string>(
  allowed: readonly T[],
  defaultsMap: Partial<Record<T, number>> | undefined,
  currentMap: Partial<Record<T, number>> | undefined
) {
  const merged = {} as Record<T, number>;

  for (const key of allowed) {
    const fallback = toRate(defaultsMap?.[key], 1 / allowed.length);
    merged[key] = toRate(currentMap?.[key], fallback);
  }

  const total = allowed.reduce((sum, key) => sum + merged[key], 0);
  if (total <= 0.0001) {
    return allowed.reduce((acc, key) => {
      acc[key] = 1 / allowed.length;
      return acc;
    }, {} as Record<T, number>);
  }

  return allowed.reduce((acc, key) => {
    acc[key] = merged[key] / total;
    return acc;
  }, {} as Record<T, number>);
}

function normalizeTypeRules(defaultRules: RawCadenceConfig['typeRules'], currentRules: RawCadenceConfig['typeRules']) {
  const rules = {} as Record<PostType, TypeRule>;

  for (const type of POST_TYPES) {
    const defaults = defaultRules?.[type] || {};
    const current = currentRules?.[type] || {};

    const minWords = toPositiveInt(current.minWords, toPositiveInt(defaults.minWords, 600, 200, 4000), 200, 6000);
    const minH2 = toPositiveInt(current.minH2, toPositiveInt(defaults.minH2, 3, 1, 12), 1, 16);
    const minSectionWords = toPositiveInt(
      current.minSectionWords,
      toPositiveInt(defaults.minSectionWords, 80, 40, 500),
      40,
      500
    );
    const excerptMin = toPositiveInt(
      current.excerptMin,
      toPositiveInt(defaults.excerptMin, 70, 30, 320),
      30,
      320
    );
    const excerptMax = toPositiveInt(
      current.excerptMax,
      toPositiveInt(defaults.excerptMax, 220, 60, 420),
      60,
      420
    );
    const safeExcerptMin = Math.max(30, Math.min(excerptMin, excerptMax - 10));
    const safeExcerptMax = Math.max(safeExcerptMin + 10, excerptMax);

    rules[type] = {
      minWords,
      minH2,
      minSectionWords,
      requiresArtifact:
        typeof current.requiresArtifact === 'boolean'
          ? current.requiresArtifact
          : Boolean(defaults.requiresArtifact),
      excerptMin: safeExcerptMin,
      excerptMax: safeExcerptMax,
    };
  }

  return rules;
}

function normalizeCategoryShareMap(
  defaultsMap: RawCadenceConfig['categoryTargetShare'],
  currentMap: RawCadenceConfig['categoryTargetShare']
) {
  const categories = Object.keys(CATEGORY_META);
  const merged: Record<string, number> = {};

  for (const category of categories) {
    const fallback = toRate(defaultsMap?.[category], 1 / categories.length);
    merged[category] = toRate(currentMap?.[category], fallback);
  }

  const total = categories.reduce((sum, category) => sum + merged[category], 0);
  if (total <= 0.0001) {
    return categories.reduce((acc, category) => {
      acc[category] = 1 / categories.length;
      return acc;
    }, {} as Record<string, number>);
  }

  return categories.reduce((acc, category) => {
    acc[category] = merged[category] / total;
    return acc;
  }, {} as Record<string, number>);
}

function buildEditorialCadenceConfig(): EditorialCadenceConfig {
  return {
    editorialWindow: toPositiveInt(CURRENT.editorialWindow, toPositiveInt(DEFAULTS.editorialWindow, 24, 6, 200), 6, 200),
    categoryCooldownWindow: toPositiveInt(
      CURRENT.categoryCooldownWindow,
      toPositiveInt(DEFAULTS.categoryCooldownWindow, 2, 1, 20),
      1,
      20
    ),
    typeCooldownWindow: toPositiveInt(CURRENT.typeCooldownWindow, toPositiveInt(DEFAULTS.typeCooldownWindow, 2, 1, 20), 1, 20),
    typeTargetShare: normalizeShareMap<PostType>(POST_TYPES, DEFAULTS.typeTargetShare, CURRENT.typeTargetShare),
    imageTargetRate: POST_TYPES.reduce((acc, type) => {
      const fallback = toRate(DEFAULTS.imageTargetRate?.[type], 0.75);
      acc[type] = toRate(CURRENT.imageTargetRate?.[type], fallback);
      return acc;
    }, {} as Record<PostType, number>),
    typeRules: normalizeTypeRules(DEFAULTS.typeRules, CURRENT.typeRules),
    categoryTargetShare: normalizeCategoryShareMap(DEFAULTS.categoryTargetShare, CURRENT.categoryTargetShare),
  };
}

export const EDITORIAL_CADENCE = buildEditorialCadenceConfig();
