#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULTS_PATH = path.join(ROOT, 'config', 'editorial-cadence.defaults.json');
const CONFIG_PATH = path.join(ROOT, 'config', 'editorial-cadence.json');

const TYPES = ['Deep Dive', 'Signal Brief', 'Explainer', 'Opinion', 'Build Guide'];
const CATEGORIES = ['AI', 'ML', 'Cloud', 'DevOps', 'WebDev', 'Security', 'Data', 'Mobile'];

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function clampRate(value, fallback) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeShares(keys, values, fallbackValues) {
  const merged = {};
  for (const key of keys) {
    const fallback = clampRate(fallbackValues[key], 1 / keys.length);
    merged[key] = clampRate(values[key], fallback);
  }

  const sum = keys.reduce((acc, key) => acc + merged[key], 0);
  if (sum <= 0.0001) {
    for (const key of keys) merged[key] = 1 / keys.length;
    return merged;
  }

  for (const key of keys) merged[key] = merged[key] / sum;
  return merged;
}

function pad(value, length) {
  return String(value).padEnd(length, ' ');
}

function printSection(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function main() {
  const defaults = loadJson(DEFAULTS_PATH);
  const current = loadJson(CONFIG_PATH);

  const typeShares = normalizeShares(TYPES, current.typeTargetShare || {}, defaults.typeTargetShare || {});
  const categoryShares = normalizeShares(CATEGORIES, current.categoryTargetShare || {}, defaults.categoryTargetShare || {});

  console.log('EvoFutura Editorial Cadence');
  console.log(`Config: ${CONFIG_PATH}`);

  printSection('Windows');
  console.log(`editorialWindow        ${current.editorialWindow ?? defaults.editorialWindow}`);
  console.log(`categoryCooldownWindow ${current.categoryCooldownWindow ?? defaults.categoryCooldownWindow}`);
  console.log(`typeCooldownWindow     ${current.typeCooldownWindow ?? defaults.typeCooldownWindow}`);

  printSection('Type Mix (Normalized)');
  for (const type of TYPES) {
    const imageRate = clampRate((current.imageTargetRate || {})[type], clampRate((defaults.imageTargetRate || {})[type], 0.75));
    console.log(`${pad(type, 14)} ${pad(formatPercent(typeShares[type]), 8)} image=${formatPercent(imageRate)}`);
  }

  printSection('Category Rotation (Normalized)');
  for (const category of CATEGORIES) {
    console.log(`${pad(category, 8)} ${formatPercent(categoryShares[category])}`);
  }

  printSection('Type Rules');
  for (const type of TYPES) {
    const fallbackRule = (defaults.typeRules || {})[type] || {};
    const rule = { ...fallbackRule, ...((current.typeRules || {})[type] || {}) };
    console.log(
      `${type}: minWords=${rule.minWords}, minH2=${rule.minH2}, minSectionWords=${rule.minSectionWords}, requiresArtifact=${Boolean(rule.requiresArtifact)}, excerpt=${rule.excerptMin}-${rule.excerptMax}`
    );
  }
}

main();
