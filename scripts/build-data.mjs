// Builds the site's data from the game. Every skill and keyword comes from the Custom Arena repo's
// content YAML, exactly as the game has it; content/ adds only the site's own words (the overview,
// the kit groups and each kit's tagline and "plays like" line).
//
//   data/site.json       the 55 fusion kits: keywords, passives and all 30 skills of each
//   data/reference.json  the 30 base skills and their ten single-element versions
//   data/statuses.json   the core and single-element statuses, and the rules terms from the game's glossary
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
/** A base or single-element skill, which must have a name and an effect. */
function checkedSkill(where, s) {
  if (!s?.name || !flat(s?.description)) fail(`${where}: no name or description`);
  return skillEntry(s ?? {});
}

const baseDoc = readYaml('base', 'skills.yaml');
// [id, archetype] for the 30 base skills, Strike to Titan.
const archetypes = Object.entries(baseDoc).map(([id, s]) => [id, s.archetype]);
if (archetypes.length !== 30) fail(`base/skills.yaml: ${archetypes.length} base skills, expected 30`);

// Reference: each base skill and its ten single-element versions.
const base = {};
for (const [id, a] of archetypes) base[a] = checkedSkill(`base/skills.yaml: ${id}`, baseDoc[id]);
const byElement = {};
for (const el of ELEMENTS) {
  const lower = el.toLowerCase();
  const doc = readYaml(lower, `skills.${lower}.yaml`) ?? {};
  byElement[el] = {};
  for (const [id, a] of archetypes) {
    const s = doc[`${id}.${lower}`];
    if (s) byElement[el][a] = checkedSkill(`${lower}/skills.${lower}.yaml: ${id}.${lower}`, s);
    else fail(`${lower}/skills.${lower}.yaml: no ${id}.${lower}`);
  }
}

// ---------------------------------------------------------------- statuses and rules terms

// The core statuses (base/statuses.yaml), each element's own (<element>/statuses.<element>.yaml; an element
// may have none) and the rules terms from the game's glossary (base/glossary.yaml). A glossary entry has its
// own text, or names a status whose description is the text; its `forms` are the words in skill text that
// mean it, which the site links to the entry. Entries tagged with an element are listed with that element.
const KINDS = ['Buff', 'Debuff', 'Neutral'];
const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function statusesOf(file, doc) {
  const out = new Map();
  for (const [id, s] of Object.entries(doc)) {
    const text = flat(s?.description);
    if (!s?.name || !text) fail(`${file}: status ${id} has no name or description`);
    else if (!KINDS.includes(s.kind)) fail(`${file}: status ${id} has kind "${s.kind}", expected ${KINDS.join(', ')}`);
    else out.set(id, { name: s.name, kind: s.kind, text });
  }
  return out;
}

const coreDoc = readYaml('base', 'statuses.yaml');
if (!coreDoc || !Object.keys(coreDoc).length) fail('base/statuses.yaml: missing or empty');
const coreStatuses = statusesOf('base/statuses.yaml', coreDoc ?? {});
const elementStatuses = {};
for (const el of ELEMENTS) {
  const lower = el.toLowerCase();
  elementStatuses[el] = statusesOf(`${lower}/statuses.${lower}.yaml`, readYaml(lower, `statuses.${lower}.yaml`) ?? {});
}

const glossary = readYaml('base', 'glossary.yaml');
if (!glossary || !Object.keys(glossary).length) fail('base/glossary.yaml: missing or empty');
const rulesTerms = [];
const elementTerms = Object.fromEntries(ELEMENTS.map((el) => [el, []]));
// status id -> glossary entry naming it (its forms, and any text of its own)
const glossaryOf = { core: new Map(), ...Object.fromEntries(ELEMENTS.map((el) => [el, new Map()])) };
for (const [id, g] of Object.entries(glossary ?? {})) {
  const where = `base/glossary.yaml: ${id}`;
  if (g.element && !ELEMENTS.includes(g.element)) {
    fail(`${where} has element ${g.element}, which isn't one of the ten`);
    continue;
  }
  if (g.status) {
    const statuses = g.element ? elementStatuses[g.element] : coreStatuses;
    const s = statuses.get(g.status);
    if (!s) {
      fail(`${where} names status ${g.status}, which ${g.element ? `${g.element.toLowerCase()}/statuses.${g.element.toLowerCase()}.yaml` : 'base/statuses.yaml'} doesn't have`);
      continue;
    }
    glossaryOf[g.element ?? 'core'].set(g.status, g);
    continue;
  }
  const text = flat(g.text);
  if (!g.name || !text) {
    fail(`${where} has no name or text`);
    continue;
  }
  (g.element ? elementTerms[g.element] : rulesTerms).push({ name: g.name, text, forms: g.forms ?? [g.name] });
}

/** Every status in a file, as players read it: a glossary entry's own text replaces the status's description. */
const statusList = (statuses, entries) =>
  [...statuses].map(([id, s]) => {
    const g = entries.get(id);
    return { name: s.name, kind: s.kind, text: g?.text ? flat(g.text) : s.text, forms: g ? (g.forms ?? [s.name]) : [] };
  });
const statusData = {
  core: statusList(coreStatuses, glossaryOf.core),
  elements: ELEMENTS.map((el) => ({ element: el, statuses: statusList(elementStatuses[el], glossaryOf[el]), terms: elementTerms[el] })),
  rules: rulesTerms,
};
for (const g of statusData.elements) if (!g.statuses.length && !g.terms.length) fail(`${g.element}: no statuses and no glossary terms`);
// Each entry gets its own link (#/statuses/<slug>), and each form in skill text means exactly one entry.
const allEntries = [...statusData.core, ...statusData.elements.flatMap((g) => [...g.statuses, ...g.terms]), ...statusData.rules];
const slugs = new Set(['core', 'rules', ...ELEMENTS.map((el) => el.toLowerCase())]);
const formOwner = new Map();
for (const e of allEntries) {
  e.slug = slugOf(e.name);
  if (slugs.has(e.slug)) fail(`statuses: two entries (or an entry and a section) would both link as #/statuses/${e.slug}`);
  slugs.add(e.slug);
  for (const f of e.forms) {
    if (formOwner.has(f)) fail(`base/glossary.yaml: "${f}" means both ${formOwner.get(f)} and ${e.name}`);
    formOwner.set(f, e.name);
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
fs.writeFileSync(path.join(root, 'data', 'statuses.json'), JSON.stringify(statusData));
const count = (f) => kits.reduce((n, k) => n + f(k), 0);
console.log(
  `data/site.json: ${kits.length} kits, ${count((k) => k.rows.length)} skills, ${count((k) => k.keywords.length)} keywords, ` +
    `${count((k) => k.passives.length + k.keywords.filter((x) => x.passive).length)} passives, from ${game}`,
);
console.log(`data/reference.json: ${archetypes.length} base skills and their ${ELEMENTS.length} single-element versions`);
console.log(
  `data/statuses.json: ${statusData.core.length} core statuses, ` +
    `${statusData.elements.reduce((n, g) => n + g.statuses.length, 0)} element statuses, ` +
    `${statusData.elements.reduce((n, g) => n + g.terms.length, 0)} element terms, ${statusData.rules.length} rules terms`,
);
