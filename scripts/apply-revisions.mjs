// Applies a revision pass to the kit tables in content/*.md and logs every change in content/revisions.json,
// which the site reads to show each revised skill's earlier version.
//
// Usage: node scripts/apply-revisions.mjs <pass.json> [changes.json ...] [--check]
//   pass.json     { "id", "date", "title", "summary" } for the pass
//   changes.json  { "revised": [{ kit, base, skill, cost, cd, hook, effect, problem, why }], "kept": [...] }
//   --check       validate only; don't write anything
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'content');
const logPath = path.join(contentDir, 'revisions.json');
const args = process.argv.slice(2);
const check = args.includes('--check');
const [passFile, ...changeFiles] = args.filter((a) => a !== '--check');
if (!passFile || !changeFiles.length) {
  console.error('Usage: node scripts/apply-revisions.mjs <pass.json> <changes.json ...> [--check]');
  process.exit(1);
}

const pass = JSON.parse(fs.readFileSync(passFile, 'utf8'));
const PROBLEMS = ['mashup', 'upgrade', 'keyword-swap', 'near-copy', 'bridge', 'formula', 'unique', 'other'];
// Hooks every kit may use besides its own keywords.
const SHARED_HOOKS = ['Texture', 'Unique'];
const errors = [];
const warnings = [];

// Every kit row, where it lives, and every skill name already in use.
const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.md') && f !== 'overview.md');
// Checkouts on Windows may use CRLF; parse and write LF (git stores LF either way).
const text = new Map(files.map((f) => [f, fs.readFileSync(path.join(contentDir, f), 'utf8').replace(/\r\n/g, '\n')]));
const kits = new Map();
for (const [file, md] of text) {
  let kit = null;
  md.split('\n').forEach((line, i) => {
    const h = line.match(/^## (.+?) — (\w+) \+ (\w+)\s*$/);
    if (h) kit = { name: h[1], slug: slugify(h[1]), file, rows: new Map(), hooks: new Set() };
    if (h) kits.set(kit.name, kit);
    const cells = line.startsWith('| ') && kit ? line.slice(2, -2).split(' | ') : null;
    if (cells?.length === 5 && cells[0] !== 'Base' && !cells[0].startsWith('---')) {
      const [base, skill, costCd, hook, effect] = cells;
      const [cost, cd] = costCd.split(' · ');
      kit.rows.set(base, { line: i, base, skill, cost, cd, hook, effect });
      kit.hooks.add(hook);
    }
  });
}
const nameOwners = new Map();
for (const k of kits.values()) for (const r of k.rows.values()) nameOwners.set(r.skill.toLowerCase(), `${k.name} ${r.base}`);
const ref = JSON.parse(fs.readFileSync(path.join(root, 'data', 'reference.json'), 'utf8'));
for (const [el, skills] of Object.entries(ref.byElement))
  for (const [base, s] of Object.entries(skills)) nameOwners.set(s.name.toLowerCase(), `${el}'s ${base}`);
for (const base of Object.keys(ref.base)) nameOwners.set(base.toLowerCase(), 'a base skill');

// Gather the changes.
const revised = [];
const verdicts = new Map();
for (const f of changeFiles) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const r of j.revised ?? []) revised.push({ ...r, from: path.basename(f) });
  for (const r of [...(j.revised ?? []), ...(j.kept ?? [])]) {
    const key = `${r.kit}/${r.base}`;
    if (verdicts.has(key)) errors.push(`${key}: judged twice (${verdicts.get(key)} and ${path.basename(f)})`);
    verdicts.set(key, path.basename(f));
  }
}
const kitsJudged = new Set([...verdicts.keys()].map((k) => k.split('/')[0]));
for (const name of kitsJudged) {
  const k = kits.get(name);
  if (!k) continue;
  const missing = [...k.rows.keys()].filter((b) => !verdicts.has(`${name}/${b}`));
  if (missing.length) warnings.push(`${name}: no verdict for ${missing.join(', ')}`);
}

const newNames = new Map();
for (const r of revised) {
  const where = `${r.kit} ${r.base} (${r.from})`;
  const k = kits.get(r.kit);
  if (!k) {
    errors.push(`${where}: no such kit`);
    continue;
  }
  const row = k.rows.get(r.base);
  if (!row) {
    errors.push(`${where}: no such base skill`);
    continue;
  }
  for (const f of ['skill', 'cost', 'cd', 'hook', 'effect', 'problem', 'why'])
    if (typeof r[f] !== 'string' || !r[f].trim()) errors.push(`${where}: missing ${f}`);
  if (!/^(nc|[SAIWr]+)$/.test(r.cost ?? '')) errors.push(`${where}: odd cost "${r.cost}"`);
  if (!/^\d+$/.test(r.cd ?? '')) errors.push(`${where}: odd cooldown "${r.cd}"`);
  if (!PROBLEMS.includes(r.problem)) errors.push(`${where}: problem "${r.problem}" isn't one of ${PROBLEMS.join(', ')}`);
  if (/[|\n]/.test(`${r.skill}${r.effect}`)) errors.push(`${where}: a pipe or line break in the text`);
  if (!/[.!)]$/.test(r.effect?.trim() ?? '')) warnings.push(`${where}: effect doesn't end with a period`);
  if (!SHARED_HOOKS.includes(r.hook) && !k.hooks.has(r.hook)) warnings.push(`${where}: new hook "${r.hook}" (kit has ${[...k.hooks].join(', ')})`);
  const lower = r.skill?.toLowerCase();
  if (lower && lower !== row.skill.toLowerCase()) {
    const owner = nameOwners.get(lower);
    if (owner && owner !== `${r.kit} ${r.base}`) errors.push(`${where}: name "${r.skill}" is already ${owner}`);
    if (newNames.has(lower)) errors.push(`${where}: name "${r.skill}" is also new for ${newNames.get(lower)}`);
    newNames.set(lower, `${r.kit} ${r.base}`);
  }
}
for (const w of warnings) console.warn(`warn: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
const byProblem = {};
for (const r of revised) byProblem[r.problem] = (byProblem[r.problem] ?? 0) + 1;
console.log(`${revised.length} revisions across ${new Set(revised.map((r) => r.kit)).size} kits ${JSON.stringify(byProblem)}; ${verdicts.size} skills judged`);
if (errors.length) process.exit(1);
if (check) process.exit(0);

// Apply to content, and log before and after.
const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : { passes: [] };
let entry = log.passes.find((p) => p.id === pass.id);
if (!entry) log.passes.push((entry = { ...pass, changes: [] }));
Object.assign(entry, pass);
const lines = new Map([...text].map(([f, md]) => [f, md.split('\n')]));
let applied = 0;
for (const r of revised) {
  const k = kits.get(r.kit);
  const row = k.rows.get(r.base);
  const after = { skill: r.skill, cost: r.cost, cd: Number(r.cd), hook: r.hook, effect: r.effect.trim() };
  const current = { skill: row.skill, cost: row.cost, cd: Number(row.cd), hook: row.hook, effect: row.effect };
  const logged = entry.changes.find((c) => c.kit === k.slug && c.base === r.base);
  if (JSON.stringify(after) === JSON.stringify(current) && !logged) continue;
  lines.get(k.file)[row.line] = `| ${r.base} | ${after.skill} | ${after.cost} · ${after.cd} | ${after.hook} | ${after.effect} |`;
  const change = { kit: k.slug, base: r.base, problem: r.problem, why: r.why, before: logged?.before ?? current, after };
  if (logged) Object.assign(logged, change);
  else entry.changes.push(change);
  applied++;
}
const order = new Map([...kits.values()].map((k, i) => [k.slug, i]));
const bases = [...kits.values()][0] ? [...[...kits.values()][0].rows.keys()] : [];
entry.changes.sort((a, b) => order.get(a.kit) - order.get(b.kit) || bases.indexOf(a.base) - bases.indexOf(b.base));
for (const [f, ls] of lines) fs.writeFileSync(path.join(contentDir, f), ls.join('\n'));
fs.writeFileSync(logPath, JSON.stringify(log, null, 2) + '\n');
console.log(`applied ${applied}; content/revisions.json now logs ${entry.changes.length} changes for pass "${entry.id}"`);
