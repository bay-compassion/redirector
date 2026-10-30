import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validate } from './validate.mjs';

const backupPath = '/food-market/backup';
const backupTargets = {
  backup: 'https://qrq.app/q/dfska9L',
  'backup-old': 'https://qrq.app/107352',
};
// Keep the main app destinations here so cutovers work after any number of switches.
const primary = new Map([
  ['/food-market/flyer', 'https://app.thebaycompassion.org?utm_source=printed_flyer&utm_medium=offline&utm_campaign=food_market'],
  ['/food-market/card', 'https://app.thebaycompassion.org?utm_source=printed_card&utm_medium=offline&utm_campaign=food_market'],
  ['/food-market/placard', 'https://app.thebaycompassion.org?utm_source=printed_placard&utm_medium=offline&utm_campaign=food_market'],
  ['/food-market', 'https://app.thebaycompassion.org'],
  ['/', 'https://app.thebaycompassion.org'],
]);

export function switchMode(rules, mode) {
  if (!['primary', 'holding', ...Object.keys(backupTargets)].includes(mode)) {
    throw new Error('Usage: node scripts/food-market-mode.mjs <primary|holding|backup|backup-old>');
  }
  const found = new Set();
  const result = rules.split(/\r?\n/).map((line) => {
    const source = line.trim().split(/\s+/)[0];
    if (!primary.has(source) && source !== backupPath) return line;
    if (found.has(source)) throw new Error(`Duplicate managed redirect: ${source}`);
    found.add(source);
    if (source === backupPath) {
      return `${source} ${backupTargets[mode] ?? backupTargets.backup} 302`;
    }
    let destination = primary.get(source);
    if (mode === 'holding') {
      destination = 'https://app.thebaycompassion.org/holding' + new URL(destination).search;
    } else if (mode !== 'primary') {
      destination = backupPath + new URL(destination).search;
    }
    return `${source} ${destination} 302`;
  }).join('\n');
  for (const source of [...primary.keys(), backupPath]) {
    if (!found.has(source)) throw new Error(`Missing managed redirect: ${source}`);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const file = join(root, 'public/_redirects');
    validate(root);
    if (process.argv.length !== 3) throw new Error('Provide exactly one mode: primary, holding, backup, or backup-old');
    const rules = switchMode(readFileSync(file, 'utf8'), process.argv[2]);
    validate(root, rules);
    writeFileSync(file, rules);
    console.log(`Food-market redirects set to ${process.argv[2]}. Deploy public/ to activate.`);
  } catch (error) {
    console.error(`Switch failed: ${error.message}`);
    process.exitCode = 1;
  }
}
