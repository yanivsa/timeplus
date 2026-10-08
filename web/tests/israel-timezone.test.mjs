import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const srcRoot = path.join(process.cwd(), 'web', 'src');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [full] : [];
  });
}

test('all Hebrew UI date/time formatting is pinned to Asia/Jerusalem', () => {
  const pattern = /\.toLocale(?:String|TimeString|DateString)\(\s*['"]he-IL['"](?:\s*,\s*\{([\s\S]*?)\})?\s*\)/g;
  let calls = 0;
  for (const file of walk(srcRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(pattern)) {
      calls += 1;
      const options = match[1] || '';
      assert.match(options, /timeZone\s*:\s*['"]Asia\/Jerusalem['"]/, `${path.relative(process.cwd(), file)} contains an unpinned he-IL date/time formatter: ${match[0]}`);
    }
  }
  assert.ok(calls > 0, 'expected at least one he-IL date/time formatter');
});
