import {
  DEFAULT_GRID,
  DIFFICULTY,
  isOpposite,
  sameCell,
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
  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');

  const difficultyEl = document.getElementById('difficulty');
  const themeEl = document.getElementById('theme');
  const soundEl = document.getElementById('sound');
  const runsEl = document.getElementById('runs');

  // On-screen controls (mobile)
  const dpadEl = document.getElementById('dpad');
  const btnUp = document.getElementById('btnUp');
  const btnDown = document.getElementById('btnDown');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');

  const btnFullscreen = document.getElementById('btnFullscreen');

  const GRID = DEFAULT_GRID;

  const BEST_KEY = 'yuki-snake-best';
  const RUNS_KEY = 'yuki-snake-runs';
  const SETTINGS_KEY = 'yuki-snake-settings';

  const state = {
    core: createInitialState({ grid: GRID, tickBase: DIFFICULTY.normal }),

    lastTick: 0,
    touchStart: null,

    audio: {
      enabled: true,
      ctx: null,
    },

    ui: {
      // used for swipe sensitivity
      swipeMinPx: 18,
    },

    // Canvas scaling
    view: {
      cssSize: 480,
      dpr: 1,
      cellPx: 20,
    },
  };

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

  function applyTheme(theme){
    document.body.dataset.theme = theme || 'night';
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

  function beep(freq, ms, type='sine', gain=0.05){
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
    // Nice-to-have, non-blocking.
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch {}
    }
  }

  function placeAppleForCore(){
    state.core.apple = placeApple(Math.random, state.core.snake, state.core.grid);
  }

  function reset(){
    const { grid } = state.core;
    const tickBase = state.core.tickBase;
    state.core = createInitialState({ grid, tickBase });
    setScore(0);
    setSpeed(state.core.tickBase / state.core.tickMs);
    btnPause.textContent = '暂停 (Space)';
  }

  function computeCanvasSize(){
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

    // canvas container width based sizing
    const rect = canvas.getBoundingClientRect();
    // Ensure square canvas. Use the smallest of width/height available.
    const cssSize = Math.floor(Math.max(260, Math.min(rect.width || 480, 560)));

    const pxSize = Math.floor(cssSize * dpr);

    canvas.width = pxSize;
    canvas.height = pxSize;

    state.view.cssSize = cssSize;
    state.view.dpr = dpr;
    state.view.cellPx = pxSize / GRID;

    // important: scale drawing units to physical pixels
    ctx.setTransform(1,0,0,1,0,0);
  }

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

  function renderOverlay(textMain, textSub){
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    ctx.font = `800 ${Math.floor(canvas.width * 0.06)}px system-ui, sans-serif`;
    ctx.fillText(textMain, canvas.width/2, canvas.height/2 - 10);
    ctx.font = `500 ${Math.floor(canvas.width * 0.032)}px system-ui, sans-serif`;
    ctx.fillText(textSub, canvas.width/2, canvas.height/2 + 18);
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

    // apple
    const appleColor = getComputedStyle(document.body).getPropertyValue('--apple').trim() || 'rgba(255, 90, 110, 0.95)';
    ctx.save();
    ctx.fillStyle = appleColor;
    const ax = state.core.apple.x * cell;
    const ay = state.core.apple.y * cell;
    drawRoundedRect(ax + cell*0.12, ay + cell*0.12, cell*0.76, cell*0.76, cell*0.22);
    ctx.fill();
    ctx.restore();

    // snake
    const headColor = getComputedStyle(document.body).getPropertyValue('--snake-head').trim() || 'rgba(122,162,255,0.95)';
    const bodyColor = getComputedStyle(document.body).getPropertyValue('--snake-body').trim() || 'rgba(122,162,255,0.70)';

    ctx.save();
    for (let i=0; i<state.core.snake.length; i++){
      const s = state.core.snake[i];
      const x = s.x * cell;
      const y = s.y * cell;
      const isHead = i === 0;
      ctx.fillStyle = isHead ? headColor : bodyColor;
      drawRoundedRect(x + cell*0.08, y + cell*0.08, cell*0.84, cell*0.84, cell*0.24);
      ctx.fill();
    }
    ctx.restore();

    if (state.core.gameOver){
      renderOverlay('游戏结束', '按 R 重开 / 点「重开」');
    } else if (!state.core.running){
      renderOverlay('暂停', '按 Space 继续 / 点「暂停」');
    }
  }

  function finishRun(){
    const runs = loadRuns();
    runs.push({ score: state.core.score, t: Date.now() });
    saveRuns(runs.slice(-50));
    renderRuns();
  }

  function doGameOver(){
    if (state.core.gameOver) return;
    state.core.gameOver = true;
    state.core.running = false;

    beep(130, 220, 'sawtooth', 0.06);
    beep(90, 260, 'triangle', 0.05);
    haptic([40, 30, 60]);

    finishRun();
  }

  function doStep(){
    const r = stepState(state.core);
    state.core = r.state;

    if (r.event === 'gameover_wall' || r.event === 'gameover_self'){
      doGameOver();
      return;
    }

    if (r.event === 'eat' || r.event === 'speedup'){
      if (!state.core.apple) placeAppleForCore();

      setScore(state.core.score);

      if (r.event === 'eat'){
        beep(660, 60, 'sine', 0.04);
        haptic(20);
      } else {
        setSpeed(state.core.tickBase / state.core.tickMs);
        beep(880, 80, 'triangle', 0.03);
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

  function togglePause(){
    if (state.core.gameOver) return;
    state.core.running = !state.core.running;
    btnPause.textContent = state.core.running ? '暂停 (Space)' : '继续 (Space)';
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

    // reset speed to base (friendlier + predictable)
    state.core.tickMs = base;
    setSpeed(state.core.tickBase / state.core.tickMs);
  }

  function requestFullscreen(){
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }

  // Settings UI
  difficultyEl.addEventListener('change', () => {
    applyDifficulty(difficultyEl.value);
    saveSettings({ difficulty: difficultyEl.value, theme: themeEl.value, sound: soundEl.checked });
    reset();
  });

  themeEl.addEventListener('change', () => {
    applyTheme(themeEl.value);
    saveSettings({ difficulty: difficultyEl.value, theme: themeEl.value, sound: soundEl.checked });
  });

  soundEl.addEventListener('change', () => {
    state.audio.enabled = !!soundEl.checked;
    saveSettings({ difficulty: difficultyEl.value, theme: themeEl.value, sound: soundEl.checked });
    if (state.audio.enabled) beep(520, 60, 'sine', 0.03);
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') setDirection(0,-1);
    else if (k === 'arrowdown' || k === 's') setDirection(0,1);
    else if (k === 'arrowleft' || k === 'a') setDirection(-1,0);
    else if (k === 'arrowright' || k === 'd') setDirection(1,0);
    else if (k === ' '){
      e.preventDefault();
      togglePause();
    }
    else if (k === 'r'){
      reset();
    }
  }, { passive: false });

  // Buttons
  btnPause.addEventListener('click', togglePause);
  btnRestart.addEventListener('click', reset);
  btnFullscreen?.addEventListener('click', requestFullscreen);

  // On-screen D-pad
  function bindPress(btn, dx, dy){
    const onPress = (e) => {
      e.preventDefault();
      ensureAudio();
      requestFullscreen();
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

  // Touch: swipe to move on canvas (and tap to pause)
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    state.touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!state.touchStart) return;
    const dx = e.clientX - state.touchStart.x;
    const dy = e.clientY - state.touchStart.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // small tap toggles pause
    if (adx < state.ui.swipeMinPx && ady < state.ui.swipeMinPx){
      togglePause();
      state.touchStart = null;
      return;
    }

    ensureAudio();
    requestFullscreen();

    if (adx > ady){
      setDirection(dx > 0 ? 1 : -1, 0);
    } else {
      setDirection(0, dy > 0 ? 1 : -1);
    }
    state.touchStart = null;
  });

  // Prevent page scroll/zoom gestures on the game area
  for (const el of [canvas, dpadEl].filter(Boolean)){
    el.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    el.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  }

  // Resize handling
  const ro = new ResizeObserver(() => {
    computeCanvasSize();
  });
  ro.observe(canvas);
  window.addEventListener('resize', computeCanvasSize);

  // init
  bestEl.textContent = String(loadBest());

  const s = loadSettings();
  const initialDifficulty = s?.difficulty || 'normal';
  const initialTheme = s?.theme || 'night';
  const initialSound = s?.sound ?? true;

  difficultyEl.value = initialDifficulty;
  themeEl.value = initialTheme;
  soundEl.checked = !!initialSound;
  state.audio.enabled = !!initialSound;

  applyDifficulty(initialDifficulty);
  applyTheme(initialTheme);
  renderRuns();

  computeCanvasSize();
  reset();
  requestAnimationFrame(loop);
})();
