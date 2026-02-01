import { useEffect } from 'react'
import type { Direction } from '../game/types'

export function useSwipeOnElement(
  el: HTMLElement | null,
  onDir: (d: Direction) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || !el) return

    let startX = 0
    let startY = 0
    let tracking = false

    const threshold = 18

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      tracking = true
      startX = e.clientX
      startY = e.clientY
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!tracking) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return

      tracking = false
      if (Math.abs(dx) > Math.abs(dy)) {
        onDir(dx > 0 ? 'right' : 'left')
      } else {
        onDir(dy > 0 ? 'down' : 'up')
      }
    }

    const onPointerUp = () => {
      tracking = false
    }

    // Important for mobile feel: prevent the page from scrolling while swiping the board.
    el.style.touchAction = 'none'

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
    }
  }, [el, enabled, onDir])
}
