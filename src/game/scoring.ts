import type { DifficultyId } from './types'

export function pointsForApple(params: {
  difficulty: DifficultyId
  wrapWalls: boolean
}): number {
  const baseByDiff: Record<DifficultyId, number> = {
    easy: 10,
    normal: 15,
    hard: 22,
  }

  const base = baseByDiff[params.difficulty]

  // Wrap-walls makes the game easier; compensate by lowering points.
  const wrapFactor = params.wrapWalls ? 0.7 : 1

  return Math.max(1, Math.round(base * wrapFactor))
}
