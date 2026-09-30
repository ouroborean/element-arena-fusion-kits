# Fusion Spec Kits — First Pass

2026-09-29

Every one of the 55 fusions has a first-draft kit: one or two new core mechanics, and all 30 base skills rebuilt to either use them or cross-wire the two parent elements. This table is the one-line version; the Kits tabs hold every skill.

## At a glance

| Fusion | Parents | Core mechanic | Plays like |
| --- | --- | --- | --- |
| Dragon | Fire + Fire | **Dragonfire**: an Ignite that burns for 10 instead of 5. **Hoard**: +1 whenever the user's burns tick (max 6); every 2 Hoard is 1 Armor; Breath skills spend it for +5 damage each. | Grows hotter and harder, then spends it all on one breath |
| Crystal | Ice + Ice | **Brittle** (max 3, a Frost debuff): +5 direct damage taken per stack; at 3 the next direct hit Shatters for +20 and Shattered. **Diamond**: no single hit deals the bearer more than 15. | Shatter combos on offense, burst-proof allies on defense |
| Ocean | Water + Water | **Crest and Trough**: each Ocean skill alternates between an attacking Crest form and a sustaining Trough form every time it's used. **Brimming**: Renew that would overheal becomes Shield. | A rhythm: plan which half of each skill lands when |
| Thunder | Lightning + Lightning | **Resound**: Thunder damage echoes at half strength at the start of the user's next turn, and each echo grants 1 Charge. **Deafened**: the bearer's counters, reflects and Traps can't trigger. | Hits twice, and switches off the enemy's tricks |
| Cloud | Wind + Wind | **Drift**: the skill lands at the start of the user's next turn, cheaper and stronger, in plain sight. **Aloft**: counts as Leaping for several turns and doesn't end on attacking. | Wind's speed traded for weight: slow, telegraphed, heavy |
| Evolution | Poison + Poison | **Evolve**: each Evolution skill goes up a stage every time it's used (I, II, III), gaining that stage's rider. | Weak openers that become the team's strongest skills |
| Life | Earth + Earth | **Flourish**: healing above max HP raises max HP (up to +30). **Bloom**: a Seedling that lives through two of its creator's turns becomes a 40 HP Treant. | A garden, and a team that keeps getting bigger |
| Divine | Holy + Holy | **Radiant**: the skill can target anyone, with one effect for allies (heal, bless) and one for enemies (damage, condemn). **Exalted**: counts as Anointed; the bearer's Radiant skills hit both sides at once. | Always useful: heal or smite as the turn needs |
| Evil | Unholy + Unholy | **Unhallowed**: healing the bearer receives hurts them instead. **Tithe**: skills spend the user's Soul Fragments for listed bonuses. | Punishes healers, feeds on souls |
| Dimension | Shadow + Shadow | **Banished**: out of the fight until the end of the bearer's next turn; can't act or be targeted, effects frozen. **Entangled**: two linked units; any effect applied to one also applies to the other. | Takes a unit out of play; makes one effect count twice |
| Apocalypse | Fire + Ice | **Frostfire**: counts as both Ignite and Chilled. **Thermal Shock**: a unit with a Fire debuff that gains a Frost debuff, or the reverse, takes 15 Piercing and is Shattered for 1 turn. | Alternate fire and ice for combo damage |
| Alchemy | Fire + Water | **Transmute**: turns effects on a unit into others, stack for stack (an enemy's Renew into Ignite, an ally's Toxin into Renew). **Catalyst**: the next skill that affects the bearer is doubled for them. | Converts the board: their buffs become your weapons |
| Plasma | Fire + Lightning | **Heat**: Plasma skills and gaining Charge add Heat (max 5), each worth +5 damage; at 5 the user Melts Down, taking 20 and dealing 20 to every enemy. Vent skills shed Heat. | Push your luck, then time the meltdown |
| Mechanic | Fire + Wind | **Contraptions**: machine minions that can't be healed but ignore Stun, Sleep and Confusion. **Upgrade**: raises an allied minion a level (+10 max HP, +5 damage, up to 3). | A small workshop of machines, built and tuned |
| Brimstone | Fire + Poison | **Sulfur** (max 4): inert until the bearer burns or Explodes, then Erupts for 10 Affliction per stack (5 to their allies) and turns into Toxin. | Load them up, then light the fuse |
| Sun | Fire + Earth | **Corona** (max 3): at the end of the bearer's turn, 5 Affliction per stack to every enemy and 5 healing per stack to every ally. **Solar Flare**: skills that spend all Corona for a burst. | A slow-burning star on your side of the board |
| Judgment | Fire + Holy | **Sin**: an Accused enemy gains 1 Sin, which never fades, for each Harmful skill they use. **Sentence**: skills consume all Sin for a payoff per Sin. | The enemy convicts themselves; then they burn for it |
| Devil | Fire + Unholy | **Contract**: a benefit now and a price when it ends; if the bearer dies first, the Devil gains 2 Soul Fragments. **Hellfire**: an Ignite that also Horrifies. | Deals for allies, tempting gifts for enemies |
| Ritual | Fire + Shadow | **Rite**: a visible count on the user that completes once they've used 2 or 3 more skills, with the effect its skill named. Stun or Sleep breaks it. | Big payoffs the enemy must race to interrupt |
| Glacier | Ice + Water | **Icebound**: the bearer's cooldowns don't tick down. **Meltwater**: the bearer's cooldowns tick down twice as fast. | Freeze their clock, speed up yours |
| Aurora | Ice + Lightning | **Shimmer**: the bearer pays colored costs with any color. **Dazzled**: at the start of the bearer's turn, one of their player's energies changes to a random color. | The energy-color kit: free yourself, scramble them |
| Winter | Ice + Wind | **Snowbound**: the bearer is Immobile, loses its mobility buffs and can't gain them; counts as a Frost debuff. | Pins targets down, then uses Wind's tools against the Immobile |
| Stasis | Ice + Poison | **Suspended**: the bearer's effects don't tick or lose duration. When it ends they **Thaw**: all their Toxin hits at once, doubled. | Freeze the poison, then release it all |
| Myth | Ice + Earth | **Legend**: each Myth skill gives its user 1; at 3 they become **Mythic** for 3 turns (+20 max HP, 2 Armor, can't be Stunned) and their skills gain Mythic riders. | A hero who becomes a giant of legend |
| Prism | Ice + Holy | **Refract**: the skill also hits one more unit on the same side for half. **Lens**: the bearer's next single-target skill doesn't refract and is 50% stronger. | Split light to spread it, focus it to burst |
| Lich | Ice + Unholy | **Phylactery**: a minion holding the user's soul; while it stands, the user can't drop below 1 HP. **Soulfrost**: a Frost debuff that gives the Lich a Soul Fragment when the bearer takes direct damage. | Break the jar first, or the Lich won't die |
| Night | Ice + Shadow | **Dusk**: a hidden countdown that strikes **Midnight**, a Frozen Sleep damage can't break. **Dormant**: an ally stops acting to become untargetable and build Shield. | The cold that comes unseen, on a clock only you can see |
| Current | Water + Lightning | **Soaked**: +5 damage taken from Current skills; when a Current skill damages a Soaked unit, every other Soaked unit on that side takes the same. | Soak the team, and one hit becomes three |
| Mist | Water + Wind | **Fog**: an enemy single-target skill aimed at a Fogged ally hits a random member of that team instead. | Hides who is vulnerable; shields a carry by chance |
| Serum | Water + Poison | **Dose** (any unit): heals 5 per stack each turn; at 4 stacks the bearer **Overdoses**, taking 10 Affliction per stack and losing all Dose. | Medicine for allies, an overdose for enemies |
| Slime | Water + Earth | **Oozes**: minions that Split into a second Ooze with half the HP when a hit doesn't kill them (max 4). **Engulf**: an Ooze keeps an enemy Stunned while it lives. | A multiplying swarm that is hard to clear |
| Anointment | Water + Holy | **Unction** (stacks): at the end of the bearer's turn, one stack removes a Debuff and heals 10. **Chrism**: counts as Anointed, and Anoints the allies its bearer helps. | Steady cleansing; Holy's Anoint shared around |
| Blood | Water + Unholy | **Blood Price**: the skill's random costs are paid with 10 HP each instead of energy. **Hemorrhage**: 5 damage per stack each turn, gaining a stack each time, until the bearer is healed. | Health spent as energy; bleeds that worsen until treated |
| Mirror | Water + Shadow | **Reflect**: reflects the next Harmful, Strategic or even Helpful skill aimed at the bearer. **Mimic**: uses a copy of the last skill the target used. | Turns the enemy's kit against them |
| Storm | Lightning + Wind | **Tempest** (team, max 5): +1 per Storm skill used, −1 at the end of any turn without one. Storm skills scale with it; at 5 the next one also hits every enemy. | Feed the storm every turn, or it dies down |
| Battery | Lightning + Poison | **Cells**: the user stores Charge past the cap (max 5) and spends it on Discharge skills. **Corroded**: the bearer's Shield loses 10 each turn and they can't gain Armor. | Charge up slowly while eating through defenses |
| Magnet | Lightning + Earth | **Attract**: moves Armor, Shield, Charge or Might from an enemy to the user. **Repel**: moves Debuffs from an ally onto an enemy. | Steals defenses and pushes problems back |
| Vengeance | Lightning + Holy | **Vow**: while it lasts, the bearer gains 1 **Wrath** (max 3) whenever an enemy damages them. Each Wrath adds 10 to their next direct damage and gives 1 Charge. | Hurt us, and we hit back harder |
| Reanimation | Lightning + Unholy | **Galvanized**: a bearer who dies returns at the end of the turn with 30 HP, **Reanimated**: can't be healed, loses 5 HP a turn. Once per character per match. | Revival with a jolt, and a shelf life |
| Ion | Lightning + Shadow | **Suppressed**: the bearer's Buffs do nothing. **Blackout**: the bearer's minions can't act and their channels pause. | An EMP for buffs, minions and channels |
| Faerie | Wind + Poison | **Charmed**: the bearer's single-target Harmful skills hit a random unit, their own team included. | Fae mischief: enemies hitting their friends |
| Nomad | Wind + Earth | **Trek** (max 3): +1 each turn the user uses a different skill than last turn; repeating or resting resets it. Nomad skills scale with Trek. | Never stay still: rotate skills to stay strong |
| Angel | Wind + Holy | **Guardian**: the first Harmful skill aimed at a Guarded ally each turn targets the Angel instead. **Halo**: the first time the bearer would die, they heal to 25 instead. | Takes the hits, and saves lives |
| Ghost | Wind + Unholy | **Spectral**: the bearer takes no Normal damage. **Haunt**: a spirit that deals 10 Affliction to its bearer each turn, then drifts to one of their allies. | Hard to hit; a haunting that wanders their team |
| Ninja | Wind + Shadow | **Shadow Clones** (5 HP, max 3): each repeats the Ninja's Harmful skills for 5 Piercing, and one takes the next single-target skill aimed at the Ninja. | Many small cuts, and a decoy for every threat |
| Spore | Poison + Earth | **Spores** (stacks): a bearer with 2 or more passes 1 to an ally each turn; at 3, a Mushroom minion sprouts from them for the Spore player. | Infect one, and the colony spreads |
| Antidote | Poison + Holy | **Inoculated**: the next Debuff on the bearer is prevented, and they're immune to it for 3 turns. **Purge**: removes an ally's Debuffs and deals 10 Affliction to an enemy per Debuff removed. | Protection that learns; cleansing that hits back |
| Blight | Poison + Unholy | **Withered** (stacks): −5 max HP per stack until cleansed. **Festering**: Toxin on a Withered unit grows by 1 each turn. | Rot: permanent attrition that only cleansing answers |
| Assassin | Poison + Shadow | **Death Mark** (hidden): Assassin skills deal +10 to the bearer, and execute them at 25 HP or less. | A hidden contract: they never know who's marked |
| Sanctuary | Earth + Holy | **Sanctum** (team, levels 1–3): each level gives every ally 1 Armor and 5 healing a turn; at 3 allies can't be Stunned. **Wardstone**: a Boulder that stops the Sanctum from expiring. | Holy ground: a fortress for the whole team |
| Grave | Earth + Unholy | **Graves** (team, max 6): +1 whenever any unit or minion dies. **Raise**: skills spend Graves to create Undead minions. | Every death, on either side, feeds the army |
| Moon | Earth + Shadow | **Lunar Cycle**: the phase advances at the end of each of the player's turns (New, Waxing, Full, Waning), and Moon skills have a rider for each. | A four-beat rhythm: hide, grow, strike, drain |
| Zealot | Holy + Unholy | **Fervor** (max 5): granted by Zealot skills, then +1 whenever the bearer takes damage or a Debuff; +5 damage and healing per stack on Zealot skills. **Martyr**: when a unit with Fervor dies, every ally heals 10 per stack. | Suffering fuels faith; even death helps |
| Vigilante | Holy + Shadow | **Exposed**: the bearer can't become Stealthed, Invulnerable, Untargetable or Invisible, and their Invisible effects are revealed. Vigilante skills deal +10 to them. | Works from the shadows to drag the enemy's into the light |
| Curse | Unholy + Shadow | **Hexes**: debuffs that each punish one kind of action. **Lingering**: when a Hexed unit dies or is cleansed, the Hex jumps to one of their allies. | Curses that punish choices and refuse to leave |

## Kit rules

Every kit follows the same shape, so any two kits can be compared skill by skill.

- **All 30 skills, same jobs.** Each kit rebuilds every base skill, and each keeps its base skill's job and targeting: Strike stays a cheap single hit, Heal still heals, Riposte is still a one-turn trick. A class keeps its role whichever of its skills gets fused.
- **One step above the parents, sideways.** Two infusions are spent, so a fusion skill is worth about one step more than its parents' versions at a similar cost. That step buys something new: a mechanic neither parent's version of the skill has, from the fusion's keywords or from a parent's wider toolkit. A fusion skill is never a parent's version with bigger numbers or the kit's keyword swapped in, and never both parents' versions added together.
- **Each skill works alone.** A character rarely has more than one or two fusion skills, so no fusion skill depends on another skill from its own kit. Each either sets up and pays off its own mechanic, or pays off its parents' statuses, which the character's native element and teammates usually supply.
- **Signature, texture and unique.** About two-thirds of each kit uses the core mechanic. Most of the rest (Hook: Texture) open new synergies for one parent's play style: they bend, feed or spend that parent's statuses in ways its own skills don't, so a character built mostly on that parent still wants them. At most two per kit bridge the parents, with one parent's status setting up the other's. Pure fusions push their element's play in new directions. Each kit also has one or two Unique skills (Hook: Unique): general utility, a new take on the base skill that no other element or kit has.
- **Few new words.** Each kit adds at most two keywords (Night keeps a third, First Light). New statuses stack and expire like existing ones unless the kit says otherwise.
- **Minions.** Companion summons a permanent minion and Summon a 3-turn one, each with one or two skills paid from the owner's energy, as in the parent elements.
- **Names.** No skill reuses an existing skill's name.

Notation: S, A, I and W are Strength, Agility, Intelligence and Wisdom energy; r is random; nc is no cost. CD is the cooldown in the owner's turns, and "for N turns" works as on the base sheet. Hook names the core mechanic a skill uses, or Texture or Unique. Numbers are first-pass placeholders for the sim pass; this pass is about identity.

## The kits

All 55 kits are under <?claude block kits?>, in eight tabs: the ten pure fusions first, then the cross fusions grouped by their first parent in the codex's order. Each kit opens with its core mechanics, then a 30-row table from Strike to Titan.

## Engine additions

Most of the 1,650 skills use effects the engine already has. The new mechanics fall into about 15 families; the first three cover about a third of the kits.

| Addition | What it does | Kits that need it |
| --- | --- | --- |
| Stack thresholds | A status that fires an effect at N stacks, then clears or converts | Crystal, Brimstone, Serum, Spore, Plasma, Myth, Blood |
| Unit and team counters | A resource on a unit or a side, visible to both players | Dragon, Battery, Nomad, Ritual, Storm, Grave, Sanctuary, Moon |
| Per-skill state | A counter stored on the skill itself | Evolution, Ocean |
| Target redirection | Changes a skill's target after it's chosen, or lets it target either side | Mist, Faerie, Angel, Ninja, Prism, Divine |
| Copying and moving effects | Copies, moves, converts or doubles effects between units | Dimension, Magnet, Alchemy, Current, Curse, Ghost, Spore |
| Delayed and repeated resolution | Skills that land later, or hit again | Cloud, Thunder, Zealot (Martyr's Spear), Devil (prices on expiry) |
| Timer control | Freezes, deepens or speeds up durations and cooldowns | Stasis, Night, Glacier, Dimension |
| Switching things off | Disables a category of effect, or inverts healing | Ion, Thunder, Vigilante, Evil |
| HP model | Max HP changes, HP as a cost, per-hit damage caps, immunity to a damage type | Life, Blight, Myth, Blood, Crystal, Ghost |
| Death and revival | Revives, death saves and on-death effects | Reanimation, Angel, Lich, Zealot, Grave, Assassin |
| Minion behavior | Splitting, merging, upgrades, transformations, attacks that echo | Slime, Mechanic, Life, Grave, Ninja |
| Skill copying | Uses another unit's last skill | Mirror |
| Energy colors | Changes a player's energy colors, or ignores color in costs | Aurora |
| Immunity by name | Immune to one named Debuff | Antidote |
| Reflecting Helpful skills | Lands an enemy's buff on your side instead | Mirror |

Already supported and used throughout: hidden effects, on-expire hooks, force-expiring an effect, counters and reflects, channels, minions, Poison's stack conversions and Devour's executes.

## Open questions

- **Names.** The kits use the codex's names, but a few already lean toward the renames I suggested earlier: Ion plays as Blackout, Nomad as Sandstorm, and Sun could become Magma by swapping Corona for molten Boulders. Renaming is cheap now; which do you want?
- **Resource kits.** Eight kits track a counter (Hoard, Heat, Cells, Trek, Rite, Tempest, Graves, Sanctum), plus Legend, Fervor and Moon's phase. Is that too many kits that feel alike, or fine because each builds and spends differently?
- **Pilot first.** Rather than tuning 1,650 skills at once, I suggest building three kits that exercise different additions: Dragon (counters; the easiest fusion to reach), Night (hidden clocks; already reviewed) and Mirror (Mimic and Reflect). Then revise the rest with what they teach, and sim.
- **Keyword load.** The kits add about 100 new terms. The glossary and Alt-hover help carry that, but reusing one generic mechanic (for example, a single stack-threshold template) across several fusions would cut the count.
- **Hidden information.** Night's Dusk and Assassin's Death Mark hide debuffs from the enemy, on top of Shadow's invisible counters. Is that the right amount of hidden state?
- **Minion cap.** Slime, Ninja, Grave, Life, Spore and Mechanic all make many minions, and the client shows 4 per side. Should the rules set a hard cap per side?
- **Setup-only payoffs.** A few skills (Stasis's Thaw, Judgment's Sentences, Alchemy's Transmutes) do little without setup from teammates. Is that acceptable, or should every fusion skill have a baseline effect?

## Revisions

| Date | Pass | What changed |
| --- | --- | --- |
| 2026-09-30 | Evolution pass | 1,440 of the 1,650 skills rewritten, because each stitched both parents' versions together (443), put the kit's keyword in place of a parent's status or tacked it on (635), made a parent's version stronger (241), or nearly copied another skill (89); 32 more were renames or clarifications. Each now adds a mechanic neither parent's version of the skill has. The "One step above the parents" rule now says so, ten kits' keywords gained a clarifying sentence (Ocean, Evolution, Current, Mist, Serum, Moon, Assassin, Sanctuary, Angel, Ninja), and Dragon's Breath number in the table above now matches its kit. |
| 2026-09-30 | Texture and Unique pass | 311 skills rewritten. 225 Texture skills now open new synergies for one parent's play style, where 141 had needed both parents' statuses and 49 followed the same "effect, then if this status, that" formula (35 more were upgrades, near-copies or other fixes). At most two per kit still bridge the parents. Each kit also gained one or two Unique skills, 86 in all: general utility, a new take on its base skill that no other element or kit has (Hook: Unique). The kit rule "Signature, texture and unique" now says so. |

