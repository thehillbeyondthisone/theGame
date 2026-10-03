// Checks the production build against the download budgets in docs/tuning.md.
// Run after `npm run build`. Exits non-zero when over budget.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const BUDGET_TOTAL = 2 * 1024 * 1024; // first playable download, transferred
const BUDGET_JS = 400 * 1024; // gzipped JavaScript

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (!name.endsWith('.map') && name !== '_headers') files.push(path);
  }
})(dist);

let total = 0;
let js = 0;
const rows = files.map((path) => {
  const raw = readFileSync(path);
  const gz = gzipSync(raw, { level: 9 }).length;
  total += gz;
  if (extname(path) === '.js') js += gz;
  return { file: relative(dist, path).replaceAll('\\', '/'), raw: raw.length, gz };
});

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
for (const r of rows.sort((a, b) => b.gz - a.gz)) {
  console.log(`${kb(r.gz).padStart(10)} gz  ${kb(r.raw).padStart(10)} raw  ${r.file}`);
}
console.log(`\nJavaScript: ${kb(js)} gz of ${kb(BUDGET_JS)} budget`);
console.log(`Everything: ${kb(total)} gz of ${kb(BUDGET_TOTAL)} budget`);
if (js > BUDGET_JS || total > BUDGET_TOTAL) {
  console.error('Over budget.');
  process.exit(1);
}
