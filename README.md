# Element Arena · Fusion Kits

A browsable site for the first-pass kits of all 55 fusion elements: each fusion's core mechanics and all 30 of its skills, with every skill shown beside its base skill and its parent elements' versions.

Live at **https://ouroborean.github.io/element-arena-fusion-kits/**. It's a companion to the [Element Arena Codex](https://ouroborean.github.io/element-arena-codex/).

## What's where

- **Overview:** the fusion matrix, a one-line summary of every kit, the rules all kits follow, the engine features they'd need, and open questions.
- **Kit pages** (`#/kit/dragon`): a fusion's mechanics and its 30 skills. Click a skill to compare it with the base skill and its parents' versions. Links to a skill are shareable, for example `#/kit/night/stun`.
- **Compare skills** (`#/skill/strike`): one base skill across all 10 elements and all 55 fusions, filterable by element.
- **Keywords** (`#/keywords`): every new term, grouped by fusion.
- **Search:** press `/` anywhere.

The site is public but asks search engines not to index it (`robots.txt` and a `noindex` tag), so it's only found through its link.

## Updating the kits

The kit text lives in `content/`, one Markdown file per tab of the "Fusion Spec Kits" design doc. To change a kit, edit its file, keeping the doc's shape: a `## Name — Parent + Parent` heading, an italic tagline, keyword bullets, then the 30-row table. Then rebuild the data and commit both:

```sh
node scripts/build-data.mjs
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
