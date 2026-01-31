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

  const GRID = 24;            // 24x24 cells
  const CELL = canvas.width / GRID;

  const BEST_KEY = 'yuki-snake-best';
  const RUNS_KEY = 'yuki-snake-runs';
  const SETTINGS_KEY = 'yuki-snake-settings';

  const DIFFICULTY = {
    easy: 170,
    normal: 140,
    hard: 110,
  };

  const state = {
    running: true,
    gameOver: false,

    tickMs: 140,
    tickBase: 140,

    snake: [],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    apple: { x: 10, y: 10 },

    score: 0,
    eaten: 0,

    lastTick: 0,
    touchStart: null,

    audio: {
      enabled: true,
      ctx: null,
    },
  };

  function same(a, b){ return a.x === b.x && a.y === b.y; }
  function isOpposite(a, b){ return a.x === -b.x && a.y === -b.y; }

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
    state.score = v;
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

    // iOS may require resume on gesture; best-effort.
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

  function placeApple(){
    while (true){
      const x = Math.floor(Math.random() * GRID);
      const y = Math.floor(Math.random() * GRID);
      if (!state.snake.some(s => s.x === x && s.y === y)){
        state.apple = { x, y };
        return;
      }
    }
  }

  function reset(){
    state.gameOver = false;
    state.running = true;

    state.tickMs = state.tickBase;

    state.dir = { x: 1, y: 0 };
    state.nextDir = { x: 1, y: 0 };

    state.snake = [
      { x: 8, y: 12 },
      { x: 7, y: 12 },
      { x: 6, y: 12 },
    ];

    state.eaten = 0;
    placeApple();
    setScore(0);
    setSpeed(state.tickBase / state.tickMs);

    btnPause.textContent = '暂停 (Space)';
  }

  function drawGrid(){
    const gridColor = getComputedStyle(document.body).getPropertyValue('--grid').trim() || 'rgba(255,255,255,0.08)';
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i=0; i<=GRID; i++){
      ctx.beginPath();
      ctx.moveTo(i*CELL, 0);
      ctx.lineTo(i*CELL, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i*CELL);
      ctx.lineTo(canvas.width, i*CELL);
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
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.fillText(textMain, canvas.width/2, canvas.height/2 - 10);
    ctx.font = '500 14px system-ui, sans-serif';
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

    // apple
    const appleColor = getComputedStyle(document.body).getPropertyValue('--apple').trim() || 'rgba(255, 90, 110, 0.95)';
    ctx.save();
    ctx.fillStyle = appleColor;
    const ax = state.apple.x * CELL;
    const ay = state.apple.y * CELL;
    drawRoundedRect(ax+3, ay+3, CELL-6, CELL-6, 8);
    ctx.fill();
    ctx.restore();

    // snake
    const headColor = getComputedStyle(document.body).getPropertyValue('--snake-head').trim() || 'rgba(122,162,255,0.95)';
    const bodyColor = getComputedStyle(document.body).getPropertyValue('--snake-body').trim() || 'rgba(122,162,255,0.70)';

    ctx.save();
    for (let i=0; i<state.snake.length; i++){
      const s = state.snake[i];
      const x = s.x * CELL;
      const y = s.y * CELL;
      const isHead = i === 0;
      ctx.fillStyle = isHead ? headColor : bodyColor;
      drawRoundedRect(x+2, y+2, CELL-4, CELL-4, 10);
      ctx.fill();
    }
    ctx.restore();

    if (state.gameOver){
      renderOverlay('游戏结束', '按 R 重开');
    } else if (!state.running){
      renderOverlay('暂停', '按 Space 继续');
    }
  }

  function finishRun(){
    const runs = loadRuns();
    runs.push({ score: state.score, t: Date.now() });
    saveRuns(runs.slice(-50));
    renderRuns();
  }

  function gameOver(){
    if (state.gameOver) return;
    state.gameOver = true;
    state.running = false;
    btnPause.textContent = '暂停 (Space)';

    beep(130, 220, 'sawtooth', 0.06);
    beep(90, 260, 'triangle', 0.05);

    finishRun();
  }

  function step(){
    // Apply next direction (disallow reversing)
    if (!isOpposite(state.dir, state.nextDir)){
      state.dir = { ...state.nextDir };
    }

    const head = state.snake[0];
    const newHead = { x: head.x + state.dir.x, y: head.y + state.dir.y };

    // wall collision
    if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID){
      return gameOver();
    }

    // Important: when NOT growing, moving into the cell where the tail currently is should be allowed
    // because the tail will move away this tick.
    const willGrow = same(newHead, state.apple);
    const bodyToCheck = willGrow ? state.snake : state.snake.slice(0, -1);
    if (bodyToCheck.some(seg => seg.x === newHead.x && seg.y === newHead.y)){
      return gameOver();
    }

    state.snake.unshift(newHead);

    if (willGrow){
      state.eaten++;
      setScore(state.score + 10);
      beep(660, 60, 'sine', 0.04);
      placeApple();

      // every 5 apples -> speed up a bit
      if (state.eaten % 5 === 0){
        state.tickMs = Math.max(70, Math.floor(state.tickMs * 0.90));
        setSpeed(state.tickBase / state.tickMs);
        beep(880, 80, 'triangle', 0.03);
      }
    } else {
      state.snake.pop();
    }
  }

  function loop(ts){
    if (!state.lastTick) state.lastTick = ts;
    const elapsed = ts - state.lastTick;

    if (state.running && !state.gameOver && elapsed >= state.tickMs){
      state.lastTick = ts;
      step();
    }

    render();
    requestAnimationFrame(loop);
  }

  function togglePause(){
    if (state.gameOver) return; // game over: use R to restart
    state.running = !state.running;
    btnPause.textContent = state.running ? '暂停 (Space)' : '继续 (Space)';
  }

  function setDirection(dx, dy){
    const next = { x: dx, y: dy };
    if (dx === 0 && dy === 0) return;
    if (isOpposite(state.dir, next)) return;
    state.nextDir = next;
  }

  function applyDifficulty(key){
    const base = DIFFICULTY[key] ?? DIFFICULTY.normal;
    state.tickBase = base;
    if (!state.gameOver){
      // Keep current speed ratio but adjust relative to base
      const mult = state.tickBase / state.tickMs;
      state.tickMs = Math.max(70, Math.floor(state.tickBase / Math.max(1, mult)));
      setSpeed(state.tickBase / state.tickMs);
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
  });

  // Buttons
  btnPause.addEventListener('click', togglePause);
  btnRestart.addEventListener('click', reset);

  // Touch: swipe to move
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

    // small tap toggles pause (but not during game over)
    if (adx < 18 && ady < 18){
      togglePause();
      state.touchStart = null;
      return;
    }

    if (adx > ady){
      setDirection(dx > 0 ? 1 : -1, 0);
    } else {
      setDirection(0, dy > 0 ? 1 : -1);
    }
    state.touchStart = null;
  });

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

  reset();
  requestAnimationFrame(loop);
})();
