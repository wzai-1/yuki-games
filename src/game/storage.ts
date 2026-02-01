const BEST_KEY = 'yuki_games_snake_best'

export function loadBest(): number {
  try {
    const v = localStorage.getItem(BEST_KEY)
    const n = v ? Number(v) : 0
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

export function saveBest(best: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(best))
  } catch {
    // ignore
  }
}
