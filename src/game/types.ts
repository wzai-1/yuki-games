export type Vec = Readonly<{ x: number; y: number }>

export type DifficultyId = 'easy' | 'normal' | 'hard'

export type Difficulty = Readonly<{
  id: DifficultyId
  label: string
  tickMs: number
}>

export type GameStatus = 'ready' | 'running' | 'paused' | 'dead'

export type Direction = 'up' | 'down' | 'left' | 'right'

export type GameConfig = Readonly<{
  grid: number
  difficulty: DifficultyId
  wrapWalls: boolean
}>

export type GameView = Readonly<{
  score: number
  best: number
  status: GameStatus
  grid: number
  snake: Vec[]
  apple: Vec
  dir: Direction
  tickMs: number
}>
