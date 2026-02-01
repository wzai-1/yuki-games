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

      // Prevent iOS/Chrome from showing focus/selection highlights while swiping.
      if (e.pointerType === 'touch') {
        e.preventDefault()
      }

      tracking = true
      startX = e.clientX
      startY = e.clientY
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!tracking) return
      if (e.pointerType === 'touch') e.preventDefault()

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
    ;(el.style as any).webkitUserSelect = 'none'
    el.style.userSelect = 'none'

    el.addEventListener('pointerdown', onPointerDown, { passive: false })
    el.addEventListener('pointermove', onPointerMove, { passive: false })
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown as any)
      el.removeEventListener('pointermove', onPointerMove as any)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
    }
  }, [el, enabled, onDir])
}
