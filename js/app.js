/**
 * Volleyball Rotation System
 *
 * Position data derived from VBRotations by monkeysppp
 * https://github.com/monkeysppp/VBRotations
 * Licensed under Apache License 2.0
 */

// Reset scroll position — fixes PWA webview retaining scroll offset from learn page
window.scrollTo(0, 0);
document.documentElement.scrollTop = 0;

// Configuration
const SCALE = 250 / 900;
const COURT_OFFSET_X = 25;
const COURT_OFFSET_Y = 32;
const PLAYER_RADIUS = 18;
const BENCH_X = 12;

// Token colours: dark token with a white ring; setter yellow, libero white.
// On the court yellow (#ffc93c = --accent) means "setter" only; the selected player gets a white ring.
const COLORS = {
  player: '#101316',
  setter: '#ffc93c',
  libero: '#ffffff',
  ring: '#ffffff',
  text: '#ffffff',
  textOnLight: '#101316'
};

// Court geometry in metres, shared by the SVG arrows and the 3D court.
// 900 data units = 9 m. Net at z = -4.5, our baseline at z = +4.5, x from -4.5 to 4.5.
const SVG_NS = 'http://www.w3.org/2000/svg';
const M_PER_UNIT = 9 / 900;
const SVG_PER_M = 250 / 9;
const BENCH_WX = (BENCH_X - 150) / SVG_PER_M;   // the bench column, where the SVG draws it

// Movement thresholds and arrow sizes (metres, from the prototype)
const MOVE_MIN = 0.5;     // shorter moves show nothing
const ARROW_MIN = 1.7;    // shorter moves show the start circle only
const ARROW_W = 0.11;
const HEAD_LEN = 0.5;
const HEAD_HALF = 0.22;
const DIM_OPACITY = 0.35;

// Slide timing
const MOVE_MS = 850;
const PLAY_MOVE_MS = 1700;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// App State
const state = {
  rotationData: null,
  availableSystems: [],
  currentSystem: null,
  mode: 'serving',
  phase: 'base',
  setterPosition: 1,
  highlightedPlayer: null,
  showZones: true,
  showBench: true,
  // Saved viewer settings (see loadSettings)
  moveMode: 'base',       // 'off' | 'base' | 'prev'
  arrowStyle: 'dashed',   // 'solid' | 'dashed' | 'chevron'
  arrowAlpha: 0.5,
  view: '2d',             // '2d' | '3d' (what is on screen now)
  savedView: '2d',        // last view chosen on this device
  playing: false,
  movement: null          // last computed start circles + arrows
};

// Player elements cache
let playerElements = {};

// ---- Viewer settings, saved on this device ----
const SETTINGS_KEY = 'vrs-viewer-settings';
const MOVE_MODES = ['off', 'base', 'prev'];
const ARROW_STYLES = ['solid', 'dashed', 'chevron'];

function loadSettings() {
  try {
    const o = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (!o || typeof o !== 'object') return;
    if (typeof o.zones === 'boolean') state.showZones = o.zones;
    if (typeof o.bench === 'boolean') state.showBench = o.bench;
    if (MOVE_MODES.includes(o.move)) state.moveMode = o.move;
    if (ARROW_STYLES.includes(o.style)) state.arrowStyle = o.style;
    if (typeof o.alpha === 'number' && o.alpha >= 0.15 && o.alpha <= 1) state.arrowAlpha = o.alpha;
    if (o.view === '2d' || o.view === '3d') state.savedView = o.view;
  } catch (e) { /* storage blocked or corrupt: keep defaults */ }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      v: 1, zones: state.showZones, bench: state.showBench,
      move: state.moveMode, style: state.arrowStyle, alpha: state.arrowAlpha, view: state.view
    }));
  } catch (e) { /* ignore */ }
}

// Reflect settings in the menu and on the SVG court
function applySettingsUI() {
  document.getElementById('toggle-zones').setAttribute('aria-checked', String(state.showZones));
  document.getElementById('toggle-bench').setAttribute('aria-checked', String(state.showBench));
  document.getElementById('zone-labels').style.display = state.showZones ? '' : 'none';
  document.querySelectorAll('#seg-move button').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.v === state.moveMode)));
  document.querySelectorAll('#seg-style button').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.v === state.arrowStyle)));
  const pct = Math.round(state.arrowAlpha * 100);
  document.getElementById('arrow-alpha').value = pct;
  document.getElementById('arrow-alpha-val').textContent = pct + '%';
}

function initSettingsMenu() {
  const btn = document.getElementById('settings-btn');
  const menu = document.getElementById('settings-menu');
  const setOpen = (open, returnFocus) => {
    menu.hidden = !open;
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open) { const first = menu.querySelector('button, input'); if (first) first.focus(); }
    else if (returnFocus) btn.focus();
  };
  btn.addEventListener('click', e => { e.stopPropagation(); setOpen(menu.hidden); });
  document.addEventListener('pointerdown', e => {
    if (!menu.hidden && !e.target.closest('#settings-menu') && !e.target.closest('#settings-btn')) setOpen(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) setOpen(false, true);
  });

  document.getElementById('toggle-zones').addEventListener('click', () => {
    state.showZones = !state.showZones;
    saveSettings(); applySettingsUI(); refresh(false);
  });
  document.getElementById('toggle-bench').addEventListener('click', () => {
    state.showBench = !state.showBench;
    saveSettings(); applySettingsUI(); refresh(false);
  });
  document.getElementById('seg-move').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    state.moveMode = b.dataset.v;
    saveSettings(); applySettingsUI(); refresh(false);
  });
  document.getElementById('seg-style').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    state.arrowStyle = b.dataset.v;
    saveSettings(); applySettingsUI(); refresh(false);
  });
  document.getElementById('arrow-alpha').addEventListener('input', e => {
    state.arrowAlpha = Math.max(0.15, Math.min(1, e.target.value / 100));
    saveSettings(); applySettingsUI(); refresh(false);
  });

  // Tap the floor to clear the followed player
  document.querySelector('.court-svg').addEventListener('click', () => {
    if (state.highlightedPlayer) togglePlayerSelection(null);
  });
}

// Single redraw entry point for the court
function refresh(animate = true) {
  updatePlayers(animate);
  renderMovement();
}

// Load available systems from manifest
async function loadAvailableSystems() {
  try {
    const response = await fetch('rotations/systems.json');
    if (!response.ok) throw new Error('Failed to load systems.json');
    state.availableSystems = await response.json();
    return state.availableSystems;
  } catch (error) {
    console.error('Error loading systems:', error);
    state.availableSystems = ['5-1'];
    return state.availableSystems;
  }
}

// Populate system dropdown dynamically
function populateSystemDropdown() {
  const menu = document.getElementById('system-menu');
  menu.innerHTML = '';

  state.availableSystems.forEach(systemName => {
    const btn = document.createElement('button');
    btn.className = 'system-option' + (state.currentSystem === systemName ? ' active' : '');
    btn.dataset.system = systemName;
    btn.textContent = systemName;
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      stopPlay();
      menu.classList.remove('open');

      // Reset state for new system
      state.phase = 'base';
      state.highlightedPlayer = null;

      await loadRotation(systemName);
      renderPhaseButtons();
      initPlayers();
      syncURL();
    });
    menu.appendChild(btn);
  });

  // Separator + Import option
  const sep = document.createElement('div');
  sep.className = 'system-sep';
  menu.appendChild(sep);

  const importBtn = document.createElement('button');
  importBtn.className = 'system-option system-import';
  importBtn.textContent = '↑ Import file...';
  importBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.remove('open');
    document.getElementById('import-rotation').click();
  });
  menu.appendChild(importBtn);
}

// Load rotation data from JSON
async function loadRotation(systemName) {
  try {
    const response = await fetch(`rotations/${systemName}.json`);
    if (!response.ok) throw new Error(`Failed to load ${systemName}.json`);
    state.rotationData = await response.json();
    routeCache.clear();
    state.currentSystem = systemName;
    document.getElementById('system-badge').textContent = state.rotationData.name + ' ▾';

    // Update active state in dropdown
    document.querySelectorAll('.system-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.system === systemName);
    });

    updateSheetCta();
    return state.rotationData;
  } catch (error) {
    console.error('Error loading rotation:', error);
    return null;
  }
}

// Show the 5-1 cheat-sheet download only while the 5-1 system is active.
function updateSheetCta() {
  const cta = document.getElementById('sheet-cta');
  if (cta) cta.hidden = state.currentSystem !== '5-1';
}

// Load rotation from a parsed JSON object (e.g. from file import)
function loadRotationFromData(data) {
  routeCache.clear();
  state.rotationData = data;
  state.currentSystem = null;
  document.getElementById('system-badge').textContent = (data.name || 'Custom') + ' ▾';
  document.querySelectorAll('.system-option').forEach(opt => opt.classList.remove('active'));
  updateSheetCta();
}

// Get phase key for position lookup
function getPhaseKey() {
  const prefix = state.mode === 'serving' ? 'serving' : 'receiving';
  const phaseMap = {
    base: 'Base', serve: 'Serve', switch: 'Switch',
    pass: 'Pass', set: 'Set', attack: 'Attack'
  };
  return prefix + phaseMap[state.phase];
}

// Get positions for current state
function getPositions() {
  if (!state.rotationData) return {};
  const phaseData = state.rotationData.positions[getPhaseKey()];
  return (phaseData && phaseData[state.setterPosition]) || {};
}

// Check if player is on bench (substituted out)
function isOnBench(pos) {
  return pos[0] < 0;
}

// Scale position from 900-unit system to SVG coordinates
function scalePos(pos) {
  if (isOnBench(pos)) {
    const scaledY = COURT_OFFSET_Y + pos[1] * SCALE;
    return { x: BENCH_X, y: scaledY };
  }
  return {
    x: COURT_OFFSET_X + pos[0] * SCALE,
    y: COURT_OFFSET_Y + pos[1] * SCALE
  };
}

function toWorld(pos) {
  const z = -4.5 + pos[1] * M_PER_UNIT;
  return isOnBench(pos) ? [BENCH_WX, z] : [pos[0] * M_PER_UNIT - 4.5, z];
}

function worldToSvg(w) {
  return [150 + w[0] * SVG_PER_M, COURT_OFFSET_Y + (w[1] + 4.5) * SVG_PER_M];
}

function phaseKeyFor(mode, phase) {
  return mode + phase.charAt(0).toUpperCase() + phase.slice(1);
}

function getPositionsFor(mode, phase) {
  const d = state.rotationData && state.rotationData.positions[phaseKeyFor(mode, phase)];
  return (d && d[state.setterPosition]) || {};
}

function moveDuration(animate) {
  if (!animate || reducedMotion.matches) return 0;
  return state.playing ? PLAY_MOVE_MS : MOVE_MS;
}

function tokenOpacity(id, onBench) {
  const dim = state.highlightedPlayer && state.highlightedPlayer !== id ? DIM_OPACITY : 1;
  return Math.min(dim, onBench ? 0.5 : 1);
}

// Token fill + label colour by role (setter and libero are told apart by more than colour: labels S / L)
function getPlayerColors(player) {
  if (player.role === 'setter') return { fill: COLORS.setter, text: COLORS.textOnLight };
  if (player.isLibero) return { fill: COLORS.libero, text: COLORS.textOnLight };
  return { fill: COLORS.player, text: COLORS.text };
}

// Create SVG element for a player
function createPlayerElement(player) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.style.cursor = 'pointer';

  // Solid white selection ring, shown when the player is followed
  const ring = document.createElementNS(SVG_NS, 'circle');
  ring.setAttribute('r', PLAYER_RADIUS + 3.5);
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', COLORS.ring);            // white: yellow is for the setter only
  ring.setAttribute('stroke-width', '2');
  ring.style.display = 'none';

  const colors = getPlayerColors(player);

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('r', PLAYER_RADIUS);
  circle.setAttribute('fill', colors.fill);
  circle.setAttribute('stroke', COLORS.ring);
  circle.setAttribute('stroke-width', '1.5');

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('fill', colors.text);
  text.setAttribute('font-size', '13.5');
  text.setAttribute('font-weight', '700');
  text.setAttribute('letter-spacing', '0.3');
  text.textContent = String(player.label);

  g.appendChild(ring);
  g.appendChild(circle);
  g.appendChild(text);

  g.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayerSelection(player.id);
  });

  return { group: g, circle, text, ring };
}

// Initialize player elements
function initPlayers() {
  const playersGroup = document.getElementById('players');
  playersGroup.innerHTML = '';
  playerElements = {};

  if (!state.rotationData) return;

  state.rotationData.players.forEach(player => {
    const elements = createPlayerElement(player);
    playerElements[player.id] = elements;
    playersGroup.appendChild(elements.group);
  });

  refresh(false);
}

// Update player positions
function updatePlayers(animate = true) {
  if (!state.rotationData) return;
  const posData = getPositions();
  const duration = moveDuration(animate);

  state.rotationData.players.forEach(player => {
    const elements = playerElements[player.id];
    if (!elements) return;

    const pos = posData[player.id];
    if (!pos || (isOnBench(pos) && !state.showBench)) {
      elements.group.style.display = 'none';
      return;
    }

    elements.group.style.display = '';
    const scaled = scalePos(pos);
    elements.group.style.transition =
      `transform ${duration}ms cubic-bezier(0.65, 0, 0.35, 1), opacity 200ms ease`;
    elements.group.style.transform = `translate(${scaled.x}px, ${scaled.y}px)`;
    elements.group.style.opacity = String(tokenOpacity(player.id, isOnBench(pos)));
    elements.ring.style.display = state.highlightedPlayer === player.id ? '' : 'none';
  });
}

// Selection only: ring + dimming. Leaves transforms alone so a tap mid-slide does not snap tokens.
function updateSelection() {
  if (!state.rotationData) return;
  const posData = getPositions();
  state.rotationData.players.forEach(player => {
    const elements = playerElements[player.id];
    const pos = posData[player.id];
    if (!elements || !pos) return;
    elements.group.style.opacity = String(tokenOpacity(player.id, isOnBench(pos)));
    elements.ring.style.display = state.highlightedPlayer === player.id ? '' : 'none';
  });
}

// Tap a player to follow only their path; tap again (or the floor: id = null) to clear
function togglePlayerSelection(id) {
  state.highlightedPlayer = (id && id !== state.highlightedPlayer) ? id : null;
  updateSelection();
  renderMovement();
}

// ---- Movement: start circles + arrows from an earlier phase to the current one ----
const routeCache = new Map();   // cleared whenever a rotation is loaded

function getFromPhase() {
  if (state.moveMode === 'off' || !state.rotationData) return null;
  const phases = state.rotationData.phases[state.mode] || [];
  const i = phases.indexOf(state.phase);
  if (i <= 0) return null;
  return state.moveMode === 'prev' ? phases[i - 1] : phases[0];
}

// Renderer-independent model, in metres: { ghosts: [{id,label,at}], arrows: [{id,a,b,bend,setter}] }
function buildMovement() {
  const out = { ghosts: [], arrows: [] };
  const fromPhase = getFromPhase();
  if (!fromPhase) return out;

  const cur = getPositions();
  const from = getPositionsFor(state.mode, fromPhase);
  const specs = [], fixed = [];

  state.rotationData.players.forEach(player => {
    const a = from[player.id], b = cur[player.id];
    if (!a || !b) return;
    if (!state.showBench && (isOnBench(a) || isOnBench(b))) return;
    const wa = toWorld(a), wb = toWorld(b);
    if (state.highlightedPlayer && player.id !== state.highlightedPlayer) { fixed.push(wa, wb); return; }
    const d = Math.hypot(wa[0] - wb[0], wa[1] - wb[1]);
    if (d < MOVE_MIN) { fixed.push(wb); return; }
    out.ghosts.push({ id: player.id, label: String(player.label), at: wa, setter: player.role === 'setter' });
    if (d < ARROW_MIN) { fixed.push(wa, wb); return; }
    specs.push({ id: player.id, a: wa, b: wb, setter: player.role === 'setter' });
  });

  const key = [state.mode, state.setterPosition, fromPhase, state.phase, state.highlightedPlayer, state.showBench].join('|');
  const cached = routeCache.get(key);
  if (cached && cached.length === specs.length) {
    specs.forEach((s, i) => { s.bend = cached[i]; });
  } else {
    VRSRouting.route(specs, fixed);
    routeCache.set(key, specs.map(s => s.bend));
  }
  out.arrows = specs;
  return out;
}

function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

const f2 = n => n.toFixed(2);
function svgPt(w) { const p = worldToSvg(w); return f2(p[0]) + ' ' + f2(p[1]); }
const CHEVRON_D = 'M' + VRSRouting.CHEVRON.map(p => p[0] + ' ' + p[1]).join('L') + 'Z';

function drawSvgArrow(a) {
  const R = VRSRouting;
  const cv = R.curve(a.a, a.b, a.bend);
  const color = a.setter ? COLORS.setter : '#ffffff';
  const g = svgEl('g', { opacity: String(state.arrowAlpha) });   // group opacity: head and line never double up

  if (state.arrowStyle === 'chevron') {
    R.chevrons(cv).forEach(ch => {
      const p = worldToSvg(ch.p);
      const deg = Math.atan2(ch.t[1], ch.t[0]) * 180 / Math.PI;
      g.appendChild(svgEl('path', {
        d: CHEVRON_D, fill: color, 'fill-opacity': f2(ch.fade),
        transform: `translate(${f2(p[0])} ${f2(p[1])}) rotate(${f2(deg)}) scale(${f2(ch.scale * SVG_PER_M)})`
      }));
    });
    return g;
  }

  const body = R.head(cv, 0.92);
  const line = svgEl('path', {
    d: `M${svgPt(body.s)} Q${svgPt(body.c)} ${svgPt(body.e)}`,
    fill: 'none', stroke: color, 'stroke-width': f2(ARROW_W * SVG_PER_M)
  });
  if (state.arrowStyle === 'dashed') {
    line.setAttribute('stroke-dasharray', f2(0.34 * SVG_PER_M) + ' ' + f2(0.22 * SVG_PER_M));
  }
  g.appendChild(line);

  // Head: tip at the end of the curve, pointing along its final direction
  const tip = cv.e, t = R.tangentAt(cv, 1);
  const bx = tip[0] - t[0] * HEAD_LEN, bz = tip[1] - t[1] * HEAD_LEN;
  const pts = [tip, [bx - t[1] * HEAD_HALF, bz + t[0] * HEAD_HALF], [bx + t[1] * HEAD_HALF, bz - t[0] * HEAD_HALF]];
  g.appendChild(svgEl('polygon', { points: pts.map(svgPt).join(' '), fill: color }));
  return g;
}

function renderMovement() {
  const layer = document.getElementById('movement');
  layer.textContent = '';
  if (!state.rotationData) { state.movement = null; return; }
  const mv = state.movement = buildMovement();

  mv.ghosts.forEach(gh => {
    const p = worldToSvg(gh.at);
    const g = svgEl('g', { transform: `translate(${f2(p[0])} ${f2(p[1])})` });
    g.appendChild(svgEl('circle', {
      r: PLAYER_RADIUS, fill: '#ffffff', 'fill-opacity': '0.1',
      stroke: gh.setter ? COLORS.setter : '#ffffff', 'stroke-opacity': '0.85', 'stroke-width': '1.2', 'stroke-dasharray': '2.8 2.3'
    }));
    const label = svgEl('text', {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: '#ffffff', 'fill-opacity': '0.7', 'font-size': '11', 'font-weight': '700'
    });
    label.textContent = gh.label;
    g.appendChild(label);
    layer.appendChild(g);
  });
  mv.arrows.forEach(a => layer.appendChild(drawSvgArrow(a)));
}

// Render phase buttons based on current mode
function renderPhaseButtons() {
  const container = document.getElementById('phase-buttons');
  container.innerHTML = '';

  if (!state.rotationData) return;

  const phases = state.rotationData.phases[state.mode];
  const phaseLabels = {
    base: 'Base', serve: 'Serve', pass: 'Pass',
    set: 'Set', attack: 'Attack', switch: 'Switch'
  };

  phases.forEach(phase => {
    const btn = document.createElement('button');
    btn.className = 'phase-btn' + (state.phase === phase ? ' active' : '');
    btn.dataset.phase = phase;
    btn.textContent = phaseLabels[phase];
    btn.addEventListener('click', () => {
      stopPlay();
      setPhase(phase);
    });
    container.appendChild(btn);
  });
}

function setPhase(phase) {
  state.phase = phase;
  document.querySelectorAll('.phase-btn').forEach(b => b.classList.toggle('active', b.dataset.phase === phase));
  refresh();
  syncURL();
}

// ---- Play: step through the phases of the current mode ----
const PLAY_FIRST_MS = 2200, PLAY_STEP_MS = 2600, PLAY_END_MS = 1800;
let playTimer = null;

function updatePlayButton() {
  const btn = document.getElementById('play-btn');
  btn.classList.toggle('on', state.playing);
  btn.setAttribute('aria-pressed', String(state.playing));
  document.getElementById('play-label').textContent = state.playing ? 'Stop' : 'Play';
}

function stopPlay() {
  if (!state.playing) return;
  state.playing = false;
  clearTimeout(playTimer);
  updatePlayButton();
}

function playStep() {
  if (!state.playing) return;
  const phases = state.rotationData.phases[state.mode] || [];
  const i = phases.indexOf(state.phase);
  if (i < 0 || i >= phases.length - 1) { playTimer = setTimeout(stopPlay, PLAY_END_MS); return; }
  setPhase(phases[i + 1]);
  playTimer = setTimeout(playStep, PLAY_STEP_MS);
}

function togglePlay() {
  if (state.playing) { stopPlay(); return; }
  const phases = state.rotationData ? (state.rotationData.phases[state.mode] || []) : [];
  if (phases.length < 2) return;
  state.playing = true;
  updatePlayButton();
  setPhase(phases[0]);
  playTimer = setTimeout(playStep, PLAY_FIRST_MS);
}

// Initialize event handlers
function initEventHandlers() {
  // System dropdown toggle
  const systemBadge = document.getElementById('system-badge');
  const systemMenu = document.getElementById('system-menu');

  systemBadge.addEventListener('click', (e) => {
    e.stopPropagation();
    systemMenu.classList.toggle('open');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    systemMenu.classList.remove('open');
  });

  document.getElementById('play-btn').addEventListener('click', togglePlay);

  // Mode toggle
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      stopPlay();
      state.mode = btn.dataset.mode;
      state.phase = 'base';
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPhaseButtons();
      refresh();
      syncURL();
    });
  });

  // Setter position
  document.querySelectorAll('.zone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      stopPlay();
      state.setterPosition = parseInt(btn.dataset.zone);
      document.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refresh();
      syncURL();
    });
  });
}

// ---- Shareable URL state (deep links) ----
// Lets other pages link straight to a court state, e.g.
//   /?system=5-1&zone=3&mode=receiving&phase=pass
const VALID_MODES = ['serving', 'receiving'];

function readStateFromURL() {
  const p = new URLSearchParams(window.location.search);
  return {
    system: p.get('system'),
    mode: p.get('mode'),
    phase: p.get('phase'),
    zone: p.get('zone')
  };
}

// Apply validated URL params to state + button active classes.
// Call AFTER the rotation is loaded so phase can be validated against it.
function applyURLState(params) {
  if (VALID_MODES.includes(params.mode)) {
    state.mode = params.mode;
    document.querySelectorAll('.mode-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === state.mode));
  }

  const zone = parseInt(params.zone, 10);
  if (zone >= 1 && zone <= 6) {
    state.setterPosition = zone;
    document.querySelectorAll('.zone-btn').forEach(b =>
      b.classList.toggle('active', parseInt(b.dataset.zone, 10) === zone));
  }

  const phases = state.rotationData && state.rotationData.phases
    ? state.rotationData.phases[state.mode] : null;
  if (params.phase && Array.isArray(phases) && phases.includes(params.phase)) {
    state.phase = params.phase;
  }
}

// Reflect current state into the URL without reloading (interaction only —
// the homepage URL stays clean until the user changes something).
function syncURL() {
  const p = new URLSearchParams();
  if (state.currentSystem) p.set('system', state.currentSystem);
  p.set('mode', state.mode);
  p.set('phase', state.phase);
  p.set('zone', String(state.setterPosition));
  history.replaceState(null, '', window.location.pathname + '?' + p.toString());
}

// Initialize app
async function init() {
  loadSettings();
  initEventHandlers();
  initSettingsMenu();
  applySettingsUI();
  await loadAvailableSystems();
  populateSystemDropdown();

  const urlState = readStateFromURL();

  // Use the URL's system if it's one we have, else the first available.
  let system = state.availableSystems[0] || '5-1';
  if (urlState.system && state.availableSystems.includes(urlState.system)) {
    system = urlState.system;
  }

  await loadRotation(system);
  applyURLState(urlState);   // mode + zone + phase (phase validated against the loaded rotation)
  renderPhaseButtons();
  initPlayers();
}

// Same minimum the editor requires, so a wrong file is refused before it replaces the court
function isRotationData(d) {
  return !!d && typeof d === 'object' && Array.isArray(d.players) &&
    !!d.phases && Array.isArray(d.phases.serving) && Array.isArray(d.phases.receiving) &&
    !!d.positions && typeof d.positions === 'object';
}

// Handle imported rotation file
document.getElementById('import-rotation').addEventListener('change', async (e) => {
  stopPlay();
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!isRotationData(data)) throw new Error('Not a rotation file');
    loadRotationFromData(data);
    state.phase = data.phases[state.mode][0] || 'base';
    state.highlightedPlayer = null;
    renderPhaseButtons();
    initPlayers();
    syncURL();
  } catch (err) {
    console.error('Failed to load rotation file:', err);
    alert('Could not load file — make sure it is a valid rotation JSON.');
  }
  e.target.value = '';
});

// Initialize help panel
(function initHelpPanel() {
  const trigger   = document.getElementById('help-trigger');
  const panel     = document.getElementById('help-panel');
  const backdrop  = document.getElementById('help-panel-backdrop');
  const closeBtn  = document.getElementById('help-panel-close');
  if (!trigger || !panel) return;

  const open = () => {
    panel.classList.add('open');
    backdrop.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
  };
  const close = () => {
    panel.classList.remove('open');
    backdrop.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  };

  trigger.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
})();

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
