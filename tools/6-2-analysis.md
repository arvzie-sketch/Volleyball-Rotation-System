# 6-2 System — Position Analysis

## What is the 6-2?

### ELI5
> Imagine you have 6 players who take turns attacking and 2 setters who take turns setting from the **back row**. Whichever setter is in the back row runs to the front to set, while the other setter (in the front row) plays as a regular hitter. This means you **always have 3 attackers at the net** — that's the "6" in 6-2 (6 hitters, 2 setters).

### Key Difference from 4-2
- **4-2**: Front-row setter sets. Back-row setter hides/plays defense. Only 2 front-row attackers.
- **6-2**: Back-row setter penetrates to the front to set. Front-row setter hits as right-side attacker. Always 3 front-row attackers.

### Key Difference from 5-1
- **5-1**: One setter, always sets (from front or back row). Has an opposite hitter.
- **6-2**: Two setters alternate. Same lineup as 4-2. No dedicated opposite — the front-row setter fills that role.

---

## Lineup

Same as 4-2: **S1, M1, H2, S2, M2, H1** (Z1→Z6 in R1)

Setters are 3 apart (opposite each other). One is always front-row, one always back-row.

| Rot | Z1 | Z2 | Z3 | Z4 | Z5 | Z6 | FR Setter (hits) | BR Setter (sets) | BR Setter Zone |
|-----|----|----|----|----|----|----|-------------------|-------------------|----------------|
| 1   | S1 | M1 | H2 | S2 | M2 | H1 | S2                | S1                | Z1             |
| 2   | H1 | S1 | M1 | H2 | S2 | M2 | S1                | S2                | Z5             |
| 3   | M2 | H1 | S1 | M1 | H2 | S2 | S1                | S2                | Z6             |
| 4   | S2 | M2 | H1 | S1 | M1 | H2 | S1                | S2                | Z1             |
| 5   | H2 | S2 | M2 | H1 | S1 | M1 | S2                | S1                | Z5             |
| 6   | M1 | H2 | S2 | M2 | H1 | S1 | S2                | S1                | Z6             |

---

## Libero Convention

Same as 5-1 / 4-2-libero-for-middles: **Libero replaces the back-row middle**.

| Rot | BR Middle | Zone | Serving: Libero? | Receiving: Libero? |
|-----|-----------|------|------------------|--------------------|
| 1   | M2        | Z5   | YES              | YES                |
| 2   | M2        | Z6   | YES              | YES                |
| 3   | M2        | Z1   | **NO** (M2 serves) | YES             |
| 4   | M1        | Z5   | YES              | YES                |
| 5   | M1        | Z6   | YES              | YES                |
| 6   | M1        | Z1   | **NO** (M1 serves) | YES             |

---

## Setter Penetration

The back-row setter must penetrate to front-right `[600,100]` to set. The penetration path depends on which zone the setter starts in:

### Penetration by Zone

| BR Setter Zone | Pre-Contact Position | Path to Setting Position | Difficulty |
|----------------|---------------------|--------------------------|------------|
| Z1 (R1, R4)    | [840, 700] (deep right) | Short diagonal to [600,100] | **Easy** — shortest path |
| Z5 (R2, R5)    | [350, 150] (left, sneaking forward) | Long diagonal to [600,100] | **Hard** — longest path, tight overlap |
| Z6 (R3, R6)    | [510, 200] (center, sneaking forward) | Medium path to [600,100] | **Medium** |

### ELI5 — Penetration
> When the opponent is about to serve, the back-row setter can't just stand at the net (overlap rules). They have to hide behind their front-row buddy. The moment the ball is served, they sprint to the front-right corner to set. From Z1 (back-right), this is easy — just run forward. From Z5 (back-left), it's a long diagonal run across the court!

### Overlap Constraints During Penetration (receivingPass)

The setter at Z5 is the tightest case. They must satisfy:
- `Z5.y > Z4.y` (must be behind front-row Z4 player)
- `Z5.x < Z6.x` (must be left of Z6 player)

With S2 at [350, 150] and H2 at Z4 [200, 100]: Z4.y=100 < Z5.y=150 ✓ (only 50 units margin!)

---

## Serve-Receive Formations (receivingPass)

### Stacking Strategy

Same stacking as 4-2, determined by the FR setter's zone:

| FR Setter Zone | Stack | FR Setter Position | Back-Row Setter Position |
|----------------|-------|--------------------|--------------------------|
| Z4 (R1, R4)    | **LEFT STACK** | [60, 60] far-left corner | [840, 700] deep right |
| Z2 (R2, R5)    | **SPREAD** | [700, 100] already right | [350, 150] sneaking forward |
| Z3 (R3, R6)    | **RIGHT STACK** | [550, 100] sliding right | [510, 200] center forward |

### Passers

With the libero replacing the back-row middle, the receiving back row has:
- **Libero**: Primary passer
- **Back-row OH**: Primary passer
- **Back-row setter**: Does NOT pass (penetrating to set)

This gives **2 effective passers** (L + OH), same as the 5-1. The back-row setter is busy running to the setting position.

### Position Details

**R1 (Left Stack, S1 penetrates from Z1):**
- S2 tucks far-left [60,60], H2 left-center [200,100], M1 center-right [400,100]
- S1 hides deep right [840,700] → sprints to [600,100] after contact
- L [200,600], H1 [450,700] — two back-row passers

**R2 (Spread, S2 penetrates from Z5):**
- H2 left [200,100], M1 center [450,100], S1 right [700,100]
- S2 sneaks forward from Z5 [350,150] → sprints right to [600,100]
- H1 [700,600], L [450,700] — two back-row passers

**R3 (Right Stack, S2 penetrates from Z6):**
- M1 left [200,100], S1 right-center [550,100], H1 right [700,100]
- S2 positioned center [510,200] → short run to [600,100]
- L [700,600], H2 [200,600] — two back-row passers

**R4–R6**: Mirror of R1–R3 with S1↔S2, M1↔M2, H1↔H2 swapped.

---

## Attack Phase (receivingSet / receivingAttack)

After serve contact, the back-row setter sprints to [600,100] to set. The front-row setter becomes the right-side hitter.

### Front-Row Attack Positions

| Phase | OH (left) | Middle (center) | FR Setter as Hitter (right) |
|-------|-----------|-----------------|------------------------------|
| receivingSet (approaching) | [0, 300] | [450, 300] | [900, 300] |
| receivingAttack (at net) | [100, 100] | [450, 100] | [800, 100] |

### Back-Row Defense During Attack

| Player | Position | Role |
|--------|----------|------|
| Libero | [200, 600] | Left-back defense |
| Back-row OH | [450, 300–600] | Pipe attack approach / defense |

---

## Switch Positions (after rally)

### receivingSwitch
- **Front**: OH left [200,100], Middle center [450,100], FR setter-as-hitter right [700,100]
- **Back**: BR setter right-back [700,600] (ready for transition setting), L left-back [200,600], OH pipe [450,700]

### servingSwitch
Same as 4-2-libero-for-middles (identical positioning for serving phases).

---

## Serving Phases

**Identical to 4-2-libero-for-middles** for all serving phases (base, serve, switch). The lineup is the same, the libero replacement is the same, and the serving team positions for defense regardless of system.

The only behavioral difference: in transition (after the opponent attacks), the back-row setter will set rather than play pure defense. But the starting positions are the same.

---

## Comparison: 6-2 vs 4-2 vs 5-1

| Aspect | 4-2 | 6-2 | 5-1 |
|--------|-----|-----|-----|
| Front-row attackers | 2 | **3** | 2 or 3 (varies) |
| Who sets | FR setter | **BR setter** (penetrates) | Single setter (always) |
| Setter runs needed | None (already at net) | **Every rally** (penetration) | When in back row |
| Lineup complexity | Simple | Medium | Medium |
| Best for | Beginners, two equal setters | Teams wanting 3 hitters always | Competitive, one elite setter |
| Libero replaces | Middle or setter | **Middle** | **Middle** |

---

## Position Derivation

1. **Serving phases (servingBase, servingServe, servingSwitch)**: Identical to 4-2-libero-for-middles — same lineup, same libero, same defensive positioning.

2. **receivingBase**: Identical to 4-2-libero-for-middles — zone center positions with libero for back-row middle.

3. **receivingPass**: Derived from 5-1 setter penetration patterns:
   - Front-row stacking matches 4-2 (same overlap constraints)
   - Back-row setter positions mirror 5-1: Z1→[840,700], Z5→[350,150], Z6→[510,200]
   - All 6 rotations verified against FIVB overlap rules

4. **receivingSet**: BR setter at [600,100], FR setter approaches right [900,300], OH left [0,300], Middle center [450,300]. Back row: L[200,600], OH[450,600].

5. **receivingAttack**: BR setter at [600,100], FR setter at net right [800,100], OH left [100,100], Middle center [450,100]. Back row OH at pipe [450,300], L at [200,600].

6. **receivingSwitch**: FR setter at right [700,100], BR setter at right-back [700,600] for transition, OH left [200,100], Middle center [450,100], L left-back [200,600], BR OH pipe [450,700].
