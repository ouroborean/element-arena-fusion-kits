// Fusion Kits: a dependency-free player reference for the 55 fusion kits (data/site.json) and the game's
// base and single-element skills (data/reference.json), both built from the game by scripts/build-data.mjs.
// Hash routes keep every view linkable:
//   #/                     overview: how fusions work, the fusion matrix, every kit at a glance
//   #/kit/<kit>[/<base>]   one kit, optionally with a skill selected
//   #/skill/<base>         one base skill across all 10 elements and 55 fusions
//   #/keywords             every fusion keyword, by kit
//   #/search/<query>       search results

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ENERGY = { S: 'Strength', A: 'Agility', I: 'Intelligence', W: 'Wisdom', r: 'Random', G: 'Random' };
const elVar = (el) => `var(--el-${el.toLowerCase()})`;

let site;
let ref;
const kits = new Map();
const groupOf = new Map();
let lastPage = '';

const main = $('#main');
const panel = $('#panel');
const layout = $('#layout');

init().catch((err) => {
  main.innerHTML = `<div class="prose"><h1>Couldn't load the kits</h1><p class="muted">${esc(err.message)}</p>
    <p class="muted">If you opened index.html straight from disk, serve the folder instead: <code>node scripts/serve.mjs</code>.</p></div>`;
});

async function init() {
  const [s, r] = await Promise.all([
    fetch('data/site.json').then((x) => x.json()),
    fetch('data/reference.json').then((x) => x.json()),
  ]);
  site = s;
  ref = r;
  for (const k of site.kits) {
    kits.set(k.slug, k);
    k.terms = keywordTerms(k);
    // Each keyword's own matcher, to find the skills that use it.
    for (const kw of k.keywords) kw.re = new RegExp(`\\b(?:${kw.forms.map(reEsc).join('|')})\\b`);
  }
  for (const g of site.groups) for (const slug of g.kits) groupOf.set(slug, g);
  buildSidebar();
  bindChrome();
  window.addEventListener('hashchange', route);
  route();
}

// ---------------------------------------------------------------- small renderers

function elChip(el) {
  return `<span class="el" style="--c:${elVar(el)}">${esc(el)}</span>`;
}
function swatch([a, b]) {
  return `<span class="sw" aria-hidden="true"><i style="background:${elVar(a)}"></i><i style="background:${elVar(b)}"></i></span>`;
}
function parentChips([a, b]) {
  return `${elChip(a)}<span class="plus">+</span>${elChip(b)}`;
}
function pips(cost) {
  if (!cost || cost === 'nc') return '<span class="pips free">Free</span>';
  const names = [...cost].map((c) => ENERGY[c] ?? c).join(', ');
  return `<span class="pips" role="img" aria-label="Cost: ${esc(names)}" title="${esc(names)}">${[...cost]
    .map((c) => `<i class="pip pip-${esc(c)}"></i>`)
    .join('')}</span>`;
}
function costCell(s) {
  return `${pips(s.cost)}<span class="cd" title="Cooldown">${esc(s.cd)}</span>`;
}
/** The kit's keywords, in the exact forms the game recognizes, bolded wherever its text uses them. */
function keywordTerms(k) {
  const forms = [...new Set(k.keywords.flatMap((x) => x.forms))].sort((a, b) => b.length - a.length);
  if (!forms.length) return null;
  return new RegExp(`\\b(${forms.map((t) => reEsc(esc(t))).join('|')})\\b`, 'g');
}
function effectHtml(k, text) {
  const html = esc(text);
  return k.terms ? html.replace(k.terms, '<b class="kw">$1</b>') : html;
}
function kindTag(kw) {
  return `${kw.kind ? `<span class="kind kind-${esc(kw.kind.toLowerCase())}">${esc(kw.kind)}</span>` : ''}${
    kw.passive ? '<span class="kind kind-passive" title="Every character carrying one of this fusion\'s skills has it">Passive</span>' : ''
  }`;
}
/** One keyword (or passive) as a definition: name, kind, rule. */
function keywordHtml(k, kw) {
  return `<div class="kwdef"><div class="kw-head"><strong>${esc(kw.term)}</strong>${kindTag(kw)}</div><p>${effectHtml(k, kw.text)}</p></div>`;
}
function passiveHtml(k, p) {
  return `<div class="kwdef"><div class="kw-head"><strong>${esc(p.name)}</strong><span class="kind kind-passive">Passive</span></div><p>${effectHtml(k, p.text)}</p></div>`;
}
function mark(text, q) {
  const html = esc(text);
  if (!q) return html;
  const i = html.toLowerCase().indexOf(esc(q).toLowerCase());
  if (i < 0) return html;
  const n = esc(q).length;
  return `${html.slice(0, i)}<mark>${html.slice(i, i + n)}</mark>${html.slice(i + n)}`;
}
const baseSlug = (base) => base.toLowerCase();
const rowOf = (k, base) => k.rows.find((r) => baseSlug(r.base) === base);
const keywordNames = (k) => k.keywords.map((x) => x.term).join(', ');

// ---------------------------------------------------------------- chrome: sidebar, search, drawers

function buildSidebar() {
  $('#sidebar').innerHTML = `
    <a class="side-link" href="#/" data-side="overview">Overview</a>
    <a class="side-link" href="#/skill/strike" data-side="skill">Compare skills</a>
    <a class="side-link" href="#/keywords" data-side="keywords">Keyword glossary</a>
    ${site.groups
      .map(
        (g) => `<section class="side-group"><h2>${esc(g.title)}</h2><ul>${g.kits
          .map((slug) => {
            const k = kits.get(slug);
            return `<li><a href="#/kit/${slug}" data-kit="${slug}">${swatch(k.parents)}<span>${esc(k.name)}</span></a></li>`;
          })
          .join('')}</ul></section>`,
      )
      .join('')}`;
}

function bindChrome() {
  const search = $('#search');
  let timer = 0;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = search.value.trim();
      if (!q) return;
      const target = `#/search/${encodeURIComponent(q)}`;
      if (location.hash.startsWith('#/search/')) {
        history.replaceState(null, '', target);
        route();
      } else location.hash = target;
    }, 180);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') search.blur();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName ?? '')) {
      e.preventDefault();
      search.focus();
      search.select();
    }
    if (e.key === 'Escape') closeDrawers();
  });
  $('#menuBtn').addEventListener('click', () => {
    const open = !layout.classList.contains('side-open');
    closeDrawers();
    if (open) {
      layout.classList.add('side-open');
      $('#menuBtn').setAttribute('aria-expanded', 'true');
      $('#scrim').hidden = false;
    }
  });
  $('#scrim').addEventListener('click', closeDrawers);
}

function closeDrawers() {
  layout.classList.remove('side-open', 'panel-open');
  $('#menuBtn').setAttribute('aria-expanded', 'false');
  $('#scrim').hidden = true;
}

function openPanelDrawer() {
  if (window.matchMedia('(max-width: 1279px)').matches) {
    layout.classList.add('panel-open');
    $('#scrim').hidden = false;
  }
}

function markNav(page, kit) {
  for (const a of $$('.topnav a')) a.classList.toggle('on', a.dataset.nav === page);
  for (const a of $$('.side-link')) a.classList.toggle('on', a.dataset.side === page);
  for (const a of $$('.side-group a')) {
    const on = a.dataset.kit === kit;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  const current = $('.side-group a.on');
  if (current) current.scrollIntoView({ block: 'nearest' });
}

// ---------------------------------------------------------------- router

function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [page = '', a, b] = raw.split('/');
  closeDrawers();
  let key;
  if (page === 'kit' && kits.has(a)) {
    key = `kit/${a}`;
    renderKit(kits.get(a), b);
  } else if (page === 'skill') {
    key = `skill/${a}`;
    renderSkill(a);
  } else if (page === 'keywords') {
    key = 'keywords';
    renderKeywords();
  } else if (page === 'search') {
    key = 'search';
    renderSearch(decodeURIComponent(raw.slice('search/'.length)));
  } else {
    key = 'overview';
    renderOverview();
  }
  if (key !== lastPage) {
    main.scrollTop = 0;
    if (key !== 'search') $('#search').value = '';
  }
  lastPage = key;
}

function setMode(mode) {
  layout.dataset.mode = mode;
}

// ---------------------------------------------------------------- overview

function renderOverview() {
  setMode('plain');
  markNav('overview');
  document.title = 'Fusion Kits · Element Arena';
  const keywordCount = site.kits.reduce((n, k) => n + k.keywords.length, 0);
  main.innerHTML = `
    <section class="hero">
      <p class="eyebrow">Element Arena · player reference</p>
      <h1>${esc(site.title)}</h1>
      <p class="lead">${site.leadHtml}</p>
      <div class="stats">
        <div><b>${site.kits.length}</b><span>Fusions</span></div>
        <div><b>${site.kits.reduce((n, k) => n + k.rows.length, 0).toLocaleString('en-US')}</b><span>Skills</span></div>
        <div><b>${keywordCount}</b><span>Keywords</span></div>
      </div>
    </section>

    ${site.sections.map((s) => `<section id="${s.id}"><h2 class="sec">${esc(s.title)}</h2><div class="prose">${s.html}</div></section>`).join('')}

    <h2 class="sec">Fusion matrix</h2>
    <div class="matrix-wrap">${matrixHtml()}</div>
    <div class="matrix-info" id="matrixInfo" aria-live="polite">Point at a fusion to preview it; click to open its kit.</div>

    <div class="sec-row"><h2 class="sec">At a glance</h2></div>
    <div class="toolbar">
      <input class="filter-input" id="glanceFilter" type="search" placeholder="Filter fusions and keywords" aria-label="Filter the table">
      <div class="chips" id="glanceEls" role="group" aria-label="Filter by parent element">${elementChips()}</div>
    </div>
    <div class="table-wrap"><table class="glance">
      <thead><tr><th>Fusion</th><th>Parents</th><th>Keywords</th><th>Plays like</th></tr></thead>
      <tbody>${site.kits
        .map(
          (k) => `<tr data-parents="${esc(k.parents.join(' '))}" data-text="${esc(
            [k.name, k.playsLike, ...k.keywords.flatMap((x) => [x.term, x.text])].join(' ').toLowerCase(),
          )}">
          <td class="c-kit"><a href="#/kit/${k.slug}">${esc(k.name)}</a></td>
          <td><div class="mini-parents">${swatch(k.parents)} ${esc(k.parents.join(' + '))}</div></td>
          <td class="glance-kw">${k.keywords.map((x) => `<p><strong>${esc(x.term)}</strong>: ${esc(x.text)}</p>`).join('')}</td>
          <td>${esc(k.playsLike)}</td></tr>`,
        )
        .join('')}</tbody>
    </table><p class="empty" id="glanceEmpty" hidden>No fusion matches.</p></div>`;

  const info = $('#matrixInfo');
  const show = (slug) => {
    const k = kits.get(slug);
    info.innerHTML = `<strong>${esc(k.name)}</strong><span class="muted">${esc(k.parents.join(' + '))}</span><br>${k.taglineHtml}<br><span class="muted">Keywords: ${esc(
      keywordNames(k),
    )}</span>`;
  };
  for (const cell of $$('.cell', main)) {
    cell.addEventListener('mouseenter', () => show(cell.dataset.kit));
    cell.addEventListener('focus', () => show(cell.dataset.kit));
  }

  const filter = $('#glanceFilter');
  let el = null;
  const apply = () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;
    for (const tr of $$('.glance tbody tr', main)) {
      const ok = (!q || tr.dataset.text.includes(q)) && (!el || tr.dataset.parents.split(' ').includes(el));
      tr.classList.toggle('hidden', !ok);
      if (ok) shown++;
    }
    $('#glanceEmpty').hidden = shown > 0;
  };
  filter.addEventListener('input', apply);
  bindElementChips($('#glanceEls'), (value) => {
    el = value;
    apply();
  });
}

function matrixHtml() {
  const E = site.elements;
  const byPair = new Map();
  for (const k of site.kits) {
    byPair.set(`${k.parents[0]}|${k.parents[1]}`, k);
    byPair.set(`${k.parents[1]}|${k.parents[0]}`, k);
  }
  return `<table class="matrix"><thead><tr><th></th>${E.map(
    (c) => `<th scope="col"><span class="el-h" style="--c:${elVar(c)}">${esc(c)}</span></th>`,
  ).join('')}</tr></thead><tbody>${E.map(
    (r) =>
      `<tr><th scope="row"><span class="el-h" style="--c:${elVar(r)}">${esc(r)}</span></th>${E.map((c) => {
        const k = byPair.get(`${r}|${c}`);
        return `<td><a class="cell" href="#/kit/${k.slug}" data-kit="${k.slug}" style="--a:${elVar(r)};--b:${elVar(c)}" aria-label="${esc(
          `${k.name}: ${r} + ${c}`,
        )}"><span>${esc(k.name)}</span></a></td>`;
      }).join('')}</tr>`,
  ).join('')}</tbody></table>`;
}

function elementChips() {
  return site.elements
    .map((el) => `<button type="button" class="chip" data-value="${el}" aria-pressed="false"><span class="dot" style="--c:${elVar(el)}"></span>${esc(el)}</button>`)
    .join('');
}
/** A group of toggle chips where at most one is on; calls back with its value or null. */
function bindElementChips(group, onChange) {
  group.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const on = chip.getAttribute('aria-pressed') !== 'true';
    for (const c of $$('.chip', group)) c.setAttribute('aria-pressed', 'false');
    chip.setAttribute('aria-pressed', String(on));
    onChange(on ? chip.dataset.value : null);
  });
}

// ---------------------------------------------------------------- kit page

function renderKit(k, base) {
  setMode('panel');
  markNav('kit', k.slug);
  document.title = `${k.name} · Fusion Kits`;
  const g = groupOf.get(k.slug);
  const i = site.kits.indexOf(k);
  const prev = site.kits[i - 1];
  const next = site.kits[i + 1];
  // Keywords that at least one of the kit's skills names, with how many do.
  const used = k.keywords
    .map((kw, n) => ({ n, kw, count: k.rows.filter((r) => kw.re.test(r.effect)).length }))
    .filter((x) => x.count > 0);

  main.innerHTML = `
    <article class="kit">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Overview</a><span>/</span><span>${esc(g.title)}</span></nav>
      <header class="kit-head" style="--a:${elVar(k.parents[0])};--b:${elVar(k.parents[1])}">
        <div class="kit-plate"><h1>${esc(k.name)}</h1></div>
        <div class="kit-parents">${parentChips(k.parents)}</div>
        <p class="tagline">${k.taglineHtml}</p>
        ${k.playsLike ? `<p class="plays-like"><span>Plays like</span>${esc(k.playsLike)}</p>` : ''}
      </header>

      <section class="mechanics"><h2 class="sec">Keywords</h2>
        <div class="kw-box">
          ${k.keywords.map((kw) => keywordHtml(k, kw)).join('')}
          ${
            k.passives.length
              ? `<p class="kw-note">Every character carrying at least one ${esc(k.name)} skill also has:</p>${k.passives.map((p) => passiveHtml(k, p)).join('')}`
              : ''
          }
          ${k.notesHtml ? `<div class="kw-notes">${k.notesHtml}</div>` : ''}
        </div>
      </section>

      <div class="sec-row">
        <h2 class="sec">Skills</h2>
        ${
          used.length
            ? `<div class="chips" id="kwChips" role="group" aria-label="Show only the skills that use a keyword">${used
                .map(
                  (x) => `<button type="button" class="chip" data-value="${x.n}" aria-pressed="false" title="Skills that use ${esc(x.kw.term)}">${esc(x.kw.term)} <span class="n">${x.count}</span></button>`,
                )
                .join('')}</div>`
            : ''
        }
      </div>
      <div class="table-wrap"><table class="rows kit-rows">
        <thead><tr><th>Base</th><th>Skill</th><th>Cost · CD</th><th>Effect</th></tr></thead>
        <tbody>${k.rows
          .map(
            (r) => `<tr data-base="${baseSlug(r.base)}" tabindex="0" aria-label="${esc(`${r.base}: ${r.skill}`)}">
              <td class="c-base">${esc(r.base)}</td>
              <td class="c-skill"><strong>${esc(r.skill)}</strong></td>
              <td class="c-cost">${costCell(r)}</td>
              <td class="c-effect">${effectHtml(k, r.effect)}</td></tr>`,
          )
          .join('')}</tbody>
      </table></div>

      <nav class="pager" aria-label="Other kits">
        ${prev ? `<a class="prev" href="#/kit/${prev.slug}"><small>Previous</small><strong>${esc(prev.name)}</strong></a>` : ''}
        ${next ? `<a class="next" href="#/kit/${next.slug}"><small>Next</small><strong>${esc(next.name)}</strong></a>` : ''}
      </nav>
    </article>`;

  const chips = $('#kwChips');
  if (chips)
    bindElementChips(chips, (value) => {
      const kw = value === null ? null : k.keywords[Number(value)];
      for (const tr of $$('.kit-rows tbody tr', main)) tr.classList.toggle('hidden', !!kw && !kw.re.test(rowOf(k, tr.dataset.base).effect));
    });
  bindRows($('.kit-rows', main), (tr) => ({ kit: k, base: tr.dataset.base }), (sel) => `#/kit/${k.slug}/${sel.base}`);

  const row = base && rowOf(k, base);
  if (row) selectRow(k, row, true);
  else emptyPanel(`Pick any of ${esc(k.name)}'s skills to compare it with its base skill and its parents' versions.`);
}

// ---------------------------------------------------------------- base skill across every element and fusion

function renderSkill(slug) {
  const base = site.bases.find((b) => baseSlug(b) === slug) ?? site.bases[0];
  setMode('panel');
  markNav('skill');
  document.title = `${base} · Fusion Kits`;
  const b = ref.base[base];

  main.innerHTML = `
    <nav class="base-strip" aria-label="Base skills">${site.bases
      .map((x) => `<a href="#/skill/${baseSlug(x)}" class="${x === base ? 'on' : ''}"${x === base ? ' aria-current="page"' : ''}>${esc(x)}</a>`)
      .join('')}</nav>
    <header class="page-head">
      <p class="eyebrow">Base skill</p>
      <h1>${esc(base)}</h1>
      <div class="base-card">${costCell(b)}<p>${esc(b.description)}</p></div>
    </header>

    <h2 class="sec">Single-element versions</h2>
    <div class="table-wrap"><table class="rows element-rows">
      <thead><tr><th>Element</th><th>Skill</th><th>Cost · CD</th><th>Effect</th></tr></thead>
      <tbody>${site.elements
        .map((el) => {
          const s = ref.byElement[el][base];
          return `<tr class="static"><td class="c-el">${elChip(el)}</td><td class="c-skill"><strong>${esc(s.name)}</strong></td>
            <td class="c-cost">${costCell(s)}</td><td class="c-effect">${esc(s.description)}</td></tr>`;
        })
        .join('')}</tbody>
    </table></div>

    <div class="sec-row"><h2 class="sec">All ${site.kits.length} fusion versions</h2></div>
    <div class="toolbar">
      <input class="filter-input" id="fusionFilter" type="search" placeholder="Filter by name or effect" aria-label="Filter fusion versions">
      <div class="chips" id="fusionEls" role="group" aria-label="Filter by parent element">${elementChips()}</div>
    </div>
    <div class="table-wrap"><table class="rows fusion-rows">
      <thead><tr><th>Fusion</th><th>Skill</th><th>Cost · CD</th><th>Effect</th></tr></thead>
      <tbody>${site.kits
        .map((k) => {
          const r = k.rows.find((x) => x.base === base);
          return `<tr data-kit="${k.slug}" data-base="${baseSlug(base)}" data-parents="${esc(k.parents.join(' '))}" data-text="${esc(
            `${k.name} ${r.skill} ${r.effect}`.toLowerCase(),
          )}" tabindex="0" aria-label="${esc(`${k.name}: ${r.skill}`)}">
            <td class="c-kit"><a href="#/kit/${k.slug}/${baseSlug(base)}">${esc(k.name)}</a>
              <div class="mini-parents">${swatch(k.parents)} ${esc(k.parents.join(' + '))}</div></td>
            <td class="c-skill"><strong>${esc(r.skill)}</strong></td>
            <td class="c-cost">${costCell(r)}</td>
            <td class="c-effect">${effectHtml(k, r.effect)}</td></tr>`;
        })
        .join('')}</tbody>
    </table><p class="empty" id="fusionEmpty" hidden>No fusion matches.</p></div>`;

  const filter = $('#fusionFilter');
  let el = null;
  const apply = () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;
    for (const tr of $$('.fusion-rows tbody tr', main)) {
      const ok = (!q || tr.dataset.text.includes(q)) && (!el || tr.dataset.parents.split(' ').includes(el));
      tr.classList.toggle('hidden', !ok);
      if (ok) shown++;
    }
    $('#fusionEmpty').hidden = shown > 0;
  };
  filter.addEventListener('input', apply);
  bindElementChips($('#fusionEls'), (value) => {
    el = value;
    apply();
  });
  bindRows($('.fusion-rows', main), (tr) => ({ kit: kits.get(tr.dataset.kit), base: tr.dataset.base }), null);
  emptyPanel(`Pick a fusion's ${esc(base)} to see it beside the base skill and its parents' versions.`);
}

// ---------------------------------------------------------------- selecting a skill row shows its lineage

function bindRows(table, pick, hashFor) {
  const choose = (tr) => {
    const sel = pick(tr);
    const row = rowOf(sel.kit, sel.base);
    if (!row) return;
    if (hashFor) history.replaceState(null, '', hashFor(sel));
    for (const t of $$('tbody tr.sel', table)) t.classList.remove('sel');
    tr.classList.add('sel');
    renderPanel(sel.kit, row);
    openPanelDrawer();
  };
  // Links do their own thing; anywhere else on a row selects it.
  table.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const tr = e.target.closest('tbody tr');
    if (tr && !tr.classList.contains('static')) choose(tr);
  });
  table.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tr = e.target.closest('tbody tr');
    if (!tr || e.target.closest('a')) return;
    e.preventDefault();
    choose(tr);
  });
}

function selectRow(k, row, scroll) {
  const tr = $(`.kit-rows tbody tr[data-base="${baseSlug(row.base)}"]`, main);
  if (tr) {
    tr.classList.add('sel');
    if (scroll) requestAnimationFrame(() => tr.scrollIntoView({ block: 'center' }));
  }
  renderPanel(k, row);
}

function emptyPanel(text) {
  panel.innerHTML = `<div class="panel-empty"><h2>Compare</h2><p>${text}</p></div>`;
}

function renderPanel(k, r) {
  const parents = k.parents[0] === k.parents[1] ? [k.parents[0]] : k.parents;
  const card = (el, s) => `
    <div class="ref-card"${el ? ` style="--c:${elVar(el)}"` : ''}>
      <div class="ref-head">${el ? elChip(el) : '<span class="el base">Base</span>'}<strong>${esc(s.name)}</strong>${costCell(s)}</div>
      <p>${esc(s.description)}</p>
    </div>`;
  const used = k.keywords.filter((kw) => kw.re.test(r.effect));
  panel.innerHTML = `
    <div class="panel-inner">
      <button class="panel-close" type="button" aria-label="Close details">&times;</button>
      <p class="eyebrow"><a href="#/kit/${k.slug}">${esc(k.name)}</a> · ${esc(r.base)}</p>
      <h2 class="panel-title">${esc(r.skill)}</h2>
      <div class="panel-meta">${costCell(r)}${parentChips(k.parents)}</div>
      <p class="panel-effect">${effectHtml(k, r.effect)}</p>
      ${used.length ? `<h3 class="sec small">${used.length === 1 ? 'Keyword' : 'Keywords'}</h3><div class="panel-kw">${used.map((kw) => keywordHtml(k, kw)).join('')}</div>` : ''}
      <h3 class="sec small">Base skill</h3>
      ${card(null, ref.base[r.base])}
      <h3 class="sec small">${parents.length === 1 ? 'Parent version' : "Parents' versions"}</h3>
      ${parents.map((el) => card(el, ref.byElement[el][r.base])).join('')}
      <a class="btn" href="#/skill/${baseSlug(r.base)}">All ${site.kits.length} fusion ${esc(r.base)} skills</a>
    </div>`;
  $('.panel-close', panel).addEventListener('click', closeDrawers);
}

// ---------------------------------------------------------------- keywords

function renderKeywords() {
  setMode('plain');
  markNav('keywords');
  document.title = 'Keywords · Fusion Kits';
  main.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Glossary</p>
      <h1>Keywords</h1>
      <p class="lead">Every keyword the ${site.kits.length} fusions add, with its rule as the game states it, grouped by fusion. Passives apply to every character carrying at least one of that fusion's skills.</p>
    </header>
    <div class="toolbar">
      <input class="filter-input" id="kwFilter" type="search" placeholder="Filter keywords" aria-label="Filter keywords">
      <div class="chips" id="kwEls" role="group" aria-label="Filter by parent element">${elementChips()}</div>
    </div>
    <div class="kw-list">${site.kits
      .map(
        (k) => `<section class="kw-kit" data-parents="${esc(k.parents.join(' '))}" data-text="${esc(
          [k.name, ...k.keywords.flatMap((x) => [x.term, x.text]), ...k.passives.flatMap((p) => [p.name, p.text])].join(' ').toLowerCase(),
        )}">
          <h2><a href="#/kit/${k.slug}">${esc(k.name)}</a>${swatch(k.parents)}<span class="muted">${esc(k.parents.join(' + '))}</span></h2>
          ${k.keywords.map((kw) => keywordHtml(k, kw)).join('')}
          ${k.passives.map((p) => passiveHtml(k, p)).join('')}
        </section>`,
      )
      .join('')}</div>
    <p class="empty" id="kwEmpty" hidden>No keyword matches.</p>`;
  const filter = $('#kwFilter');
  let el = null;
  const apply = () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;
    for (const s of $$('.kw-kit', main)) {
      const ok = (!q || s.dataset.text.includes(q)) && (!el || s.dataset.parents.split(' ').includes(el));
      s.hidden = !ok;
      if (ok) shown++;
    }
    $('#kwEmpty').hidden = shown > 0;
  };
  filter.addEventListener('input', apply);
  bindElementChips($('#kwEls'), (value) => {
    el = value;
    apply();
  });
}

// ---------------------------------------------------------------- search

function renderSearch(query) {
  setMode('plain');
  markNav('search');
  document.title = 'Search · Fusion Kits';
  const input = $('#search');
  if (document.activeElement !== input) input.value = query;
  const q = query.trim().toLowerCase();
  if (!q) {
    main.innerHTML = '<p class="muted">Type to search skills, keywords and kits.</p>';
    return;
  }
  const hit = (s) => s.toLowerCase().includes(q);
  const kitHits = site.kits.filter((k) => hit(k.name) || hit(k.tagline) || k.parents.some(hit));
  const kwHits = [];
  for (const k of site.kits) {
    for (const x of k.keywords) if (hit(x.term) || hit(x.text)) kwHits.push({ k, term: x.term, text: x.text });
    for (const p of k.passives) if (hit(p.name) || hit(p.text)) kwHits.push({ k, term: p.name, text: p.text });
  }
  const skillHits = [];
  for (const k of site.kits) for (const r of k.rows) if (hit(r.skill) || hit(r.effect)) skillHits.push({ k, r });
  const LIMIT = 150;

  main.innerHTML = `
    <header class="page-head"><p class="eyebrow">Search</p><h1>“${esc(query)}”</h1>
      <p class="muted">${kitHits.length} kits · ${kwHits.length} keywords · ${skillHits.length} skills</p></header>
    <div class="results">
      ${
        kitHits.length
          ? `<h2 class="sec small">Kits</h2><ul class="result-list">${kitHits
              .map(
                (k) => `<li><a href="#/kit/${k.slug}"><div class="r-top"><strong>${mark(k.name, query)}</strong>${parentChips(k.parents)}</div>
                  <p>${mark(k.tagline, query)}</p></a></li>`,
              )
              .join('')}</ul>`
          : ''
      }
      ${
        kwHits.length
          ? `<h2 class="sec small">Keywords</h2><ul class="result-list">${kwHits
              .map(
                ({ k, term, text }) => `<li><a href="#/kit/${k.slug}"><div class="r-top"><strong>${mark(term, query)}</strong><span class="muted">${esc(k.name)}</span></div>
                  <p>${mark(text, query)}</p></a></li>`,
              )
              .join('')}</ul>`
          : ''
      }
      ${
        skillHits.length
          ? `<h2 class="sec small">Skills</h2><ul class="result-list">${skillHits
              .slice(0, LIMIT)
              .map(
                ({ k, r }) => `<li><a href="#/kit/${k.slug}/${baseSlug(r.base)}"><div class="r-top"><strong>${mark(r.skill, query)}</strong>
                  <span class="muted">${esc(k.name)} · ${esc(r.base)}</span>${costCell(r)}</div>
                  <p>${mark(r.effect, query)}</p></a></li>`,
              )
              .join('')}</ul>${skillHits.length > LIMIT ? `<p class="muted">Showing the first ${LIMIT}; narrow the search to see more.</p>` : ''}`
          : ''
      }
      ${!kitHits.length && !kwHits.length && !skillHits.length ? '<p class="muted">Nothing matches.</p>' : ''}
    </div>`;
}
