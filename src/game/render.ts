import type { Vec } from './types'

export type RenderTheme = 'dark' | 'light'

export type RenderOpts = Readonly<{
  grid: number
  theme: RenderTheme
}>

// Draw on an integer backing store and present at a CSS size derived from it.
// This avoids fractional scaling artifacts on iOS Chrome (1px bleed on right/bottom).
export function computeCanvasSizing(params: {
  dpr: number
  cssBox: number
  grid: number
}): { pxSize: number; cssSize: number } {
  const dpr = Math.max(1, Math.min(3, params.dpr))
  const raw = Math.max(params.grid, params.cssBox)
  let pxSize = Math.floor(raw * dpr)
  pxSize = Math.max(params.grid, Math.floor(pxSize / params.grid) * params.grid)
  const cssSize = pxSize / dpr
  return { pxSize, cssSize }
}

export function draw(ctx: CanvasRenderingContext2D, opts: RenderOpts, snake: readonly Vec[], apple: Vec) {
  const { grid, theme } = opts

  const bg = theme === 'dark' ? '#0b1220' : '#f8fafc'
  const gridLine = theme === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(30,41,59,0.08)'
  const snakeFill = theme === 'dark' ? '#60a5fa' : '#2563eb'
  const snakeHead = theme === 'dark' ? '#93c5fd' : '#1d4ed8'
  const appleFill = '#ef4444'

  const w = ctx.canvas.width
  const cell = w / grid

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, w, w)

  // background
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, w)

  // grid lines (half-pixel for crispness)
  ctx.strokeStyle = gridLine
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i <= grid; i++) {
    const p = Math.round(i * cell) + 0.5
    ctx.moveTo(p, 0)
    ctx.lineTo(p, w)
    ctx.moveTo(0, p)
    ctx.lineTo(w, p)
  }
  ctx.stroke()

  // apple
  ctx.fillStyle = appleFill
  roundRect(ctx, apple.x * cell + 2, apple.y * cell + 2, cell - 4, cell - 4, 6)
  ctx.fill()

  // snake
  for (let i = 0; i < snake.length; i++) {
    const p = snake[i]
    ctx.fillStyle = i === snake.length - 1 ? snakeHead : snakeFill
    roundRect(ctx, p.x * cell + 2, p.y * cell + 2, cell - 4, cell - 4, 6)
    ctx.fill()
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
