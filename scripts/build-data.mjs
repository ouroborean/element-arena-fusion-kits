// Builds the site's data from the game. Every skill and keyword comes from the Custom Arena repo's
// content YAML, exactly as the game has it; content/ adds only the site's own words (the overview,
// the kit groups and each kit's tagline and "plays like" line).
//
//   data/site.json       the 55 fusion kits: keywords, passives and all 30 skills of each
//   data/reference.json  the 30 base skills and their ten single-element versions
//
// Usage: node scripts/build-data.mjs [path to the Custom Arena repo]   (default: ../Custom Arena)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'content');
const game = path.resolve(process.argv[2] ?? path.join(root, '..', 'Custom Arena'));
const gameData = path.join(game, 'packages', 'content', 'data');
if (!fs.existsSync(gameData)) {
  console.error(`No game content at ${gameData}. Pass the Custom Arena repo's path: node scripts/build-data.mjs "../Custom Arena"`);
  process.exit(1);
}
const YAML = createRequire(path.join(game, 'packages', 'content', 'package.json'))('yaml');

const ELEMENTS = ['Fire', 'Ice', 'Water', 'Lightning', 'Wind', 'Poison', 'Earth', 'Holy', 'Unholy', 'Shadow'];
// The kit groups, in the order the site lists them (one file each in content/).
const GROUPS = ['pure-fusions', 'fire-pairs', 'ice-pairs', 'water-pairs', 'lightning-pairs', 'wind-pairs', 'poison-earth-pairs', 'holy-unholy-pairs'];

const problems = [];
const fail = (msg) => problems.push(msg);

// ---------------------------------------------------------------- Markdown (the site's own words)

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Inline Markdown: **bold** and *italic*. */
function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
}

/** Block Markdown: paragraphs and bullet lists. */
function blocks(md) {
  const out = [];
  const lines = md.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) {
      i++;
      continue;
    }
    if (/^- /.test(lines[i])) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2));
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^- /.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

/** Splits on "## " headings: the text before the first one, then [{ title, body }]. */
function sections(md) {
  const parts = md.split(/^## /m);
  const pre = parts.shift();
  return { pre, sections: parts.map((p) => ({ title: p.split('\n')[0].trim(), body: p.slice(p.indexOf('\n') + 1).trim() })) };
}

const readText = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const titleOf = (pre) => pre.match(/^# (.+)$/m)[1].trim();
const afterTitle = (pre) => pre.replace(/^# .+$/m, '').trim();

// ---------------------------------------------------------------- the game's content

const readYaml = (...parts) => {
  const file = path.join(gameData, ...parts);
  return fs.existsSync(file) ? (YAML.parse(fs.readFileSync(file, 'utf8')) ?? {}) : null;
};
const flat = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const skillEntry = (s) => ({ name: s.name, cost: String(s.cost ?? ''), cd: s.cooldown ?? 0, description: flat(s.description) });

const baseDoc = readYaml('base', 'skills.yaml');
// [id, archetype] for the 30 base skills, Strike to Titan.
const archetypes = Object.entries(baseDoc).map(([id, s]) => [id, s.archetype]);
if (archetypes.length !== 30) fail(`base/skills.yaml: ${archetypes.length} base skills, expected 30`);

// Reference: each base skill and its ten single-element versions.
const base = {};
for (const [id, a] of archetypes) base[a] = skillEntry(baseDoc[id]);
const byElement = {};
for (const el of ELEMENTS) {
  const lower = el.toLowerCase();
  const doc = readYaml(lower, `skills.${lower}.yaml`) ?? {};
  byElement[el] = {};
  for (const [id, a] of archetypes) {
    const s = doc[`${id}.${lower}`];
    if (s) byElement[el][a] = skillEntry(s);
    else fail(`${lower}/skills.${lower}.yaml: no ${id}.${lower}`);
  }
}

const fusions = readYaml('elements', 'fusions.yaml');

/** A fusion's keywords, from its glossary: an entry has its own text, or names a status whose description is the text. */
function keywordsOf(slug, statuses) {
  const glossary = readYaml('fusions', slug, `glossary.${slug}.yaml`) ?? {};
  const out = [];
  for (const [id, g] of Object.entries(glossary)) {
    const status = g.status ? statuses[g.status] : null;
    if (g.status && !status) fail(`${slug}: glossary ${id} names status ${g.status}, which statuses.${slug}.yaml doesn't have`);
    const term = g.name ?? status?.name;
    const text = flat(g.text ?? status?.description);
    if (!term || !text) {
      fail(`${slug}: glossary ${id} has no name or text`);
      continue;
    }
    out.push({ term, kind: status?.kind ?? '', text, forms: g.forms ?? [term] });
  }
  return out;
}

/** A fusion's passives: rules every character carrying one of its skills has. One named like a keyword marks that keyword instead. */
function passivesOf(slug, f, statuses, keywords) {
  const out = [];
  for (const id of f.passives ?? []) {
    const s = statuses[id];
    if (!s) {
      fail(`${slug}: passive ${id} isn't in statuses.${slug}.yaml`);
      continue;
    }
    const kw = keywords.find((k) => k.term === s.name);
    if (kw) kw.passive = true;
    else out.push({ name: s.name, text: flat(s.description) });
  }
  return out;
}

function rowsOf(slug) {
  const doc = readYaml('fusions', slug, `skills.${slug}.yaml`);
  if (!doc) {
    fail(`${slug}: no fusions/${slug}/skills.${slug}.yaml`);
    return [];
  }
  const rows = [];
  for (const [id, a] of archetypes) {
    const s = doc[`${id}.${slug}`];
    if (!s) {
      fail(`${slug}: no ${id}.${slug}`);
      continue;
    }
    const e = skillEntry(s);
    rows.push({ base: a, skill: e.name, cost: e.cost, cd: e.cd, effect: e.description });
  }
  return rows;
}

// ---------------------------------------------------------------- kits: the game's kit, the site's flavor

const groups = [];
const kits = [];
const seen = new Set();
const isTagline = (p) => /^\*[^*].*\*$/.test(p);
const isPlaysLike = (p) => p.startsWith('Plays like:');
for (const gslug of GROUPS) {
  const { pre, sections: secs } = sections(readText(path.join(contentDir, `${gslug}.md`)));
  const lead = afterTitle(pre);
  const g = { slug: gslug, title: titleOf(pre), lead, leadHtml: inline(lead), kits: [] };
  for (const s of secs) {
    const m = s.title.match(/^(.+?) — (\w+) \+ (\w+)$/);
    if (!m) {
      fail(`content/${gslug}.md: bad kit heading "${s.title}" (expected "Name — Element + Element")`);
      continue;
    }
    const [, name, a, b] = m;
    const slug = name.toLowerCase();
    const f = fusions[slug];
    if (!f) {
      fail(`content/${gslug}.md: ${name} isn't a fusion in the game (elements/fusions.yaml)`);
      continue;
    }
    if (f.name !== name || [a, b].sort().join() !== [...f.elements].sort().join())
      fail(`content/${gslug}.md: "${s.title}" doesn't match the game's ${f.name} (${f.elements.join(' + ')})`);
    if (seen.has(slug)) fail(`content: ${name} appears twice`);
    seen.add(slug);

    // Flavor: an italic tagline, a "Plays like:" line, then any notes.
    const paras = s.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const tagline = (paras.find(isTagline) ?? '').replace(/^\*|\*$/g, '');
    const playsLike = (paras.find(isPlaysLike) ?? '').replace(/^Plays like:\s*/, '');
    const notes = paras.filter((p) => !isTagline(p) && !isPlaysLike(p));
    if (!tagline) fail(`content/${gslug}.md: ${name} has no tagline`);

    const statuses = readYaml('fusions', slug, `statuses.${slug}.yaml`) ?? {};
    const keywords = keywordsOf(slug, statuses);
    const passives = passivesOf(slug, f, statuses, keywords);
    g.kits.push(slug);
    kits.push({
      slug,
      name: f.name,
      parents: [...f.elements],
      group: gslug,
      tagline,
      taglineHtml: inline(tagline),
      playsLike,
      notesHtml: notes.map((p) => `<p>${inline(p)}</p>`).join(''),
      keywords,
      passives,
      rows: rowsOf(slug),
    });
  }
  groups.push(g);
}
for (const slug of Object.keys(fusions)) if (!seen.has(slug)) fail(`content: no kit for the game's ${fusions[slug].name} (add it to a content/*.md group)`);

// ---------------------------------------------------------------- overview

const ov = sections(readText(path.join(contentDir, 'overview.md')));
const lead = afterTitle(ov.pre);

if (problems.length) {
  console.error(`Nothing written: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const site = {
  title: titleOf(ov.pre),
  lead,
  leadHtml: inline(lead),
  sections: ov.sections.map((s) => ({ id: s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), title: s.title, html: blocks(s.body) })),
  elements: ELEMENTS,
  bases: archetypes.map(([, a]) => a),
  groups,
  kits,
};

fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data', 'site.json'), JSON.stringify(site));
fs.writeFileSync(path.join(root, 'data', 'reference.json'), JSON.stringify({ base, byElement }));
const count = (f) => kits.reduce((n, k) => n + f(k), 0);
console.log(
  `data/site.json: ${kits.length} kits, ${count((k) => k.rows.length)} skills, ${count((k) => k.keywords.length)} keywords, ` +
    `${count((k) => k.passives.length + k.keywords.filter((x) => x.passive).length)} passives, from ${game}`,
);
console.log(`data/reference.json: ${archetypes.length} base skills and their ${ELEMENTS.length} single-element versions`);
