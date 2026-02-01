import type { Direction, GameConfig, GameStatus, Vec } from './types'
import { getDifficulty } from './difficulty'

export type GameState = Readonly<{
  grid: number
  snake: Vec[]
  dir: Direction
  queuedDir: Direction | null
  apple: Vec
  growing: number
  score: number
  status: GameStatus
  wrapWalls: boolean
  tickMs: number
}>

const DIR_VEC: Record<Direction, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export function isOpposite(a: Direction, b: Direction): boolean {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  )
}

export function withinBounds(p: Vec, grid: number): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < grid && p.y < grid
}

export function wrap(p: Vec, grid: number): Vec {
  return { x: (p.x + grid) % grid, y: (p.y + grid) % grid }
}

export function eq(a: Vec, b: Vec): boolean {
  return a.x === b.x && a.y === b.y
}

export function contains(list: readonly Vec[], p: Vec): boolean {
  return list.some((v) => eq(v, p))
}

export function placeApple(grid: number, snake: readonly Vec[], rng = Math.random): Vec {
  // Avoid infinite loops for near-full board
  const open: Vec[] = []
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const p = { x, y }
      if (!contains(snake, p)) open.push(p)
    }
  }
  if (open.length === 0) return snake[0] ?? { x: 0, y: 0 }
  return open[Math.floor(rng() * open.length)]
}

export function createInitialState(config: GameConfig, rng = Math.random): GameState {
  const grid = config.grid
  const mid = Math.floor(grid / 2)
  const snake: Vec[] = [
    { x: mid - 1, y: mid },
    { x: mid, y: mid },
    { x: mid + 1, y: mid },
  ]
  const apple = placeApple(grid, snake, rng)
  const diff = getDifficulty(config.difficulty)
  return {
    grid,
    snake,
    dir: 'right',
    queuedDir: null,
    apple,
    growing: 0,
    score: 0,
    status: 'ready',
    wrapWalls: config.wrapWalls,
    tickMs: diff.tickMs,
  }
}

export function queueDirection(state: GameState, next: Direction): GameState {
  if (state.status === 'dead') return state
  if (isOpposite(state.dir, next)) return state
  if (state.queuedDir && isOpposite(state.queuedDir, next)) return state
  return { ...state, queuedDir: next }
}

export function start(state: GameState): GameState {
  if (state.status === 'running') return state
  if (state.status === 'dead') return state
  return { ...state, status: 'running' }
}

export function pause(state: GameState): GameState {
  if (state.status !== 'running') return state
  return { ...state, status: 'paused' }
}

export function resume(state: GameState): GameState {
  if (state.status !== 'paused') return state
  return { ...state, status: 'running' }
}

export function reset(config: GameConfig, rng = Math.random): GameState {
  return createInitialState(config, rng)
}

export function step(state: GameState, rng = Math.random): GameState {
  if (state.status !== 'running') return state

  const dir = state.queuedDir ?? state.dir
  const dv = DIR_VEC[dir]
  const head = state.snake[state.snake.length - 1]
  let next = { x: head.x + dv.x, y: head.y + dv.y }

  if (state.wrapWalls) {
    next = wrap(next, state.grid)
  } else if (!withinBounds(next, state.grid)) {
    return { ...state, status: 'dead', dir, queuedDir: null }
  }

  // Tail cell is allowed if we're not growing (it will move away)
  const willGrow = eq(next, state.apple)
  const body = state.snake
  const tail = body[0]
  const hitsSelf = contains(body, next) && !(eq(next, tail) && !willGrow && state.growing === 0)
  if (hitsSelf) {
    return { ...state, status: 'dead', dir, queuedDir: null }
  }

  let snake = [...body, next]
  let growing = state.growing
  let score = state.score
  let apple = state.apple

  if (willGrow) {
    score += 1
    growing += 2
    apple = placeApple(state.grid, snake, rng)
  }

  if (growing > 0) {
    growing -= 1
  } else {
    snake = snake.slice(1)
  }

  return {
    ...state,
    snake,
    dir,
    queuedDir: null,
    apple,
    growing,
    score,
  }
}
