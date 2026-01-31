(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const speedEl = document.getElementById('speed');
  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');

  const GRID = 24;            // 24x24 cells
  const CELL = canvas.width / GRID;

  const BEST_KEY = 'yuki-snake-best';

  const state = {
    running: true,
    tickMs: 140,
    tickBase: 140,
    frameHandle: null,
    snake: [],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    apple: { x: 10, y: 10 },
    score: 0,
    eaten: 0,
    lastTick: 0,
    touchStart: null,
  };

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function loadBest(){
    const v = Number(localStorage.getItem(BEST_KEY) || '0');
    return Number.isFinite(v) ? v : 0;
  }

  function saveBest(v){
    localStorage.setItem(BEST_KEY, String(v));
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

  function reset(){
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
  }

  function same(a,b){ return a.x === b.x && a.y === b.y; }

  function isOpposite(a, b){ return a.x === -b.x && a.y === -b.y; }

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

  function drawGrid(){
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
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
    ctx.save();
    ctx.fillStyle = 'rgba(255, 90, 110, 0.95)';
    const ax = state.apple.x * CELL;
    const ay = state.apple.y * CELL;
    drawRoundedRect(ax+3, ay+3, CELL-6, CELL-6, 8);
    ctx.fill();
    ctx.restore();

    // snake
    ctx.save();
    for (let i=0; i<state.snake.length; i++){
      const s = state.snake[i];
      const x = s.x * CELL;
      const y = s.y * CELL;
      const isHead = i === 0;
      ctx.fillStyle = isHead ? 'rgba(122,162,255,0.95)' : 'rgba(122,162,255,0.70)';
      drawRoundedRect(x+2, y+2, CELL-4, CELL-4, 10);
      ctx.fill();
    }
    ctx.restore();

    if (!state.running){
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0,0,canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '700 26px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂停', canvas.width/2, canvas.height/2 - 6);
      ctx.font = '500 14px system-ui, sans-serif';
      ctx.fillText('按 Space 继续', canvas.width/2, canvas.height/2 + 18);
      ctx.restore();
    }
  }

  function gameOver(){
    state.running = false;
    btnPause.textContent = '继续 (Space)';

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width/2, canvas.height/2 - 10);
    ctx.font = '500 14px system-ui, sans-serif';
    ctx.fillText('按 R 重开', canvas.width/2, canvas.height/2 + 18);
    ctx.restore();
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
    // self collision
    if (state.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)){
      return gameOver();
    }

    state.snake.unshift(newHead);

    if (same(newHead, state.apple)){
      state.eaten++;
      setScore(state.score + 10);
      placeApple();

      // every 5 apples -> speed up a bit
      if (state.eaten % 5 === 0){
        state.tickMs = Math.max(70, Math.floor(state.tickMs * 0.90));
        setSpeed(state.tickBase / state.tickMs);
      }
    } else {
      state.snake.pop();
    }
  }

  function loop(ts){
    if (!state.lastTick) state.lastTick = ts;
    const elapsed = ts - state.lastTick;

    if (state.running && elapsed >= state.tickMs){
      state.lastTick = ts;
      step();
    }

    render();
    state.frameHandle = requestAnimationFrame(loop);
  }

  function togglePause(){
    state.running = !state.running;
    btnPause.textContent = state.running ? '暂停 (Space)' : '继续 (Space)';
  }

  function setDirection(dx, dy){
    const next = { x: dx, y: dy };
    if (dx === 0 && dy === 0) return;
    if (isOpposite(state.dir, next)) return;
    state.nextDir = next;
  }

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
      btnPause.textContent = '暂停 (Space)';
    }
  });

  // Buttons
  btnPause.addEventListener('click', togglePause);
  btnRestart.addEventListener('click', () => {
    reset();
    btnPause.textContent = '暂停 (Space)';
  });

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

    // small tap toggles pause
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
  reset();
  state.frameHandle = requestAnimationFrame(loop);
})();
