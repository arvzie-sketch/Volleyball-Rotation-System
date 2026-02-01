/**
 * Rotation Editor
 * A flexible tool for creating and editing volleyball rotation systems
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
  editingPlayer: null
};

// Player elements cache
let playerElements = {};

// Initialize editor
function init() {
  loadFromStorage();
  initEventHandlers();
  renderPlayerList();
  renderPhaseConfig();
  updatePhaseSelect();
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

// Initialize positions for a specific phase and setter
function initPositions(phaseKey, setterPos) {
  if (!state.rotation.positions[phaseKey]) {
    state.rotation.positions[phaseKey] = {};
  }
  if (!state.rotation.positions[phaseKey][setterPos]) {
    state.rotation.positions[phaseKey][setterPos] = {};
  }
}

// Check if position is on bench
function isOnBench(pos) {
  return pos && pos[0] < 0;
}

// Scale position from SVG coordinates to 900-unit system
function unscalePos(x, y) {
  // Check if on bench
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

// Render player list in left panel
function renderPlayerList() {
  const container = document.getElementById('player-list');
  container.innerHTML = '';
  
  state.rotation.players.forEach(player => {
    const item = document.createElement('div');
    item.className = 'player-item';
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
    editBtn.textContent = '✎';
    editBtn.title = 'Edit';
    editBtn.onclick = () => openPlayerModal(player.id);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn delete';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Delete';
    deleteBtn.onclick = () => deletePlayer(player.id);
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    item.appendChild(color);
    item.appendChild(info);
    item.appendChild(actions);
    
    // Select player on click
    item.addEventListener('click', (e) => {
      if (e.target.closest('.icon-btn')) return;
      selectPlayer(player.id);
    });
    
    container.appendChild(item);
  });
}

// Render phase configuration in right panel
function renderPhaseConfig() {
  const container = document.getElementById('phase-config');
  container.innerHTML = '';
  
  ['serving', 'receiving'].forEach(mode => {
    const section = document.createElement('div');
    section.className = 'mode-section';
    
    const header = document.createElement('div');
    header.className = 'mode-header';
    header.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    
    const phaseList = document.createElement('div');
    phaseList.className = 'phase-list';
    
    const phases = state.rotation.phases[mode] || [];
    
    phases.forEach(phase => {
      const tag = document.createElement('div');
      tag.className = 'phase-tag';
      
      const label = document.createElement('span');
      label.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);
      
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.title = 'Remove phase';
      removeBtn.onclick = () => removePhase(mode, phase);
      
      tag.appendChild(label);
      tag.appendChild(removeBtn);
      phaseList.appendChild(tag);
    });
    
    const addBtn = document.createElement('button');
    addBtn.className = 'add-phase-btn';
    addBtn.textContent = '+ Add Phase';
    addBtn.onclick = () => addPhase(mode);
    
    phaseList.appendChild(addBtn);
    section.appendChild(header);
    section.appendChild(phaseList);
    container.appendChild(section);
  });
}

// Update phase select dropdown
function updatePhaseSelect() {
  const select = document.getElementById('phase-select');
  select.innerHTML = '';
  
  const phases = state.rotation.phases[state.currentMode] || [];
  phases.forEach(phase => {
    const option = document.createElement('option');
    option.value = phase;
    option.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);
    option.selected = phase === state.currentPhase;
    select.appendChild(option);
  });
}

// Render players on court
function renderCourtPlayers() {
  const container = document.getElementById('editor-players');
  container.innerHTML = '';
  playerElements = {};
  
  const positions = getCurrentPositions();
  
  state.rotation.players.forEach(player => {
    const pos = positions[player.id];
    
    // Create SVG group
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
    
    // Set position using SVG transform attribute (more reliable)
    if (pos) {
      const scaled = scalePos(pos);
      g.setAttribute('transform', `translate(${scaled.x}, ${scaled.y})`);
      g.style.opacity = isOnBench(pos) ? '0.5' : '1';
    } else {
      // Default position in center of court for new players
      g.setAttribute('transform', 'translate(150, 157)');
      g.style.opacity = '0.5';
    }
    
    // Update color
    circle.setAttribute('fill', getPlayerColor(player.id));
    
    // Set pointer style
    g.style.pointerEvents = 'all';
    g.style.cursor = 'grab';
    
    // Drag events
    g.addEventListener('mousedown', (e) => {
      console.log('mousedown on player', player.id);
      e.stopPropagation();
      startDrag(e, player.id);
    });
    
    g.addEventListener('touchstart', (e) => {
      console.log('touchstart on player', player.id);
      e.stopPropagation();
      e.preventDefault();
      startDrag(e, player.id);
    }, { passive: false });
    
    // Click to select
    g.addEventListener('click', (e) => {
      console.log('click on player', player.id);
      e.stopPropagation();
      selectPlayer(player.id);
    });
    
    container.appendChild(g);
    playerElements[player.id] = { group: g, circle, text };
  });
}

// Update position info panel
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

// Select a player
function selectPlayer(playerId) {
  state.selectedPlayer = state.selectedPlayer === playerId ? null : playerId;
  
  // Update visual selection
  Object.entries(playerElements).forEach(([id, elements]) => {
    const player = state.rotation.players.find(p => p.id === id);
    if (player) {
      elements.circle.setAttribute('fill', getPlayerColor(id));
    }
  });
  
  // Update player list selection
  document.querySelectorAll('.player-item').forEach(item => {
    const itemId = item.dataset.playerId;
    item.style.background = itemId === state.selectedPlayer 
      ? 'rgba(255,255,255,0.15)' 
      : '';
  });
  
  updatePositionInfo();
}

// Start dragging a player
function startDrag(e, playerId) {
  if (e.type === 'mousedown' && e.button !== 0) return; // Only left click
  e.preventDefault();
  
  console.log('Starting drag for player:', playerId);
  
  const event = e.touches ? e.touches[0] : e;
  const svg = document.getElementById('editor-court');
  const rect = svg.getBoundingClientRect();
  
  // Get the SVG's viewBox dimensions
  const viewBox = svg.viewBox.baseVal;
  const scaleX = viewBox.width / rect.width;
  const scaleY = viewBox.height / rect.height;
  
  state.draggingPlayer = playerId;
  selectPlayer(playerId);
  
  const elements = playerElements[playerId];
  if (elements) {
    elements.group.classList.add('dragging');
    
    // Get current position
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
    
    // Calculate offset in SVG coordinate space
    const svgX = (event.clientX - rect.left) * scaleX;
    const svgY = (event.clientY - rect.top) * scaleY;
    
    state.dragOffset.x = svgX - currentX;
    state.dragOffset.y = svgY - currentY;
    
    // Store scale factors for move handler
    state.dragScale = { x: scaleX, y: scaleY };
    
    console.log('Drag started:', { playerId, currentX, currentY, svgX, svgY, offset: state.dragOffset });
  }
}

// Handle drag move
function handleDrag(e) {
  if (!state.draggingPlayer) return;
  
  e.preventDefault();
  const event = e.touches ? e.touches[0] : e;
  const svg = document.getElementById('editor-court');
  const rect = svg.getBoundingClientRect();
  
  // Convert to SVG coordinate space
  const svgX = (event.clientX - rect.left) * state.dragScale.x;
  const svgY = (event.clientY - rect.top) * state.dragScale.y;
  
  // Apply offset
  const x = svgX - state.dragOffset.x;
  const y = svgY - state.dragOffset.y;
  
  const elements = playerElements[state.draggingPlayer];
  if (elements) {
    elements.group.setAttribute('transform', `translate(${Math.round(x)}, ${Math.round(y)})`);
    
    // Update position info in real-time
    const unscaled = unscalePos(x, y);
    document.getElementById('info-x').textContent = unscaled[0];
    document.getElementById('info-y').textContent = unscaled[1];
  }
}

// End drag
function endDrag(e) {
  if (!state.draggingPlayer) return;
  
  const elements = playerElements[state.draggingPlayer];
  if (elements) {
    elements.group.classList.remove('dragging');
    
    // Get final position from transform attribute
    const transform = elements.group.getAttribute('transform');
    const match = transform ? transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/) : null;
    
    if (match) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      const pos = unscalePos(x, y);
      
      console.log('Drag ended:', { x, y, pos });
      
      // Save position
      const positions = getCurrentPositions();
      positions[state.draggingPlayer] = pos;
      
      // Update bench state
      elements.group.style.opacity = isOnBench(pos) ? '0.5' : '1';
      
      saveToStorage();
    }
  }
  
  state.draggingPlayer = null;
  updatePositionInfo();
}

// Open player modal (add or edit)
function openPlayerModal(playerId = null) {
  state.editingPlayer = playerId;
  const modal = document.getElementById('player-modal');
  
  if (playerId) {
    // Edit existing player
    const player = state.rotation.players.find(p => p.id === playerId);
    if (player) {
      document.getElementById('player-id').value = player.id;
      document.getElementById('player-id').disabled = true;
      document.getElementById('player-label').value = player.label;
      document.getElementById('player-role').value = player.role;
      document.getElementById('player-libero').checked = player.isLibero || false;
    }
  } else {
    // Add new player
    document.getElementById('player-id').value = '';
    document.getElementById('player-id').disabled = false;
    document.getElementById('player-label').value = '';
    document.getElementById('player-role').value = 'setter';
    document.getElementById('player-libero').checked = false;
  }
  
  modal.classList.add('open');
}

// Save player from modal
function savePlayer() {
  const id = document.getElementById('player-id').value.trim();
  const label = document.getElementById('player-label').value.trim();
  const role = document.getElementById('player-role').value;
  const isLibero = document.getElementById('player-libero').checked;
  
  if (!id || !label) {
    alert('Please fill in all fields');
    return;
  }
  
  // Check for duplicate ID
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
    // Edit existing
    const index = state.rotation.players.findIndex(p => p.id === state.editingPlayer);
    if (index !== -1) {
      state.rotation.players[index] = playerData;
    }
  } else {
    // Add new
    state.rotation.players.push(playerData);
  }
  
  saveToStorage();
  renderPlayerList();
  renderCourtPlayers();
  closeModal();
}

// Delete player
function deletePlayer(playerId) {
  if (!confirm('Are you sure you want to delete this player?')) return;
  
  state.rotation.players = state.rotation.players.filter(p => p.id !== playerId);
  
  // Remove from all positions
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

// Close player modal
function closeModal() {
  document.getElementById('player-modal').classList.remove('open');
  state.editingPlayer = null;
}

// Add phase to mode
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
  updatePhaseSelect();
}

// Remove phase from mode
function removePhase(mode, phase) {
  if (state.rotation.phases[mode].length <= 1) {
    alert('Cannot remove the last phase');
    return;
  }
  
  // Remove phase
  state.rotation.phases[mode] = state.rotation.phases[mode].filter(p => p !== phase);
  
  // Remove positions for this phase
  const phaseKey = mode + phase.charAt(0).toUpperCase() + phase.slice(1);
  delete state.rotation.positions[phaseKey];
  
  // Update current phase if needed
  if (state.currentMode === mode && state.currentPhase === phase) {
    state.currentPhase = state.rotation.phases[mode][0];
  }
  
  saveToStorage();
  renderPhaseConfig();
  updatePhaseSelect();
  renderCourtPlayers();
}

// Export rotation as JSON
function exportJSON() {
  saveToStorage();
  
  // Build JSON manually to match original format exactly
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

// Escape string for JSON (handles quotes, backslashes, newlines)
function escapeJSON(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

// Build JSON string to match original format
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
        // Put all positions on one line as a single object
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

// Reset editor
function resetEditor() {
  if (!confirm('Are you sure you want to reset? All data will be lost.')) return;
  
  localStorage.removeItem('rotation-editor-data');
  state.rotation = JSON.parse(JSON.stringify(DEFAULT_ROTATION));
  state.selectedPlayer = null;
  
  document.getElementById('system-name').value = state.rotation.name;
  document.getElementById('system-desc').value = state.rotation.description;
  
  renderPlayerList();
  renderPhaseConfig();
  updatePhaseSelect();
  renderCourtPlayers();
  updatePositionInfo();
}

// Import JSON file
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      
      // Validate the imported data
      if (!imported.players || !Array.isArray(imported.players)) {
        throw new Error('Invalid rotation data: missing players array');
      }
      
      if (!imported.phases) {
        throw new Error('Invalid rotation data: missing phases');
      }
      
      if (!imported.positions) {
        imported.positions = {};
      }
      
      // Load the imported rotation
      state.rotation = imported;
      state.selectedPlayer = null;
      state.currentMode = 'serving';
      state.currentPhase = imported.phases.serving?.[0] || 'base';
      state.currentSetter = 1;
      
      // Update header inputs
      document.getElementById('system-name').value = imported.name || 'Imported Rotation';
      document.getElementById('system-desc').value = imported.description || '';
      
      // Save to localStorage
      saveToStorage();
      
      // Re-render everything
      renderPlayerList();
      renderPhaseConfig();
      updatePhaseSelect();
      renderCourtPlayers();
      updatePositionInfo();
      
      alert(`Successfully imported: ${imported.name}`);
      
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing JSON: ' + error.message);
    }
    
    // Reset file input so same file can be imported again
    event.target.value = '';
  };
  
  reader.readAsText(file);
}

// Send selected player to bench
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

// Open copy positions modal
function openCopyModal() {
  const modal = document.getElementById('copy-modal');
  const phaseSelect = document.getElementById('copy-source-phase');
  const setterSelect = document.getElementById('copy-source-setter');
  
  // Populate phases
  const currentPhases = state.rotation.phases[state.currentMode] || [];
  phaseSelect.innerHTML = '';
  currentPhases.forEach(phase => {
    const option = document.createElement('option');
    option.value = phase;
    option.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);
    phaseSelect.appendChild(option);
  });
  
  // Populate setter positions
  setterSelect.innerHTML = '';
  for (let i = 1; i <= 6; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    setterSelect.appendChild(option);
  }
  
  modal.classList.add('open');
}

// Close copy modal
function closeCopyModal() {
  document.getElementById('copy-modal').classList.remove('open');
}

// Copy positions from another phase/setter
function copyPositions() {
  const sourcePhase = document.getElementById('copy-source-phase').value;
  const sourceSetter = parseInt(document.getElementById('copy-source-setter').value);
  
  const phaseKey = state.currentMode + sourcePhase.charAt(0).toUpperCase() + sourcePhase.slice(1);
  
  if (!state.rotation.positions[phaseKey] || !state.rotation.positions[phaseKey][sourceSetter]) {
    alert('Source has no positions defined');
    return;
  }
  
  const sourcePositions = state.rotation.positions[phaseKey][sourceSetter];
  const targetPositions = getCurrentPositions();
  
  // Copy all positions
  Object.keys(sourcePositions).forEach(playerId => {
    targetPositions[playerId] = [...sourcePositions[playerId]];
  });
  
  saveToStorage();
  renderCourtPlayers();
  closeCopyModal();
}

// Initialize event handlers
function initEventHandlers() {
  // Global drag events
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('touchmove', handleDrag, { passive: false });
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);
  
  // Mode select
  document.getElementById('mode-select').addEventListener('change', (e) => {
    state.currentMode = e.target.value;
    state.currentPhase = state.rotation.phases[state.currentMode]?.[0] || 'base';
    updatePhaseSelect();
    renderCourtPlayers();
    updatePositionInfo();
  });
  
  // Phase select
  document.getElementById('phase-select').addEventListener('change', (e) => {
    state.currentPhase = e.target.value;
    renderCourtPlayers();
    updatePositionInfo();
  });
  
  // Setter select
  document.getElementById('setter-select').addEventListener('change', (e) => {
    state.currentSetter = parseInt(e.target.value);
    renderCourtPlayers();
    updatePositionInfo();
  });
  
  // Header inputs
  document.getElementById('system-name').addEventListener('input', saveToStorage);
  document.getElementById('system-desc').addEventListener('input', saveToStorage);
  
  // Buttons
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