# Rotation Editor - User Guide

The Rotation Editor is a flexible tool that allows you to create and customize volleyball rotation systems. You can drag players to position them, configure phases, and export the result as a JSON file compatible with the main Volleyball Rotation System.

## Getting Started

Open `editor.html` in your web browser to start using the editor.

## Features

### 1. Player Management (Left Panel)
- **Add Players**: Click the `+` button to add new players
- **Edit Players**: Click the ✎ icon to edit a player's details
- **Delete Players**: Click the ✕ icon to remove a player
- **Player Properties**:
  - **ID**: Unique identifier (e.g., 's', 'h1', 'm1')
  - **Label**: Display name on court (e.g., 'S', 'H1', 'M1')
  - **Role**: Setter, Outside Hitter, Middle Blocker, Opposite, or Libero
  - **Is Libero**: Check this box for libero players (they'll display in red)

### 2. Court Positioning (Center)
- **Drag Players**: Click and drag any player on the court to position them
- **Real-time Coordinates**: See X/Y coordinates update as you drag
- **Send to Bench**: Select a player and click "Send to Bench" to put them on the bench (appears at x < 0)
- **Select Players**: Click on a player (either on court or in the list) to select them (highlighted in yellow)

### 3. Phase Configuration (Right Panel)
- **Add Phases**: Click `+ Add Phase` to add a phase to Serving or Receiving mode
- **Remove Phases**: Click the ✕ button next to a phase to remove it
- **Available Phases**: base, serve, pass, set, attack, switch

### 4. Controls (Above Court)
- **Mode**: Switch between Serving and Receiving modes
- **Phase**: Select which phase to edit
- **Setter in Zone**: Choose which zone the setter is currently in (1-6)
- **Copy Positions**: Copy player positions from another phase/setter combination to the current one

### 5. Import, Export & Reset (Header)
- **System Name**: Name your rotation system (e.g., "4-2", "5-1", "6-2")
- **Description**: Add a description of your rotation system
- **Import JSON**: Load an existing rotation file to edit it
- **Export JSON**: Download your rotation as a JSON file
- **Reset**: Clear all data and start fresh

## Workflow

### Creating a New Rotation

1. **Set up players**: Add all players for your system (typically 6 players)
   - For 5-1: 1 setter, 2 outside hitters, 2 middle blockers, 1 opposite
   - For 4-2: 2 setters, 2 outside hitters, 2 middle blockers
   - For 4-2 with libero: Add a libero player

2. **Configure phases**: Set up the phases for each mode
   - Serving: typically [base, serve, switch]
   - Receiving: typically [base, pass, set, attack, switch]

3. **Position players for each scenario**:
   - Select mode (Serving/Receiving)
   - Select phase (Base/Serve/Pass/etc.)
   - Select setter position (1-6)
   - Drag each player to their correct position
   - Players on the bench should be positioned with x < 0

4. **Use Copy Positions to save time**:
   - Position players for one scenario (e.g., Serving Base, setter in zone 1)
   - Move to a similar scenario (e.g., Serving Base, setter in zone 2)
   - Click "Copy Positions" and copy from the previous scenario
   - Adjust individual player positions as needed

5. **Import/Export**: 
   - Use "Import JSON" to load existing rotation files (like the 5-1 or 4-2 from the rotations folder)
   - Use "Export JSON" to download your completed rotation file

### Using the Exported JSON

The exported JSON file is in the exact format required by the main Volleyball Rotation System. To use it:

1. Save the JSON file to the `rotations/` folder (e.g., `rotations/my-rotation.json`)
2. Update `rotations/systems.json` to include your new system name:

```json
["5-1", "4-2", "my-rotation"]
```

3. The main app will now include your rotation in the dropdown menu

## Position Coordinates

The coordinate system uses a 900x900 grid:
- **X coordinate**: 0-900 (left to right)
- **Y coordinate**: 0-900 (top to bottom)
- **Bench positions**: Use x < 0 (typically -64) with appropriate y coordinate

Reference points:
- Court left edge: ~0
- Court right edge: ~900
- Net (top of court): ~0
- End line (bottom of court): ~900
- Attack line: ~300 from net

## Tips

1. **Start with Base Positions**: Position all players in the base formation first (serving and receiving)
2. **Copy Strategically**: Use the "Copy Positions" feature to avoid repositioning all 6 players for every scenario
3. **Save Frequently**: The editor auto-saves to your browser's localStorage, but export regularly as backup
4. **Check All Zones**: Make sure to set positions for setter in all 6 zones (1-6) for each phase
5. **Libero Handling**: Mark liberos with the "Is Libero" checkbox for proper color coding

## Creating Specific Rotation Systems

### 4-2 Rotation (Basic)
1. Add 2 setters, 2 outside hitters, 2 middle blockers
2. Configure phases: Serving [base, serve, switch], Receiving [base, pass, set, attack, switch]
3. Position players with one setter in front row (zones 2-3-4), other in back row (zones 1-5-6)
4. Both setters should not be on the court simultaneously

### 4-2 with Libero
1. Add 2 setters, 2 outside hitters, 1 middle blocker, 1 libero
2. Follow same positioning as basic 4-2
3. Libero replaces a back-row setter or hitter (send them to bench with x < 0)

### 6-2 Rotation
1. Add 2 setters, 2 outside hitters, 2 middle blockers
2. All 6 players are always on the court
3. Both setters play as hitters when not setting
4. Requires more complex positioning for each setter location

## Troubleshooting

- **Players not appearing**: Make sure you've added players in the left panel
- **Positions not saving**: Try refreshing the page - data is saved to localStorage
- **Export not working**: Check that your browser allows downloads and pop-ups
- **Positions lost after reload**: Ensure you're using the same browser and haven't cleared localStorage

## File Structure

```
volleyball-rotation-system/
├── editor.html              # The editor interface
├── js/
│   └── editor.js            # Editor logic
├── rotations/
│   ├── 5-1.json            # Example 5-1 rotation
│   ├── 4-2.json            # Example 4-2 rotation (needs fixing)
│   └── systems.json        # List of available systems
└── index.html              # Main rotation viewer