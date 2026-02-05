/**
 * Rotation Editor (Redesigned UI)
 * A flexible tool for creating and editing volleyball rotation systems
 * Matches main app design system
 */

// Constants
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

// Default rotation template
const DEFAULT_ROTATION = {
  name: 'New Rotation',
  description: 'Custom rotation system',
  players: [
    { id: 's', label: 'S', role: 'setter' },
    { id: 'o', label: 'O', role: 'opposite' },
    { id: 'h1', label: 'H1', role: 'outside' },
    { id: 'h2', label: 'H2', role: 'outside' },
    { id: 'm1', label: 'M1', role: 'middle' },
    { id: 'm2', label: 'M2', role: 'middle' }
  ],
  phases: {
    serving: ['base', 'serve', 'switch'],
    receiving: ['base', 'pass', 'set', 'attack', 'switch']
  },
  positions: {}
};

// Available phases for each mode
const AVAILABLE_PHASES = ['base', 'serve', 'pass', 'set', 'attack', 'switch'];

// App state
const state = {
  rotation: null,
  currentMode: 'serving',
  currentPhase: 'base',
  currentSetter: 1,
  selectedPlayer: null,
  draggingPlayer: null,
  dragOffset: { x: 0, y: 0 },
  editingPlayer: null,
  completion: {}  // { "servingBase": { "1": true, ... }, ... }
};

// Player elements cache
let playerElements = {};

// ==========================================
// INITIALIZATION
// ==========================================

function init() {
  loadFromStorage();
  loadCompletionState();
  initEventHandlers();
  renderPlayerList();
  renderPhaseConfig();
  renderNavigation();
  renderCourtPlayers();
  updatePositionInfo();
}

// Load rotation from localStorage or use default
function loadFromStorage() {
  const saved = localStorage.getItem('rotation-editor-data');
  if (saved) {
    try {
      state.rotation = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved data:', e);
      state.rotation = JSON.parse(JSON.stringify(DEFAULT_ROTATION));
    }
  } else {
    state.rotation = JSON.parse(JSON.stringify(DEFAULT_ROTATION));
  }

  // Ensure positions object exists
  if (!state.rotation.positions) {
    state.rotation.positions = {};
  }

  // Update header inputs
  document.getElementById('system-name').value = state.rotation.name;
  document.getElementById('system-desc').value = state.rotation.description;
}

// Save to localStorage
function saveToStorage() {
  state.rotation.name = document.getElementById('system-name').value;
  state.rotation.description = document.getElementById('system-desc').value;
  localStorage.setItem('rotation-editor-data', JSON.stringify(state.rotation));
}

// ==========================================
// COMPLETION TRACKING
// ==========================================

function loadCompletionState() {
  const saved = localStorage.getItem('rotation-editor-completion');
  if (saved) {
    try {
      state.completion = JSON.parse(saved);
    } catch (e) {
      state.completion = {};
    }
  } else {
    state.completion = {};
  }
}

function saveCompletionState() {
  localStorage.setItem('rotation-editor-completion', JSON.stringify(state.completion));
}

function clearCompletionState() {
  state.completion = {};
  saveCompletionState();
}

// Toggle completion for current mode+phase+setter
function toggleCompletion() {
  const key = getPhaseKey();
  if (!state.completion[key]) {
    state.completion[key] = {};
  }
  const setterStr = String(state.currentSetter);
  state.completion[key][setterStr] = !state.completion[key][setterStr];
  saveCompletionState();
  updateNavVisuals();
  renderPhaseConfig();
}

// Check if a specific zone is marked complete
function isZoneComplete(mode, phase, setter) {
  const key = mode + phase.charAt(0).toUpperCase() + phase.slice(1);
  return !!(state.completion[key] && state.completion[key][String(setter)]);
}

// Check if all 6 zones for a phase are complete
function isPhaseComplete(mode, phase) {
  for (let z = 1; z <= 6; z++) {
    if (!isZoneComplete(mode, phase, z)) return false;
  }
  return true;
}

// Get completion count: { done, total }
function getCompletionCount() {
  let done = 0;
  let total = 0;
  ['serving', 'receiving'].forEach(mode => {
    const phases = state.rotation.phases[mode] || [];
    phases.forEach(phase => {
      for (let z = 1; z <= 6; z++) {
        total++;
        if (isZoneComplete(mode, phase, z)) done++;
      }
    });
  });
  return { done, total };
}

// Remove completion entries for a specific phase
function removeCompletionForPhase(mode, phase) {
  const key = mode + phase.charAt(0).toUpperCase() + phase.slice(1);
  delete state.completion[key];
  saveCompletionState();
}

// ==========================================
// NAVIGATION (Phase Buttons + Zone Grid)
// ==========================================

// Render the full navigation bar (phase buttons + zone grid)
function renderNavigation() {
  const container = document.getElementById('nav-phases');
  container.innerHTML = '';

  ['serving', 'receiving'].forEach(mode => {
    const group = document.createElement('div');
    group.className = 'nav-mode-group';

    const label = document.createElement('span');
    label.className = 'nav-mode-label';
    label.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);

    const btns = document.createElement('div');
    btns.className = 'nav-phase-btns';

    const phases = state.rotation.phases[mode] || [];
    phases.forEach(phase => {
      const btn = document.createElement('button');
      btn.className = 'phase-btn';
      btn.dataset.mode = mode;
      btn.dataset.phase = phase;
      btn.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);

      // Set active/complete states
      if (state.currentMode === mode && state.currentPhase === phase) {
        btn.classList.add('active');
      }
      if (isPhaseComplete(mode, phase)) {
        btn.classList.add('complete');
      }

      btn.addEventListener('click', () => {
        state.currentMode = mode;
        state.currentPhase = phase;
        renderCourtPlayers();
        updatePositionInfo();
        updateNavVisuals();
      });

      btns.appendChild(btn);
    });

    group.appendChild(label);
    group.appendChild(btns);
    container.appendChild(group);
  });

  // Also update zone grid and progress
  updateNavVisuals();
}

// Update active/complete visual states on nav buttons without full re-render
function updateNavVisuals() {
  // Update phase buttons
  document.querySelectorAll('.phase-btn').forEach(btn => {
    const mode = btn.dataset.mode;
    const phase = btn.dataset.phase;
    btn.classList.toggle('active', state.currentMode === mode && state.currentPhase === phase);
    btn.classList.toggle('complete', isPhaseComplete(mode, phase));
  });

  // Update zone buttons
  document.querySelectorAll('.zone-btn').forEach(btn => {
    const zone = parseInt(btn.dataset.zone);
    const isActive = zone === state.currentSetter;
    const isDone = isZoneComplete(state.currentMode, state.currentPhase, zone);
    btn.classList.toggle('active', isActive);
    btn.classList.toggle('complete', isDone);
    // Show checkmark for completed zones
    const zoneNum = btn.dataset.zone;
    btn.textContent = isDone ? '\u2713 ' + zoneNum : zoneNum;
  });

  // Update Mark Done button
  const markBtn = document.getElementById('btn-mark-done');
  const currentDone = isZoneComplete(state.currentMode, state.currentPhase, state.currentSetter);
  markBtn.classList.toggle('is-done', currentDone);
  markBtn.textContent = currentDone ? '\u2713 Done' : 'Mark Done';

  // Update progress counter
  const { done, total } = getCompletionCount();
  document.getElementById('progress-text').textContent = `${done} / ${total}`;
}

// ==========================================
// POSITION HELPERS
// ==========================================

// Get phase key for position lookup
function getPhaseKey() {
  const prefix = state.currentMode;
  const phase = state.currentPhase.charAt(0).toUpperCase() + state.currentPhase.slice(1);
  return prefix + phase;
}

// Get positions for current state
function getCurrentPositions() {
  const key = getPhaseKey();
  if (!state.rotation.positions[key]) {
    state.rotation.positions[key] = {};
  }
  if (!state.rotation.positions[key][state.currentSetter]) {
    state.rotation.positions[key][state.currentSetter] = {};
  }
  return state.rotation.positions[key][state.currentSetter];
}

// Check if position is on bench
function isOnBench(pos) {
  return pos && pos[0] < 0;
}

// Scale position from SVG coordinates to 900-unit system
function unscalePos(x, y) {
  if (x < 25) {
    return [-64, Math.round((y - COURT_OFFSET_Y) / SCALE)];
  }
  return [
    Math.round((x - COURT_OFFSET_X) / SCALE),
    Math.round((y - COURT_OFFSET_Y) / SCALE)
  ];
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

// Get player color
function getPlayerColor(playerId) {
  const player = state.rotation.players.find(p => p.id === playerId);
  if (!player) return COLORS.player;

  if (player.isLibero) return COLORS.libero;
  if (state.selectedPlayer === playerId) return COLORS.highlight;
  return COLORS.player;
}

// ==========================================
// PLAYER LIST (Left Panel)
// ==========================================

function renderPlayerList() {
  const container = document.getElementById('player-list');
  container.innerHTML = '';

  state.rotation.players.forEach(player => {
    const item = document.createElement('div');
    item.className = 'player-item';
    if (state.selectedPlayer === player.id) {
      item.classList.add('selected');
    }
    item.dataset.playerId = player.id;

    const color = document.createElement('div');
    color.className = 'player-color';
    color.style.background = getPlayerColor(player.id);

    const info = document.createElement('div');
    info.className = 'player-info';

    const name = document.createElement('div');
    name.className = 'player-name';
    name.textContent = `${player.label} (${player.id})`;

    const role = document.createElement('div');
    role.className = 'player-role';
    role.textContent = player.role + (player.isLibero ? ' (Libero)' : '');

    info.appendChild(name);
    info.appendChild(role);

    const actions = document.createElement('div');
    actions.className = 'player-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.textContent = '\u270E';
    editBtn.title = 'Edit';
    editBtn.onclick = () => openPlayerModal(player.id);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn delete';
    deleteBtn.textContent = '\u2715';
    deleteBtn.title = 'Delete';
    deleteBtn.onclick = () => deletePlayer(player.id);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(color);
    item.appendChild(info);
    item.appendChild(actions);

    item.addEventListener('click', (e) => {
      if (e.target.closest('.icon-btn')) return;
      selectPlayer(player.id);
    });

    container.appendChild(item);
  });
}

// ==========================================
// PHASE CONFIGURATION (Right Panel)
// ==========================================

function renderPhaseConfig() {
  const container = document.getElementById('phase-config');
  container.innerHTML = '';

  ['serving', 'receiving'].forEach(mode => {
    const section = document.createElement('div');
    section.className = 'mode-section';

    const label = document.createElement('div');
    label.className = 'mode-label';
    label.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);

    const phaseList = document.createElement('div');
    phaseList.className = 'phase-tags';

    const phases = state.rotation.phases[mode] || [];

    phases.forEach(phase => {
      const tag = document.createElement('div');
      tag.className = 'phase-tag';

      const tagLabel = document.createElement('span');
      tagLabel.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);

      // Completion dots: 6 tiny dots showing per-zone status
      const dots = document.createElement('span');
      dots.className = 'completion-dots';
      for (let z = 1; z <= 6; z++) {
        const dot = document.createElement('span');
        dot.className = 'completion-dot';
        if (isZoneComplete(mode, phase, z)) {
          dot.classList.add('done');
        }
        dots.appendChild(dot);
      }

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '\u2715';
      removeBtn.title = 'Remove phase';
      removeBtn.onclick = () => removePhase(mode, phase);

      tag.appendChild(tagLabel);
      tag.appendChild(dots);
      tag.appendChild(removeBtn);
      phaseList.appendChild(tag);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-phase-btn';
    addBtn.textContent = '+ Add Phase';
    addBtn.onclick = () => addPhase(mode);

    phaseList.appendChild(addBtn);
    section.appendChild(label);
    section.appendChild(phaseList);
    container.appendChild(section);
  });
}

// ==========================================
// COURT RENDERING
// ==========================================

function renderCourtPlayers() {
  const container = document.getElementById('editor-players');
  container.innerHTML = '';
  playerElements = {};

  const positions = getCurrentPositions();

  state.rotation.players.forEach(player => {
    const pos = positions[player.id];

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('draggable-player');
    g.dataset.playerId = player.id;

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

    if (pos) {
      const scaled = scalePos(pos);
      g.setAttribute('transform', `translate(${scaled.x}, ${scaled.y})`);
      g.style.opacity = isOnBench(pos) ? '0.5' : '1';
    } else {
      g.setAttribute('transform', 'translate(150, 157)');
      g.style.opacity = '0.5';
    }

    circle.setAttribute('fill', getPlayerColor(player.id));

    g.style.pointerEvents = 'all';
    g.style.cursor = 'grab';

    g.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      startDrag(e, player.id);
    });

    g.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      e.preventDefault();
      startDrag(e, player.id);
    }, { passive: false });

    g.addEventListener('click', (e) => {
      e.stopPropagation();
      selectPlayer(player.id);
    });

    container.appendChild(g);
    playerElements[player.id] = { group: g, circle, text };
  });
}

// ==========================================
// POSITION INFO
// ==========================================

function updatePositionInfo() {
  document.getElementById('info-selected').textContent = state.selectedPlayer || 'None';

  if (state.selectedPlayer) {
    const positions = getCurrentPositions();
    const pos = positions[state.selectedPlayer];

    if (pos) {
      document.getElementById('info-x').textContent = pos[0];
      document.getElementById('info-y').textContent = pos[1];
      document.getElementById('btn-to-bench').disabled = isOnBench(pos);
    } else {
      document.getElementById('info-x').textContent = '-';
      document.getElementById('info-y').textContent = '-';
      document.getElementById('btn-to-bench').disabled = true;
    }
  } else {
    document.getElementById('info-x').textContent = '-';
    document.getElementById('info-y').textContent = '-';
    document.getElementById('btn-to-bench').disabled = true;
  }
}

// ==========================================
// PLAYER SELECTION
// ==========================================

function selectPlayer(playerId) {
  state.selectedPlayer = state.selectedPlayer === playerId ? null : playerId;

  Object.entries(playerElements).forEach(([id, elements]) => {
    const player = state.rotation.players.find(p => p.id === id);
    if (player) {
      elements.circle.setAttribute('fill', getPlayerColor(id));
    }
  });

  document.querySelectorAll('.player-item').forEach(item => {
    const itemId = item.dataset.playerId;
    item.classList.toggle('selected', itemId === state.selectedPlayer);
  });

  updatePositionInfo();
}

// ==========================================
// DRAG AND DROP
// ==========================================

function startDrag(e, playerId) {
  if (e.type === 'mousedown' && e.button !== 0) return;
  e.preventDefault();

  const event = e.touches ? e.touches[0] : e;
  const svg = document.getElementById('editor-court');
  const rect = svg.getBoundingClientRect();

  const viewBox = svg.viewBox.baseVal;
  const scaleX = viewBox.width / rect.width;
  const scaleY = viewBox.height / rect.height;

  state.draggingPlayer = playerId;
  selectPlayer(playerId);

  const elements = playerElements[playerId];
  if (elements) {
    elements.group.classList.add('dragging');

    const positions = getCurrentPositions();
    const pos = positions[playerId];
    let currentX, currentY;

    if (pos) {
      const scaled = scalePos(pos);
      currentX = scaled.x;
      currentY = scaled.y;
    } else {
      currentX = viewBox.width / 2;
      currentY = viewBox.height / 2;
    }

    const svgX = (event.clientX - rect.left) * scaleX;
    const svgY = (event.clientY - rect.top) * scaleY;

    state.dragOffset.x = svgX - currentX;
    state.dragOffset.y = svgY - currentY;
    state.dragScale = { x: scaleX, y: scaleY };
  }
}

function handleDrag(e) {
  if (!state.draggingPlayer) return;

  e.preventDefault();
  const event = e.touches ? e.touches[0] : e;
  const svg = document.getElementById('editor-court');
  const rect = svg.getBoundingClientRect();

  const svgX = (event.clientX - rect.left) * state.dragScale.x;
  const svgY = (event.clientY - rect.top) * state.dragScale.y;

  const x = svgX - state.dragOffset.x;
  const y = svgY - state.dragOffset.y;

  const elements = playerElements[state.draggingPlayer];
  if (elements) {
    elements.group.setAttribute('transform', `translate(${Math.round(x)}, ${Math.round(y)})`);

    const unscaled = unscalePos(x, y);
    document.getElementById('info-x').textContent = unscaled[0];
    document.getElementById('info-y').textContent = unscaled[1];
  }
}

function endDrag(e) {
  if (!state.draggingPlayer) return;

  const elements = playerElements[state.draggingPlayer];
  if (elements) {
    elements.group.classList.remove('dragging');

    const transform = elements.group.getAttribute('transform');
    const match = transform ? transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/) : null;

    if (match) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      const pos = unscalePos(x, y);

      const positions = getCurrentPositions();
      positions[state.draggingPlayer] = pos;

      elements.group.style.opacity = isOnBench(pos) ? '0.5' : '1';

      saveToStorage();
    }
  }

  state.draggingPlayer = null;
  updatePositionInfo();
}

// ==========================================
// PLAYER CRUD
// ==========================================

function openPlayerModal(playerId = null) {
  state.editingPlayer = playerId;
  const modal = document.getElementById('player-modal');

  if (playerId) {
    const player = state.rotation.players.find(p => p.id === playerId);
    if (player) {
      document.getElementById('player-id').value = player.id;
      document.getElementById('player-id').disabled = true;
      document.getElementById('player-label').value = player.label;
      document.getElementById('player-role').value = player.role;
      document.getElementById('player-libero').checked = player.isLibero || false;
    }
  } else {
    document.getElementById('player-id').value = '';
    document.getElementById('player-id').disabled = false;
    document.getElementById('player-label').value = '';
    document.getElementById('player-role').value = 'setter';
    document.getElementById('player-libero').checked = false;
  }

  modal.classList.add('open');
}

function savePlayer() {
  const id = document.getElementById('player-id').value.trim();
  const label = document.getElementById('player-label').value.trim();
  const role = document.getElementById('player-role').value;
  const isLibero = document.getElementById('player-libero').checked;

  if (!id || !label) {
    alert('Please fill in all fields');
    return;
  }

  if (state.editingPlayer !== id) {
    const existing = state.rotation.players.find(p => p.id === id);
    if (existing) {
      alert('Player ID must be unique');
      return;
    }
  }

  const playerData = { id, label, role };
  if (isLibero) {
    playerData.isLibero = true;
  }

  if (state.editingPlayer) {
    const index = state.rotation.players.findIndex(p => p.id === state.editingPlayer);
    if (index !== -1) {
      state.rotation.players[index] = playerData;
    }
  } else {
    state.rotation.players.push(playerData);
  }

  saveToStorage();
  renderPlayerList();
  renderCourtPlayers();
  closeModal();
}

function deletePlayer(playerId) {
  if (!confirm('Are you sure you want to delete this player?')) return;

  state.rotation.players = state.rotation.players.filter(p => p.id !== playerId);

  Object.keys(state.rotation.positions).forEach(phaseKey => {
    Object.keys(state.rotation.positions[phaseKey]).forEach(setterPos => {
      delete state.rotation.positions[phaseKey][setterPos][playerId];
    });
  });

  if (state.selectedPlayer === playerId) {
    state.selectedPlayer = null;
  }

  saveToStorage();
  renderPlayerList();
  renderCourtPlayers();
  updatePositionInfo();
}

function closeModal() {
  document.getElementById('player-modal').classList.remove('open');
  state.editingPlayer = null;
}

// ==========================================
// PHASE MANAGEMENT
// ==========================================

function addPhase(mode) {
  const available = AVAILABLE_PHASES.filter(
    p => !state.rotation.phases[mode].includes(p)
  );

  if (available.length === 0) {
    alert('No more phases available');
    return;
  }

  const phase = available[0];
  state.rotation.phases[mode].push(phase);
  saveToStorage();
  renderPhaseConfig();
  renderNavigation();
}

function removePhase(mode, phase) {
  if (state.rotation.phases[mode].length <= 1) {
    alert('Cannot remove the last phase');
    return;
  }

  state.rotation.phases[mode] = state.rotation.phases[mode].filter(p => p !== phase);

  const phaseKey = mode + phase.charAt(0).toUpperCase() + phase.slice(1);
  delete state.rotation.positions[phaseKey];

  // Clear completion for removed phase
  removeCompletionForPhase(mode, phase);

  if (state.currentMode === mode && state.currentPhase === phase) {
    state.currentPhase = state.rotation.phases[mode][0];
  }

  saveToStorage();
  renderPhaseConfig();
  renderNavigation();
  renderCourtPlayers();
}

// ==========================================
// IMPORT / EXPORT / RESET
// ==========================================

function exportJSON() {
  saveToStorage();

  const json = buildRotationJSON(state.rotation);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.rotation.name.replace(/\s+/g, '-').toLowerCase()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeJSON(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function buildRotationJSON(rotation) {
  const nl = '\r\n';
  const indent = '  ';
  const indent2 = indent + indent;

  let json = '{' + nl;
  json += indent + `"name": "${escapeJSON(rotation.name)}",` + nl;
  json += indent + `"description": "${escapeJSON(rotation.description)}",` + nl;
  json += indent + '"players": [' + nl;

  rotation.players.forEach((player, index) => {
    json += indent2 + '{ ';
    json += `"id": "${escapeJSON(player.id)}", `;
    json += `"label": "${escapeJSON(player.label)}", `;
    json += `"role": "${escapeJSON(player.role)}"`;
    if (player.isLibero) {
      json += `, "isLibero": true`;
    }
    json += ' }';
    if (index < rotation.players.length - 1) {
      json += ',';
    }
    json += nl;
  });

  json += indent + '],' + nl;
  json += indent + '"phases": {' + nl;
  json += indent2 + `"serving": ${JSON.stringify(rotation.phases.serving)},` + nl;
  json += indent2 + `"receiving": ${JSON.stringify(rotation.phases.receiving)}` + nl;
  json += indent + '},' + nl;
  json += indent + '"positions": {' + nl;

  const phaseKeys = Object.keys(rotation.positions).sort();
  phaseKeys.forEach((phaseKey, phaseIndex) => {
    json += indent2 + `"${phaseKey}": {` + nl;
    const setterKeys = Object.keys(rotation.positions[phaseKey]).sort((a, b) => parseInt(a) - parseInt(b));
    setterKeys.forEach((setterKey, setterIndex) => {
      const positions = rotation.positions[phaseKey][setterKey];
      const playerEntries = Object.entries(positions);

      if (playerEntries.length === 0) {
        json += indent + indent2 + indent + `"${setterKey}": {}`;
      } else {
        const posEntries = playerEntries.map(([playerId, pos]) =>
          `"${playerId}": [${pos[0]}, ${pos[1]}]`
        ).join(', ');
        json += indent + indent2 + indent + `"${setterKey}": { ${posEntries} }`;
      }

      if (setterIndex < setterKeys.length - 1) {
        json += ',';
      }
      json += nl;
    });
    json += indent2 + '}';
    if (phaseIndex < phaseKeys.length - 1) {
      json += ',';
    }
    json += nl;
  });

  json += indent + '}' + nl;
  json += '}';

  return json;
}

function resetEditor() {
  if (!confirm('Are you sure you want to reset? All data will be lost.')) return;

  localStorage.removeItem('rotation-editor-data');
  state.rotation = JSON.parse(JSON.stringify(DEFAULT_ROTATION));
  state.selectedPlayer = null;
  state.currentMode = 'serving';
  state.currentPhase = 'base';
  state.currentSetter = 1;

  // Clear completion
  clearCompletionState();

  document.getElementById('system-name').value = state.rotation.name;
  document.getElementById('system-desc').value = state.rotation.description;

  renderPlayerList();
  renderPhaseConfig();
  renderNavigation();
  renderCourtPlayers();
  updatePositionInfo();
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);

      if (!imported.players || !Array.isArray(imported.players)) {
        throw new Error('Invalid rotation data: missing players array');
      }

      if (!imported.phases) {
        throw new Error('Invalid rotation data: missing phases');
      }

      if (!imported.positions) {
        imported.positions = {};
      }

      state.rotation = imported;
      state.selectedPlayer = null;
      state.currentMode = 'serving';
      state.currentPhase = imported.phases.serving?.[0] || 'base';
      state.currentSetter = 1;

      document.getElementById('system-name').value = imported.name || 'Imported Rotation';
      document.getElementById('system-desc').value = imported.description || '';

      saveToStorage();

      // Clear all completion on import
      clearCompletionState();

      renderPlayerList();
      renderPhaseConfig();
      renderNavigation();
      renderCourtPlayers();
      updatePositionInfo();

      alert(`Successfully imported: ${imported.name}`);

    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing JSON: ' + error.message);
    }

    event.target.value = '';
  };

  reader.readAsText(file);
}

// ==========================================
// BENCH & COPY
// ==========================================

function sendToBench() {
  if (!state.selectedPlayer) return;

  const positions = getCurrentPositions();
  positions[state.selectedPlayer] = [-64, 700];

  const elements = playerElements[state.selectedPlayer];
  if (elements) {
    const scaled = scalePos(positions[state.selectedPlayer]);
    elements.group.setAttribute('transform', `translate(${scaled.x}, ${scaled.y})`);
    elements.group.style.opacity = '0.5';
  }

  saveToStorage();
  updatePositionInfo();
}

function openCopyModal() {
  const modal = document.getElementById('copy-modal');
  const phaseSelect = document.getElementById('copy-source-phase');
  const setterSelect = document.getElementById('copy-source-setter');

  // Populate with ALL phases from both modes
  phaseSelect.innerHTML = '';
  ['serving', 'receiving'].forEach(mode => {
    const phases = state.rotation.phases[mode] || [];
    phases.forEach(phase => {
      const option = document.createElement('option');
      const phaseKey = mode + phase.charAt(0).toUpperCase() + phase.slice(1);
      option.value = phaseKey;
      option.textContent = mode.charAt(0).toUpperCase() + mode.slice(1) + ' - ' + phase.charAt(0).toUpperCase() + phase.slice(1);
      phaseSelect.appendChild(option);
    });
  });

  setterSelect.innerHTML = '';
  for (let i = 1; i <= 6; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    setterSelect.appendChild(option);
  }

  modal.classList.add('open');
}

function closeCopyModal() {
  document.getElementById('copy-modal').classList.remove('open');
}

function copyPositions() {
  const sourcePhaseKey = document.getElementById('copy-source-phase').value;
  const sourceSetter = parseInt(document.getElementById('copy-source-setter').value);

  if (!state.rotation.positions[sourcePhaseKey] || !state.rotation.positions[sourcePhaseKey][sourceSetter]) {
    alert('Source has no positions defined');
    return;
  }

  const sourcePositions = state.rotation.positions[sourcePhaseKey][sourceSetter];
  const targetPositions = getCurrentPositions();

  Object.keys(sourcePositions).forEach(playerId => {
    targetPositions[playerId] = [...sourcePositions[playerId]];
  });

  saveToStorage();
  renderCourtPlayers();
  closeCopyModal();
}

// ==========================================
// EVENT HANDLERS
// ==========================================

function initEventHandlers() {
  // Global drag events
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('touchmove', handleDrag, { passive: false });
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);

  // Zone grid buttons
  document.querySelectorAll('.zone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentSetter = parseInt(btn.dataset.zone);
      renderCourtPlayers();
      updatePositionInfo();
      updateNavVisuals();
    });
  });

  // Mark Done button
  document.getElementById('btn-mark-done').addEventListener('click', toggleCompletion);

  // Header inputs
  document.getElementById('system-name').addEventListener('input', saveToStorage);
  document.getElementById('system-desc').addEventListener('input', saveToStorage);

  // Action buttons
  document.getElementById('btn-add-player').addEventListener('click', () => openPlayerModal());
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', importJSON);
  document.getElementById('btn-export').addEventListener('click', exportJSON);
  document.getElementById('btn-reset').addEventListener('click', resetEditor);
  document.getElementById('btn-to-bench').addEventListener('click', sendToBench);
  document.getElementById('btn-copy-positions').addEventListener('click', openCopyModal);

  // Player modal
  document.getElementById('btn-save-player').addEventListener('click', savePlayer);
  document.getElementById('btn-cancel-player').addEventListener('click', closeModal);

  // Copy modal
  document.getElementById('btn-confirm-copy').addEventListener('click', copyPositions);
  document.getElementById('btn-cancel-copy').addEventListener('click', closeCopyModal);

  // Close modals on overlay click
  document.getElementById('player-modal').addEventListener('click', (e) => {
    if (e.target.id === 'player-modal') closeModal();
  });
  document.getElementById('copy-modal').addEventListener('click', (e) => {
    if (e.target.id === 'copy-modal') closeCopyModal();
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
