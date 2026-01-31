// Core snake game logic (pure-ish, no DOM). Used by app.js and unit tests.

// Smaller grid for better mobile readability (and fewer edge artifacts on iOS)
export const DEFAULT_GRID = 18;

export const DIFFICULTY = {
  easy: 170,
  normal: 140,
  hard: 110,
};

export function isOpposite(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

export function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function withinBounds(p, grid = DEFAULT_GRID) {
  return p.x >= 0 && p.x < grid && p.y >= 0 && p.y < grid;
}

export function nextHead(snake, dir) {
  const head = snake[0];
  return { x: head.x + dir.x, y: head.y + dir.y };
}

export function collidesWithBody(newHead, snake, willGrow) {
  // When not growing, moving into the current tail cell is allowed
  // because the tail will move away on this tick.
  const bodyToCheck = willGrow ? snake : snake.slice(0, -1);
  return bodyToCheck.some(seg => seg.x === newHead.x && seg.y === newHead.y);
}

export function stepState(state) {
  // Returns { state, event } where event is one of:
  // 'none' | 'eat' | 'speedup' | 'gameover_wall' | 'gameover_self'

  const grid = state.grid;

  // apply nextDir (cannot reverse)
  const dir = isOpposite(state.dir, state.nextDir) ? state.dir : state.nextDir;

  const newHead = nextHead(state.snake, dir);

  if (!withinBounds(newHead, grid)) {
    return { state: { ...state, dir, gameOver: true, running: false }, event: 'gameover_wall' };
  }

  const willGrow = sameCell(newHead, state.apple);
  if (collidesWithBody(newHead, state.snake, willGrow)) {
    return { state: { ...state, dir, gameOver: true, running: false }, event: 'gameover_self' };
  }

  const snake = [newHead, ...state.snake];
  let apple = state.apple;
  let eaten = state.eaten;
  let score = state.score;
  let tickMs = state.tickMs;
  let event = 'none';

  if (willGrow) {
    eaten += 1;
    score += 10;
    event = 'eat';

    // apple will be placed by caller (needs RNG + snake)
    apple = null;

    if (eaten % 5 === 0) {
      tickMs = Math.max(70, Math.floor(tickMs * 0.9));
      event = 'speedup';
    }
  } else {
    snake.pop();
  }

  return {
    state: {
      ...state,
      dir,
      snake,
      apple,
      eaten,
      score,
      tickMs,
    },
    event,
  };
}

export function placeApple(rng, snake, grid = DEFAULT_GRID) {
  // rng: () => number in [0,1)
  // note: worst-case loop is fine for small grids.
  for (let i = 0; i < grid * grid + 10; i++) {
    const x = Math.floor(rng() * grid);
    const y = Math.floor(rng() * grid);
    if (!snake.some(s => s.x === x && s.y === y)) return { x, y };
  }
  // fallback: find any empty cell
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      if (!snake.some(s => s.x === x && s.y === y)) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

export function createInitialState({
  grid = DEFAULT_GRID,
  tickBase = DIFFICULTY.normal,
  rng = Math.random,
} = {}) {
  // Place the initial snake relative to the grid size (works for smaller grids).
  const y = Math.floor(grid / 2);
  const x0 = Math.max(3, Math.floor(grid / 3));

  const snake = [
    { x: x0, y },
    { x: x0 - 1, y },
    { x: x0 - 2, y },
  ];

  const apple = placeApple(rng, snake, grid);
  return {
    grid,
    running: true,
    gameOver: false,
    tickBase,
    tickMs: tickBase,
    snake,
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    apple,
    score: 0,
    eaten: 0,
  };
}
