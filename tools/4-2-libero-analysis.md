# 4-2 Libero Variants — Position Analysis

This document explains the two 4-2 libero variants: **libero for back-row setter** and **libero for back-row middle**.

---

## Base 4-2 Lineup Reference

Service order (Z1→Z6): **S1, M1, H2, S2, M2, H1**

| Rot | Z1 | Z2 | Z3 | Z4 | Z5 | Z6 | FR Setter | FR Setter Zone |
|-----|----|----|----|----|----|----|-----------|----------------|
| 1   | S1 | M1 | H2 | S2 | M2 | H1 | S2        | Z4             |
| 2   | H1 | S1 | M1 | H2 | S2 | M2 | S1        | Z2             |
| 3   | M2 | H1 | S1 | M1 | H2 | S2 | S1        | Z3             |
| 4   | S2 | M2 | H1 | S1 | M1 | H2 | S1        | Z4             |
| 5   | H2 | S2 | M2 | H1 | S1 | M1 | S2        | Z2             |
| 6   | M1 | H2 | S2 | M2 | H1 | S1 | S2        | Z3             |

**Back-row zones**: Z1, Z5, Z6 (always the same three zones)

---

## Libero Substitution Convention

Following the established pattern from 5-1.json:

1. **Serving team**: Libero replaces at **Z5 and Z6 only**. At Z1, the player serves → libero sits out.
2. **Receiving team**: Libero **always** replaces (Z1, Z5, Z6). The player doesn't need to serve.
3. When libero is off court: appears in data at bench position `[-64, 700]`.

**Why no libero at Z1 when serving?**
The player at Z1 must serve. The libero cannot serve (standard FIVB rules). So the original player stays on court for that rotation's serving phases.

---

## Variant 1: Libero Replaces Back-Row Setter

### Concept (ELI5)
> Imagine you have two setters taking turns — one sets from the front row while the other goes to the back. The back-row setter is a poor defender/passer. So we bring in a **libero** (a defensive specialist in a different-colored jersey) to replace that back-row setter. Now the back row has better passing and defense!

### Who Gets Replaced?

| Rot | Back-Row Setter | Zone | Serving: Libero? | Receiving: Libero? |
|-----|-----------------|------|------------------|--------------------|
| 1   | S1              | Z1   | **NO** (S1 serves) | YES (L for S1) |
| 2   | S2              | Z5   | YES (L for S2)   | YES (L for S2) |
| 3   | S2              | Z6   | YES (L for S2)   | YES (L for S2) |
| 4   | S2              | Z1   | **NO** (S2 serves) | YES (L for S2) |
| 5   | S1              | Z5   | YES (L for S1)   | YES (L for S1) |
| 6   | S1              | Z6   | YES (L for S1)   | YES (L for S1) |

### Back-Row Composition (with libero)

| Rot | Z1 | Z5 | Z6 | Passers | Notes |
|-----|----|----|------|---------|-------|
| 1   | **L** | M2 | H1 | L+H1 (primary), M2 (secondary) | Best 3-passer back row |
| 2   | H1 | **L** | M2 | L+H1 (primary), M2 (secondary) | Same quality |
| 3   | M2 | H2 | **L** | L+H2 (primary), M2 (secondary) | Same quality |
| 4   | **L** | M1 | H2 | L+H2 (primary), M1 (secondary) | Same quality |
| 5   | H2 | **L** | M1 | L+H2 (primary), M1 (secondary) | Same quality |
| 6   | M1 | H1 | **L** | L+H1 (primary), M1 (secondary) | Same quality |

**Key advantage**: With the libero replacing the setter, ALL 3 back-row players can pass:
- Libero: excellent passer (primary)
- OH (H1/H2): good passer (primary)
- Middle (M1/M2): average passer (secondary)

This is BETTER than libero-for-middle, where the back-row setter still hides.

### Serve-Receive Formations (receivingPass)

The stacking strategy is **identical to base 4-2** — the front row stacks the same way based on the front-row setter's zone:
- **Setter at Z4** (R1, R4): LEFT STACK — setter tucks to far-left corner
- **Setter at Z2** (R2, R5): SPREAD — setter already at right, even spacing
- **Setter at Z3** (R3, R6): RIGHT STACK — setter slides right

The back-row positions use the **same coordinates** as the base 4-2. The libero takes the exact position the setter would have occupied. The difference is behavioral — the libero actively passes from that position instead of hiding.

### Switch Positions (after rally)

When the libero is on court, the back row switches to ideal positions:
- **Libero → left back** `[200, 600]` — primary defender position
- **OH → center deep** `[450, 700]` — pipe attack position
- **Middle → right back** `[700, 600]` — right-side defense

This follows the 5-1 convention where the libero always plays left back.

---

## Variant 2: Libero Replaces Back-Row Middle

### Concept (ELI5)
> Same idea as above, but instead of replacing the setter, we replace the back-row **middle blocker**. Middle blockers are tall players who are great at blocking but mediocre at passing and defense. Bringing in the libero gives us better passing on that side. The difference from variant 1 is that the **back-row setter is still on court** — they're a poor passer who needs to hide during serve-receive.

### Who Gets Replaced?

| Rot | Back-Row Middle | Zone | Serving: Libero? | Receiving: Libero? |
|-----|-----------------|------|------------------|--------------------|
| 1   | M2              | Z5   | YES (L for M2)   | YES (L for M2) |
| 2   | M2              | Z6   | YES (L for M2)   | YES (L for M2) |
| 3   | M2              | Z1   | **NO** (M2 serves) | YES (L for M2) |
| 4   | M1              | Z5   | YES (L for M1)   | YES (L for M1) |
| 5   | M1              | Z6   | YES (L for M1)   | YES (L for M1) |
| 6   | M1              | Z1   | **NO** (M1 serves) | YES (L for M1) |

### Back-Row Composition (with libero)

| Rot | Z1 | Z5 | Z6 | Passers | Notes |
|-----|----|----|------|---------|-------|
| 1   | S1 | **L** | H1 | L+H1 (primary), S1 hides | Setter hides at Z1 |
| 2   | H1 | S2 | **L** | L+H1 (primary), S2 hides | Setter hides at Z5 |
| 3   | **L** | H2 | S2 | L+H2 (primary), S2 hides | Setter hides at Z6 |
| 4   | S2 | **L** | H2 | L+H2 (primary), S2 hides | Setter hides at Z1 |
| 5   | H2 | S1 | **L** | L+H2 (primary), S1 hides | Setter hides at Z5 |
| 6   | **L** | H1 | S1 | L+H1 (primary), S1 hides | Setter hides at Z6 |

**Key difference from variant 1**: The back-row setter is still on court and needs to hide. Only 2 effective passers (L + OH) instead of 3. This may require the front-row OH to drop back in some formations.

### Serve-Receive Formations (receivingPass)

Same stacking as base 4-2 and variant 1. The libero takes the middle's exact zone position (a straight name-swap from the base 4-2 data). The back-row setter still hides as before.

### Switch Positions (after rally)

When the libero is on court:
- **Libero → left back** `[200, 600]` — primary defender
- **OH → center deep** `[450, 700]` — pipe attack
- **Setter → right back** `[700, 600]` — right-side defense (standard setter defense position)

---

## Comparison: Which Variant is Better?

| Aspect | Libero for Setter | Libero for Middle |
|--------|-------------------|-------------------|
| Back-row passers | 3 (L + OH + mid) | 2 (L + OH, setter hides) |
| Serve-receive quality | **Better** | Good |
| Back-row defense | Good (all 3 contribute) | Good (but setter weaker) |
| Common in real volleyball? | Less common | **More common** (same as 5-1 pattern) |
| Front-row setting | Same (always front-row setter) | Same |

**Libero for setter** gives better back-row passing quality because the setter (the weakest passer) is completely removed from the back row. However, **libero for middle** is more common in practice because it follows the same pattern as the 5-1 system (libero replaces back-row middle), and coaches often prefer consistency.

---

## Position Derivation Method

Both variants derive positions from the validated base 4-2 data:

1. **receivingBase & receivingPass** (overlap rules apply):
   - Straight name-swap: libero takes the replaced player's exact coordinates
   - Since base 4-2 passes all 7 FIVB overlap rules, the swap preserves validity
   - The libero occupies the same zone position but with different player skills

2. **servingBase** (no overlap):
   - Same zone positions, libero at replaced player's zone
   - When player serves from Z1: no libero, same as base 4-2

3. **servingServe** (serving team free from overlap):
   - Libero pre-shifts to left-back defense `[175, 620]`
   - Other back-row players adjust to defensive positions
   - When no libero (Z1 serving): same as base 4-2

4. **Switch positions** (servingSwitch, receivingSwitch — after rally):
   - Back row: L[200,600], OH[450,700], remaining player[700,600]
   - Front row: same as base 4-2 (OH left, middle center, setter right)

5. **receivingSet & receivingAttack** (after serve contact, free movement):
   - Libero takes the replaced player's coordinates from base 4-2
   - Minor adjustments: libero gravitates toward left-back defense
