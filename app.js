import {
  DEFAULT_GRID,
  DIFFICULTY,
  isOpposite,
  placeApple,
  createInitialState,
  stepState,
} from './snake-core.js';

(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const speedEl = document.getElementById('speed');

  const difficultyEl = document.getElementById('difficulty');
  const themeEl = document.getElementById('theme');
  const soundEl = document.getElementById('sound');
  const runsEl = document.getElementById('runs');

  // Overlay
  const overlayEl = document.getElementById('overlay');
  const overlayTitleEl = document.getElementById('overlayTitle');
  const overlaySubEl = document.getElementById('overlaySub');
  const btnStart = document.getElementById('btnStart');
  const btnRestartBig = document.getElementById('btnRestartBig');

  // On-screen controls (mobile)
  const dpadEl = document.getElementById('dpad');
  const btnUp = document.getElementById('btnUp');
  const btnDown = document.getElementById('btnDown');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');

  const GRID = DEFAULT_GRID;

  const BEST_KEY = 'yuki-snake-best';
  const RUNS_KEY = 'yuki-snake-runs';
  const SETTINGS_KEY = 'yuki-snake-settings';

  const state = {
    core: createInitialState({ grid: GRID, tickBase: DIFFICULTY.normal }),
    lastTick: 0,

    ui: {
      started: false,
      gameOverHandled: false,
      swipeMinPx: 18,
    },

    audio: {
      enabled: true,
      ctx: null,
    },

    view: {
      dpr: 1,
      cellPx: 20,
    },
  };

  // ----- storage -----

  function loadBest(){
    const v = Number(localStorage.getItem(BEST_KEY) || '0');
    return Number.isFinite(v) ? v : 0;
  }

  function saveBest(v){
    localStorage.setItem(BEST_KEY, String(v));
  }

  function loadRuns(){
    try{
      const raw = localStorage.getItem(RUNS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveRuns(runs){
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
  }

  function renderRuns(){
    const runs = loadRuns()
      .slice()
      .sort((a,b) => (b.score - a.score) || (a.t - b.t))
      .slice(0, 5);

    runsEl.innerHTML = '';
    if (runs.length === 0){
      const li = document.createElement('li');
      li.textContent = '还没有记录～先来一把！';
      runsEl.appendChild(li);
      return;
    }

    for (const r of runs){
      const li = document.createElement('li');
      const dt = new Date(r.t);
      li.textContent = `${r.score} 分 · ${dt.toLocaleString()}`;
      runsEl.appendChild(li);
    }
  }

  function loadSettings(){
    try{
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveSettings(s){
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  // ----- UI helpers -----

  function setScore(v){
    state.core.score = v;
    scoreEl.textContent = String(v);

    const best = loadBest();
    if (v > best){
      saveBest(v);
      bestEl.textContent = String(v);
    }
  }

  function setSpeed(mult){
    speedEl.textContent = `${mult.toFixed(1)}x`;
  }

  function applyTheme(key){
    document.body.dataset.theme = key === 'light' ? 'light' : 'dark';
  }

  function showOverlay({ title, sub, showStart, showRestart }){
    overlayTitleEl.textContent = title;
    overlaySubEl.textContent = sub;

    btnStart.classList.toggle('hidden', !showStart);
    btnRestartBig.classList.toggle('hidden', !showRestart);

    overlayEl.classList.toggle('hidden', false);
  }

  function hideOverlay(){
    overlayEl.classList.toggle('hidden', true);
  }

  function ensureAudio(){
    if (!state.audio.enabled) return null;
    if (!state.audio.ctx){
      try {
        state.audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        state.audio.ctx = null;
      }
    }
    return state.audio.ctx;
  }

  function beep(freq, ms, type='sine', gain=0.09){
    if (!state.audio.enabled) return;
    const ac = ensureAudio();
    if (!ac) return;

    if (ac.state === 'suspended') ac.resume().catch(() => {});

    const o = ac.createOscillator();
    const g = ac.createGain();

    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;

    o.connect(g);
    g.connect(ac.destination);

    const t0 = ac.currentTime;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms/1000);

    o.start(t0);
    o.stop(t0 + ms/1000);
  }

  function haptic(pattern){
    if (!state.audio.enabled) return; // treat as part of "feedback"
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch {}
    }
  }

  function computeCanvasSize(){
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

    const rect = canvas.getBoundingClientRect();
    const cssSize = Math.floor(Math.max(260, Math.min(rect.width || 480, 560)));
    // Make the backing store size divisible by GRID to avoid off-by-one overdraw
    let pxSize = Math.floor(cssSize * dpr);
    pxSize = pxSize - (pxSize % GRID);

    canvas.width = pxSize;
    canvas.height = pxSize;

    state.view.dpr = dpr;
    state.view.cellPx = pxSize / GRID;

    ctx.setTransform(1,0,0,1,0,0);
  }

  // ----- game control -----

  function placeAppleForCore(){
    state.core.apple = placeApple(Math.random, state.core.snake, state.core.grid);
  }

  function resetToReady(){
    const { grid } = state.core;
    const tickBase = state.core.tickBase;

    state.core = createInitialState({ grid, tickBase });
    state.core.running = false; // wait for start
    state.core.gameOver = false;

    state.ui.started = false;
    state.lastTick = 0;

    setScore(0);
    setSpeed(state.core.tickBase / state.core.tickMs);

    state.ui.gameOverHandled = false;

    showOverlay({
      title: '准备好了吗？',
      sub: '点一下开始',
      showStart: true,
      showRestart: false,
    });
  }

  function startGame(){
    ensureAudio();
    beep(520, 70, 'sine', 0.08);

    state.ui.started = true;
    state.ui.gameOverHandled = false;
    state.core.running = true;
    state.core.gameOver = false;

    hideOverlay();
  }

  function finishRun(){
    const runs = loadRuns();
    runs.push({ score: state.core.score, t: Date.now() });
    saveRuns(runs.slice(-50));
    renderRuns();
  }

  function doGameOver(reason){
    if (state.ui.gameOverHandled) return;
    state.ui.gameOverHandled = true;

    state.core.gameOver = true;
    state.core.running = false;

    // Make feedback clearly different
    beep(180, 140, 'sawtooth', 0.10);
    setTimeout(() => beep(120, 180, 'triangle', 0.10), 70);
    haptic([60, 40, 90]);

    finishRun();

    showOverlay({
      title: '游戏结束',
      sub: reason === 'self' ? '撞到自己啦～' : '撞墙啦～',
      showStart: false,
      showRestart: true,
    });
  }

  function doStep(){
    const r = stepState(state.core);
    state.core = r.state;

    if (r.event === 'gameover_wall') return doGameOver('wall');
    if (r.event === 'gameover_self') return doGameOver('self');

    if (r.event === 'eat' || r.event === 'speedup'){
      if (!state.core.apple) placeAppleForCore();

      setScore(state.core.score);

      if (r.event === 'eat'){
        beep(880, 70, 'sine', 0.08);
        haptic(20);
      } else {
        setSpeed(state.core.tickBase / state.core.tickMs);
        beep(1040, 90, 'triangle', 0.07);
        haptic(30);
      }
    }
  }

  function loop(ts){
    if (!state.lastTick) state.lastTick = ts;
    const elapsed = ts - state.lastTick;

    if (state.core.running && !state.core.gameOver && elapsed >= state.core.tickMs){
      state.lastTick = ts;
      doStep();
    }

    render();
    requestAnimationFrame(loop);
  }

  function setDirection(dx, dy){
    const next = { x: dx, y: dy };
    if (dx === 0 && dy === 0) return;
    if (isOpposite(state.core.dir, next)) return;
    state.core.nextDir = next;
  }

  function applyDifficulty(key){
    const base = DIFFICULTY[key] ?? DIFFICULTY.normal;
    state.core.tickBase = base;
    state.core.tickMs = base;
    setSpeed(state.core.tickBase / state.core.tickMs);
  }

  // ----- rendering (better snake + food) -----

  function drawGrid(){
    const gridColor = getComputedStyle(document.body).getPropertyValue('--grid').trim() || 'rgba(255,255,255,0.08)';
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    const cell = state.view.cellPx;
    const size = canvas.width;

    for (let i=0; i<=GRID; i++){
      const p = i * cell;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRoundedRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  function drawApple(cell){
    const appleColor = getComputedStyle(document.body).getPropertyValue('--apple').trim() || 'rgba(255, 90, 110, 0.95)';

    const ax = state.core.apple.x * cell;
    const ay = state.core.apple.y * cell;

    // body
    ctx.save();
    ctx.fillStyle = appleColor;
    const r = cell * 0.34;
    const cx = ax + cell * 0.5;
    const cy = ay + cell * 0.55;

    ctx.beginPath();
    ctx.arc(cx - r*0.55, cy, r, 0, Math.PI*2);
    ctx.arc(cx + r*0.55, cy, r, 0, Math.PI*2);
    ctx.closePath();
    ctx.fill();

    // highlight
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx - r*0.7, cy - r*0.4, r*0.35, r*0.55, -0.4, 0, Math.PI*2);
    ctx.fill();

    // stem + leaf
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(90,60,40,0.95)';
    ctx.lineWidth = Math.max(2, cell * 0.10);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, ay + cell * 0.30);
    ctx.lineTo(cx, ay + cell * 0.14);
    ctx.stroke();

    ctx.fillStyle = 'rgba(70, 190, 110, 0.95)';
    ctx.beginPath();
    ctx.ellipse(cx + cell*0.18, ay + cell*0.18, cell*0.18, cell*0.10, -0.6, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }

  function drawSnake(cell){
    const headColor = getComputedStyle(document.body).getPropertyValue('--snake-head').trim() || 'rgba(122,162,255,0.95)';
    const bodyColor = getComputedStyle(document.body).getPropertyValue('--snake-body').trim() || 'rgba(122,162,255,0.70)';

    const s = state.core.snake;

    ctx.save();
    for (let i=0; i<s.length; i++){
      const seg = s[i];
      const x = seg.x * cell;
      const y = seg.y * cell;

      const t = i / Math.max(1, s.length - 1);
      const pad = cell * (0.10 + t*0.12); // tail thinner
      const w = cell - pad*2;
      const r = cell * 0.28;

      ctx.fillStyle = (i === 0) ? headColor : bodyColor;
      drawRoundedRect(x + pad, y + pad, w, w, r);
      ctx.fill();

      if (i === 0){
        // Eyes based on direction
        const dir = state.core.dir;
        const ex = x + cell*0.5;
        const ey = y + cell*0.5;
        const off = cell*0.16;

        let e1 = {x: ex - off, y: ey - off};
        let e2 = {x: ex + off, y: ey - off};

        if (dir.x === 1 && dir.y === 0){ // right
          e1 = {x: ex + off*0.5, y: ey - off};
          e2 = {x: ex + off*0.5, y: ey + off};
        } else if (dir.x === -1 && dir.y === 0){ // left
          e1 = {x: ex - off*0.5, y: ey - off};
          e2 = {x: ex - off*0.5, y: ey + off};
        } else if (dir.x === 0 && dir.y === 1){ // down
          e1 = {x: ex - off, y: ey + off*0.5};
          e2 = {x: ex + off, y: ey + off*0.5};
        } // up default already

        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.arc(e1.x, e1.y, cell*0.07, 0, Math.PI*2);
        ctx.arc(e2.x, e2.y, cell*0.07, 0, Math.PI*2);
        ctx.fill();
      }

      if (i === s.length - 1){
        // Tail tip mark
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + cell*0.5, y + cell*0.5, cell*0.10, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  function render(){
    ctx.clearRect(0,0,canvas.width, canvas.height);

    // background
    const g = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    g.addColorStop(0,'rgba(122,162,255,0.08)');
    g.addColorStop(1,'rgba(0,0,0,0.10)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,canvas.width, canvas.height);

    drawGrid();

    const cell = state.view.cellPx;
    drawApple(cell);
    drawSnake(cell);
  }

  // ----- event wiring -----

  difficultyEl.addEventListener('change', () => {
    applyDifficulty(difficultyEl.value);
    saveSettings({ difficulty: difficultyEl.value, theme: themeEl.value, sound: soundEl.checked });
    resetToReady();
  });

  themeEl.addEventListener('change', () => {
    applyTheme(themeEl.value);
    saveSettings({ difficulty: difficultyEl.value, theme: themeEl.value, sound: soundEl.checked });
  });

  soundEl.addEventListener('change', () => {
    state.audio.enabled = !!soundEl.checked;
    saveSettings({ difficulty: difficultyEl.value, theme: themeEl.value, sound: soundEl.checked });

    // audible confirmation
    if (state.audio.enabled){
      ensureAudio();
      beep(700, 80, 'sine', 0.09);
      setTimeout(() => beep(950, 70, 'triangle', 0.08), 60);
    }
  });

  btnStart.addEventListener('click', startGame);
  btnRestartBig.addEventListener('click', () => {
    resetToReady();
    startGame();
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();

    if (!state.ui.started && (k === 'enter' || k === ' ')){
      e.preventDefault();
      startGame();
      return;
    }

    if (k === 'arrowup' || k === 'w') setDirection(0,-1);
    else if (k === 'arrowdown' || k === 's') setDirection(0,1);
    else if (k === 'arrowleft' || k === 'a') setDirection(-1,0);
    else if (k === 'arrowright' || k === 'd') setDirection(1,0);
    else if (k === 'r'){
      if (state.core.gameOver){
        resetToReady();
        startGame();
      }
    }
  }, { passive: false });

  // On-screen D-pad
  function bindPress(btn, dx, dy){
    const onPress = (e) => {
      e.preventDefault();
      if (!state.ui.started) startGame();
      setDirection(dx, dy);
    };

    btn.addEventListener('pointerdown', onPress, { passive: false });
    btn.addEventListener('touchstart', onPress, { passive: false });
  }

  if (btnUp && btnDown && btnLeft && btnRight){
    bindPress(btnUp, 0, -1);
    bindPress(btnDown, 0, 1);
    bindPress(btnLeft, -1, 0);
    bindPress(btnRight, 1, 0);
  }

  // Swipe to move on canvas
  let touchStart = null;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (adx < state.ui.swipeMinPx && ady < state.ui.swipeMinPx){
      touchStart = null;
      return;
    }

    if (!state.ui.started) startGame();

    if (adx > ady){
      setDirection(dx > 0 ? 1 : -1, 0);
    } else {
      setDirection(0, dy > 0 ? 1 : -1);
    }
    touchStart = null;
  });

  // Prevent page scroll on game area
  for (const el of [canvas, dpadEl].filter(Boolean)){
    el.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    el.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  }

  // Resize
  const ro = new ResizeObserver(() => computeCanvasSize());
  ro.observe(canvas);
  window.addEventListener('resize', computeCanvasSize);

  // ----- init -----

  bestEl.textContent = String(loadBest());

  const s = loadSettings();
  const initialDifficulty = s?.difficulty || 'normal';
  const initialTheme = s?.theme || 'dark';
  const initialSound = s?.sound ?? true;

  difficultyEl.value = initialDifficulty;
  themeEl.value = (initialTheme === 'light') ? 'light' : 'dark';
  soundEl.checked = !!initialSound;
  state.audio.enabled = !!initialSound;

  applyDifficulty(initialDifficulty);
  applyTheme(themeEl.value);
  renderRuns();

  computeCanvasSize();
  resetToReady();
  requestAnimationFrame(loop);
})();
