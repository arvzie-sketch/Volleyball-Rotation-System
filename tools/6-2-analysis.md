# 6-2 System — Position Analysis

## What is the 6-2?

Two setters line up opposite each other, so one is always in the front row and one in the back row.
The **back-row setter sets** (penetrates to the net after the serve); the **front-row setter hits**
from the right side, playing the opposite's role. Result: **three front-row attackers in every
rotation**. If the front-row setter set instead, it would be a 4-2 (two attackers).

"Sets from the back row" describes rotational position only — the setter still sets at the net
(right front, ~[600,100]). As a back-row player they may not block or attack a ball that is entirely
above the net from in front of the attack line.

---

## Lineup

**S1, H1, M2, S2, H2, M1** (Z1→Z6 when S1 is in Z1) — the 5-1 lineup (`S, H1, M2, O, H2, M1`) with the
opposite replaced by the second setter. Matches the common 6-2 order (setter → outside → middle).

The viewer's zone key is **S1's zone**.

| Key (S1 zone) | Z1 | Z2 | Z3 | Z4 | Z5 | Z6 | Back-row setter (sets) | Front-row setter (hits) |
|---|---|---|---|---|---|---|---|---|
| 1 | S1 | H1 | M2 | S2 | H2 | M1 | S1 from Z1 | S2 |
| 6 | H1 | M2 | S2 | H2 | M1 | S1 | S1 from Z6 | S2 |
| 5 | M2 | S2 | H2 | M1 | S1 | H1 | S1 from Z5 | S2 |
| 4 | S2 | H2 | M1 | S1 | H1 | M2 | S2 from Z1 | S1 |
| 3 | H2 | M1 | S1 | H1 | M2 | S2 | S2 from Z6 | S1 |
| 2 | M1 | S1 | H1 | M2 | S2 | H2 | S2 from Z5 | S1 |

---

## Libero

Libero replaces the **back-row middle** (same as the 5-1). When that middle is in Z1 on serve
(keys 2 and 5) the middle serves and the libero sits.

| Key | Back-row middle | Zone |
|---|---|---|
| 1 | M1 | Z6 |
| 6 | M1 | Z5 |
| 5 | M2 | Z1 (serves) |
| 4 | M2 | Z6 |
| 3 | M2 | Z5 |
| 2 | M1 | Z1 (serves) |

---

## Derivation (all phases)

Every phase is generated from `rotations/5-1.json`, because a 6-2 is structurally a 5-1 whose setter
is always the back-row one:

- **Keys 1, 6, 5** (S1 back row) = 5-1 keys 1, 6, 5 with `s→s1`, `o→s2`.
- **Keys 4, 3, 2** (S2 back row) = 5-1 keys **1, 6, 5** with `s→s2`, `o→s1`, `h1↔h2`, `m1↔m2`.

5-1 keys 4/3/2 (front-row setter sets) are never used — that would be 4-2 behaviour.

One deliberate deviation from the 5-1 data: in **receivingPass keys 1 and 4** the front-row middle
stands centrally at the net `[450,80]` instead of the 5-1's `[150,60]`.

---

## Serve receive (receivingPass)

**Three passers in every rotation: both outside hitters + libero** (the front-row OH drops back,
legal as long as they stay in front of their back-row counterpart). The back-row setter hides and
does not pass; the front-row setter and middle stay at the net.

| Back-row setter starts | Keys | Front row | Setter pre-contact |
|---|---|---|---|
| Z1 | 1, 4 | FR setter far left `[54,100]`, middle central `[450,80]` | deep right `[840,700]` |
| Z6 | 6, 3 | FR setter `[560,60]`, middle right `[700,140]` | behind FR setter `[510,170]` |
| Z5 | 5, 2 | middle far left `[60,60]`, FR setter right `[840,100]` | forward-left `[350,140]` |

Passers: OH left `[200,600]`, middle-deep `[450,700]` and right `[700,600]` — which player takes which
lane follows the 5-1.

---

## Verification

`node tools/validate-rotation.js rotations/6-2.json` — all checks pass (overlap, libero, serving).
