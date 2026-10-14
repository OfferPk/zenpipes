const test = require('node:test');
const assert = require('node:assert/strict');
const ZenPipes = require('../src/pipes.js');

test('rotateMask rotates 90 degrees clockwise', () => {
  assert.equal(ZenPipes.rotateMask(ZenPipes.N), ZenPipes.E);
  assert.equal(ZenPipes.rotateMask(ZenPipes.E), ZenPipes.S);
  assert.equal(ZenPipes.rotateMask(ZenPipes.S), ZenPipes.W);
  assert.equal(ZenPipes.rotateMask(ZenPipes.W), ZenPipes.N);

  // Elbow: N | E (3) -> E | S (6) -> S | W (12) -> W | N (9)
  let elbow = ZenPipes.N | ZenPipes.E;
  assert.equal(elbow, 3);
  elbow = ZenPipes.rotateMask(elbow);
  assert.equal(elbow, ZenPipes.E | ZenPipes.S);
  elbow = ZenPipes.rotateMask(elbow);
  assert.equal(elbow, ZenPipes.S | ZenPipes.W);
  elbow = ZenPipes.rotateMask(elbow);
  assert.equal(elbow, ZenPipes.W | ZenPipes.N);
});

test('areConnected checks mutual ports between adjacent cells', () => {
  const grid = ZenPipes.createGrid(2, 2, 0);
  // (0,0) points East, (0,1) points West -> connected
  grid[0][0] = ZenPipes.E;
  grid[0][1] = ZenPipes.W;
  assert.equal(ZenPipes.areConnected(grid, 0, 0, ZenPipes.E), true);
  assert.equal(ZenPipes.areConnected(grid, 0, 1, ZenPipes.W), true);

  // If (0,1) is rotated to point South -> disconnected
  grid[0][1] = ZenPipes.S;
  assert.equal(ZenPipes.areConnected(grid, 0, 0, ZenPipes.E), false);
});

test('computeFlow finds connected path from source', () => {
  // Simple 2x2 loop
  const grid = [
    [ZenPipes.E | ZenPipes.S, ZenPipes.S | ZenPipes.W],
    [ZenPipes.N | ZenPipes.E, ZenPipes.N | ZenPipes.W]
  ];
  const flow = ZenPipes.computeFlow(grid, 0, 0);
  assert.equal(flow.countConnected, 4);
  assert.equal(flow.totalPipes, 4);
  assert.equal(flow.hasLeaks, false);
  assert.equal(ZenPipes.isSolved(grid, 0, 0), true);
});

test('computeFlow flags leaks when port faces wall or dead neighbor', () => {
  const grid = [
    [ZenPipes.N | ZenPipes.E, ZenPipes.W], // (0,0) has port pointing North (off-grid)
    [0, 0]
  ];
  const flow = ZenPipes.computeFlow(grid, 0, 0);
  assert.equal(flow.hasLeaks, true);
  assert.equal(ZenPipes.isSolved(grid, 0, 0), false);
});

test('solve finds minimal rotations to solve scrambled loop', () => {
  // Solved 2x2:
  // [E|S, S|W]
  // [N|E, N|W]
  // Scramble (0,1) by 1 rotation
  const solved = [
    [ZenPipes.E | ZenPipes.S, ZenPipes.S | ZenPipes.W],
    [ZenPipes.N | ZenPipes.E, ZenPipes.N | ZenPipes.W]
  ];
  const scrambled = ZenPipes.cloneGrid(solved);
  scrambled[0][1] = ZenPipes.rotateMask(scrambled[0][1]); // Needs 3 more rotations to complete cycle

  const result = ZenPipes.solve(scrambled, 0, 0);
  assert.equal(result.solvable, true);
  assert.ok(result.minMoves >= 1);
});

test('all 50 levels in src/levels.js are verified and solvable', () => {
  const Levels = require('../src/levels.js');
  assert.equal(Levels.ALL_LEVELS.length, 50);
  assert.equal(Levels.PACKS.length, 5);

  for (const level of Levels.ALL_LEVELS) {
    assert.ok(level.rows >= 3 && level.rows <= 6);
    assert.ok(level.cols >= 3 && level.cols <= 6);
    assert.equal(level.solvedGrid.length, level.rows);
    assert.equal(level.solvedGrid[0].length, level.cols);
    assert.equal(ZenPipes.isSolved(level.solvedGrid, 0, 0), true, `Level ${level.name} must be solved in target state`);
    assert.ok(level.par >= 3, `Level ${level.name} par must be at least 3`);
  }
});

