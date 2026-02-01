/**
 * Volleyball Rotation System
 *
 * Position data derived from VBRotations by monkeysppp
 * https://github.com/monkeysppp/VBRotations
 * Licensed under Apache License 2.0
 */

// Configuration
const SCALE = 250 / 900;
const COURT_OFFSET_X = 25;
const COURT_OFFSET_Y = 32;
const PLAYER_RADIUS = 18;
const BENCH_X = 12;

const COLORS = {
  player: '#efa581',
  highlight: '#f1c40f',
  libero: '#e74c3c',
  text: '#f5f5f5'
};

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
  showBench: true
};

// Player elements cache
let playerElements = {};

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
      menu.classList.remove('open');

      // Reset state for new system
      state.phase = 'base';
      state.highlightedPlayer = null;

      await loadRotation(systemName);
      renderPhaseButtons();
      initPlayers();
    });
    menu.appendChild(btn);
  });
}

// Load rotation data from JSON
async function loadRotation(systemName) {
  try {
    const response = await fetch(`rotations/${systemName}.json`);
    if (!response.ok) throw new Error(`Failed to load ${systemName}.json`);
    state.rotationData = await response.json();
    state.currentSystem = systemName;
    document.getElementById('system-badge').textContent = state.rotationData.name + ' ▼';

    // Update active state in dropdown
    document.querySelectorAll('.system-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.system === systemName);
    });

    return state.rotationData;
  } catch (error) {
    console.error('Error loading rotation:', error);
    return null;
  }
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
  return phaseData ? phaseData[state.setterPosition] : {};
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

// Get player color based on state
function getPlayerColor(player) {
  if (state.highlightedPlayer === player.id) return COLORS.highlight;
  if (player.isLibero) return COLORS.libero;
  return COLORS.player;
}

// Create SVG element for a player
function createPlayerElement(player) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.style.cursor = 'pointer';

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('r', PLAYER_RADIUS);
  circle.setAttribute('stroke', COLORS.text);
  circle.setAttribute('stroke-width', '2');

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('fill', COLORS.text);
  text.setAttribute('font-size', '11');
  text.setAttribute('font-weight', '700');
  text.textContent = player.label;

  g.appendChild(circle);
  g.appendChild(text);

  g.addEventListener('click', () => {
    state.highlightedPlayer = state.highlightedPlayer === player.id ? null : player.id;
    updatePlayerColors();
  });

  return { group: g, circle, text };
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

  updatePlayers(false);
}

// Update player positions
function updatePlayers(animate = true) {
  const posData = getPositions();
  if (!state.rotationData) return;

  state.rotationData.players.forEach(player => {
    const elements = playerElements[player.id];
    if (!elements) return;

    const pos = posData[player.id];
    if (!pos) {
      elements.group.style.display = 'none';
      return;
    }

    const onBench = isOnBench(pos);

    // Hide benched players if bench display is off
    if (onBench && !state.showBench) {
      elements.group.style.display = 'none';
      return;
    }

    elements.group.style.display = '';

    const scaled = scalePos(pos);
    const duration = animate ? 500 : 0;
    elements.group.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    elements.group.style.transform = `translate(${scaled.x}px, ${scaled.y}px)`;
    elements.circle.setAttribute('fill', getPlayerColor(player));
    elements.group.style.opacity = onBench ? '0.5' : '1';
  });
}

// Update player colors only
function updatePlayerColors() {
  if (!state.rotationData) return;
  state.rotationData.players.forEach(player => {
    const elements = playerElements[player.id];
    if (elements) {
      elements.circle.setAttribute('fill', getPlayerColor(player));
    }
  });
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
    btn.textContent = phaseLabels[phase];
    btn.addEventListener('click', () => {
      state.phase = phase;
      document.querySelectorAll('.phase-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePlayers();
    });
    container.appendChild(btn);
  });
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

  // Mode toggle
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      state.phase = 'base';
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPhaseButtons();
      updatePlayers();
    });
  });

  // Setter position
  document.querySelectorAll('.zone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.setterPosition = parseInt(btn.dataset.zone);
      document.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePlayers();
    });
  });

  // Toggle zones
  document.getElementById('toggle-zones').addEventListener('click', (e) => {
    state.showZones = !state.showZones;
    e.currentTarget.classList.toggle('active', state.showZones);
    document.getElementById('zone-labels').style.display = state.showZones ? '' : 'none';
  });

  // Toggle bench
  document.getElementById('toggle-bench').addEventListener('click', (e) => {
    state.showBench = !state.showBench;
    e.currentTarget.classList.toggle('active', state.showBench);
    updatePlayers();
  });
}

// Initialize app
async function init() {
  initEventHandlers();
  await loadAvailableSystems();
  populateSystemDropdown();

  // Load first available system
  const defaultSystem = state.availableSystems[0] || '5-1';
  await loadRotation(defaultSystem);
  renderPhaseButtons();
  initPlayers();
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
