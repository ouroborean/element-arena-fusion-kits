// Builds data/site.json from the Markdown in content/ (the "Fusion Spec Kits" doc, one file per tab).
// Usage: node scripts/build-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'content');

export const ELEMENTS = ['Fire', 'Ice', 'Water', 'Lightning', 'Wind', 'Poison', 'Earth', 'Holy', 'Unholy', 'Shadow'];
const GROUPS = [
  'pure-fusions',
  'fire-pairs',
  'ice-pairs',
  'water-pairs',
  'lightning-pairs',
  'wind-pairs',
  'poison-earth-pairs',
  'holy-unholy-pairs',
];

export const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Inline Markdown used by the doc: **bold** and *italic*. */
export function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
}

const splitRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(' | ')
    .map((c) => c.trim());

/** Block Markdown used by the doc: paragraphs, bullet lists (nested by 4 spaces) and pipe tables. */
export function blocks(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const [head, , ...body] = rows;
      out.push(
        '<div class="table-wrap"><table><thead><tr>' +
          splitRow(head)
            .map((c) => `<th>${inline(c)}</th>`)
            .join('') +
          '</tr></thead><tbody>' +
          body.map((r) => '<tr>' + splitRow(r).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
          '</tbody></table></div>',
      );
      continue;
    }
    if (/^\s*- /.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*- /.test(lines[i])) {
        const depth = lines[i].match(/^\s*/)[0].length >= 4 ? 1 : 0;
        items.push({ depth, text: lines[i].replace(/^\s*- /, '') });
        i++;
      }
      let html = '<ul>';
      let open = false;
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        if (it.depth === 0) {
          if (open) html += '</ul></li>';
          open = false;
          const next = items[k + 1];
          html += `<li>${inline(it.text)}`;
          if (next && next.depth === 1) {
            html += '<ul>';
            open = true;
          } else html += '</li>';
        } else html += `<li>${inline(it.text)}</li>`;
      }
      if (open) html += '</ul></li>';
      out.push(html + '</ul>');
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('|') && !/^\s*- /.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

function sections(md) {
  // Splits on "## " headings: [{ title, body }] plus the text before the first one.
  const parts = md.split(/^## /m);
  const pre = parts.shift();
  return { pre, sections: parts.map((p) => ({ title: p.split('\n')[0].trim(), body: p.slice(p.indexOf('\n') + 1) })) };
}

function parseCost(s) {
  const [cost, cd] = s.split('·').map((x) => x.trim());
  return { cost, cd: Number(cd) };
}

function parseKit(title, body, group) {
  const m = title.match(/^(.+?) — (\w+) \+ (\w+)$/);
  if (!m) throw new Error(`bad kit heading: ${title}`);
  const [, name, a, b] = m;
  const tableAt = body.indexOf('\n| Base |');
  const intro = body.slice(0, tableAt).trim();
  const tableMd = body.slice(tableAt).trim();
  const introLines = intro.split('\n');
  const tagline = introLines[0].replace(/^\*|\*$/g, '');
  const rest = introLines.slice(1).join('\n').trim();
  // Each top-level bullet (with any nested bullets) defines a keyword; its first bold run names it.
  const bullets = [];
  let cur = null;
  for (const line of rest.split('\n')) {
    if (/^- /.test(line)) bullets.push((cur = [line]));
    else if (cur && /^\s{4}- /.test(line)) cur.push(line);
    else cur = null;
  }
  const keywords = bullets.map((lines) => ({
    term: lines[0].match(/^- \*\*(.+?)\*\*/)?.[1] ?? '',
    html: blocks(lines.join('\n')).replace(/^<ul><li>/, '').replace(/<\/li><\/ul>$/, ''),
  }));
  const rows = tableMd
    .split('\n')
    .slice(2)
    .filter((l) => l.startsWith('|'))
    .map((l) => {
      const [base, skill, costCd, hook, effect] = splitRow(l);
      return { base, skill, ...parseCost(costCd), hook, effect };
    });
  if (rows.length !== 30) throw new Error(`${name}: ${rows.length} rows`);
  return {
    slug: slugify(name),
    name,
    parents: [a, b],
    group,
    tagline,
    taglineHtml: inline(tagline),
    introHtml: blocks(rest),
    keywords,
    hooks: [...new Set(rows.map((r) => r.hook))],
    rows,
  };
}

const groups = [];
const kits = [];
for (const slug of GROUPS) {
  const md = fs.readFileSync(path.join(contentDir, `${slug}.md`), 'utf8').replace(/\r\n/g, '\n');
  const { pre, sections: secs } = sections(md);
  const title = pre.match(/^# (.+)$/m)[1].trim();
  const lead = pre.replace(/^# .+$/m, '').trim();
  const g = { slug, title, lead, leadHtml: inline(lead), kits: [] };
  for (const s of secs) {
    const kit = parseKit(s.title, s.body, slug);
    g.kits.push(kit.slug);
    kits.push(kit);
  }
  groups.push(g);
}

// Overview: lead, the at-a-glance table, and the doc's other sections.
const ov = sections(fs.readFileSync(path.join(contentDir, 'overview.md'), 'utf8').replace(/\r\n/g, '\n'));
const ovTitle = ov.pre.match(/^# (.+)$/m)[1].trim();
const ovPre = ov.pre.replace(/^# .+$/m, '').trim().split('\n\n');
const date = ovPre[0].trim();
const lead = ovPre.slice(1).join(' ').trim().replace('the Kits tabs hold every skill', 'each kit page holds every skill');
const glance = ov.sections.find((s) => s.title === 'At a glance');
const atAGlance = glance.body
  .split('\n')
  .filter((l) => l.startsWith('|'))
  .slice(2)
  .map((l) => {
    const [fusion, parents, core, playsLike] = splitRow(l);
    return { kit: slugify(fusion), fusion, parents: parents.split(' + '), coreHtml: inline(core), playsLike };
  });
const overviewSections = ov.sections
  .filter((s) => !['At a glance', 'The kits'].includes(s.title))
  .map((s) => ({ id: slugify(s.title), title: s.title, html: blocks(s.body) }));

// Revision log (content/revisions.json, written by scripts/apply-revisions.mjs): each revised row carries its
// earlier versions, newest first, and its version number is how many times it has been revised.
const logPath = path.join(contentDir, 'revisions.json');
const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : { passes: [] };
const kitBySlug = new Map(kits.map((k) => [k.slug, k]));
const passes = log.passes.map((p) => {
  let count = 0;
  for (const c of p.changes) {
    const row = kitBySlug.get(c.kit)?.rows.find((r) => r.base === c.base);
    if (!row) {
      console.warn(`revisions.json: no ${c.kit} ${c.base}`);
      continue;
    }
    (row.history ??= []).unshift({ pass: p.id, date: p.date, problem: c.problem, why: c.why, before: c.before });
    count++;
  }
  return { id: p.id, date: p.date, title: p.title, summary: p.summary, count };
});

const site = {
  title: ovTitle,
  date,
  lead,
  leadHtml: inline(lead),
  elements: ELEMENTS,
  bases: kits[0].rows.map((r) => r.base),
  groups,
  kits,
  atAGlance,
  overviewSections,
  passes,
};

fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data', 'site.json'), JSON.stringify(site));
console.log(
  `data/site.json: ${groups.length} groups, ${kits.length} kits, ${kits.reduce((n, k) => n + k.rows.length, 0)} skills, ${passes.reduce((n, p) => n + p.count, 0)} logged revisions`,
);
