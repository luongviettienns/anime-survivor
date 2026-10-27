import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const src = 'src';
const failures = [];
function traverse(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, item.name);
    if (item.isDirectory()) { traverse(full); continue; }
    if (!item.name.endsWith('.ts')) continue;
    const contents = readFileSync(full, 'utf8');
    const path = relative('.', full).replaceAll('\\', '/');
    if (path.startsWith('src/domain/') && /(?:from\s*['"]phaser['"]|import\s*\(['"]phaser['"]\))/.test(contents)) {
      failures.push(`${path}: domain must not depend on Phaser`);
    }
    if (path.startsWith('src/domain/') && /from\s*['"]\.\.\/game\//.test(contents)) {
      failures.push(`${path}: domain must not depend on game infrastructure`);
    }
    if (contents.split('\n').length > 210) failures.push(`${path}: file exceeds 210 physical lines`);
  }
}
traverse(src);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Architecture boundaries and file sizes: OK');
