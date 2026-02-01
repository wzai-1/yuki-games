import type { Vec } from './types'

export type RenderTheme = 'dark'

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
  const { grid } = opts

  // Dark-only theme (keeps UI simple & consistent)
  const bg = '#0b1220'
  const gridLine = 'rgba(148,163,184,0.12)'

  const snakeBodyFill = '#60a5fa'
  const snakeHeadFill = '#93c5fd'
  const snakeOutline = 'rgba(15,23,42,0.55)'

  const appleFill = '#ef4444'
  const appleHighlight = 'rgba(255,255,255,0.25)'
  const leafFill = '#22c55e'
  const stemFill = '#92400e'

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

  // apple (clearer icon: body + highlight + leaf)
  drawApple(ctx, { x: apple.x * cell, y: apple.y * cell, cell }, {
    fill: appleFill,
    highlight: appleHighlight,
    leaf: leafFill,
    stem: stemFill,
    outline: snakeOutline,
  })

  // snake (clearer head & tail)
  for (let i = 0; i < snake.length; i++) {
    const p = snake[i]
    const isHead = i === snake.length - 1
    const isTail = i === 0

    if (isHead) {
      drawHead(ctx, { x: p.x * cell, y: p.y * cell, cell }, {
        fill: snakeHeadFill,
        outline: snakeOutline,
      })
    } else if (isTail) {
      drawTail(ctx, { x: p.x * cell, y: p.y * cell, cell }, {
        fill: snakeBodyFill,
        outline: snakeOutline,
      })
    } else {
      drawBody(ctx, { x: p.x * cell, y: p.y * cell, cell }, {
        fill: snakeBodyFill,
        outline: snakeOutline,
      })
    }
  }
}

type CellBox = Readonly<{ x: number; y: number; cell: number }>

type Paint = Readonly<{ fill: string; outline: string }>

type ApplePaint = Readonly<{
  fill: string
  highlight: string
  leaf: string
  stem: string
  outline: string
}>

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function drawBody(ctx: CanvasRenderingContext2D, box: CellBox, paint: Paint) {
  const pad = Math.max(2, Math.floor(box.cell * 0.12))
  const r = Math.max(6, Math.floor(box.cell * 0.28))
  const x = box.x + pad
  const y = box.y + pad
  const w = box.cell - pad * 2

  ctx.fillStyle = paint.fill
  roundRect(ctx, x, y, w, w, r)
  ctx.fill()

  ctx.strokeStyle = paint.outline
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawTail(ctx: CanvasRenderingContext2D, box: CellBox, paint: Paint) {
  const pad = Math.max(3, Math.floor(box.cell * 0.16))
  const r = Math.max(6, Math.floor(box.cell * 0.26))
  const x = box.x + pad
  const y = box.y + pad
  const w = box.cell - pad * 2

  ctx.fillStyle = paint.fill
  roundRect(ctx, x, y, w, w, r)
  ctx.fill()

  // tail marker (tiny notch)
  ctx.strokeStyle = paint.outline
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + w * 0.25, y + w * 0.72)
  ctx.lineTo(x + w * 0.75, y + w * 0.72)
  ctx.stroke()
}

function drawHead(ctx: CanvasRenderingContext2D, box: CellBox, paint: Paint) {
  const pad = Math.max(2, Math.floor(box.cell * 0.1))
  const r = Math.max(7, Math.floor(box.cell * 0.32))
  const x = box.x + pad
  const y = box.y + pad
  const w = box.cell - pad * 2

  ctx.fillStyle = paint.fill
  roundRect(ctx, x, y, w, w, r)
  ctx.fill()

  ctx.strokeStyle = paint.outline
  ctx.lineWidth = 2
  ctx.stroke()

  // eyes
  ctx.fillStyle = 'rgba(15,23,42,0.75)'
  const eyeR = Math.max(2, Math.floor(box.cell * 0.08))
  ctx.beginPath()
  ctx.arc(x + w * 0.35, y + w * 0.42, eyeR, 0, Math.PI * 2)
  ctx.arc(x + w * 0.65, y + w * 0.42, eyeR, 0, Math.PI * 2)
  ctx.fill()
}

function drawApple(ctx: CanvasRenderingContext2D, box: CellBox, paint: ApplePaint) {
  const cx = box.x + box.cell / 2
  const cy = box.y + box.cell / 2
  const r = box.cell * 0.34

  // body
  ctx.fillStyle = paint.fill
  ctx.beginPath()
  ctx.arc(cx, cy + box.cell * 0.06, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = paint.outline
  ctx.lineWidth = 2
  ctx.stroke()

  // highlight
  ctx.fillStyle = paint.highlight
  ctx.beginPath()
  ctx.arc(cx - r * 0.35, cy - r * 0.25, r * 0.35, 0, Math.PI * 2)
  ctx.fill()

  // stem
  ctx.strokeStyle = paint.stem
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx, cy - r * 1.0)
  ctx.lineTo(cx, cy - r * 0.55)
  ctx.stroke()

  // leaf
  ctx.fillStyle = paint.leaf
  ctx.beginPath()
  ctx.ellipse(cx + r * 0.35, cy - r * 0.8, r * 0.35, r * 0.22, -0.5, 0, Math.PI * 2)
  ctx.fill()
}
