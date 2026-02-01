import { useEffect } from 'react'
import type { Direction } from '../game/types'

function keyToDir(key: string): Direction | null {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'up'
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'down'
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'left'
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'right'
    default:
      return null
  }
}

export function useKeyboardInput(onDir: (d: Direction) => void, onTogglePause: () => void) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        onTogglePause()
        return
      }
      const dir = keyToDir(e.key)
      if (dir) {
        e.preventDefault()
        onDir(dir)
      }
    }
    window.addEventListener('keydown', onKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onDir, onTogglePause])
}

// (Deprecated) old global swipe listener; kept empty to avoid breaking imports.
export function useSwipeInput(_onDir: (d: Direction) => void) {
  // no-op
}
