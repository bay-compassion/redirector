import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { validate } from './validate.mjs';

function fixture(t, rules) {
  const root = mkdtempSync(join(tmpdir(), 'redirector-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'public'));
  writeFileSync(join(root, 'netlify.toml'), '[build]\npublish = "public"\n');
  writeFileSync(join(root, 'public/404.html'), 'Not found');
  writeFileSync(join(root, 'public/_redirects'), rules);
  return root;
}

test('accepts root and ministry links, comments, and URL query strings', (t) => {
  const root = fixture(t, '# Links\n/ https://example.com 302\n/food-market https://example.com/app?x=1#section 307\n');
  assert.equal(validate(root), 2);
});

test('accepts internal redirect chains with query strings and trailing slashes', (t) => {
  const root = fixture(t, '/ /food-market?utm_source=test 302\n/food-market /food-market/backup/ 302\n/food-market/backup https://qrq.app/107352 302\n');
  assert.equal(validate(root), 3);
});

for (const [name, rules, message] of [
  ['duplicate paths', '/x https://example.com 302\n/x/ https://example.org 302', /duplicate/],
  ['insecure destinations', '/x http://example.com 302', /HTTPS/],
  ['invalid URL', '/x https://example.com:invalid 302', /HTTPS/],
  ['credentials', '/x https://user:password@example.com 302', /credentials/],
  ['rewrite status', '/x https://example.com 200', /status/],
  ['wildcard paths', '/* https://example.com 302', /literal/],
  ['redirect loops', '/x https://go.thebaycompassion.org/x 302', /loops/],
  ['internal self loops', '/x /x/?utm_source=test 302', /loops/],
  ['internal chain loops', '/x /y 302\n/y /z 302\n/z /x 302', /loops/],
  ['missing internal targets', '/x /missing 302', /missing internal/],
  ['protocol-relative destinations', '/x //example.com 302', /literal root-relative/],
  ['nonliteral internal destinations', '/x /food-market/../x 302', /literal root-relative/],
  ['empty rules', '# no rules', /active rule/],
  ['missing status', '/x https://example.com', /expected source/],
]) {
  test(`rejects ${name}`, (t) => {
    assert.throws(() => validate(fixture(t, rules)), message);
  });
}

test('rejects a wrong publish directory or additional redirect configuration', (t) => {
  const root = fixture(t, '/ https://example.com 302');
  for (const config of [
    '[build]\npublish = "other"',
    '[build]\npublish = "public"\n[[redirects]]\nfrom = "/x"',
  ]) {
    writeFileSync(join(root, 'netlify.toml'), config);
    assert.throws(() => validate(root), /netlify.toml/);
  }
});

test('rejects a missing fallback page', (t) => {
  const root = fixture(t, '/ https://example.com 302');
  rmSync(join(root, 'public/404.html'));
  assert.throws(() => validate(root), /404.html/);
});
