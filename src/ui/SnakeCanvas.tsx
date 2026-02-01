import { useEffect, useRef } from 'react'
import type { GameState } from '../game/core'
import { computeCanvasSizing, draw, type RenderTheme } from '../game/render'

export default function SnakeCanvas(props: {
  state: GameState
  theme: RenderTheme
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const grid = props.state.grid

  useEffect(() => {
    const wrapEl = wrapRef.current
    const canvasEl = canvasRef.current
    if (!wrapEl || !canvasEl) return

    const ctx = canvasEl.getContext('2d')
    if (!ctx) return

    const recalc = () => {
      const rect = wrapEl.getBoundingClientRect()
      const cssBox = Math.floor(rect.width)
      const { pxSize, cssSize } = computeCanvasSizing({
        dpr: window.devicePixelRatio || 1,
        cssBox,
        grid,
      })

      canvasEl.width = pxSize
      canvasEl.height = pxSize

      // Force CSS size from backing-store size to avoid fractional scaling artifacts.
      wrapEl.style.width = `${cssSize}px`
      wrapEl.style.height = `${cssSize}px`

      // Additionally inset by 1px to guarantee nothing touches the edge on iOS.
      canvasEl.style.margin = '1px'
      canvasEl.style.width = `calc(${cssSize}px - 2px)`
      canvasEl.style.height = `calc(${cssSize}px - 2px)`
    }

    recalc()

    const ro = new ResizeObserver(() => recalc())
    ro.observe(wrapEl)

    const onOrient = () => recalc()
    window.addEventListener('orientationchange', onOrient)

    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', onOrient)
    }
  }, [grid])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    draw(ctx, { grid: props.state.grid, theme: props.theme }, props.state.snake, props.state.apple)
  }, [props.state, props.theme])

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-xl bg-slate-900/40 ring-1 ring-white/10"
    >
      <canvas ref={canvasRef} className="block touch-none select-none" />
      {/* overlay frame for crisp border (separate from canvas pixels) */}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/10" />
    </div>
  )
}
