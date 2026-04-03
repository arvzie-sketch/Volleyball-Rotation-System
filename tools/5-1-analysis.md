# Volleyball Positioning Analysis

## Reference: 5-1.json Analysis + FIVB Rules

This document is a reference for creating accurate rotation data for any system.

---

## FIVB Rule 7.4 (2025-2028): Positions at Service Hit

Full text (FIVB Rules 2025-2028, page 25):

> **7.4** At the moment the ball is hit by the server, each team must be
> positioned within its own court (except the server). The players of the
> **receiving team must be in the rotational order** at the service hit.
> The players of the **serving team, however, are free to occupy any position**
> at the service hit.

### 7 Overlap Rules (receiving team only, at moment of serve)

**Rule 7.4.2.1 — Front-back pairs** (front player must be closer to net):

| # | Constraint | In our coordinates |
|---|------------|--------------------|
| 1 | Z4 (front-left) must be in front of Z5 (back-left) | Z4.y < Z5.y |
| 2 | Z3 (front-centre) must be in front of Z6 (back-centre) | Z3.y < Z6.y |
| 3 | Z2 (front-right) must be in front of Z1 (back-right) | Z2.y < Z1.y |

**Rule 7.4.2.2 — Left-right within rows** (lateral order must match rotation):

| # | Constraint | In our coordinates |
|---|------------|--------------------|
| 4 | Z4 must be left of Z3 (front row) | Z4.x < Z3.x |
| 5 | Z3 must be left of Z2 (front row) | Z3.x < Z2.x |
| 6 | Z5 must be left of Z6 (back row) | Z5.x < Z6.x |
| 7 | Z6 must be left of Z1 (back row) | Z6.x < Z1.x |

**Rule 7.4.3 — Measurement**: Positions determined by feet contacting the ground.
Each player needs "at least a part of one foot" in the correct relative position.
"Level with" (exactly aligned) is also legal.

**Rule 7.4.4 — After the service hit**, players of both teams may move around
and occupy any position on their court and in the free zone.

### When overlap rules apply to each phase:

| Phase | Overlap rules? | Reason |
|-------|---------------|--------|
| `servingBase` | NO (reference only) | Serving team free (Rule 7.4) |
| `servingServe` | NO | Serving team free (Rule 7.4) |
| `servingSwitch` | NO | After rally |
| `receivingBase` | **YES** | Receiving team at moment of serve |
| `receivingPass` | **YES** | Serve-receive formation, BEFORE serve contact |
| `receivingSet` | NO | After serve contact |
| `receivingAttack` | NO | After serve contact |
| `receivingSwitch` | NO | After rally |

### Practical note on back-row movement during receive:

Professional serves exceed 100 km/h. Back-row players **cannot reposition**
during the pass — the ball arrives too fast. Back-row positions in
`receivingPass` should remain at their zone (base) positions.
Full repositioning happens during `receivingSwitch` (after the rally).

Sources:
- FIVB Official Volleyball Rules 2025-2028 (in /tools folder)
- https://www.fivb.com/volleyball/the-game/official-volleyball-rules/

---

## Coordinate System Reminder

```
NET (y = 0)
┌──────────────────────────────────────┐
│  Zone 4        Zone 3       Zone 2   │  FRONT ROW
│  x≈200,y≈100   x≈450,y≈100  x≈700,y≈100
│                                      │
│  Zone 5        Zone 6       Zone 1   │  BACK ROW
│  x≈200,y≈600   x≈450,y≈600  x≈700,y≈600
└──────────────────────────────────────┘
END LINE (y = 900)
Server: x≈700, y≈940
```

---

## 5-1 Lineup

Service order (Z1→Z6→Z5→Z4→Z3→Z2): S, H1, M2, O, H2, M1
Clockwise (Z1→Z2→Z3→Z4→Z5→Z6): S, M1, H2, O, M2, H1

### Zone assignments per rotation:

| Rot | Z1 | Z2 | Z3 | Z4 | Z5     | Z6 | Front Row      | Server |
|-----|----|----|----|----|--------|-----|----------------|--------|
| 1   | S  | H1 | M2 | O  | H2    | M1→L| H1, M2, O     | S      |
| 2   | M1 | S  | H1 | M2 | O     | H2  | S, H1, M2     | M1     |
| 3   | H2 | M1 | S  | H1 | M2→L  | O   | M1, S, H1     | H2     |
| 4   | O  | H2 | M1 | S  | H1    | M2→L| H2, M1, S     | O      |
| 5   | M2 | O  | H2 | M1 | S     | H1  | O, H2, M1     | M2     |
| 6   | H1 | M2 | O  | H2 | M1→L  | S   | M2, O, H2     | H1     |

Libero replaces back-row middle (M1 or M2) EXCEPT when that middle is serving (Z1).

---

## PATTERN 1: Front-Row Ideal Positions (servingSwitch / after play)

Regardless of which zone a player starts in, they switch to:

| Role    | Ideal Front Position | Coordinates     | Notes                    |
|---------|---------------------|-----------------|--------------------------|
| Setter  | Right front (Z2)    | [700, 100]      | Setting position         |
| OH      | Left front (Z4)     | [200, 100]      | Left pin for attacking   |
| Middle  | Center front (Z3)   | [450, 100]      | Center for quick attacks |
| Opposite| Right front (Z2)    | [700, 100]      | Right pin for attacking  |

**Evidence from 5-1 servingSwitch (all 6 rotations):**

| Rot | Left [200,100] | Center [450,100] | Right [700,100] |
|-----|----------------|-------------------|-----------------|
| 1   | H1 ✓(OH)       | M2 (mid)          | O (opp)         |
| 2   | H1 ✓(OH)       | M2 (mid)          | S (setter)      |
| 3   | H1 ✓(OH)       | M1 (mid)          | S (setter)      |
| 4   | H2 ✓(OH)       | M1 (mid)          | S (setter)      |
| 5   | H2 ✓(OH)       | M1 (mid)          | O (opp)         |
| 6   | H2 ✓(OH)       | M2 (mid)          | O (opp)         |

**Key finding: The outside hitter (H1 or H2) is ALWAYS at left front [200, 100].**
- When BOTH H1 and H2 are front row, doesn't happen in 5-1 (they're 3 apart)
- In 4-2, both outsides are also 3 apart, so this won't happen either

---

## PATTERN 2: Back-Row Ideal Positions (servingSwitch)

| Role    | Ideal Back Position  | Coordinates      | Notes                    |
|---------|---------------------|------------------|--------------------------|
| Setter  | Right back (Z1)     | [700, 600]       | Defense, ready to set    |
| OH      | Center back (Z6)    | [450, 700]       | **PIPE attack position** |
| Opposite| Right back (Z1)     | [700, 600]       | Right-side defense       |
| Libero  | Left back (Z5)      | [200, 600]       | Primary passer/defender  |
| Middle  | Left back or bench  | [200, 600]/bench | Replaced by libero       |

**Evidence from 5-1 servingSwitch (back row):**

| Rot | Left [200,600] | Center [450,700] | Right [700,600] |
|-----|----------------|-------------------|-----------------|
| 1   | L (libero)     | H2 (OH) ✓PIPE    | S (setter)      |
| 2   | M1 (mid)       | H2 (OH) ✓PIPE    | O (opp)         |
| 3   | L (libero)     | H2 (OH) ✓PIPE    | O (opp)         |
| 4   | L (libero)     | H1 (OH) ✓PIPE    | O (opp)         |
| 5   | M2 (mid)       | H1 (OH) ✓PIPE    | S (setter)      |
| 6   | L (libero)     | H1 (OH) ✓PIPE    | S (setter)      |

**Key finding: The back-row OH is ALWAYS at center back deep [450, 700] for pipe attacks.**
**The setter/opposite is ALWAYS at right back [700, 600].**
**The libero (or non-libero middle) is ALWAYS at left back [200, 600].**

---

## PATTERN 3: servingServe Pre-Positioning (Rule 7.4)

The serving team pre-switches during the serve. Analysis of actual coordinates:

### Rotation 1: S serves (front: H1@Z2, M2@Z3, O@Z4)
```
Base:  H1:[700,100]  M2:[450,100]  O:[200,100]   ← zone positions
Serve: H1:[306, 97]  M2:[450,100]  O:[598,101]   ← H1 moved LEFT, O moved RIGHT
```
H1 pre-switches toward left pin. O pre-switches toward right. Rule 7.4!

### Rotation 2: M1 serves (front: S@Z2, H1@Z3, M2@Z4)
```
Base:  S:[700,100]   H1:[450,100]  M2:[200,100]
Serve: S:[580,100]   H1:[295,101]  M2:[439,101]   ← S left, H1 left, M2 right
```

### Rotation 3: H2 serves (front: M1@Z2, S@Z3, H1@Z4)
```
Base:  M1:[700,100]  S:[450,100]   H1:[200,100]
Serve: M1:[468, 97]  S:[616, 97]   H1:[320,100]   ← M1 left, S right
```
M1 goes center, S goes right (setting pos). H1 already near left.

### Rotation 4: O serves (front: H2@Z2, M1@Z3, S@Z4)
```
Base:  H2:[700,100]  M1:[450,100]  S:[200,100]
Serve: H2:[306,104]  M1:[450,100]  S:[594,101]    ← H2 LEFT, S RIGHT
```
H2 pre-switches to left pin! S pre-switches to right! Rule 7.4!

### Rotation 5: M2 serves (front: O@Z2, H2@Z3, M1@Z4)
```
Base:  O:[700,100]   H2:[450,100]  M1:[200,100]
Serve: O:[580,100]   H2:[292,104]  M1:[439,101]   ← H2 left, M1 right
```

### Rotation 6: H1 serves (front: M2@Z2, O@Z3, H2@Z4)
```
Base:  M2:[700,100]  O:[450,100]   H2:[200,100]
Serve: M2:[464,104]  O:[608,108]   H2:[320,100]   ← M2 left, O right
```

**Summary: The front-row players pre-shift toward their ideal switch positions.**
- OH always drifts toward LEFT
- Setter/Opposite always drifts toward RIGHT
- Middle drifts toward CENTER

### Back row pre-positioning during servingServe:

| Rot | Setter/Opp movement | OH movement | Libero/Mid movement |
|-----|---------------------|-------------|---------------------|
| 1   | S serving (exempt)  | H2: Z5[200,600]→[468,724] center | L: Z6→[155,626] left |
| 2   | O: Z5[200,600]→[803,662] RIGHT! | H2: Z6[450,700] stays | M1 serving |
| 3   | O: Z6[450,700]→[796,587] RIGHT! | (H2 serving) | L: Z5 stays |
| 4   | (O serving) | H1: Z5[200,600]→[468,706] CENTER | L: Z6[450,700]→[158,576] left |
| 5   | S: Z5[200,600]→[781,425] RIGHT! | H1: Z6[450,700] stays | M2 serving |
| 6   | S: Z6[450,700]→[792,457] RIGHT! | (H1 serving) | L: Z5→[173,637] left |

**Back-row patterns during servingServe:**
- **Setter/Opposite** pre-moves toward RIGHT side (~[780-800, 400-660])
- **OH** pre-moves toward CENTER (~[450-470, 700-720]) for pipe
- **Libero** pre-moves toward LEFT (~[155-200, 576-637])

---

## PATTERN 4: Receiving Attack Phase

During receiving (opponent serves), the team must start in legal positions, then
after serve contact, players transition through pass → set → attack.

### Front-row attack positions (receivingAttack):

| Rot | Left ~[100,100] | Center [450,100] | Right ~[800,100] | Setter [600,100] |
|-----|-----------------|-------------------|-------------------|------------------|
| 1   | O (stays Z4)    | M2 (Z3)          | H1 (stays Z2!)   | S (from Z1 back) |
| 2   | H1 (Z3→left)   | M2 (Z4→center)   | —                 | S (Z2→set)       |
| 3   | H1 (stays Z4)   | M1 (Z2→center)   | —                 | S (Z3→set)       |
| 4   | H2 (Z2→left!)  | M1 (Z3)           | —                 | S (Z4→set)       |
| 5   | H2 (Z3→left)   | M1 (Z4→center)   | O [800,100](Z2)   | S (from Z5 back) |
| 6   | H2 (stays Z4)   | M2 (Z2→center)   | O [800,100](Z3→R) | S (from Z6 back) |

**Key findings:**
- OH goes to left pin in ALL rotations EXCEPT R1 (where H1 stays at Z2 right)
- R1 is special: H1 and O both stay in their rotation positions (no cross-switch)
- In R4, H2 DOES switch from Z2 (right) to left — because S moves from Z4→right, clearing the path
- R1 can't switch because S is in the back row, and H1/O would need to cross
- When O is front row: R1 stays left (Z4), R5 stays right (Z2), R6 moves right from Z3

### Back-row positions during receivingAttack:

| Rot | Who's in back row | Right ~[700,600] | Center ~[450,300] | Left/Deep |
|-----|-------------------|-------------------|--------------------|-----------|
| 1   | S, H2, L(M1)     | S:[700,600]       | H2:[450,300]       | L:[400,700] |
| 2   | M1, O, H2, L     | L:[700,600]       | H2:[440,300]       | O:[840,300] |
| 3   | H2, L(M2), O     | O:[840,300]       | H2:[450,300]       | L:[450,700] |
| 4   | O, H1, L(M2)     | O:[840,300]       | H1:[450,700]       | L:[700,600] |
| 5   | M2, S, H1, L     | L:[700,600]       | H1:[450,300]       | S:[600,100]* |
| 6   | H1, L(M1), S     | S:[600,100]*      | H1:[450,300]       | L:[400,700] |

*S at [600,100] means setter is at the net setting from back row

**Note:** O (opposite) tends toward RIGHT back (~[840, 300]) when in back row.

---

## PATTERN 5: Outside Hitter Pipe Position Confirmation

The back-row OH consistently positions at center-back deep for pipe attacks:

| Rot | Back-row OH | servingSwitch pos | receivingAttack pos |
|-----|-------------|-------------------|---------------------|
| 1   | H2          | [450, 700] ✓      | [450, 300] ✓*       |
| 2   | H2          | [450, 700] ✓      | [440, 300] ✓*       |
| 3   | H2          | [450, 700] ✓      | [450, 300] ✓*       |
| 4   | H1          | [450, 700] ✓      | [450, 700] ✓        |
| 5   | H1          | [450, 700] ✓      | [450, 300] ✓*       |
| 6   | H1          | [450, 700] ✓      | [450, 300] ✓*       |

*During attack, OH moves forward from [450,700] to [450,300] for the actual pipe approach

---

## APPLICATION TO 4-2 SYSTEM

### Mapping 5-1 roles to 4-2:

| 5-1 Role | 4-2 Equivalent | Notes |
|----------|---------------|-------|
| Setter (front row) | S1 or S2 (front row) | Sets from right front [600-700, 100] |
| Setter (back row) | — | N/A in 5-1, setter always runs up |
| Opposite (back row) | **S1 or S2 (back row)** | Back-row setter plays like opposite! |
| OH (front row) | H1 or H2 (front row) | Left pin [100-200, 100] |
| OH (back row) | H1 or H2 (back row) | Center deep [450, 700] for pipe |
| Middle (front) | M1 or M2 (front row) | Center [450, 100] |
| Middle (back) | M1 or M2 (back row) | Left back [200, 600] (like libero) |
| Libero | — (no libero in base 4-2) | — |

### Key 4-2 positioning rules derived from 5-1 analysis:

1. **Front-row setter** → right front [600-700, 100] to set
2. **Front-row OH** → left front pin [100-200, 100] to attack
3. **Front-row middle** → center [450, 100]
4. **Back-row setter** → RIGHT back [700, 600] (like opposite in 5-1)
5. **Back-row OH** → CENTER back deep [450, 700] (pipe attack position)
6. **Back-row middle** → LEFT back [200, 600] (like libero in 5-1)

### servingServe pre-positioning (Rule 7.4):
- Front-row setter drifts RIGHT toward [580-620, 100]
- Front-row OH drifts LEFT toward [280-320, 100]
- Front-row middle stays center [430-470, 100]
- Back-row setter drifts RIGHT toward [780, 450-600]
- Back-row OH drifts toward CENTER [450-470, 700-720]
- Back-row middle stays LEFT [200, 600]

### receivingAttack — 5-1 R1 no-switch explained:
- In 5-1 R1: S penetrates from Z1 (back right) toward [600,100]. O is at Z4 (front left).
  If O tried to cross to right pin, O's path collides with S running forward → traffic jam.
  So both H1 and O stay in their rotation positions (no cross-switch).
- In R4: S is at Z4 (front left), moves right to set. This CLEARS the left side.
  H2 at Z2 can freely cross to left pin without collision.

### 4-2 key difference — OH can ALWAYS switch:
- In 4-2, the setter is ALWAYS in the front row. No back-row setter penetration.
- No traffic collision path exists, so the front-row OH can switch to left pin
  in ALL 6 rotations during receiving.
- This means receivingAttack should show OH at left [100,100] in every rotation.
