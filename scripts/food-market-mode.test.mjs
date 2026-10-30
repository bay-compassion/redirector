import assert from 'node:assert/strict';
import test from 'node:test';
import { switchMode } from './food-market-mode.mjs';

const primaryRules = `# Keep this comment
/food-market/flyer https://app.thebaycompassion.org?utm_source=printed_flyer&utm_medium=offline&utm_campaign=food_market 302
/food-market/card https://app.thebaycompassion.org?utm_source=printed_card&utm_medium=offline&utm_campaign=food_market 302
/food-market/placard https://app.thebaycompassion.org?utm_source=printed_placard&utm_medium=offline&utm_campaign=food_market 302
/food-market https://app.thebaycompassion.org 302
/ https://app.thebaycompassion.org 302
/food-market/backup https://qrq.app/q/dfska9L 302
/other-ministry https://example.org/other 307
`;

for (const [mode, queue] of [['backup', 'https://qrq.app/q/dfska9L'], ['backup-old', 'https://qrq.app/107352']]) {
test(`${mode} routes every entry point through the backup link with attribution`, () => {
  const result = switchMode(primaryRules, mode);
  const originalLines = primaryRules.trimEnd().split('\n');
  const resultLines = result.trimEnd().split('\n');
  assert.equal(resultLines.length, originalLines.length);
  assert.equal(resultLines[0], originalLines[0]);
  assert.equal(resultLines.at(-2), `/food-market/backup ${queue} 302`);
  assert.equal(resultLines.at(-1), originalLines.at(-1));
  for (let i = 1; i <= 5; i++) {
    const [source, destination, status] = resultLines[i].split(' ');
    const [originalSource, originalDestination] = originalLines[i].split(' ');
    const target = new URL(destination, 'https://go.thebaycompassion.org');
    assert.equal(source, originalSource);
    assert.equal(status, '302');
    assert.equal(destination.split('?')[0], '/food-market/backup');
    assert.equal(target.search, new URL(originalDestination).search);
  }
});
}

test('primary restores every main app destination from either backup queue', () => {
  assert.equal(switchMode(switchMode(primaryRules, 'backup'), 'primary'), primaryRules);
  assert.equal(switchMode(switchMode(primaryRules, 'backup-old'), 'primary'), primaryRules);
});

test('holding sends all entry points to the holding page with their attribution', () => {
  const result = switchMode(primaryRules, 'holding').trimEnd().split('\n');
  const original = primaryRules.trimEnd().split('\n');
  for (let i = 1; i <= 5; i++) {
    const [source, destination, status] = result[i].split(' ');
    const [originalSource, originalDestination] = original[i].split(' ');
    assert.equal(source, originalSource);
    assert.equal(status, '302');
    assert.equal(destination, 'https://app.thebaycompassion.org/holding' + new URL(originalDestination).search);
  }
  assert.deepEqual(result.slice(6), original.slice(6));
  assert.equal(result[0], original[0]);
});

test('all four modes can transition directly to any other mode', () => {
  for (const from of ['primary', 'holding', 'backup', 'backup-old']) {
    for (const to of ['primary', 'holding', 'backup', 'backup-old']) {
      assert.equal(switchMode(switchMode(primaryRules, from), to), switchMode(primaryRules, to));
    }
  }
});

test('primary moves the legacy flyer holding destination to the main app', () => {
  const legacyRules = primaryRules.replace(
    'https://app.thebaycompassion.org?utm_source=printed_flyer',
    'https://app.thebaycompassion.org/holding?utm_source=printed_flyer',
  );
  assert.equal(switchMode(legacyRules, 'primary'), primaryRules);
});

test('repeated mode selections are safe', () => {
  assert.equal(switchMode(primaryRules, 'primary'), primaryRules);
  for (const mode of ['backup', 'backup-old']) {
    const backupRules = switchMode(primaryRules, mode);
    assert.equal(switchMode(backupRules, mode), backupRules);
  }
  assert.equal(switchMode(switchMode(primaryRules, 'backup-old'), 'backup'), switchMode(primaryRules, 'backup'));
  assert.equal(switchMode(switchMode(primaryRules, 'backup'), 'backup-old'), switchMode(primaryRules, 'backup-old'));
});

test('rejects unknown modes and missing or duplicate managed paths', () => {
  assert.throws(() => switchMode(primaryRules, 'typo'), /Usage/);
  assert.throws(() => switchMode(primaryRules.replace('/food-market/card ', '/missing '), 'backup'), /Missing managed redirect/);
  assert.throws(() => switchMode(primaryRules.replace('/food-market/backup ', '/missing '), 'backup-old'), /Missing managed redirect/);
  assert.throws(() => switchMode(`${primaryRules}/food-market https://example.org 302\n`, 'backup'), /Duplicate managed redirect/);
});
