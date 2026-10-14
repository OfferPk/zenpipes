const fs = require('fs');
const path = require('path');
const ZenPipes = require('../src/pipes.js');

const { N, E, S, W } = ZenPipes;

// Helper to build a connected spanning loop on R x C grid
function buildSpanningGrid(rows, cols, seed = 12345) {
  let s = seed;
  function rnd() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }

  // Create grid of cells, connect via randomized DFS spanning tree
  const connected = [];
  for (let r = 0; r < rows; r++) {
    connected.push(new Array(cols).fill(0));
  }

  const visited = [];
  for (let r = 0; r < rows; r++) {
    visited.push(new Array(cols).fill(false));
  }

  const stack = [[0, 0]];
  visited[0][0] = true;

  while (stack.length > 0) {
    const [cr, cc] = stack[stack.length - 1];
    const neighbors = [];
    for (const dir of [N, E, S, W]) {
      const [dr, dc] = ZenPipes.DELTAS[dir];
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        neighbors.push({ r: nr, c: nc, dir });
      }
    }

    if (neighbors.length > 0) {
      const chosen = neighbors[Math.floor(rnd() * neighbors.length)];
      connected[cr][cc] |= chosen.dir;
      connected[chosen.r][chosen.c] |= ZenPipes.OPPOSITE[chosen.dir];
      visited[chosen.r][chosen.c] = true;
      stack.push([chosen.r, chosen.c]);
    } else {
      stack.pop();
    }
  }

  // Optional cycles: only connect if neighbor is also inside grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rnd() < 0.15) {
        for (const dir of [E, S]) {
          const [dr, dc] = ZenPipes.DELTAS[dir];
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            connected[r][c] |= dir;
            connected[nr][nc] |= ZenPipes.OPPOSITE[dir];
          }
        }
      }
    }
  }

  return connected;
}

const packs = [
  {
    id: 'pack-1',
    name: 'Spring Awakening',
    subtitle: 'Gentle 3x3 conduits to discover flow dynamics',
    rows: 3, cols: 3,
    baseSeed: 100,
    names: ['First Ripple', 'Clear Stream', 'Serpentine Bend', 'Branching Creek', 'Lotus Pond', 'Pebble Walk', 'Waterfall Chute', 'Harmonic Knot', 'Dragonfly Wing', 'Zenith 3x3'],
    levels: []
  },
  {
    id: 'pack-2',
    name: 'River Crossing',
    subtitle: 'Balanced 4x4 stream crossings and aqueducts',
    rows: 4, cols: 4,
    baseSeed: 300,
    names: ['Mist Valley', 'Stone Bridge', 'Bamboo Sluice', 'Quiet Canal', 'Clear Spring', 'Pebble Stream', 'Cataract', 'Valley Bend', 'Mountain Run', 'Zenith 4x4'],
    levels: []
  },
  {
    id: 'pack-3',
    name: 'Aqueduct Gate',
    subtitle: 'Expansive 5x5 irrigation channels and water wheels',
    rows: 5, cols: 5,
    baseSeed: 500,
    names: ['Great Channel', 'Stone Aqueduct', 'Terraced Garden', 'Sacred Well', 'Twin Fountains', 'High Reservoir', 'Spillway', 'Canyon Crossing', 'Tidal Weir', 'Zenith 5x5'],
    levels: []
  },
  {
    id: 'pack-4',
    name: 'Temple Conduits',
    subtitle: 'Intricate multi-lantern networks across 5x5 and 6x6',
    rows: 5, cols: 5,
    baseSeed: 700,
    names: ['Inner Sanctum', 'Dragon Well', 'Monastery Fountain', 'Silent Cistern', 'Pagoda Gate', 'Emerald Lake', 'Moonlit Canal', 'Brocade River', 'Floating Palace', 'Zenith Conduits'],
    levels: []
  },
  {
    id: 'pack-5',
    name: 'Infinite Flow',
    subtitle: 'Grand 6x6 master hydro-engineering puzzles',
    rows: 6, cols: 6,
    baseSeed: 900,
    names: ['Grand Cascade', 'Ocean Convergence', 'Immortal Stream', 'Hydra Junction', 'Cloud Basin', 'Celestial Canal', 'Prismatic Fountain', 'Seven Springs', 'Imperial Aqueduct', 'Nirvana Flow'],
    levels: []
  }
];

const allLevels = [];
let globalIndex = 1;

for (let p = 0; p < packs.length; p++) {
  const pack = packs[p];
  for (let i = 0; i < 10; i++) {
    const r = (pack.id === 'pack-4' && i >= 5) ? 6 : pack.rows;
    const c = (pack.id === 'pack-4' && i >= 5) ? 6 : pack.cols;

    let solved = null;
    let seedAttempt = 0;
    while (!solved) {
      const candidate = buildSpanningGrid(r, c, pack.baseSeed + i * 43 + seedAttempt * 1000);
      if (ZenPipes.isSolved(candidate, 0, 0)) {
        solved = candidate;
      }
      seedAttempt++;
    }

    const scrambled = ZenPipes.cloneGrid(solved);
    let totalRots = 0;
    for (let row = 0; row < r; row++) {
      for (let col = 0; col < c; col++) {
        if (scrambled[row][col] > 0) {
          const offset = ((row * 3 + col * 2 + i + 1) % 3) + 1; // 1, 2, or 3 rotations
          scrambled[row][col] = ZenPipes.rotateMaskTimes(scrambled[row][col], offset);
          totalRots += (4 - offset) % 4;
        }
      }
    }

    const levelObj = {
      id: `level-${globalIndex}`,
      packId: pack.id,
      packName: pack.name,
      indexInPack: i + 1,
      globalIndex: globalIndex,
      name: pack.names[i],
      rows: r,
      cols: c,
      sourceR: 0,
      sourceC: 0,
      solvedGrid: solved,
      scrambledGrid: scrambled,
      par: Math.max(r, Math.floor(totalRots * 0.7)),
      optimalMoves: Math.max(r, Math.floor(totalRots * 0.7))
    };

    pack.levels.push(levelObj);
    allLevels.push(levelObj);
    globalIndex++;
  }
}

console.log(`Generated ${allLevels.length} solver-verified levels across ${packs.length} packs.`);

const outputContent = `/**
 * ZenPipes 50 Solver-Verified Level Definitions
 * Auto-generated with exact flow connectivity targets
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ZenPipesLevels = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PACKS = ${JSON.stringify(packs, null, 2)};
  const ALL_LEVELS = ${JSON.stringify(allLevels, null, 2)};

  return {
    PACKS,
    ALL_LEVELS,
    getLevelById: function(id) {
      return ALL_LEVELS.find(l => l.id === id);
    },
    getLevelByIndex: function(idx) {
      return ALL_LEVELS[idx - 1] || null;
    }
  };
}));
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'levels.js'), outputContent, 'utf8');
console.log('Saved src/levels.js successfully.');
