#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { stdin, stdout } = require('process');
const readline = require('readline/promises');

const ROOT = path.join(__dirname, '..');
const DEFAULTS_PATH = path.join(ROOT, 'config', 'editorial-cadence.defaults.json');
const CONFIG_PATH = path.join(ROOT, 'config', 'editorial-cadence.json');

const TYPES = ['Deep Dive', 'Signal Brief', 'Explainer', 'Opinion', 'Build Guide'];
const CATEGORIES = ['AI', 'ML', 'Cloud', 'DevOps', 'WebDev', 'Security', 'Data', 'Mobile'];

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clampRate(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function parseIntInput(raw, min, max) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, parsed));
}

function parseRatioInput(raw) {
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return null;
  const ratio = parsed > 1 ? parsed / 100 : parsed;
  return clampRate(ratio);
}

function normalizeShares(keys, map) {
  const sum = keys.reduce((acc, key) => acc + clampRate(map[key] || 0), 0);
  if (sum <= 0.0001) {
    const even = 1 / keys.length;
    for (const key of keys) map[key] = even;
    return;
  }
  for (const key of keys) map[key] = clampRate(map[key] || 0) / sum;
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

async function ask(rl, label) {
  return (await rl.question(label)).trim();
}

async function editWindows(rl, config) {
  console.log('\nEdit windows (press Enter to keep current)');
  const fields = [
    ['editorialWindow', 6, 200],
    ['categoryCooldownWindow', 1, 20],
    ['typeCooldownWindow', 1, 20],
  ];

  for (const [key, min, max] of fields) {
    const raw = await ask(rl, `${key} [${config[key]}]: `);
    if (!raw) continue;
    const parsed = parseIntInput(raw, min, max);
    if (parsed === null) {
      console.log(`Invalid number for ${key}, skipped.`);
      continue;
    }
    config[key] = parsed;
  }
}

async function editShareMap(rl, map, keys, title) {
  console.log(`\n${title} (use ratio 0-1 or percentage 0-100; Enter keeps current)`);
  for (const key of keys) {
    const raw = await ask(rl, `${key} [${percent(map[key])}]: `);
    if (!raw) continue;
    const parsed = parseRatioInput(raw);
    if (parsed === null) {
      console.log(`Invalid value for ${key}, skipped.`);
      continue;
    }
    map[key] = parsed;
  }
  normalizeShares(keys, map);
}

async function editImageRates(rl, config) {
  console.log('\nImage inclusion rates by type (0-1 or 0-100; Enter keeps current)');
  for (const type of TYPES) {
    const raw = await ask(rl, `${type} [${percent(config.imageTargetRate[type])}]: `);
    if (!raw) continue;
    const parsed = parseRatioInput(raw);
    if (parsed === null) {
      console.log(`Invalid value for ${type}, skipped.`);
      continue;
    }
    config.imageTargetRate[type] = parsed;
  }
}

async function pickType(rl) {
  console.log('\nChoose type:');
  TYPES.forEach((type, idx) => console.log(`${idx + 1}. ${type}`));
  const raw = await ask(rl, 'Type number: ');
  const idx = Number.parseInt(raw, 10);
  if (!Number.isFinite(idx) || idx < 1 || idx > TYPES.length) return null;
  return TYPES[idx - 1];
}

async function editTypeRules(rl, config) {
  const type = await pickType(rl);
  if (!type) {
    console.log('Invalid type selection.');
    return;
  }

  const rule = config.typeRules[type];
  console.log(`\nEditing rules for ${type} (Enter keeps current)`);

  const minWords = await ask(rl, `minWords [${rule.minWords}]: `);
  if (minWords) {
    const parsed = parseIntInput(minWords, 200, 6000);
    if (parsed !== null) rule.minWords = parsed;
  }

  const minH2 = await ask(rl, `minH2 [${rule.minH2}]: `);
  if (minH2) {
    const parsed = parseIntInput(minH2, 1, 16);
    if (parsed !== null) rule.minH2 = parsed;
  }

  const minSectionWords = await ask(rl, `minSectionWords [${rule.minSectionWords}]: `);
  if (minSectionWords) {
    const parsed = parseIntInput(minSectionWords, 40, 500);
    if (parsed !== null) rule.minSectionWords = parsed;
  }

  const requiresArtifact = await ask(
    rl,
    `requiresArtifact [${rule.requiresArtifact ? 'y' : 'n'}] (y/n): `
  );
  if (requiresArtifact) {
    if (/^(y|yes|true|1)$/i.test(requiresArtifact)) rule.requiresArtifact = true;
    if (/^(n|no|false|0)$/i.test(requiresArtifact)) rule.requiresArtifact = false;
  }

  const excerptMin = await ask(rl, `excerptMin [${rule.excerptMin}]: `);
  if (excerptMin) {
    const parsed = parseIntInput(excerptMin, 30, 320);
    if (parsed !== null) rule.excerptMin = parsed;
  }

  const excerptMax = await ask(rl, `excerptMax [${rule.excerptMax}]: `);
  if (excerptMax) {
    const parsed = parseIntInput(excerptMax, 60, 420);
    if (parsed !== null) rule.excerptMax = parsed;
  }

  if (rule.excerptMax < rule.excerptMin + 10) {
    rule.excerptMax = rule.excerptMin + 10;
  }
}

function printMenu() {
  console.log('\nEditorial Cadence Control Panel');
  console.log('1. Edit windows');
  console.log('2. Edit type mix');
  console.log('3. Edit category rotation');
  console.log('4. Edit image inclusion rates');
  console.log('5. Edit type rules');
  console.log('6. Reset to defaults');
  console.log('7. Save and exit');
  console.log('8. Exit without saving');
}

async function main() {
  const defaults = loadJson(DEFAULTS_PATH);
  const current = loadJson(CONFIG_PATH);
  const config = clone({ ...defaults, ...current });

  config.typeTargetShare = { ...defaults.typeTargetShare, ...(current.typeTargetShare || {}) };
  config.imageTargetRate = { ...defaults.imageTargetRate, ...(current.imageTargetRate || {}) };
  config.typeRules = clone({ ...defaults.typeRules, ...(current.typeRules || {}) });
  config.categoryTargetShare = {
    ...defaults.categoryTargetShare,
    ...(current.categoryTargetShare || {}),
  };

  normalizeShares(TYPES, config.typeTargetShare);
  normalizeShares(CATEGORIES, config.categoryTargetShare);

  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    while (true) {
      printMenu();
      const choice = await ask(rl, 'Choose 1-8: ');

      if (choice === '1') await editWindows(rl, config);
      else if (choice === '2') await editShareMap(rl, config.typeTargetShare, TYPES, 'Edit type target shares');
      else if (choice === '3') {
        await editShareMap(rl, config.categoryTargetShare, CATEGORIES, 'Edit category target shares');
      } else if (choice === '4') await editImageRates(rl, config);
      else if (choice === '5') await editTypeRules(rl, config);
      else if (choice === '6') {
        Object.assign(config, clone(defaults));
        normalizeShares(TYPES, config.typeTargetShare);
        normalizeShares(CATEGORIES, config.categoryTargetShare);
        console.log('Reset to defaults.');
      } else if (choice === '7') {
        normalizeShares(TYPES, config.typeTargetShare);
        normalizeShares(CATEGORIES, config.categoryTargetShare);
        writeJson(CONFIG_PATH, config);
        console.log(`Saved: ${CONFIG_PATH}`);
        break;
      } else if (choice === '8') {
        console.log('Exiting without saving.');
        break;
      } else {
        console.log('Invalid option.');
      }
    }
  } finally {
    rl.close();
  }
}

main().catch(error => {
  console.error('Failed to open cadence control panel:', error);
  process.exit(1);
});
