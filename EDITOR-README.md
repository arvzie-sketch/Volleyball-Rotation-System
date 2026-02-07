# Rotation Editor - User Guide

The Rotation Editor is a drag-and-drop tool for creating and customizing volleyball rotation systems. Export the result as a JSON file compatible with the main Volleyball Rotation System viewer.

**Live editor:** [https://arvzie-sketch.github.io/Volleyball-Rotation-System/editor.html](https://arvzie-sketch.github.io/Volleyball-Rotation-System/editor.html)

## Getting Started

Open `editor.html` in your web browser. You can:

1. **Start fresh** — The editor opens with a blank template
2. **Import from file** — Click **Import** to upload a `.json` rotation file
3. **Import from library** — Click **Library** to load any existing rotation from the `/rotations` folder (works on GitHub Pages and web servers)

All imports reset completion tracking so you can review everything from scratch.

## Interface Layout

### Navigation Bar (above court)

Two **phase bubbles** are shown side-by-side — one for Serving, one for Receiving:

```
┌─ SERVING ─────────────┐  ┌─ RECEIVING ──────────────────────────┐
│ [Base] [Serve] [Switch]│  │ [Base] [Pass] [Set] [Attack] [Switch]│
└────────────────────────┘  └──────────────────────────────────────┘
```

Click any phase button to select it. The mode is set automatically based on which group you click. The active mode's bubble gets a highlighted border.

Below the phases is a **zone grid** (2x3, matching the court layout) for selecting the setter rotation:

```
SETTER  [4] [3] [2]  [✓]    0 / 48
        [5] [6] [1]
```

### Court (center)

- **Drag players** to set their positions
- **Bench area** (left side) — drag a player there to bench them (off-court)
- **Click a player** to highlight them in yellow for tracking

### Right Sidebar

- **Player roster** — add, remove, or edit players (name, label, role, libero flag)
- **Phase configuration** — add/remove phases for each mode with `+` and `x` buttons
- **Completion dots** — small dots next to each phase tag show per-zone completion status

### Top Bar

- **System name and description** fields
- **Import** / **Export** / **Library** / **Reset** / **Copy From...** buttons

## FIVB Overlap Validation

The editor validates positions against FIVB Rule 7.4 overlap rules **in real time**. During phases where overlap applies (receivingBase and receivingPass), any violation is highlighted with a red indicator showing which rule is broken.

This ensures your formations are legal before exporting.

## Completion Tracking

There are many combinations to fill in (e.g., 8 phases x 6 zones = 48 slots). The editor tracks your progress:

1. Set up positions for a mode + phase + zone combination
2. Click **Mark Done** (the `✓` button beside the zone grid)
3. The zone button turns green with a checkmark
4. When all 6 zones in a phase are done, the phase button turns green
5. The **progress counter** shows done / total

Completion state persists in localStorage across reloads. It is not included in exported files.

## Copy Positions

Click **Copy From...** to copy all player positions from one phase/zone to another. Useful when consecutive phases share similar positioning — copy first, then adjust.

## Mobile Editing

On screens < 900px, the editor uses a **tab-based layout**:

- Three tabs: **Court**, **Players**, **Config**
- One panel visible at a time, giving the court full width
- Larger touch targets for easier dragging

## Workflow

### Creating a New Rotation

1. **Add players** in the right sidebar
   - 5-1: 1 setter, 2 outside hitters, 2 middle blockers, 1 opposite, 1 libero
   - 4-2: 2 setters, 2 outside hitters, 2 middle blockers (+ optional libero)
   - 6-2: same lineup as 4-2, with libero

2. **Configure phases** in the right sidebar
   - Serving: typically base, serve, switch
   - Receiving: typically base, pass, set, attack, switch

3. **Position players** for each combination
   - Click a phase button → select a zone → drag players on the court
   - Bench players by dragging them to the left edge

4. **Mark each slot done** as you go — the progress counter helps track what's left

5. **Export** your completed rotation as JSON

### Using the Exported JSON

1. Save the file to `rotations/` (e.g., `rotations/my-system.json`)
2. Add the name (without `.json`) to `rotations/systems.json`:
   ```json
   ["5-1", "4-2", "my-system"]
   ```
3. The viewer picks it up automatically

## Position Coordinates

The coordinate system uses a 900x900 grid:

| Reference | Coordinates |
|-----------|-------------|
| Net (top) | y = 0 |
| End line (bottom) | y = 900 |
| Left sideline | x = 0 |
| Right sideline | x = 900 |
| Attack line | y ≈ 300 |
| Bench | x = -64 |
| Server position | x ≈ 700, y ≈ 940 |

Zone centers:

| Zone | Position | Coordinates |
|------|----------|-------------|
| Z1 (back right) | x=700, y=600 |
| Z2 (front right) | x=700, y=100 |
| Z3 (front center) | x=450, y=100 |
| Z4 (front left) | x=200, y=100 |
| Z5 (back left) | x=200, y=600 |
| Z6 (back center) | x=450, y=600 |

## Tips

1. **Start with Base Positions** — position all players in base formation first
2. **Copy Strategically** — use Copy From to avoid repositioning all players for every slot
3. **Watch the overlap indicator** — fix violations in receivingBase/receivingPass before exporting
4. **Export regularly** — the editor auto-saves to localStorage, but export as backup
5. **Mark Done as you go** — don't leave it all to the end

## Troubleshooting

- **Players not appearing**: Add players in the right sidebar first
- **Positions not saving**: Data saves to localStorage automatically — check you haven't cleared it
- **Export not working**: Check that your browser allows downloads
- **Overlap errors showing**: Only applies to receivingBase and receivingPass — fix the positioning or ignore for other phases
