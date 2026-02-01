import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  placeApple,
  queueDirection,
  step,
  withinBounds,
} from './core'

describe('snake core', () => {
  it('withinBounds works', () => {
    expect(withinBounds({ x: 0, y: 0 }, 6)).toBe(true)
    expect(withinBounds({ x: 5, y: 5 }, 6)).toBe(true)
    expect(withinBounds({ x: -1, y: 0 }, 6)).toBe(false)
    expect(withinBounds({ x: 0, y: 6 }, 6)).toBe(false)
  })

  it('placeApple never places on the snake', () => {
    const snake = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]
    const apple = placeApple(6, snake, () => 0)
    const onSnake = snake.some((s) => s.x === apple.x && s.y === apple.y)
    expect(onSnake).toBe(false)
  })

  it('moving into tail cell is allowed when not growing', () => {
    const config = { grid: 6, difficulty: 'normal' as const, wrapWalls: false }
    const st0 = createInitialState(config)

    // craft state where head moves into current tail, not growing
    const st = {
      ...st0,
      status: 'running' as const,
      snake: [
        { x: 2, y: 2 }, // tail
        { x: 2, y: 3 },
        { x: 1, y: 3 },
        { x: 1, y: 2 }, // head
      ],
      dir: 'up' as const,
      queuedDir: 'left' as const,
      apple: { x: 5, y: 5 },
      growing: 0,
    }

    // queue left, head goes to (0,2) ? Wait: head is (1,2) and left => (0,2), not tail.
    // Instead, move right into tail at (2,2): head (1,2) right => (2,2)
    const st2 = { ...st, dir: 'right' as const, queuedDir: null }
    const st3 = step(st2, () => 0.5)
    expect(st3.status).toBe('running')
    expect(st3.snake[st3.snake.length - 1]).toEqual({ x: 2, y: 2 })
  })

  it('step triggers wall game over', () => {
    const config = { grid: 6, difficulty: 'normal' as const, wrapWalls: false }
    const st0 = createInitialState(config)
    const st = {
      ...st0,
      status: 'running' as const,
      snake: [
        { x: 3, y: 0 },
        { x: 4, y: 0 },
        { x: 5, y: 0 },
      ],
      dir: 'right' as const,
      queuedDir: null,
    }
    const r = step(st)
    expect(r.status).toBe('dead')
  })

  it('eat increases score and relocates apple', () => {
    const config = { grid: 6, difficulty: 'normal' as const, wrapWalls: false }
    const st0 = createInitialState(config, () => 0)
    const st = {
      ...st0,
      status: 'running' as const,
      snake: [
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
      dir: 'right' as const,
      queuedDir: null,
      apple: { x: 3, y: 2 },
      score: 0,
      growing: 0,
    }
    const r = step(st, () => 0.99)
    expect(r.score).toBe(1)
    expect(r.apple).not.toEqual({ x: 3, y: 2 })
  })

  it('queueDirection refuses opposite turns', () => {
    const config = { grid: 6, difficulty: 'normal' as const, wrapWalls: false }
    const st0 = createInitialState(config)
    const st = { ...st0, status: 'running' as const, dir: 'left' as const }
    const r = queueDirection(st, 'right')
    expect(r.queuedDir).toBe(null)
  })
})
