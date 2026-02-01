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

export function useSwipeInput(onDir: (d: Direction) => void) {
  useEffect(() => {
    let startX = 0
    let startY = 0
    let tracking = false

    const threshold = 22

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      tracking = true
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const onMove = (e: TouchEvent) => {
      if (!tracking || e.touches.length !== 1) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return

      tracking = false
      if (Math.abs(dx) > Math.abs(dy)) {
        onDir(dx > 0 ? 'right' : 'left')
      } else {
        onDir(dy > 0 ? 'down' : 'up')
      }
    }

    const onEnd = () => {
      tracking = false
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)

    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [onDir])
}
