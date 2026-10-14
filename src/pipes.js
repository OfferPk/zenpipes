/**
 * ZenPipes Core Logic Engine
 * Flow rotation puzzle engine: Bitmask directional ports, BFS flow simulation, and backtrack solver
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ZenPipes = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Port direction bitmasks
  const N = 1; // 0001 Up
  const E = 2; // 0010 Right
  const S = 4; // 0100 Down
  const W = 8; // 1000 Left

  const OPPOSITE = {
    [N]: S,
    [E]: W,
    [S]: N,
    [W]: E
  };

  const DELTAS = {
    [N]: [-1, 0],
    [E]: [0, 1],
    [S]: [1, 0],
    [W]: [0, -1]
  };

  /**
   * Rotate a port bitmask clockwise by 90 degrees
   */
  function rotateMask(mask) {
    let next = 0;
    if (mask & N) next |= E;
    if (mask & E) next |= S;
    if (mask & S) next |= W;
    if (mask & W) next |= N;
    return next;
  }

  /**
   * Rotate a mask clockwise `times` times (0..3)
   */
  function rotateMaskTimes(mask, times) {
    let m = mask;
    const count = (times % 4 + 4) % 4;
    for (let i = 0; i < count; i++) {
      m = rotateMask(m);
    }
    return m;
  }

  /**
   * Create an empty grid
   */
  function createGrid(rows, cols, fillVal = 0) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
      grid.push(new Array(cols).fill(fillVal));
    }
    return grid;
  }

  /**
   * Clone a 2D grid
   */
  function cloneGrid(grid) {
    return grid.map(row => row.slice());
  }

  /**
   * Check if two adjacent cells have mutually connected open ports
   */
  function areConnected(grid, r1, c1, dir) {
    const mask1 = grid[r1][c1];
    if (!(mask1 & dir)) return false;

    const [dr, dc] = DELTAS[dir];
    const r2 = r1 + dr;
    const c2 = c1 + dc;

    if (r2 < 0 || r2 >= grid.length || c2 < 0 || c2 >= grid[0].length) {
      return false;
    }

    const mask2 = grid[r2][c2];
    const opp = OPPOSITE[dir];
    return (mask2 & opp) !== 0;
  }

  /**
   * Compute flow connectivity from a source using BFS
   * Returns:
   *   { connected: Array<Array<boolean>>, countConnected: number, totalPipes: number, hasLeaks: boolean }
   */
  function computeFlow(grid, sourceR = 0, sourceC = 0) {
    const rows = grid.length;
    const cols = grid[0].length;
    const connected = createGrid(rows, cols, false);

    let totalPipes = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] > 0) totalPipes++;
      }
    }

    if (grid[sourceR][sourceC] === 0) {
      return { connected, countConnected: 0, totalPipes, hasLeaks: true };
    }

    connected[sourceR][sourceC] = true;
    const queue = [[sourceR, sourceC]];
    let countConnected = 1;
    let hasLeaks = false;

    while (queue.length > 0) {
      const [r, c] = queue.shift();
      const mask = grid[r][c];

      // Check all 4 directions
      for (const dir of [N, E, S, W]) {
        if (mask & dir) {
          const [dr, dc] = DELTAS[dir];
          const nr = r + dr;
          const nc = c + dc;

          // If port points off board -> leak
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
            hasLeaks = true;
            continue;
          }

          const neighborMask = grid[nr][nc];
          const opp = OPPOSITE[dir];

          // If neighbor has no matching port -> leak
          if (!(neighborMask & opp)) {
            hasLeaks = true;
            continue;
          }

          if (!connected[nr][nc]) {
            connected[nr][nc] = true;
            countConnected++;
            queue.push([nr, nc]);
          }
        }
      }
    }

    return { connected, countConnected, totalPipes, hasLeaks };
  }

  /**
   * Check if puzzle is fully solved:
   * Every pipe with mask > 0 must be connected to source, with zero leaks
   */
  function isSolved(grid, sourceR = 0, sourceC = 0) {
    const flow = computeFlow(grid, sourceR, sourceC);
    return !flow.hasLeaks && flow.countConnected === flow.totalPipes && flow.totalPipes > 0;
  }

  /**
   * Rotate a cell on the grid clockwise by 90 degrees
   */
  function rotateCell(grid, r, c) {
    const next = cloneGrid(grid);
    next[r][c] = rotateMask(next[r][c]);
    return next;
  }

  /**
   * Solve a pipe rotation puzzle using backtracking search with pruning
   * Target is to find minimal rotation steps to connect all pipes without leaks
   */
  function solve(grid, sourceR = 0, sourceC = 0) {
    const rows = grid.length;
    const cols = grid[0].length;
    const current = cloneGrid(grid);

    // Collect non-empty cells
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (current[r][c] > 0) {
          // Cross (mask 15) has 1 unique orientation; straight (5 or 10) has 2; others 4
          const m = current[r][c];
          let maxRots = 4;
          if (m === 15) maxRots = 1;
          else if (m === 5 || m === 10) maxRots = 2;
          cells.push({ r, c, maxRots });
        }
      }
    }

    let solutionMoves = null;
    let minMoves = Infinity;

    function backtrack(index, movesSoFar, movesList) {
      if (movesSoFar >= minMoves) return;

      if (index === cells.length) {
        if (isSolved(current, sourceR, sourceC)) {
          minMoves = movesSoFar;
          solutionMoves = movesList.slice();
        }
        return;
      }

      const cell = cells[index];
      const origMask = current[cell.r][cell.c];

      for (let rot = 0; rot < cell.maxRots; rot++) {
        current[cell.r][cell.c] = rotateMaskTimes(origMask, rot);

        // Quick boundary prune: if port points off grid, prune
        const m = current[cell.r][cell.c];
        let invalid = false;
        if ((cell.r === 0 && (m & N)) ||
            (cell.r === rows - 1 && (m & S)) ||
            (cell.c === 0 && (m & W)) ||
            (cell.c === cols - 1 && (m & E))) {
          invalid = true;
        }

        if (!invalid) {
          const nextList = rot > 0 ? movesList.concat([{ r: cell.r, c: cell.c, rotations: rot }]) : movesList;
          backtrack(index + 1, movesSoFar + rot, nextList);
        }
      }

      current[cell.r][cell.c] = origMask;
    }

    backtrack(0, 0, []);

    if (solutionMoves !== null) {
      return {
        solvable: true,
        minMoves: minMoves,
        solution: solutionMoves
      };
    }

    return {
      solvable: false,
      minMoves: -1,
      solution: []
    };
  }

  return {
    N, E, S, W,
    OPPOSITE,
    DELTAS,
    rotateMask,
    rotateMaskTimes,
    createGrid,
    cloneGrid,
    areConnected,
    computeFlow,
    isSolved,
    rotateCell,
    solve
  };
}));
