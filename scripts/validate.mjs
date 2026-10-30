import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function validate(root, rules = readFileSync(join(root, 'public/_redirects'), 'utf8')) {
  // Accept only this project's minimal config rather than implementing TOML.
  const config = readFileSync(join(root, 'netlify.toml'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  if (
    config.length !== 2 ||
    config[0] !== '[build]' ||
    !/^publish\s*=\s*(?:"public"|'public')\s*(?:#.*)?$/.test(config[1])
  ) {
    throw new Error('netlify.toml must contain only [build] and publish = "public"; expand validation before adding settings');
  }
  if (!statSync(join(root, 'public/404.html')).isFile()) {
    throw new Error('Missing public/404.html fallback page');
  }

  const sources = new Set();
  const internalTargets = new Map();
  const lines = rules.split(/\r?\n/);
  for (const [index, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const label = `public/_redirects:${index + 1}`;
    const fields = line.split(/\s+/);
    if (fields.length !== 3) {
      throw new Error(`${label}: expected source, destination, and status`);
    }
    const [source, destination, status] = fields;
    if (!/^\/(?:[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/?)?$/.test(source)) {
      throw new Error(`${label}: use a literal path such as /food-market`);
    }
    const normalized = source.replace(/\/$/, '') || '/';
    if (sources.has(normalized)) {
      throw new Error(`${label}: duplicate source path ${source}`);
    }
    sources.add(normalized);

    if (!['301', '302', '307', '308'].includes(status)) {
      throw new Error(`${label}: expected status 301, 302, 307, or 308`);
    }
    if (destination.startsWith('/')) {
      if (!/^\/(?:[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/?)?(?:\?[^#\s\\]*)?$/.test(destination)) {
        throw new Error(`${label}: internal destination must be a literal root-relative path`);
      }
      const pathname = destination.split('?')[0];
      internalTargets.set(normalized, pathname.replace(/\/$/, '') || '/');
      continue;
    }
    let target;
    try {
      target = new URL(destination);
    } catch {
      throw new Error(`${label}: destination must be a full HTTPS URL`);
    }
    if (!destination.startsWith('https://') || !target.hostname || target.username || target.password) {
      throw new Error(`${label}: destination must be a full HTTPS URL without credentials`);
    }
    if (target.hostname === 'go.thebaycompassion.org') {
      throw new Error(`${label}: use an external destination to avoid redirect loops`);
    }
  }
  if (!sources.size) {
    throw new Error('public/_redirects must contain at least one active rule');
  }
  for (const [source, target] of internalTargets) {
    if (!sources.has(target)) {
      throw new Error(`${source}: missing internal redirect target ${target}`);
    }
    const visited = new Set();
    let current = source;
    while (internalTargets.has(current)) {
      if (visited.has(current)) throw new Error(`${source}: internal redirect loops through ${current}`);
      visited.add(current);
      current = internalTargets.get(current);
    }
  }
  return sources.size;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const count = validate(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
    console.log(`Validated ${count} redirect rules and Netlify publish configuration.`);
  } catch (error) {
    console.error(`Validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
