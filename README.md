# Volleyball Rotation System

A visual tool for viewing and editing volleyball player rotations across different offensive systems. Designed for coaches, players, and analysts who need to plan, review, or teach court positioning for every phase of play.

**Live demo:**
- **Viewer:** [https://arvzie-sketch.github.io/Volleyball-Rotation-System/](https://arvzie-sketch.github.io/Volleyball-Rotation-System/)
- **Editor:** [https://arvzie-sketch.github.io/Volleyball-Rotation-System/editor.html](https://arvzie-sketch.github.io/Volleyball-Rotation-System/editor.html)

## Overview

The app has two parts:

- **Viewer** (`index.html`) - Interactive court display for reviewing rotations during practice or games
- **Editor** (`editor.html`) - Drag-and-drop editor for creating and modifying rotation files

Both run entirely in the browser with no server or dependencies required. Just open the HTML files directly or host them on any static server (GitHub Pages, etc.).

## Viewer

The viewer displays player positions on a volleyball court for any combination of:

- **System** - The offensive system. Available systems: 5-1, 4-2, 4-2-L-Setter, 4-2-L-Middle, 6-2. Select from the dropdown at the top.
- **Mode** - Serving or Receiving
- **Phase** - The stage of play (Base, Serve/Pass, Set, Attack, Switch). Available phases vary by mode and system.
- **Setter position** - Which rotation the team is in (zones 1-6). The 2x3 grid at the bottom mirrors the court layout.

### Controls

| Control | Location | Description |
|---------|----------|-------------|
| System dropdown | Top bar | Switch between rotation systems |
| Serving / Receiving | Below title | Toggle between modes |
| Phase buttons | Below the court | Select the phase of play |
| Zone grid (1-6) | Bottom bar | Select which rotation (setter position) |
| `#` toggle | Bottom bar | Show/hide zone number overlays on court |
| `L` toggle | Bottom bar | Show/hide bench (substituted players) |
| `?` toggle | Bottom bar | Color legend |

Click any player on the court to highlight them in yellow. This helps track a single player across phase transitions.

## Editor

The editor lets you create rotation data from scratch or modify existing files. Open `editor.html` in a browser.

### Getting started

1. **Start fresh** - The editor opens with a blank template. Add players in the right sidebar, configure phases, then drag players into position for each combination.
2. **Import from file** - Click **Import** to upload a `.json` rotation file from your device
3. **Import from library** - Click **Library** to load any existing rotation from the `/rotations` folder (works on GitHub Pages and web servers)

All imports reset completion tracking so you can review everything from scratch.

### Mobile editing

On mobile devices (screens < 900px), the editor uses a **tab-based layout** for better usability:

- Three tabs at the top: **Court**, **Players**, **Config**
- Only one panel is visible at a time, giving the court full screen width
- Larger touch targets on player circles for easier dragging
- Tap a tab to switch between panels

This mobile layout makes it practical to create and edit rotations on phones and tablets.

### Navigation

The editor uses a navigation bar above the court with two **phase bubbles** side-by-side:

```
┌─ SERVING ─────────────┐  ┌─ RECEIVING ──────────────────────────┐
│ [Base] [Serve] [Switch]│  │ [Base] [Pass] [Set] [Attack] [Switch]│
└────────────────────────┘  └──────────────────────────────────────┘
```

Click any phase button to select it. The mode is set automatically based on which group you click. The active mode's bubble gets a highlighted border.

Below the phases is a **zone grid** (2x3, matching the court layout) for selecting the setter rotation, with a compact **checkmark button** beside it to mark the current slot as done:

```
SETTER  [4] [3] [2]  [✓]    0 / 48
        [5] [6] [1]
```

Each unique combination of mode + phase + setter zone is one "slot" that needs player positions defined.

### Editing positions

- **Drag players** on the court to set their positions
- **Right sidebar** shows the player roster - add, remove, or edit players (name, label, role, libero flag)
- The **bench area** (left side of court) is for substituted-out players. Drag a player there to bench them.

### Completion tracking

Since there are many combinations to fill in (e.g., 8 phases x 6 zones = 48 slots for a typical 5-1), the editor includes a completion tracker to help you keep track of your progress:

1. Set up positions for a mode + phase + zone combination
2. Click **Mark Done** to mark that slot as complete
3. The zone button turns green with a checkmark
4. When all 6 zones in a phase are done, the phase button turns green
5. The **progress counter** shows how many slots are done out of the total

Completion state is saved in your browser's localStorage and persists across page reloads. It is editor-only metadata and is not included in exported files.

### FIVB overlap validation

The editor validates player positions against FIVB Rule 7.4 overlap rules in real time. During phases where overlap applies (receivingBase and receivingPass), any violation is highlighted with a red indicator showing which rule is broken. This helps ensure your formations are legal before exporting.

### Copy positions

Click **Copy From...** in the top bar to copy all player positions from one phase/zone to another. This is useful when consecutive phases share similar positioning - copy first, then make adjustments.

### Phase configuration

In the right sidebar under **Phases**, you can add or remove phases for each mode. Click the `+` button next to a mode to add a phase, or click `x` on a phase tag to remove it. Small completion dots next to each phase tag show per-zone completion status at a glance.

### Export

Click **Export** in the top bar to download the rotation data as a `.json` file. The exported file can be:
- Loaded back into the editor later for further editing
- Placed in the `rotations/` folder and registered in `systems.json` for the viewer to use

### Reset

Click **Reset** to clear all data and start over. This also clears all completion tracking.

## Rotation data format

Rotation files are JSON with this structure:

```json
{
  "name": "5-1",
  "description": "5-1 rotation system with 1 setter and 5 hitters",
  "players": [
    { "id": "s", "label": "S", "role": "setter" },
    { "id": "h1", "label": "H1", "role": "outside" },
    { "id": "l", "label": "L", "role": "libero", "isLibero": true }
  ],
  "phases": {
    "serving": ["base", "serve", "switch"],
    "receiving": ["base", "pass", "set", "attack", "switch"]
  },
  "positions": {
    "servingBase": {
      "1": { "s": [700, 600], "h1": [200, 100] },
      "2": { "s": [700, 100], "h1": [450, 100] }
    }
  }
}
```

- **Coordinate system** - Positions use a 900x900 unit grid. `[0, 0]` is the top-left of the court (net side, left edge). Use `x = -64` to place a player on the bench.
- **Position keys** follow the pattern `[mode][Phase]`, e.g., `servingBase`, `receivingAttack`.
- **Setter zone keys** (`"1"` through `"6"`) represent which zone the setter occupies in that rotation.

## Adding a new system to the viewer

1. Create your rotation JSON file using the editor or by hand
2. Save it in the `rotations/` folder (e.g., `rotations/my-system.json`)
3. Add the filename (without `.json`) to `rotations/systems.json`:
   ```json
   ["5-1", "4-2", "my-system"]
   ```
4. The viewer will pick it up automatically on next load

## Local development

If opening the files directly doesn't work (some browsers block local `fetch` requests), use a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve
```

Then open `http://localhost:8000`.

## Project structure

```
index.html              Viewer app
editor.html             Editor app (standalone, all CSS inline)
css/styles.css          Viewer styles
js/app.js               Viewer logic
js/editor.js            Editor logic
rotations/
  systems.json          List of available rotation systems
  5-1.json              5-1 system rotation data
  4-2.json              4-2 system rotation data
  4-2-L-Setter.json     4-2 with libero replacing back-row setter
  4-2-L-Middle.json     4-2 with libero replacing back-row middle
  6-2.json              6-2 system rotation data
tools/
  validate-rotation.js  FIVB overlap rule validator for rotation files
  position-analysis.md  Coordinate system and 5-1 pattern analysis
  4-2-libero-analysis.md  Analysis of both 4-2 libero variants
  6-2-analysis.md       6-2 system analysis and position derivation
```

## Credits

Position data derived from [VBRotations](https://github.com/monkeysppp/VBRotations) by monkeysppp, licensed under Apache License 2.0.

## License

Apache License 2.0
