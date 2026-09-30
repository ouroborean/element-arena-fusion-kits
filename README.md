# Element Arena · Fusion Kits

A browsable site for the first-pass kits of all 55 fusion elements: each fusion's core mechanics and all 30 of its skills, with every skill shown beside its base skill and its parent elements' versions.

Live at **https://ouroborean.github.io/element-arena-fusion-kits/**. It's a companion to the [Element Arena Codex](https://ouroborean.github.io/element-arena-codex/).

## What's where

- **Overview:** the fusion matrix, a one-line summary of every kit, the rules all kits follow, the engine features they'd need, and open questions.
- **Kit pages** (`#/kit/dragon`): a fusion's mechanics and its 30 skills. Click a skill to compare it with the base skill and its parents' versions. Links to a skill are shareable, for example `#/kit/night/stun`. Each skill's hook is one of the kit's core mechanics, Texture (new synergies for one parent's play style) or Unique (utility no other kit has).
- **Compare skills** (`#/skill/strike`): one base skill across all 10 elements and all 55 fusions, filterable by element.
- **Keywords** (`#/keywords`): every new term, grouped by fusion.
- **Ratings** (`#/ratings`): give any skill 1 to 3 stars with the stars beside it (click the current star again to clear it). This page lists what you've rated, filters by star count, and exports or imports ratings.
- **Changes** (`#/changes`): every skill rewritten since the first pass, with its earlier version and why it changed. It filters by kind of problem and by element, and you can rate the new versions there. Revised skills also carry a Revised tag on the kit pages, which can filter to them, and the details panel shows each one's earlier version.
- **Search:** press `/` anywhere.

Ratings are saved in the browser you rate in, so they survive reloads and restarts but don't follow you to another browser or device, and a site running from `localhost` keeps its own set. Export them to back them up or to send them to someone. Importing adds a file's ratings to yours; where both rate the same skill, the file wins, unless yours rates a newer version.

When a skill you've rated is revised, your rating stays but is marked as given to the earlier version (dashed stars), and the skill counts as unrated until you rate the new text. The Ratings page's "Revised since rated" filter lists them.

The site is public but asks search engines not to index it (`robots.txt` and a `noindex` tag), so it's only found through its link.

## Updating the kits

The kit text lives in `content/`, one Markdown file per tab of the "Fusion Spec Kits" design doc. To change a kit, edit its file, keeping the doc's shape: a `## Name — Parent + Parent` heading, an italic tagline, keyword bullets, then the 30-row table. Then rebuild the data and commit both:

```sh
node scripts/build-data.mjs
```

A revision pass that rewrites many skills goes through `scripts/apply-revisions.mjs` instead, so the site can show what changed. It takes a pass file (`{ "id", "date", "title", "summary" }`) and one or more change files (`{ "revised": [{ kit, base, skill, cost, cd, hook, effect, problem, why }], "kept": [...] }`). It validates names, costs and hooks, then rewrites the table rows and logs each skill's before and after in `content/revisions.json`. Add `--check` to validate without writing. Running it again on the same pass is safe.

```sh
node scripts/apply-revisions.mjs pass.json changes.json --check
```

`data/reference.json` holds the game's own base and single-element skills. Rebuild it when those change, pointing at the Custom Arena repo:

```sh
node scripts/build-reference.mjs "../Custom Arena"
```

## Previewing locally

```sh
node scripts/serve.mjs
```

Then open http://localhost:5190. There's no build step and there are no dependencies. GitHub Pages serves the repository root from `main`.
