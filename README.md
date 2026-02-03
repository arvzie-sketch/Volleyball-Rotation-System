# Volleyball Rotation System

An interactive volleyball rotation teaching tool for coaches and players.

#Try it
https://arvzie-sketch.github.io/Volleyball-Rotation-System/

## Features

- 5-1 rotation system visualization
- Serving and receiving phases
- Player position tracking
- Mobile-friendly design

## Usage

Open `index.html` in a web browser, or deploy to GitHub Pages / Firebase Hosting.

### Local Development

Due to JSON loading, you'll need a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve
```

Then open `http://localhost:8000`

## Adding New Rotation Systems

1. Create a new JSON file in `rotations/` (e.g., `4-2.json`)
2. Follow the structure in `rotations/5-1.json`
3. Update `app.js` to load the new rotation

## File Structure

```
├── index.html          # App structure
├── css/
│   └── styles.css      # All styling
├── js/
│   └── app.js          # App logic
└── rotations/
    └── 5-1.json        # Position data
```

## Attribution

Position data derived from [VBRotations](https://github.com/monkeysppp/VBRotations) by monkeysppp, licensed under Apache License 2.0.

## License

MIT License - see LICENSE file
