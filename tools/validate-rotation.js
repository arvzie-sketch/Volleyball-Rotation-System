#!/usr/bin/env node
/**
 * Volleyball Rotation Validator
 * =============================
 * Validates rotation JSON files against official volleyball rules.
 * Encodes all overlap, positioning, and structural rules so any
 * rotation system (4-2, 5-1, 6-2, etc.) can be verified.
 *
 * Usage: node validate-rotation.js <rotation-file.json> [lineup]
 *
 * The lineup argument is optional. If omitted, it will be auto-detected
 * from the servingBase rotation 1 positions.
 *
 * Example: node validate-rotation.js ../rotations/4-2.json "s1,m1,h2,s2,m2,h1"
 *   (lineup is the clockwise zone order starting from Z1 in rotation 1)
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// VOLLEYBALL COURT COORDINATE SYSTEM
// ============================================================
// x: 0 (left sideline) to 900 (right sideline)
// y: 0 (net / center line) to 900 (end line)
// Serving position: y ≈ 940 (behind end line)
// Bench / substitution: x = -64 (off court left)
//
// COURT ZONES (as seen from behind the end line, looking at the net):
//
//   NET (y = 0)
//   ┌─────────────────────────────────────┐
//   │  Zone 4       Zone 3       Zone 2   │  ← FRONT ROW
//   │  (left)      (center)     (right)   │
//   │  x≈200,y≈100  x≈450,y≈100 x≈700,y≈100
//   │─────────────────────────────────────│  ← 3m attack line
//   │  Zone 5       Zone 6       Zone 1   │  ← BACK ROW
//   │  (left)      (center)     (right)   │
//   │  x≈200,y≈600  x≈450,y≈600 x≈700,y≈600
//   └─────────────────────────────────────┘
//   END LINE (y = 900)
//   Server position: x≈700, y≈940

// ============================================================
// FIVB RULE 7.4 — OVERLAP RULES (2025-2028)
// ============================================================
// Source: FIVB Official Rules 2025-2028, Rule 7.4 (page 25)
//
// At the moment the ball is hit by the server:
//   - RECEIVING team MUST be in rotational order (7 overlap rules below)
//   - SERVING team is FREE to occupy any position (Rule 7.4 change)
//   - After the service hit, ALL players may move freely (Rule 7.4.4)
//
// RULE 7.4.2.1 — FRONT-BACK PAIRS:
//   Each front-row player must be closer to the net than the
//   corresponding back-row player (y-axis, smaller y = closer to net):
//     #1: Zone 4 (LF) in front of Zone 5 (LB): Z4.y < Z5.y
//     #2: Zone 3 (CF) in front of Zone 6 (CB): Z3.y < Z6.y
//     #3: Zone 2 (RF) in front of Zone 1 (RB): Z2.y < Z1.y
//
// RULE 7.4.2.2 — LEFT-RIGHT WITHIN ROWS:
//   Players must maintain lateral order within their row
//   (x-axis, smaller x = closer to left sideline):
//     #4: Z4 left of Z3 (front row): Z4.x < Z3.x
//     #5: Z3 left of Z2 (front row): Z3.x < Z2.x
//     #6: Z5 left of Z6 (back row):  Z5.x < Z6.x
//     #7: Z6 left of Z1 (back row):  Z6.x < Z1.x
//
// RULE 7.4.3 — MEASUREMENT:
//   Positions determined by feet contacting the ground.
//   "Level with" (exactly aligned) is legal. Only need "at least
//   a part of one foot" in the correct relative position.
//
// Phases where overlap applies:
//   receivingBase — YES (receiving team at moment of serve)
//   servingBase   — YES (checked for data integrity, standard positions)
//   servingServe  — NO  (serving team free, Rule 7.4)
//   All others    — NO  (after serve contact, Rule 7.4.4)

// ============================================================
// ROTATION MECHANICS
// ============================================================
// Players rotate CLOCKWISE one position when gaining serve:
//   Z1 → Z6 → Z5 → Z4 → Z3 → Z2 → Z1
//
// A "lineup" defines which player is in each zone for Rotation 1.
// For rotation R, the player in zone Z is:
//   lineup[(Z - R + 600) % 6]   (the +600 avoids negative modulo)
//
// Example 4-2 lineup (Z1→Z6): S1, M1, H2, S2, M2, H1
//   Rotation 1: Z1=S1, Z2=M1, Z3=H2, Z4=S2, Z5=M2, Z6=H1
//   Rotation 2: Z1=H1, Z2=S1, Z3=M1, Z4=H2, Z5=S2, Z6=M2
//   ...etc

// Zone reference coordinates (approximate center of each zone)
const ZONE_REFS = {
    1: { x: 700, y: 600 },
    2: { x: 700, y: 100 },
    3: { x: 450, y: 100 },
    4: { x: 200, y: 100 },
    5: { x: 200, y: 600 },
    6: { x: 450, y: 600 }
};

// Overlap rule definitions
const OVERLAP_RULES = [
    // Front-back pairs (front player y must be < back player y)
    { front: 4, back: 5, axis: 'y', desc: 'Z4 (LF) must be in front of Z5 (LB)' },
    { front: 3, back: 6, axis: 'y', desc: 'Z3 (CF) must be in front of Z6 (CB)' },
    { front: 2, back: 1, axis: 'y', desc: 'Z2 (RF) must be in front of Z1 (RB)' },
    // Left-right front row (left player x must be < right player x)
    { front: 4, back: 3, axis: 'x', desc: 'Z4 (LF) must be left of Z3 (CF)' },
    { front: 3, back: 2, axis: 'x', desc: 'Z3 (CF) must be left of Z2 (RF)' },
    // Left-right back row
    { front: 5, back: 6, axis: 'x', desc: 'Z5 (LB) must be left of Z6 (CB)' },
    { front: 6, back: 1, axis: 'x', desc: 'Z6 (CB) must be left of Z1 (RB)' },
];

// Phases where overlap rules must be checked
// Note: servingServe excluded per FIVB Rule 7.4 (2025-2028) — serving team is
// fully exempt from overlap rules.
// receivingBase AND receivingPass are both BEFORE serve contact — overlap applies.
// receivingPass = the serve-receive formation (tactical adjustment from base grid).
const OVERLAP_PHASES = ['servingBase', 'receivingBase', 'receivingPass'];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get zone assignments for a given rotation number.
 * @param {string[]} lineup - Array of player IDs in zone order (Z1-Z6) for rotation 1
 * @param {number} rotation - Rotation number (1-6)
 * @returns {Object} Map of zone number → player ID
 */
function getZoneAssignments(lineup, rotation) {
    const zones = {};
    for (let z = 1; z <= 6; z++) {
        const idx = ((z - rotation) % 6 + 6) % 6;
        zones[z] = lineup[idx];
    }
    return zones;
}

/**
 * Reverse: get zone for each player in a given rotation.
 */
function getPlayerZones(lineup, rotation) {
    const zoneAssign = getZoneAssignments(lineup, rotation);
    const playerZones = {};
    for (const [zone, player] of Object.entries(zoneAssign)) {
        playerZones[player] = parseInt(zone);
    }
    return playerZones;
}

/**
 * Auto-detect lineup from servingBase rotation 1 positions.
 * Assigns each player to the nearest zone based on coordinates.
 */
function autoDetectLineup(positions) {
    const r1 = positions.servingBase?.['1'];
    if (!r1) {
        console.error('Cannot auto-detect lineup: servingBase rotation 1 not found');
        process.exit(1);
    }

    const players = Object.entries(r1).filter(([id, pos]) => pos[0] >= 0); // exclude bench
    const lineup = new Array(6).fill(null);

    for (const [playerId, pos] of players) {
        let bestZone = 1;
        let bestDist = Infinity;
        for (let z = 1; z <= 6; z++) {
            const ref = ZONE_REFS[z];
            const dist = Math.sqrt((pos[0] - ref.x) ** 2 + (pos[1] - ref.y) ** 2);
            if (dist < bestDist) {
                bestDist = dist;
                bestZone = z;
            }
        }
        if (lineup[bestZone - 1] !== null) {
            console.warn(`Warning: Zone ${bestZone} conflict between ${lineup[bestZone - 1]} and ${playerId}`);
        }
        lineup[bestZone - 1] = playerId;
    }

    return lineup;
}

/**
 * Check if a player is at the serving position (off-court behind end line).
 */
function isServingPosition(pos) {
    return pos[1] > 900;
}

/**
 * Check if a player is on the bench (off-court left).
 */
function isBenchPosition(pos) {
    return pos[0] < 0;
}

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

function validateFile(filePath, lineupArg) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const positions = data.positions;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Validating: ${data.name || path.basename(filePath)}`);
    console.log(`Description: ${data.description || 'N/A'}`);
    console.log(`Players: ${data.players.map(p => p.label).join(', ')}`);
    console.log(`${'='.repeat(60)}\n`);

    // Determine lineup
    let lineup;
    if (lineupArg) {
        lineup = lineupArg.split(',').map(s => s.trim());
    } else {
        lineup = autoDetectLineup(positions);
    }

    const onCourtPlayers = data.players.filter(p => !p.isLibero).map(p => p.id);
    const liberoPlayer = data.players.find(p => p.isLibero);
    const allPlayerIds = data.players.map(p => p.id);

    console.log(`Lineup (Z1→Z6 in R1): ${lineup.join(', ')}`);
    if (liberoPlayer) console.log(`Libero: ${liberoPlayer.label} (${liberoPlayer.id})`);
    console.log();

    // Print zone assignment table
    console.log('Zone Assignments per Rotation:');
    console.log('Rot  | Z1   Z2   Z3   Z4   Z5   Z6   | Front Row        | Setter');
    console.log('-----|-------------------------------|------------------|-------');
    for (let r = 1; r <= 6; r++) {
        const zones = getZoneAssignments(lineup, r);
        const frontRow = [zones[2], zones[3], zones[4]];
        const setters = data.players.filter(p => p.role === 'setter').map(p => p.id);
        const frontSetter = frontRow.find(p => setters.includes(p));
        const zoneStr = [1,2,3,4,5,6].map(z => zones[z].padEnd(4)).join(' ');
        const frontStr = frontRow.join(', ');
        console.log(`  ${r}  | ${zoneStr}| ${frontStr.padEnd(17)}| ${frontSetter || 'none'}`);
    }
    console.log();

    let totalErrors = 0;
    let totalWarnings = 0;

    // Validate each phase and rotation
    const allPhases = Object.keys(positions);
    for (const phase of allPhases) {
        for (let r = 1; r <= 6; r++) {
            const rotKey = String(r);
            const posData = positions[phase]?.[rotKey];
            if (!posData) {
                console.log(`  MISSING: ${phase} rotation ${r}`);
                totalErrors++;
                continue;
            }

            const errors = [];
            const warnings = [];

            // --- Structural checks ---

            // Check all players present
            const presentPlayers = Object.keys(posData);
            for (const pid of allPlayerIds) {
                if (!presentPlayers.includes(pid)) {
                    errors.push(`Player ${pid} missing`);
                }
            }

            // Check for duplicate positions
            const posStrings = {};
            for (const [pid, pos] of Object.entries(posData)) {
                const key = `${pos[0]},${pos[1]}`;
                if (posStrings[key] && !isBenchPosition(pos)) {
                    warnings.push(`${pid} and ${posStrings[key]} at same position [${pos}]`);
                }
                posStrings[key] = pid;
            }

            // Check coordinate ranges
            for (const [pid, pos] of Object.entries(posData)) {
                if (isBenchPosition(pos)) continue;
                if (isServingPosition(pos)) continue;
                if (pos[0] < -10 || pos[0] > 910 || pos[1] < -10 || pos[1] > 910) {
                    warnings.push(`${pid} at unusual position [${pos}]`);
                }
            }

            // --- Overlap checks (only for relevant phases) ---
            if (OVERLAP_PHASES.includes(phase)) {
                const zones = getZoneAssignments(lineup, r);
                const playerZones = getPlayerZones(lineup, r);

                // Find which on-court players are actually in positions
                // (handle libero substitutions - libero takes a back-row player's zone)
                const zonePositions = {};
                for (let z = 1; z <= 6; z++) {
                    const expectedPlayer = zones[z];
                    if (posData[expectedPlayer]) {
                        const pos = posData[expectedPlayer];
                        if (!isBenchPosition(pos)) {
                            zonePositions[z] = { player: expectedPlayer, pos };
                        }
                    }
                }

                // If a player is on bench, check if libero took their zone
                if (liberoPlayer && posData[liberoPlayer.id]) {
                    const libPos = posData[liberoPlayer.id];
                    if (!isBenchPosition(libPos)) {
                        // Find which zone the libero is filling
                        const benchedPlayer = Object.entries(posData).find(
                            ([pid, pos]) => isBenchPosition(pos) && lineup.includes(pid)
                        );
                        if (benchedPlayer) {
                            const benchedZone = playerZones[benchedPlayer[0]];
                            if (benchedZone) {
                                zonePositions[benchedZone] = { player: liberoPlayer.id, pos: libPos };
                            }
                        }
                    }
                }

                // Check server exemption
                const serverPlayer = zones[1]; // Z1 player is the server
                const isServePhase = phase === 'servingServe';

                for (const rule of OVERLAP_RULES) {
                    const frontZone = rule.front;
                    const backZone = rule.back;

                    // Skip if server is exempt
                    if (isServePhase) {
                        if (frontZone === 1 || backZone === 1) {
                            // Server (Z1) is exempt
                            const z1Pos = posData[serverPlayer];
                            if (z1Pos && isServingPosition(z1Pos)) {
                                continue;
                            }
                        }
                    }

                    const frontPos = zonePositions[frontZone];
                    const backPos = zonePositions[backZone];

                    if (!frontPos || !backPos) continue;

                    if (rule.axis === 'y') {
                        if (frontPos.pos[1] >= backPos.pos[1]) {
                            errors.push(
                                `OVERLAP: ${rule.desc} — ` +
                                `${frontPos.player}(Z${frontZone}) y=${frontPos.pos[1]} ` +
                                `>= ${backPos.player}(Z${backZone}) y=${backPos.pos[1]}`
                            );
                        }
                    } else if (rule.axis === 'x') {
                        if (frontPos.pos[0] >= backPos.pos[0]) {
                            errors.push(
                                `OVERLAP: ${rule.desc} — ` +
                                `${frontPos.player}(Z${frontZone}) x=${frontPos.pos[0]} ` +
                                `>= ${backPos.player}(Z${backZone}) x=${backPos.pos[0]}`
                            );
                        }
                    }
                }
            }

            // --- Logical checks ---

            // Server should be at serve position during servingServe
            if (phase === 'servingServe') {
                const zones = getZoneAssignments(lineup, r);
                const serverPlayer = zones[1];
                const serverPos = posData[serverPlayer];
                if (serverPos && !isServingPosition(serverPos)) {
                    warnings.push(`Server ${serverPlayer} not at serving position (y=${serverPos[1]}, expected y>900)`);
                }
            }

            // Report
            if (errors.length > 0 || warnings.length > 0) {
                console.log(`  ${phase} R${r}:`);
                for (const e of errors) {
                    console.log(`    ❌ ERROR: ${e}`);
                    totalErrors++;
                }
                for (const w of warnings) {
                    console.log(`    ⚠️  WARN: ${w}`);
                    totalWarnings++;
                }
            }
        }
    }

    // Summary
    console.log(`\n${'─'.repeat(60)}`);
    if (totalErrors === 0 && totalWarnings === 0) {
        console.log('✅ All checks passed! No errors or warnings.');
    } else {
        console.log(`Results: ${totalErrors} error(s), ${totalWarnings} warning(s)`);
        if (totalErrors > 0) {
            console.log('❌ Validation FAILED — overlap or structural errors found.');
        } else {
            console.log('⚠️  Validation passed with warnings.');
        }
    }
    console.log();

    return totalErrors;
}

// ============================================================
// MAIN
// ============================================================
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage: node validate-rotation.js <rotation-file.json> [lineup]');
    console.log('  lineup: comma-separated player IDs in Z1-Z6 order for rotation 1');
    console.log('  If omitted, lineup is auto-detected from servingBase R1 positions.');
    console.log();
    console.log('Example: node validate-rotation.js ../rotations/4-2.json "s1,m1,h2,s2,m2,h1"');
    process.exit(0);
}

const filePath = path.resolve(args[0]);
if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const lineupArg = args[1] || null;
const errorCount = validateFile(filePath, lineupArg);
process.exit(errorCount > 0 ? 1 : 0);
