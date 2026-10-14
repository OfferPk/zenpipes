/**
 * ZenPipes Application Controller
 * Handles pipe network rendering, rotation, flow simulation, audio synthesis, and offline PWA.
 */

(function () {
  'use strict';

  // State
  let currentMode = 'campaign'; // 'campaign' | 'freeplay'
  let currentLevel = null;
  let currentGrid = null;
  let initialGrid = null;
  let moveCount = 0;
  let moveHistory = []; // Stack of { r, c }
  let activeHint = null; // { r, c } or null
  let activePackId = 'pack-1';
  let progress = {};
  let isLevelWon = false;

  const THEMES = ['', 'theme-emerald', 'theme-amber', 'theme-purple'];
  let currentThemeIndex = 0;

  // DOM Elements
  const elGrid = document.getElementById('pipes-grid');
  const elLevelTitle = document.getElementById('level-title');
  const elLevelMeta = document.getElementById('level-meta');
  const elModeSubtitle = document.getElementById('game-mode-subtitle');
  const elHudMoves = document.getElementById('hud-moves');
  const elHudPar = document.getElementById('hud-par');
  const elHudConnected = document.getElementById('hud-connected');
  const elHudStars = document.getElementById('hud-stars');
  const elToast = document.getElementById('toast');

  // Modals
  const modalLevels = document.getElementById('modal-levels');
  const modalFreeplay = document.getElementById('modal-freeplay');
  const modalVictory = document.getElementById('modal-victory');
  const modalHelp = document.getElementById('modal-help');

  function loadProgress() {
    try {
      const data = localStorage.getItem('zenpipes_progress');
      if (data) progress = JSON.parse(data);
    } catch (e) {
      progress = {};
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem('zenpipes_progress', JSON.stringify(progress));
    } catch (e) {}
  }

  function loadTheme() {
    try {
      const savedTheme = localStorage.getItem('zenpipes_theme');
      if (savedTheme) {
        currentThemeIndex = THEMES.indexOf(savedTheme);
        if (currentThemeIndex === -1) currentThemeIndex = 0;
      }
      applyTheme();
    } catch (e) {}
  }

  function applyTheme() {
    THEMES.forEach(t => {
      if (t) document.body.classList.remove(t);
    });
    const active = THEMES[currentThemeIndex];
    if (active) document.body.classList.add(active);
    try {
      localStorage.setItem('zenpipes_theme', active);
    } catch (e) {}
  }

  function cycleTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
    applyTheme();
    const names = ['Aquamarine Stream', 'Emerald Bamboo', 'Solar Amber', 'Amethyst River'];
    showToast(`Theme: ${names[currentThemeIndex]}`);
  }

  let toastTimer = null;
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    elToast.textContent = msg;
    elToast.classList.add('visible');
    toastTimer = setTimeout(() => {
      elToast.classList.remove('visible');
    }, 2200);
  }

  function calculateStars(moves, par) {
    if (moves <= par) return 3;
    if (moves <= par + Math.max(2, Math.floor(par * 0.4))) return 2;
    return 1;
  }

  function updateHud() {
    elHudMoves.textContent = moveCount;
    const par = currentLevel ? currentLevel.par : Math.max(3, currentGrid.length * 2);
    elHudPar.textContent = par;

    const sourceR = currentLevel ? currentLevel.sourceR : 0;
    const sourceC = currentLevel ? currentLevel.sourceC : 0;
    const flow = ZenPipes.computeFlow(currentGrid, sourceR, sourceC);
    elHudConnected.textContent = `${flow.countConnected} / ${flow.totalPipes}`;

    const stars = calculateStars(moveCount, par);
    const starEls = elHudStars.querySelectorAll('.star');
    starEls.forEach((s, idx) => {
      if (idx < stars) s.classList.add('active');
      else s.classList.remove('active');
    });
  }

  // Draw Pipe SVG inside cell
  function createPipeSvg(mask, isFlowing, isSource) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.classList.add('pipe-svg');

    const streamColor = isFlowing ? 'var(--water-stream)' : 'var(--pipe-off)';
    const glowFilter = isFlowing ? 'drop-shadow(0 0 4px var(--water-glow))' : 'none';
    const strokeWidth = 18;

    // Background pipe line tracks
    if (mask & ZenPipes.N) {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', '50'); line.setAttribute('y1', '50');
      line.setAttribute('x2', '50'); line.setAttribute('y2', '0');
      line.setAttribute('stroke', streamColor);
      line.setAttribute('stroke-width', strokeWidth);
      line.setAttribute('stroke-linecap', 'square');
      line.style.filter = glowFilter;
      svg.appendChild(line);
    }
    if (mask & ZenPipes.E) {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', '50'); line.setAttribute('y1', '50');
      line.setAttribute('x2', '100'); line.setAttribute('y2', '50');
      line.setAttribute('stroke', streamColor);
      line.setAttribute('stroke-width', strokeWidth);
      line.setAttribute('stroke-linecap', 'square');
      line.style.filter = glowFilter;
      svg.appendChild(line);
    }
    if (mask & ZenPipes.S) {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', '50'); line.setAttribute('y1', '50');
      line.setAttribute('x2', '50'); line.setAttribute('y2', '100');
      line.setAttribute('stroke', streamColor);
      line.setAttribute('stroke-width', strokeWidth);
      line.setAttribute('stroke-linecap', 'square');
      line.style.filter = glowFilter;
      svg.appendChild(line);
    }
    if (mask & ZenPipes.W) {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', '50'); line.setAttribute('y1', '50');
      line.setAttribute('x2', '0'); line.setAttribute('y2', '50');
      line.setAttribute('stroke', streamColor);
      line.setAttribute('stroke-width', strokeWidth);
      line.setAttribute('stroke-linecap', 'square');
      line.style.filter = glowFilter;
      svg.appendChild(line);
    }

    // Center joint hub
    const center = document.createElementNS(svgNS, 'circle');
    center.setAttribute('cx', '50');
    center.setAttribute('cy', '50');
    center.setAttribute('r', isSource ? '18' : '12');
    center.setAttribute('fill', isSource ? '#FFFFFF' : streamColor);
    if (isFlowing) center.style.filter = glowFilter;
    svg.appendChild(center);

    // Source water ripple ring
    if (isSource) {
      const ring = document.createElementNS(svgNS, 'circle');
      ring.setAttribute('cx', '50');
      ring.setAttribute('cy', '50');
      ring.setAttribute('r', '26');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', 'var(--water-glow)');
      ring.setAttribute('stroke-width', '4');
      svg.appendChild(ring);
    }

    return svg;
  }

  // Render Grid
  function renderGrid() {
    elGrid.innerHTML = '';
    const rows = currentGrid.length;
    const cols = currentGrid[0].length;

    elGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    elGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    const sourceR = currentLevel ? currentLevel.sourceR : 0;
    const sourceC = currentLevel ? currentLevel.sourceC : 0;
    const flow = ZenPipes.computeFlow(currentGrid, sourceR, sourceC);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const mask = currentGrid[r][c];
        const isSource = (r === sourceR && c === sourceC);
        const isFlowing = flow.connected[r][c];

        const tile = document.createElement('button');
        tile.className = 'pipe-tile';
        if (isSource) tile.classList.add('is-source');
        if (activeHint && activeHint.r === r && activeHint.c === c) {
          tile.classList.add('is-hint');
        }

        tile.setAttribute('role', 'gridcell');
        tile.setAttribute('aria-label', `Row ${r + 1}, Col ${c + 1}: ${isFlowing ? 'Flowing' : 'Disconnected'}`);

        if (mask > 0) {
          tile.appendChild(createPipeSvg(mask, isFlowing, isSource));
        }

        tile.addEventListener('click', () => onPipeTap(r, c));
        elGrid.appendChild(tile);
      }
    }
  }

  function onPipeTap(r, c) {
    if (isLevelWon) return;
    if (currentGrid[r][c] === 0) return;

    ZenPipesAudio.playRotate(r, c);

    // Rotate clockwise 90 degrees
    currentGrid = ZenPipes.rotateCell(currentGrid, r, c);
    moveCount++;
    moveHistory.push({ r, c });
    activeHint = null;

    renderGrid();
    updateHud();

    const sourceR = currentLevel ? currentLevel.sourceR : 0;
    const sourceC = currentLevel ? currentLevel.sourceC : 0;
    if (ZenPipes.isSolved(currentGrid, sourceR, sourceC)) {
      handleWin();
    }
  }

  function handleWin() {
    isLevelWon = true;
    ZenPipesAudio.playWin();

    const par = currentLevel ? currentLevel.par : Math.max(3, currentGrid.length * 2);
    const stars = calculateStars(moveCount, par);

    if (currentMode === 'campaign' && currentLevel) {
      const prev = progress[currentLevel.id] || { stars: 0, bestMoves: Infinity };
      progress[currentLevel.id] = {
        completed: true,
        stars: Math.max(prev.stars, stars),
        bestMoves: Math.min(prev.bestMoves, moveCount)
      };
      saveProgress();
    }

    const vicStarsEl = document.getElementById('victory-stars');
    vicStarsEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 'victory-star' + (i < stars ? ' active' : '');
      s.textContent = '★';
      vicStarsEl.appendChild(s);
    }

    document.getElementById('vic-moves').textContent = moveCount;
    document.getElementById('vic-par').textContent = par;

    const btnNext = document.getElementById('btn-vic-next');
    if (currentMode === 'freeplay') {
      btnNext.textContent = 'New Puzzle';
    } else {
      const nextIdx = currentLevel.globalIndex + 1;
      if (nextIdx > ZenPipesLevels.ALL_LEVELS.length) {
        btnNext.textContent = 'Free Play';
      } else {
        btnNext.textContent = 'Next Level';
      }
    }

    modalVictory.classList.add('active');
  }

  function loadLevel(level) {
    currentMode = 'campaign';
    currentLevel = level;
    initialGrid = ZenPipes.cloneGrid(level.scrambledGrid);
    currentGrid = ZenPipes.cloneGrid(level.scrambledGrid);
    moveCount = 0;
    moveHistory = [];
    activeHint = null;
    isLevelWon = false;

    elModeSubtitle.textContent = 'Campaign';
    elLevelTitle.textContent = `${level.globalIndex}. ${level.name}`;
    elLevelMeta.textContent = `${level.packName} • ${level.rows}x${level.cols} Grid`;

    renderGrid();
    updateHud();
    closeAllModals();
  }

  function loadFreePlay(grid, par, sizeName) {
    currentMode = 'freeplay';
    currentLevel = {
      id: 'freeplay-' + Date.now(),
      name: `Zen Flow (${sizeName})`,
      par: par,
      optimalMoves: par,
      rows: grid.length,
      cols: grid[0].length,
      sourceR: 0,
      sourceC: 0
    };
    initialGrid = ZenPipes.cloneGrid(grid);
    currentGrid = ZenPipes.cloneGrid(grid);
    moveCount = 0;
    moveHistory = [];
    activeHint = null;
    isLevelWon = false;

    elModeSubtitle.textContent = 'Free Play';
    elLevelTitle.textContent = currentLevel.name;
    elLevelMeta.textContent = `Infinite Flow • ${grid.length}x${grid[0].length} Grid`;

    renderGrid();
    updateHud();
    closeAllModals();
  }

  function undoMove() {
    if (moveHistory.length === 0 || isLevelWon) return;
    const last = moveHistory.pop();
    // 3 rotations clockwise = 1 rotation counter-clockwise
    currentGrid = ZenPipes.rotateMaskTimes(currentGrid[last.r][last.c], 3);
    moveCount--;
    activeHint = null;
    ZenPipesAudio.playUndo();
    renderGrid();
    updateHud();
  }

  function resetLevel() {
    if (!initialGrid) return;
    currentGrid = ZenPipes.cloneGrid(initialGrid);
    moveCount = 0;
    moveHistory = [];
    activeHint = null;
    isLevelWon = false;
    ZenPipesAudio.playReset();
    renderGrid();
    updateHud();
    showToast('Pipes reset');
  }

  function requestHint() {
    if (isLevelWon) return;

    // If campaign level with known solvedGrid
    if (currentLevel && currentLevel.solvedGrid) {
      for (let r = 0; r < currentGrid.length; r++) {
        for (let c = 0; c < currentGrid[0].length; c++) {
          if (currentGrid[r][c] > 0 && currentGrid[r][c] !== currentLevel.solvedGrid[r][c]) {
            activeHint = { r, c };
            ZenPipesAudio.playHint();
            renderGrid();
            showToast(`Hint: Rotate pipe at Row ${r + 1}, Col ${c + 1}`);
            return;
          }
        }
      }
    }

    showToast('Circuit already connected!');
  }

  function updateSoundIcon() {
    const isMuted = ZenPipesAudio.isMuted();
    document.getElementById('icon-sound-on').style.display = isMuted ? 'none' : 'block';
    document.getElementById('icon-sound-off').style.display = isMuted ? 'block' : 'none';
  }

  function toggleSound() {
    const isMuted = !ZenPipesAudio.isMuted();
    ZenPipesAudio.setMuted(isMuted);
    updateSoundIcon();
    showToast(isMuted ? 'Sound Muted' : 'Sound On');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  function openLevelsModal() {
    renderPackTabs();
    renderLevelGrid();
    modalLevels.classList.add('active');
  }

  function renderPackTabs() {
    const container = document.getElementById('pack-tabs-container');
    container.innerHTML = '';
    ZenPipesLevels.PACKS.forEach(p => {
      const tab = document.createElement('button');
      tab.className = 'pack-tab' + (p.id === activePackId ? ' active' : '');
      tab.textContent = p.name;
      tab.addEventListener('click', () => {
        activePackId = p.id;
        renderPackTabs();
        renderLevelGrid();
      });
      container.appendChild(tab);
    });
  }

  function renderLevelGrid() {
    const gridEl = document.getElementById('level-select-grid');
    gridEl.innerHTML = '';
    const pack = ZenPipesLevels.PACKS.find(p => p.id === activePackId);
    if (!pack) return;

    pack.levels.forEach(lvl => {
      const tile = document.createElement('button');
      tile.className = 'level-tile';
      if (currentLevel && currentLevel.id === lvl.id) {
        tile.classList.add('current');
      }

      const pData = progress[lvl.id];
      if (pData && pData.stars > 0) {
        tile.classList.add('has-stars');
      }

      const num = document.createElement('span');
      num.className = 'level-tile-num';
      num.textContent = lvl.indexInPack;
      tile.appendChild(num);

      const stars = document.createElement('span');
      stars.className = 'level-tile-stars';
      const count = pData ? pData.stars : 0;
      stars.textContent = count > 0 ? '★'.repeat(count) : `Par ${lvl.par}`;
      tile.appendChild(stars);

      tile.addEventListener('click', () => {
        loadLevel(lvl);
      });

      gridEl.appendChild(tile);
    });
  }

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const key = e.key.toLowerCase();
    if (key === 'z') undoMove();
    else if (key === 'r') resetLevel();
    else if (key === 'h') requestHint();
    else if (key === 'm') toggleSound();
    else if (key === 'escape') closeAllModals();
  });

  // UI Event Listeners
  document.getElementById('btn-undo').addEventListener('click', undoMove);
  document.getElementById('btn-reset').addEventListener('click', resetLevel);
  document.getElementById('btn-hint').addEventListener('click', requestHint);
  document.getElementById('btn-theme').addEventListener('click', cycleTheme);
  document.getElementById('btn-sound').addEventListener('click', toggleSound);

  document.getElementById('btn-levels-modal').addEventListener('click', openLevelsModal);
  document.getElementById('btn-freeplay-modal').addEventListener('click', () => {
    modalFreeplay.classList.add('active');
  });
  document.getElementById('btn-help').addEventListener('click', () => {
    modalHelp.classList.add('active');
  });

  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllModals();
    });
  });

  let selectedSize = 3;
  document.querySelectorAll('#grid-size-selector .btn-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#grid-size-selector .btn-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = parseInt(btn.dataset.size, 10);
    });
  });

  document.getElementById('btn-generate-puzzle').addEventListener('click', () => {
    // Generate a random level matching size
    const pack = ZenPipesLevels.PACKS.find(p => p.rows === selectedSize) || ZenPipesLevels.PACKS[0];
    const randLvl = pack.levels[Math.floor(Math.random() * pack.levels.length)];
    loadFreePlay(randLvl.scrambledGrid, randLvl.par, `${selectedSize}x${selectedSize}`);
  });

  document.getElementById('btn-vic-replay').addEventListener('click', () => {
    closeAllModals();
    resetLevel();
  });

  document.getElementById('btn-vic-next').addEventListener('click', () => {
    closeAllModals();
    if (currentMode === 'freeplay') {
      document.getElementById('btn-generate-puzzle').click();
    } else {
      const nextIdx = currentLevel.globalIndex + 1;
      const nextLevel = ZenPipesLevels.getLevelByIndex(nextIdx);
      if (nextLevel) loadLevel(nextLevel);
      else openLevelsModal();
    }
  });

  function init() {
    loadProgress();
    loadTheme();
    updateSoundIcon();

    const firstLevel = ZenPipesLevels.getLevelByIndex(1);
    if (firstLevel) loadLevel(firstLevel);

    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
          console.log('ZenPipes ServiceWorker registered:', reg.scope);
        }).catch((err) => {
          console.log('ServiceWorker registration error:', err);
        });
      });
    }
  }

  init();
})();
