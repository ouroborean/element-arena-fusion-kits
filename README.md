# Element Arena · Fusion Kits

A player reference for Element Arena's 55 fusion elements: each fusion's keywords and all 30 of its skills, exactly as the game has them, with every skill shown beside its base skill and its parent elements' versions. It also has the base skills, each element's versions of them, and the game's statuses and rules terms.

Live at **https://ouroborean.github.io/element-arena-fusion-kits/**. It's a companion to the [Element Arena Codex](https://ouroborean.github.io/element-arena-codex/).

## What's where

- **Overview:** how fusions work, the fusion matrix, and every fusion at a glance with its keywords.
- **Kit pages** (`#/kit/dragon`): a fusion's keywords and passives, and its 30 skills. Filter the skills by the keyword they use, or click one to compare it with the base skill and its parents' versions. Links to a skill are shareable, for example `#/kit/night/stun`.
- **Base skills** (`#/base`): the 30 base skills with no infusion, with a tab for each element's single-infusion versions (`#/base/fire`). Each skill links to its Compare page.
- **Compare skills** (`#/skill/strike`): one base skill across all 10 elements and all 55 fusions, filterable by element.
- **Keywords** (`#/keywords`): every fusion keyword and passive, grouped by fusion.
- **Statuses & terms** (`#/statuses`): the core statuses, each element's statuses and terms, and the rules terms from the game's glossary. Each entry has its own link, such as `#/statuses/might`, and the words in skill text that mean one (in the forms the game's tooltips recognize) link to it; a skill's detail panel also defines them.
- **Search:** press `/` anywhere. It covers kits, keywords, statuses and terms, base and element skills, and fusion skills.

The site is public but asks search engines not to index it (`robots.txt` and a `noindex` tag), so it's only found through its link.

## Updating from the game

Every skill (name, cost, cooldown, effect), keyword, passive, status and rules term comes from the game's content in the Custom Arena repo, so the site is updated by rebuilding its data from there:

```sh
node scripts/build-data.mjs "../Custom Arena"
```

The argument is the path to the Custom Arena repo (`../Custom Arena` is the default). The build uses the game's own `yaml` package, so install the game's dependencies first. It reads `packages/content/data/`:

- `elements/fusions.yaml`: the 55 fusions, their parent elements and their passives.
- `fusions/<fusion>/skills.<fusion>.yaml`: each fusion's 30 skills (ids `<base skill>.<fusion>`, such as `strike.dragon`).
- `fusions/<fusion>/glossary.<fusion>.yaml` and `statuses.<fusion>.yaml`: its keywords. A glossary entry has its own `text`, or names a status whose `description` is the text. Passives are statuses too.
- `base/skills.yaml` and `<element>/skills.<element>.yaml`: the base skills and their single-element versions, shown beside each fusion skill and on the Base skills page.
- `base/statuses.yaml` and `<element>/statuses.<element>.yaml`: the core statuses and each element's (an element may have none; Earth has only glossary terms). Each needs a `name`, a `kind` (Buff, Debuff or Neutral) and a `description`.
- `base/glossary.yaml`: the rules terms. As with fusion glossaries, an entry has its own `text` or names a status (and its own `text` then replaces the status's description, as for Trap). Entries with an `element` are listed with that element; the rest are the rules terms. Their `forms` are the words the site links in skill text.

It writes `data/site.json` (the kits), `data/reference.json` (base and single-element skills) and `data/statuses.json` (statuses and rules terms). If anything is missing, such as a fusion without all 30 skills, a glossary entry naming a status that doesn't exist, or a status without a description, it lists the problems and writes nothing. Commit the rebuilt data.

`content/` holds the site's own words, nothing mechanical: `overview.md` (the overview's intro and "How fusions work"), and one file per group of kits in the sidebar, each with the group's intro and, for every fusion, a `## Name — Element + Element` heading, an italic tagline, a `Plays like:` line and optional notes. Keep them consistent with the game when a fusion is reworked, and rebuild after editing them.

## Previewing locally

```sh
node scripts/serve.mjs
```

Then open http://localhost:5190. There are no dependencies to install and nothing to build for the page itself. GitHub Pages serves the repository root from `main`.
