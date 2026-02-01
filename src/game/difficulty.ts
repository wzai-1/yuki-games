import type { Difficulty, DifficultyId } from './types'

export const DIFFICULTIES: readonly Difficulty[] = [
  { id: 'easy', label: '简单', tickMs: 150 },
  { id: 'normal', label: '普通', tickMs: 110 },
  { id: 'hard', label: '困难', tickMs: 80 },
]

export function getDifficulty(id: DifficultyId): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1]
}
