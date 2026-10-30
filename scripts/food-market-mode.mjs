import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validate } from './validate.mjs';

const backup = 'https://qrq.app/q/dfska9L';
// Keep the primary destinations here so recovery works after any number of switches.
const primary = new Map([
  ['/food-market/flyer', 'https://app.thebaycompassion.org/holding?utm_source=printed_flyer&utm_medium=offline&utm_campaign=food_market'],
  ['/food-market/card', 'https://app.thebaycompassion.org?utm_source=printed_card&utm_medium=offline&utm_campaign=food_market'],
  ['/food-market/placard', 'https://app.thebaycompassion.org?utm_source=printed_placard&utm_medium=offline&utm_campaign=food_market'],
  ['/food-market', 'https://app.thebaycompassion.org'],
  ['/', 'https://app.thebaycompassion.org'],
]);

export function switchMode(rules, mode) {
  if (!['primary', 'backup'].includes(mode)) {
    throw new Error('Usage: node scripts/food-market-mode.mjs <primary|backup>');
  }
  const found = new Set();
  const result = rules.split(/\r?\n/).map((line) => {
    const source = line.trim().split(/\s+/)[0];
    if (!primary.has(source)) return line;
    if (found.has(source)) throw new Error(`Duplicate managed redirect: ${source}`);
    found.add(source);
    let destination = primary.get(source);
    if (mode === 'backup') {
      const target = new URL(backup);
      target.search = new URL(destination).search;
      destination = target.href;
    }
    return `${source} ${destination} 302`;
  }).join('\n');
  for (const source of primary.keys()) {
    if (!found.has(source)) throw new Error(`Missing managed redirect: ${source}`);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const file = join(root, 'public/_redirects');
    validate(root);
    if (process.argv.length !== 3) throw new Error('Provide exactly one mode: primary or backup');
    const rules = switchMode(readFileSync(file, 'utf8'), process.argv[2]);
    validate(root, rules);
    writeFileSync(file, rules);
    console.log(`Food-market redirects set to ${process.argv[2]}. Deploy public/ to activate.`);
  } catch (error) {
    console.error(`Switch failed: ${error.message}`);
    process.exitCode = 1;
  }
}
