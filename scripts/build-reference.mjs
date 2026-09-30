// Builds data/reference.json: every base skill and its ten single-element versions, read from the
// game repo's content, so each fusion skill can be shown beside its parents' versions.
// Usage: node scripts/build-reference.mjs [path to the Custom Arena repo]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const game = path.resolve(process.argv[2] ?? path.join(root, '..', 'Custom Arena'));
const data = path.join(game, 'packages', 'content', 'data');
const YAML = createRequire(path.join(game, 'packages', 'content', 'package.json'))('yaml');

const ELEMENTS = ['Fire', 'Ice', 'Water', 'Lightning', 'Wind', 'Poison', 'Earth', 'Holy', 'Unholy', 'Shadow'];
const flat = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const entry = (s) => ({ name: s.name, cost: s.cost ?? '', cd: s.cooldown ?? 0, description: flat(s.description) });

const baseDoc = YAML.parse(fs.readFileSync(path.join(data, 'base', 'skills.yaml'), 'utf8'));
const base = {};
for (const s of Object.values(baseDoc)) base[s.archetype] = entry(s);

const byElement = {};
for (const el of ELEMENTS) {
  const lower = el.toLowerCase();
  const doc = YAML.parse(fs.readFileSync(path.join(data, lower, `skills.${lower}.yaml`), 'utf8'));
  byElement[el] = {};
  for (const [id, s] of Object.entries(doc)) {
    const [archetypeId, suffix] = id.split('.');
    if (suffix !== lower) continue; // minion skills live in the same files
    const archetype = baseDoc[archetypeId]?.archetype;
    if (archetype) byElement[el][archetype] = entry(s);
  }
  const n = Object.keys(byElement[el]).length;
  if (n !== 30) throw new Error(`${el}: ${n} skills`);
}

fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data', 'reference.json'), JSON.stringify({ base, byElement }));
console.log(`data/reference.json: ${Object.keys(base).length} base skills x ${ELEMENTS.length} elements`);
