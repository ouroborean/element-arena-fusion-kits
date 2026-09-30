// Fusion Kits: a dependency-free browser for the 55 fusion kits (data/site.json) and the game's
// single-element skills (data/reference.json). Hash routes keep every view linkable:
//   #/                     overview, fusion matrix and the doc's notes
//   #/kit/<kit>[/<base>]   one kit, optionally with a skill selected
//   #/skill/<base>         one base skill across all 10 elements and 55 fusions
//   #/keywords             every new keyword, by kit
//   #/ratings              the skills you've starred, with export and import
//   #/changes              every revised skill, before and after
//   #/search/<query>       search results

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ENERGY = { S: 'Strength', A: 'Agility', I: 'Intelligence', W: 'Wisdom', r: 'Random', G: 'Random' };
const elVar = (el) => `var(--el-${el.toLowerCase()})`;

let site;
let ref;
const kits = new Map();
const groupOf = new Map();
const glance = new Map();
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
    k.hookClass = hookClasses(k);
    k.terms = keywordTerms(k);
  }
  for (const g of site.groups) for (const slug of g.kits) groupOf.set(slug, g);
  for (const a of site.atAGlance) glance.set(a.kit, a);
  loadRatings();
  buildSidebar();
  bindChrome();
  bindRatings();
  window.addEventListener('hashchange', route);
  route();
}

// ---------------------------------------------------------------- ratings: 1 to 3 stars per skill, kept in this browser

const RATINGS_KEY = 'fusion-kits:ratings:v1';
const STAR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2l2.9 6.6 7.2.6-5.5 4.8 1.7 7-6.3-3.8-6.3 3.8 1.7-7-5.5-4.8 7.2-.6z"/></svg>';
// A rating is { s: stars, v: the skill's version when it was rated }. A skill's version counts its revisions, so a
// rating given before the latest revision is stale: it's kept and shown, but marked, and doesn't count as rated.
// Saves from before revisions existed hold just the stars, which means version 0.
let ratings = {};
let storageOk = true;

const ratingId = (kitSlug, base) => `${kitSlug}/${baseSlug(base)}`;
const isStars = (v) => v === 1 || v === 2 || v === 3;
const rowVersion = (r) => r?.history?.length ?? 0;
function rowForId(id) {
  const [slug, base] = id.split('/');
  const k = kits.get(slug);
  return k && rowOf(k, base);
}
function normRating(x) {
  if (isStars(x)) return { s: x, v: 0 };
  if (x && isStars(x.s) && Number.isInteger(x.v) && x.v >= 0) return { s: x.s, v: x.v };
  return null;
}
const isStale = (id) => !!ratings[id] && ratings[id].v < rowVersion(rowForId(id));
/** Stars given to the skill as it reads now: 0 if it's unrated or was rated before its latest revision. */
const currentStars = (id) => (ratings[id] && !isStale(id) ? ratings[id].s : 0);

function loadRatings() {
  try {
    const saved = JSON.parse(localStorage.getItem(RATINGS_KEY) ?? '{}');
    ratings = {};
    for (const [id, x] of Object.entries(saved ?? {})) {
      const r = normRating(x);
      if (r) ratings[id] = r;
    }
    storageOk = true;
  } catch {
    ratings = {};
    storageOk = false;
  }
}

function saveRatings() {
  try {
    localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

/** Rated skills that still exist in the kits (ratings for renamed or removed ones are kept, not shown). */
function ratedItems() {
  const out = [];
  for (const k of site.kits)
    for (const r of k.rows) {
      const id = ratingId(k.slug, r.base);
      if (ratings[id]) out.push({ k, r, id, v: ratings[id].s, stale: isStale(id) });
    }
  return out;
}

function kitRatedCount(k) {
  let n = 0;
  for (const r of k.rows) if (currentStars(ratingId(k.slug, r.base))) n++;
  return n;
}

/** The three-star control shown beside a skill; every copy of one skill's control stays in sync. */
function starsHtml(id, label) {
  const v = ratings[id]?.s ?? 0;
  const stale = isStale(id);
  return `<span class="stars" role="group" aria-label="${esc(`Rate ${label}`)}" data-id="${esc(id)}" data-value="${v}" data-stale="${stale}">${[1, 2, 3]
    .map(
      (n) =>
        `<button type="button" class="star" data-n="${n}" aria-pressed="${n === v && !stale}" aria-label="${n} ${n === 1 ? 'star' : 'stars'}" title="${starTitle(n, v, stale)}">${STAR_SVG}</button>`,
    )
    .join('')}</span>`;
}
const starTitle = (n, v, stale) =>
  stale
    ? `You gave the earlier version ${v} of 3 stars; click to rate this version ${n} of 3`
    : n === v
      ? `${n} of 3 stars (click again to clear)`
      : `${n} of 3 stars`;

function starsText(v, stale = false) {
  return `<span class="stars-ro${stale ? ' stale' : ''}" role="img" aria-label="${stale ? `Rated ${v} of 3 before its revision` : `Rated ${v} of 3`}"${
    stale ? ' title="Rated before this skill was revised"' : ''
  }>${'★'.repeat(v)}<span>${'★'.repeat(3 - v)}</span></span>`;
}

function setRating(id, stars) {
  if (isStars(stars)) ratings[id] = { s: stars, v: rowVersion(rowForId(id)) };
  else delete ratings[id];
  saveRatings();
  refreshRatings();
}

function refreshRatings() {
  for (const el of $$('.stars')) {
    const id = el.dataset.id;
    const v = ratings[id]?.s ?? 0;
    const stale = isStale(id);
    el.dataset.value = String(v);
    el.dataset.stale = String(stale);
    for (const b of $$('.star', el)) {
      const n = Number(b.dataset.n);
      b.setAttribute('aria-pressed', String(n === v && !stale));
      b.title = starTitle(n, v, stale);
    }
  }
  for (const el of $$('[data-rated-kit]')) {
    const k = kits.get(el.dataset.ratedKit);
    const n = kitRatedCount(k);
    el.textContent = n ? `${n}/${k.rows.length}` : '';
    el.classList.toggle('full', n === k.rows.length);
  }
  const total = ratedItems().filter((it) => !it.stale).length;
  $('#navRated').textContent = total ? String(total) : '';
  const kitCount = $('#kitRated');
  if (kitCount) kitCount.textContent = `${kitRatedCount(kits.get(kitCount.dataset.kit))} / 30 rated`;
  const summary = $('#ratingsSummary');
  if (summary) summary.innerHTML = ratingsSummaryHtml();
  $$('[data-storage-warning]').forEach((el) => (el.hidden = storageOk));
  document.dispatchEvent(new CustomEvent('ratings-changed'));
}

function bindRatings() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.stars .star');
    if (!b) return;
    const id = b.closest('.stars').dataset.id;
    const n = Number(b.dataset.n);
    // Clicking the current rating clears it; on a stale rating, any star rates the new version.
    setRating(id, currentStars(id) === n ? 0 : n);
  });
  // Another tab of the site changed them.
  window.addEventListener('storage', (e) => {
    if (e.key !== RATINGS_KEY) return;
    loadRatings();
    refreshRatings();
  });
  refreshRatings();
}

// ---------------------------------------------------------------- revisions

const PROBLEMS = {
  mashup: { label: 'Mashup', long: "Both parents' versions stitched together" },
  upgrade: { label: 'Upgrade', long: "A parent's version, made stronger" },
  'keyword-swap': { label: 'Keyword swap', long: "A parent's version with the kit's keyword swapped in or tacked on" },
  'near-copy': { label: 'Near-copy', long: 'Nearly the same as a parent version or another skill in the kit' },
  bridge: { label: 'Bridge', long: "A texture skill that only paid off with both parents' statuses in play" },
  formula: { label: 'Formula', long: 'A texture skill built on the stock "effect, then if this status, that" pattern' },
  unique: { label: 'Unique', long: "Rebuilt as one of the kit's Unique skills: utility no other kit has" },
  rebalance: { label: 'Rebalance', long: "Reworked to fit the kit's shape: 4 Unique, 8 Texture and 18 core skills split evenly between its mechanics" },
  other: { label: 'Other', long: 'Reworked for another reason' },
};
const problemOf = (p) => PROBLEMS[p] ?? PROBLEMS.other;

function revTag(r) {
  const h = r.history?.[0];
  if (!h) return '';
  return `<span class="rev-tag" title="${esc(`Revised ${h.date}. Was ${h.before.skill}: ${problemOf(h.problem).long.toLowerCase()}.`)}">Revised</span>`;
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
function hookChip(k, hook) {
  return `<span class="hook ${k.hookClass[hook] ?? ''}">${esc(hook)}</span>`;
}
/** Hooks every kit may use besides its own keywords. */
const SHARED_HOOKS = ['Texture', 'Unique'];
/** Each kit's core hooks get a color in order of appearance; Texture stays grey and Unique is solid. */
function hookClasses(k) {
  const out = { Unique: 'h-unique' };
  let n = 0;
  for (const h of k.hooks) if (!SHARED_HOOKS.includes(h)) out[h] = `h${Math.min(++n, 4)}`;
  return out;
}
/** The kit's own terms (bold words in its mechanics, and its hooks), bolded where effects use them. */
function keywordTerms(k) {
  const terms = new Set();
  for (const m of k.introHtml.matchAll(/<strong>(.+?)<\/strong>/g)) terms.add(m[1].replace(/\s*\(N\)$|\s+N$/, ''));
  for (const h of k.hooks) if (!SHARED_HOOKS.includes(h)) for (const t of h.split('/')) terms.add(t.trim());
  const list = [...terms].filter((t) => t.length > 2).sort((a, b) => b.length - a.length);
  if (!list.length) return null;
  return new RegExp(`\\b(${list.map((t) => esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
}
function effectHtml(k, text) {
  const html = esc(text);
  return k.terms ? html.replace(k.terms, '<b class="kw">$1</b>') : html;
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

// ---------------------------------------------------------------- chrome: sidebar, search, drawers

function buildSidebar() {
  $('#sidebar').innerHTML = `
    <a class="side-link" href="#/" data-side="overview">Overview</a>
    <a class="side-link" href="#/skill/strike" data-side="skill">Compare skills</a>
    <a class="side-link" href="#/keywords" data-side="keywords">Keyword glossary</a>
    <a class="side-link" href="#/ratings" data-side="ratings">Your ratings</a>
    ${site.passes.length ? '<a class="side-link" href="#/changes" data-side="changes">Changes</a>' : ''}
    ${site.groups
      .map(
        (g) => `<section class="side-group"><h2>${esc(g.title)}</h2><ul>${g.kits
          .map((slug) => {
            const k = kits.get(slug);
            return `<li><a href="#/kit/${slug}" data-kit="${slug}">${swatch(k.parents)}<span>${esc(k.name)}</span><span class="rated" data-rated-kit="${slug}" title="Skills you've rated"></span></a></li>`;
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
  } else if (page === 'ratings') {
    key = 'ratings';
    renderRatings();
  } else if (page === 'changes') {
    key = 'changes';
    renderChanges();
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
  main.innerHTML = `
    <section class="hero">
      <p class="eyebrow">Element Arena · design</p>
      <h1>Fusion Spec Kits</h1>
      <p class="hero-sub">First pass · ${esc(site.date)}${
        site.passes.length
          ? ` · <a href="#/changes">${esc(site.passes.at(-1).title)} · ${esc(site.passes.at(-1).date)} · ${site.passes.at(-1).count.toLocaleString('en-US')} skills revised</a>`
          : ''
      }</p>
      <p class="lead">${site.leadHtml}</p>
      <div class="stats">
        <div><b>${site.kits.length}</b><span>Fusions</span></div>
        <div><b>${site.kits.reduce((n, k) => n + k.rows.length, 0).toLocaleString('en-US')}</b><span>Skills</span></div>
        <div><b>${site.bases.length}</b><span>Skills per kit</span></div>
      </div>
    </section>

    <h2 class="sec">Fusion matrix</h2>
    <div class="matrix-wrap">${matrixHtml()}</div>
    <div class="matrix-info" id="matrixInfo" aria-live="polite">Point at a fusion to preview its core mechanic; click to open its kit.</div>

    <div class="sec-row"><h2 class="sec">At a glance</h2></div>
    <div class="toolbar">
      <input class="filter-input" id="glanceFilter" type="search" placeholder="Filter fusions and mechanics" aria-label="Filter the table">
      <div class="chips" id="glanceEls" role="group" aria-label="Filter by parent element">${elementChips()}</div>
    </div>
    <div class="table-wrap"><table class="glance">
      <thead><tr><th>Fusion</th><th>Parents</th><th>Core mechanic</th><th>Plays like</th></tr></thead>
      <tbody>${site.atAGlance
        .map(
          (a) => `<tr data-parents="${esc(a.parents.join(' '))}" data-text="${esc(
            (a.fusion + ' ' + a.coreHtml.replace(/<[^>]+>/g, '') + ' ' + a.playsLike).toLowerCase(),
          )}">
          <td class="c-kit"><a href="#/kit/${a.kit}">${esc(a.fusion)}</a></td>
          <td><div class="mini-parents">${swatch(a.parents)} ${esc(a.parents.join(' + '))}</div></td>
          <td>${a.coreHtml}</td><td>${esc(a.playsLike)}</td></tr>`,
        )
        .join('')}</tbody>
    </table><p class="empty" id="glanceEmpty" hidden>No fusion matches.</p></div>

    ${site.overviewSections
      .map((s) => `<section id="${s.id}"><h2 class="sec">${esc(s.title)}</h2><div class="prose">${s.html}</div></section>`)
      .join('')}`;

  const info = $('#matrixInfo');
  const show = (slug) => {
    const a = glance.get(slug);
    const k = kits.get(slug);
    info.innerHTML = `<strong>${esc(k.name)}</strong><span class="muted">${esc(k.parents.join(' + '))}</span><br>${a.coreHtml}`;
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
  const counts = {};
  for (const r of k.rows) counts[r.hook] = (counts[r.hook] ?? 0) + 1;
  const revisedCount = k.rows.filter((r) => r.history).length;

  main.innerHTML = `
    <article class="kit">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Overview</a><span>/</span><span>${esc(g.title)}</span></nav>
      <header class="kit-head" style="--a:${elVar(k.parents[0])};--b:${elVar(k.parents[1])}">
        <div class="kit-plate"><h1>${esc(k.name)}</h1></div>
        <div class="kit-parents">${parentChips(k.parents)}</div>
        <p class="tagline">${k.taglineHtml}</p>
      </header>

      <section class="mechanics"><h2 class="sec">Core mechanics</h2><div class="prose">${k.introHtml}</div></section>

      <div class="sec-row">
        <div class="sec-title"><h2 class="sec">Skills</h2><span class="rated-count" id="kitRated" data-kit="${k.slug}"></span></div>
        <div class="filters">
          <div class="chips" id="hookChips" role="group" aria-label="Filter by hook">
            ${k.hooks
              .map(
                (h) => `<button type="button" class="chip" data-value="${esc(h)}" aria-pressed="false">${esc(h)} <span class="n">${counts[h]}</span></button>`,
              )
              .join('')}
          </div>
          ${
            revisedCount
              ? `<button type="button" class="chip" id="revisedOnly" aria-pressed="false" title="Show only the skills rewritten since the first pass">Revised <span class="n">${revisedCount}</span></button>`
              : ''
          }
          <button type="button" class="chip" id="unratedOnly" aria-pressed="false" title="Show only the skills you haven't rated yet, or rated before they were revised">Unrated</button>
        </div>
      </div>
      <div class="table-wrap"><table class="rows kit-rows">
        <thead><tr><th>Base</th><th>Skill</th><th>Cost · CD</th><th>Hook</th><th>Effect</th></tr></thead>
        <tbody>${k.rows
          .map(
            (r) => `<tr data-base="${baseSlug(r.base)}" data-hook="${esc(r.hook)}" data-revised="${!!r.history}" tabindex="0" aria-label="${esc(`${r.base}: ${r.skill}`)}">
              <td class="c-base">${esc(r.base)}</td>
              <td class="c-skill"><strong>${esc(r.skill)}</strong>${revTag(r)}<div class="skill-stars">${starsHtml(ratingId(k.slug, r.base), r.skill)}</div></td>
              <td class="c-cost">${costCell(r)}</td>
              <td class="c-hook">${hookChip(k, r.hook)}</td>
              <td class="c-effect">${effectHtml(k, r.effect)}</td></tr>`,
          )
          .join('')}</tbody>
      </table></div>

      <nav class="pager" aria-label="Other kits">
        ${prev ? `<a class="prev" href="#/kit/${prev.slug}"><small>Previous</small><strong>${esc(prev.name)}</strong></a>` : ''}
        ${next ? `<a class="next" href="#/kit/${next.slug}"><small>Next</small><strong>${esc(next.name)}</strong></a>` : ''}
      </nav>
    </article>`;

  // Filters apply when toggled, not when a rating changes, so rating a skill never makes rows jump.
  let hookFilter = null;
  let unratedOnly = false;
  let revisedOnly = false;
  const applyFilters = () => {
    for (const tr of $$('.kit-rows tbody tr', main)) {
      const rated = !!currentStars(`${k.slug}/${tr.dataset.base}`);
      tr.classList.toggle(
        'hidden',
        (!!hookFilter && tr.dataset.hook !== hookFilter) || (unratedOnly && rated) || (revisedOnly && tr.dataset.revised !== 'true'),
      );
    }
  };
  bindElementChips($('#hookChips'), (hook) => {
    hookFilter = hook;
    applyFilters();
  });
  $('#unratedOnly').addEventListener('click', (e) => {
    unratedOnly = !unratedOnly;
    e.currentTarget.setAttribute('aria-pressed', String(unratedOnly));
    applyFilters();
  });
  $('#revisedOnly')?.addEventListener('click', (e) => {
    revisedOnly = !revisedOnly;
    e.currentTarget.setAttribute('aria-pressed', String(revisedOnly));
    applyFilters();
  });
  bindRows($('.kit-rows', main), (tr) => ({ kit: k, base: tr.dataset.base }), (sel) => `#/kit/${k.slug}/${sel.base}`);
  refreshRatings();

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
      <thead><tr><th>Fusion</th><th>Skill</th><th>Cost · CD</th><th>Hook</th><th>Effect</th></tr></thead>
      <tbody>${site.kits
        .map((k) => {
          const r = k.rows.find((x) => x.base === base);
          return `<tr data-kit="${k.slug}" data-base="${baseSlug(base)}" data-parents="${esc(k.parents.join(' '))}" data-text="${esc(
            `${k.name} ${r.skill} ${r.effect}`.toLowerCase(),
          )}" tabindex="0" aria-label="${esc(`${k.name}: ${r.skill}`)}">
            <td class="c-kit"><a href="#/kit/${k.slug}/${baseSlug(base)}">${esc(k.name)}</a>
              <div class="mini-parents">${swatch(k.parents)} ${esc(k.parents.join(' + '))}</div></td>
            <td class="c-skill"><strong>${esc(r.skill)}</strong>${revTag(r)}<div class="skill-stars">${starsHtml(ratingId(k.slug, r.base), r.skill)}</div></td>
            <td class="c-cost">${costCell(r)}</td>
            <td class="c-hook">${hookChip(k, r.hook)}</td>
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
  // Links and the star buttons do their own thing; anywhere else on a row selects it.
  table.addEventListener('click', (e) => {
    if (e.target.closest('a, .stars')) return;
    const tr = e.target.closest('tbody tr');
    if (tr && !tr.classList.contains('static')) choose(tr);
  });
  table.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tr = e.target.closest('tbody tr');
    if (!tr || e.target.closest('a, .stars')) return;
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
  panel.innerHTML = `<div class="panel-empty"><h2>Lineage</h2><p>${text}</p></div>`;
}

function renderPanel(k, r) {
  const parents = k.parents[0] === k.parents[1] ? [k.parents[0]] : k.parents;
  const card = (label, el, s) => `
    <div class="ref-card"${el ? ` style="--c:${elVar(el)}"` : ''}>
      <div class="ref-head">${el ? elChip(el) : '<span class="el base">Base</span>'}<strong>${esc(s.name)}</strong>${costCell(s)}</div>
      <p>${esc(s.description)}</p>
    </div>`;
  panel.innerHTML = `
    <div class="panel-inner">
      <button class="panel-close" type="button" aria-label="Close details">&times;</button>
      <p class="eyebrow"><a href="#/kit/${k.slug}">${esc(k.name)}</a> · ${esc(r.base)}</p>
      <h2 class="panel-title">${esc(r.skill)}</h2>
      <div class="panel-rate"><span class="eyebrow">Your rating</span>${starsHtml(ratingId(k.slug, r.base), r.skill)}</div>
      <div class="panel-meta">${costCell(r)}${hookChip(k, r.hook)}${parentChips(k.parents)}</div>
      <p class="panel-effect">${effectHtml(k, r.effect)}</p>
      ${(r.history ?? [])
        .map(
          (h) => `<h3 class="sec small">Before ${esc(h.date)}</h3>
      <div class="ref-card was">
        <div class="ref-head"><span class="el base">Was</span><strong>${esc(h.before.skill)}</strong>${costCell(h.before)}${hookChip(k, h.before.hook)}</div>
        <p>${effectHtml(k, h.before.effect)}</p>
        <p class="why"><b>${esc(problemOf(h.problem).label)}.</b> ${esc(h.why)}</p>
      </div>`,
        )
        .join('')}
      <h3 class="sec small">Base skill</h3>
      ${card('Base', null, ref.base[r.base])}
      <h3 class="sec small">${parents.length === 1 ? 'Parent version' : "Parents' versions"}</h3>
      ${parents.map((el) => card(el, el, ref.byElement[el][r.base])).join('')}
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
      <p class="lead">Every term the ${site.kits.length} kits introduce, with its rule, grouped by fusion.</p>
    </header>
    <div class="toolbar">
      <input class="filter-input" id="kwFilter" type="search" placeholder="Filter keywords" aria-label="Filter keywords">
      <div class="chips" id="kwEls" role="group" aria-label="Filter by parent element">${elementChips()}</div>
    </div>
    <div class="kw-list">${site.kits
      .map(
        (k) => `<section class="kw-kit" data-parents="${esc(k.parents.join(' '))}" data-text="${esc(
          `${k.name} ${k.keywords.map((x) => x.html.replace(/<[^>]+>/g, '')).join(' ')}`.toLowerCase(),
        )}">
          <h2><a href="#/kit/${k.slug}">${esc(k.name)}</a>${swatch(k.parents)}<span class="muted">${esc(k.parents.join(' + '))}</span></h2>
          ${k.keywords.map((x) => `<div class="kw">${x.html}</div>`).join('')}
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

// ---------------------------------------------------------------- ratings page

function ratingsSummaryHtml() {
  const items = ratedItems();
  const current = items.filter((it) => !it.stale);
  const by = { 1: 0, 2: 0, 3: 0 };
  for (const it of current) by[it.v]++;
  const stale = items.length - current.length;
  const total = site.kits.reduce((n, k) => n + k.rows.length, 0);
  const kitsDone = site.kits.filter((k) => kitRatedCount(k) === k.rows.length).length;
  return `<div><b>${current.length}</b><span>of ${total.toLocaleString('en-US')} rated</span></div>
    ${[3, 2, 1].map((v) => `<div><b>${by[v]}</b><span>${starsText(v)}</span></div>`).join('')}
    ${stale ? `<div class="stale-stat"><b>${stale}</b><span>revised since rated</span></div>` : ''}
    <div><b>${kitsDone}</b><span>kits fully rated</span></div>`;
}

function staleNote(r, id) {
  const was = ratedVersion(r, id)?.skill;
  return was && was !== r.skill ? `You rated the earlier version, ${esc(was)}` : 'You rated it before its revision';
}

/** The version of a revised skill that a stale rating was given to. */
function ratedVersion(r, id) {
  const h = r.history ?? [];
  return h[h.length - 1 - (ratings[id]?.v ?? 0)]?.before ?? null;
}

function renderRatings() {
  setMode('plain');
  markNav('ratings');
  document.title = 'Ratings · Fusion Kits';
  main.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Your review</p>
      <h1>Ratings</h1>
      <p class="lead">The stars you've given skills. They're saved in this browser only, so export them to keep a copy or to send them to someone. Importing a file adds its ratings to yours. When a skill you rated is revised, your rating stays, marked as given to the earlier version, until you rate the new one.</p>
    </header>
    <p class="warn" data-storage-warning${storageOk ? ' hidden' : ''}>This browser isn't letting the site save anything, so your ratings will be lost when you leave. Export them before you close the page.</p>
    <div class="stats rating-stats" id="ratingsSummary">${ratingsSummaryHtml()}</div>
    <div class="toolbar ratings-tools">
      <div class="chips" id="starFilter" role="group" aria-label="Show only">${[3, 2, 1]
        .map((v) => `<button type="button" class="chip" data-value="${v}" aria-pressed="false" aria-label="${v} ${v === 1 ? 'star' : 'stars'}">${starsText(v)}</button>`)
        .join('')}<button type="button" class="chip" data-value="stale" aria-pressed="false" title="Skills revised after you rated them">Revised since rated</button></div>
      <div class="chips">
        <button type="button" class="chip" id="exportRatings">Export</button>
        <button type="button" class="chip" id="importRatings">Import</button>
        <input type="file" id="importFile" accept=".json,application/json" hidden>
        <button type="button" class="chip danger" id="clearRatings">Clear all</button>
      </div>
    </div>
    <p class="notice" id="ratingsNotice" role="status"></p>
    <div id="ratingsList"></div>`;

  let filter = null;
  const notice = (text) => ($('#ratingsNotice').textContent = text);
  // Rebuilt only on load, filter or import, so changing a rating here never reshuffles the list under you.
  const renderList = () => {
    const items = ratedItems()
      .filter((it) => !filter || (filter === 'stale' ? it.stale : !it.stale && it.v === filter))
      .sort((a, b) => a.stale - b.stale || b.v - a.v);
    $('#ratingsList').innerHTML = items.length
      ? `<div class="table-wrap"><table class="rows rating-rows">
          <thead><tr><th>Rating</th><th>Skill</th><th>Fusion</th><th>Effect</th></tr></thead>
          <tbody>${items
            .map(
              ({ k, r, id, stale }) => `<tr class="static">
                <td class="c-rate">${starsHtml(id, r.skill)}</td>
                <td class="c-skill"><a href="#/kit/${k.slug}/${baseSlug(r.base)}"><strong>${esc(r.skill)}</strong></a>${revTag(r)}<div class="c-base">${esc(r.base)}</div>${
                  stale ? `<div class="stale-note">${staleNote(r, id)}</div>` : ''
                }</td>
                <td class="c-kit"><a href="#/kit/${k.slug}">${esc(k.name)}</a><div class="mini-parents">${swatch(k.parents)} ${esc(k.parents.join(' + '))}</div></td>
                <td class="c-effect">${effectHtml(k, r.effect)}</td></tr>`,
            )
            .join('')}</tbody></table></div>`
      : `<p class="empty">${
          filter === 'stale'
            ? 'None of the skills you rated have been revised since.'
            : filter
              ? `No skills rated ${filter} ${filter === 1 ? 'star' : 'stars'} yet.`
              : "You haven't rated any skills yet. Use the stars beside each skill on the kit pages."
        }</p>`;
  };
  renderList();

  bindElementChips($('#starFilter'), (v) => {
    filter = v === 'stale' ? 'stale' : v ? Number(v) : null;
    renderList();
  });
  $('#exportRatings').addEventListener('click', () => {
    const n = exportRatings();
    notice(n ? `Exported ${n} ratings.` : 'There are no ratings to export yet.');
  });
  $('#importRatings').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { added, changed, older, skipped } = importRatings(JSON.parse(await file.text()));
      renderList();
      notice(
        `Imported ${added + changed} ratings: ${added} new, ${changed} changed${older ? `, ${older} skipped because yours rate a newer version` : ''}${
          skipped ? `, ${skipped} skipped as invalid` : ''
        }.`,
      );
    } catch {
      notice("That file isn't a ratings export.");
    }
  });
  $('#clearRatings').addEventListener('click', () => {
    const n = Object.keys(ratings).length;
    if (!n || !confirm(`Clear all ${n} ratings? Export them first if you might want them back.`)) return;
    ratings = {};
    saveRatings();
    refreshRatings();
    renderList();
    notice(`Cleared ${n} ratings.`);
  });
}

/** Downloads every rating as JSON, with the fusion and skill names so the file reads on its own. */
function exportRatings() {
  const order = new Map(site.kits.map((k, i) => [k.slug, i]));
  const list = Object.entries(ratings)
    .map(([id, x]) => {
      const [slug, base] = id.split('/');
      const k = kits.get(slug);
      const r = k && rowOf(k, base);
      const stale = isStale(id);
      return {
        id,
        stars: x.s,
        version: x.v,
        fusion: k?.name ?? null,
        base: r?.base ?? base,
        skill: (stale ? ratedVersion(r, id)?.skill : r?.skill) ?? null,
        ...(stale ? { revisedSince: true } : {}),
      };
    })
    .sort((a, b) => (order.get(a.id.split('/')[0]) ?? 999) - (order.get(b.id.split('/')[0]) ?? 999) || site.bases.indexOf(a.base) - site.bases.indexOf(b.base));
  if (!list.length) return 0;
  const body = JSON.stringify({ app: 'fusion-kits', version: 2, exported: new Date().toISOString(), ratings: list }, null, 2);
  const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `fusion-kit-ratings-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return list.length;
}

/** Adds an export's ratings to the ones saved here. The file wins where both rate the same version of a skill;
 *  where one rates a newer version than the other, the newer one wins. */
function importRatings(data) {
  const source = data?.ratings ?? data;
  const entries = Array.isArray(source)
    ? source.map((x) => [
        x?.id ?? `${x?.kit ?? slugify(String(x?.fusion ?? ''))}/${baseSlug(String(x?.base ?? ''))}`,
        { s: x?.stars, v: x?.version ?? 0 },
      ])
    : Object.entries(source ?? {});
  if (!entries.length) throw new Error('empty');
  let added = 0;
  let changed = 0;
  let older = 0;
  let skipped = 0;
  for (const [id, x] of entries) {
    const r = normRating(x);
    if (!r || !/^[a-z0-9-]+\/[a-z]+$/.test(id)) {
      skipped++;
      continue;
    }
    const cur = ratings[id];
    if (cur && cur.v > r.v) {
      older++;
      continue;
    }
    if (!cur) added++;
    else if (cur.s !== r.s || cur.v !== r.v) changed++;
    ratings[id] = r;
  }
  if (!added && !changed && !older && skipped === entries.length) throw new Error('nothing valid');
  saveRatings();
  refreshRatings();
  return { added, changed, older, skipped };
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ---------------------------------------------------------------- changes: every revised skill, before and after

function renderChanges() {
  setMode('plain');
  markNav('changes');
  document.title = 'Changes · Fusion Kits';
  // One entry per revision of a row; the version after a revision is the next revision's "before", or the row as it is.
  const byPass = new Map(site.passes.map((p) => [p.id, []]));
  for (const k of site.kits)
    for (const r of k.rows)
      (r.history ?? []).forEach((h, i) => {
        const after = i === 0 ? r : r.history[i - 1].before;
        byPass.get(h.pass)?.push({ k, r, h, after });
      });
  const passes = [...site.passes].reverse();

  main.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Revision log</p>
      <h1>Changes</h1>
      <p class="lead">Every skill rewritten since the first pass, with its earlier version and why it changed. Rate the new versions right here.</p>
    </header>
    ${
      passes.length
        ? `<div class="toolbar">
      <input class="filter-input" id="chFilter" type="search" placeholder="Filter by fusion, skill or text" aria-label="Filter changes">
      <div class="chips" id="chProblems" role="group" aria-label="Filter by problem">${Object.entries(PROBLEMS)
        .map(([key, p]) => `<button type="button" class="chip" data-value="${key}" aria-pressed="false" title="${esc(p.long)}">${esc(p.label)}</button>`)
        .join('')}</div>
      <div class="chips" id="chEls" role="group" aria-label="Filter by parent element">${elementChips()}</div>
    </div>`
        : '<p class="empty">No skills have been revised yet.</p>'
    }
    ${passes
      .map((p) => {
        const list = byPass.get(p.id);
        const by = {};
        for (const c of list) by[c.h.problem] = (by[c.h.problem] ?? 0) + 1;
        return `<section class="pass">
          <h2 class="sec">${esc(p.title)} <span class="pass-date">${esc(p.date)}</span></h2>
          <p class="lead">${esc(p.summary)}</p>
          <div class="stats">
            <div><b>${list.length.toLocaleString('en-US')}</b><span>skills revised</span></div>
            ${Object.keys(PROBLEMS)
              .filter((key) => by[key])
              .map((key) => `<div title="${esc(PROBLEMS[key].long)}"><b>${by[key]}</b><span>${esc(PROBLEMS[key].label)}</span></div>`)
              .join('')}
          </div>
          <div class="change-list">${list.map(changeHtml).join('')}</div>
          <p class="empty" hidden>No change matches.</p>
        </section>`;
      })
      .join('')}`;
  if (!passes.length) return;

  const filter = $('#chFilter');
  let problem = null;
  let el = null;
  const apply = () => {
    const q = filter.value.trim().toLowerCase();
    for (const sec of $$('.pass', main)) {
      let shown = 0;
      for (const c of $$('.change', sec)) {
        const ok =
          (!q || c.dataset.text.includes(q)) && (!problem || c.dataset.problem === problem) && (!el || c.dataset.parents.split(' ').includes(el));
        c.hidden = !ok;
        if (ok) shown++;
      }
      $('.empty', sec).hidden = shown > 0;
    }
  };
  filter.addEventListener('input', apply);
  bindElementChips($('#chProblems'), (v) => {
    problem = v;
    apply();
  });
  bindElementChips($('#chEls'), (v) => {
    el = v;
    apply();
  });
}

function changeHtml({ k, r, h, after }) {
  const side = (label, s, extra = '') => `<div class="side">
      <span class="side-label">${label}</span>
      <div class="side-head"><strong>${esc(s.skill)}</strong>${costCell(s)}${hookChip(k, s.hook)}${extra}</div>
      <p>${effectHtml(k, s.effect)}</p>
    </div>`;
  const text = `${k.name} ${k.parents.join(' ')} ${r.base} ${h.before.skill} ${after.skill} ${h.before.effect} ${after.effect} ${h.why}`.toLowerCase();
  return `<article class="change" data-problem="${esc(h.problem)}" data-parents="${esc(k.parents.join(' '))}" data-text="${esc(text)}">
    <header class="change-head">
      <a href="#/kit/${k.slug}/${baseSlug(r.base)}"><strong>${esc(k.name)}</strong><span class="c-base">${esc(r.base)}</span></a>
      <span class="mini-parents">${swatch(k.parents)} ${esc(k.parents.join(' + '))}</span>
      <span class="problem-tag p-${esc(h.problem)}" title="${esc(problemOf(h.problem).long)}">${esc(problemOf(h.problem).label)}</span>
    </header>
    <div class="change-body">
      ${side('Before', h.before)}
      ${side('Now', after, after === r ? starsHtml(ratingId(k.slug, r.base), r.skill) : '')}
    </div>
    <p class="why">${esc(h.why)}</p>
  </article>`;
}

// ---------------------------------------------------------------- search

function renderSearch(query) {
  setMode('plain');
  markNav('search');
  document.title = `Search · Fusion Kits`;
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
  for (const k of site.kits) for (const x of k.keywords) if (hit(x.html.replace(/<[^>]+>/g, ''))) kwHits.push({ k, x });
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
                ({ k, x }) => `<li><a href="#/kit/${k.slug}"><div class="r-top"><strong>${esc(x.term)}</strong><span class="muted">${esc(k.name)}</span></div>
                  <p>${mark(x.html.replace(/<[^>]+>/g, ''), query)}</p></a></li>`,
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
                  <span class="muted">${esc(k.name)} · ${esc(r.base)}</span>${costCell(r)}${revTag(r)}${
                    ratings[ratingId(k.slug, r.base)]
                      ? starsText(ratings[ratingId(k.slug, r.base)].s, isStale(ratingId(k.slug, r.base)))
                      : ''
                  }</div>
                  <p>${mark(r.effect, query)}</p></a></li>`,
              )
              .join('')}</ul>${skillHits.length > LIMIT ? `<p class="muted">Showing the first ${LIMIT}; narrow the search to see more.</p>` : ''}`
          : ''
      }
      ${!kitHits.length && !kwHits.length && !skillHits.length ? '<p class="muted">Nothing matches.</p>' : ''}
    </div>`;
}
