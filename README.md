# Element Arena · Fusion Kits

A player reference for Element Arena's 55 fusion elements: each fusion's keywords and all 30 of its skills, exactly as the game has them, with every skill shown beside its base skill and its parent elements' versions.

Live at **https://ouroborean.github.io/element-arena-fusion-kits/**. It's a companion to the [Element Arena Codex](https://ouroborean.github.io/element-arena-codex/).

## What's where

- **Overview:** how fusions work, the fusion matrix, and every fusion at a glance with its keywords.
- **Kit pages** (`#/kit/dragon`): a fusion's keywords and passives, and its 30 skills. Filter the skills by the keyword they use, or click one to compare it with the base skill and its parents' versions. Links to a skill are shareable, for example `#/kit/night/stun`.
- **Compare skills** (`#/skill/strike`): one base skill across all 10 elements and all 55 fusions, filterable by element.
- **Keywords** (`#/keywords`): every fusion keyword and passive, grouped by fusion.
- **Search:** press `/` anywhere.

The site is public but asks search engines not to index it (`robots.txt` and a `noindex` tag), so it's only found through its link.

## Updating from the game

Every skill (name, cost, cooldown, effect), keyword and passive comes from the game's content in the Custom Arena repo, so the site is updated by rebuilding its data from there:

```sh
node scripts/build-data.mjs "../Custom Arena"
```

The argument is the path to the Custom Arena repo (`../Custom Arena` is the default). The build uses the game's own `yaml` package, so install the game's dependencies first. It reads `packages/content/data/`:

- `elements/fusions.yaml`: the 55 fusions, their parent elements and their passives.
- `fusions/<fusion>/skills.<fusion>.yaml`: each fusion's 30 skills (ids `<base skill>.<fusion>`, such as `strike.dragon`).
- `fusions/<fusion>/glossary.<fusion>.yaml` and `statuses.<fusion>.yaml`: its keywords. A glossary entry has its own `text`, or names a status whose `description` is the text. Passives are statuses too.
- `base/skills.yaml` and `<element>/skills.<element>.yaml`: the base skills and their single-element versions, shown beside each fusion skill.

It writes `data/site.json` (the kits) and `data/reference.json` (base and single-element skills). If anything is missing, such as a fusion without all 30 skills or a glossary entry naming a status that doesn't exist, it lists the problems and writes nothing. Commit the rebuilt data.

`content/` holds the site's own words, nothing mechanical: `overview.md` (the overview's intro and "How fusions work"), and one file per group of kits in the sidebar, each with the group's intro and, for every fusion, a `## Name — Element + Element` heading, an italic tagline, a `Plays like:` line and optional notes. Keep them consistent with the game when a fusion is reworked, and rebuild after editing them.

## Previewing locally

```sh
node scripts/serve.mjs
```

Then open http://localhost:5190. There are no dependencies to install and nothing to build for the page itself. GitHub Pages serves the repository root from `main`.
