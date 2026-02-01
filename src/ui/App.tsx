import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DifficultyId } from '../game/types'
import { DIFFICULTIES, getDifficulty } from '../game/difficulty'
import {
  createInitialState,
  pause,
  queueDirection,
  reset,
  resume,
  start,
  step,
  type GameState,
} from '../game/core'
import { loadBest, saveBest } from '../game/storage'
import SnakeCanvas from './SnakeCanvas'
import Segmented from './components/Segmented'
import Toggle from './components/Toggle'
import { useKeyboardInput, useSwipeInput } from './useInput'

const GRID = 18

export default function App() {
  const [difficulty, setDifficulty] = useState<DifficultyId>('normal')
  const [wrapWalls, setWrapWalls] = useState(false)
  const [sound, setSound] = useState(false)
  const [showHelp, setShowHelp] = useState(false) // default collapsed

  const config = useMemo(
    () => ({ grid: GRID, difficulty, wrapWalls }),
    [difficulty, wrapWalls],
  )

  const [best, setBest] = useState(() => loadBest())
  const [state, setState] = useState<GameState>(() => createInitialState(config))

  // restart when config changes
  useEffect(() => {
    setState((s) => {
      const next = reset(config)
      return { ...next, status: s.status === 'running' ? 'running' : 'ready' }
    })
  }, [config])

  useEffect(() => {
    if (state.score > best) {
      setBest(state.score)
      saveBest(state.score)
    }
  }, [state.score, best])

  const tickMs = getDifficulty(difficulty).tickMs

  // game loop (setInterval is ok at this scale)
  const loopRef = useRef<number | null>(null)
  useEffect(() => {
    if (loopRef.current) {
      window.clearInterval(loopRef.current)
      loopRef.current = null
    }

    loopRef.current = window.setInterval(() => {
      setState((s) => step(s))
    }, tickMs)

    return () => {
      if (loopRef.current) window.clearInterval(loopRef.current)
      loopRef.current = null
    }
  }, [tickMs])

  const onDir = useCallback((d: import('../game/types').Direction) => {
    setState((s) => queueDirection(s, d))
    setState((s) => (s.status === 'paused' ? resume(s) : s))
  }, [])

  const togglePause = useCallback(() => {
    setState((s) => {
      if (s.status === 'running') return pause(s)
      if (s.status === 'paused') return resume(s)
      return s
    })
  }, [])

  useKeyboardInput(onDir, togglePause)
  useSwipeInput(onDir)

  const restartAndStart = useCallback(() => {
    setState(() => start(createInitialState(config)))
  }, [config])

  useEffect(() => {
    if (!sound) return
    // tiny beep on eat/death: skip for now (keeps stack simple)
  }, [sound])

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[920px] px-3 py-4">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight">贪吃蛇</h1>
            <p className="text-[11px] text-slate-400">键盘 / 手机滑动都支持</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
              onClick={() => setShowHelp((v) => !v)}
            >
              {showHelp ? '收起说明' : '玩法说明'}
            </button>

            {state.status === 'ready' ? (
              <button
                type="button"
                className="rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-xs text-emerald-100 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25"
                onClick={() => setState((s) => start(s))}
              >
                开始
              </button>
            ) : null}

            {state.status === 'paused' ? (
              <button
                type="button"
                className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
                onClick={() => setState((s) => resume(s))}
              >
                继续
              </button>
            ) : null}

            {state.status === 'running' ? (
              <button
                type="button"
                className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
                onClick={() => setState((s) => pause(s))}
              >
                暂停
              </button>
            ) : null}

            {state.status === 'dead' ? (
              <button
                type="button"
                className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
                onClick={restartAndStart}
              >
                重来
              </button>
            ) : null}
          </div>
        </header>

        {showHelp ? (
          <div className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-5 text-slate-200 ring-1 ring-white/10">
            <ul className="list-disc pl-4">
              <li>键盘：方向键 / WASD；空格暂停/继续</li>
              <li>手机：在屏幕上滑动控制方向（任意区域）</li>
              <li>吃到苹果 +1 分，蛇变长；撞墙/撞到自己游戏结束</li>
            </ul>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_280px]">
          <div className="flex flex-col items-center">
            <SnakeCanvas
              state={state}
              overlay={
                state.status === 'ready' ? (
                  <div className="w-full max-w-[420px] rounded-2xl bg-slate-950/80 p-4 text-center ring-1 ring-white/15 backdrop-blur">
                    <div className="text-sm font-semibold">准备出发！</div>
                    <div className="mt-1 text-xs leading-5 text-slate-300">
                      点 <span className="text-emerald-200">开始</span> 开局。键盘用方向键/WASD；手机直接滑动。
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-100 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25"
                        onClick={() => setState((s) => start(s))}
                      >
                        开始
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
                        onClick={() => setShowHelp(true)}
                      >
                        玩法说明
                      </button>
                    </div>
                  </div>
                ) : state.status === 'dead' ? (
                  <div className="w-full max-w-[420px] rounded-2xl bg-slate-950/80 p-4 text-center ring-1 ring-white/15 backdrop-blur">
                    <div className="text-sm font-semibold">哎呀，撞上啦！</div>
                    <div className="mt-1 text-xs text-slate-300">本局 {state.score} 分 · 最高 {best} 分</div>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-100 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25"
                        onClick={restartAndStart}
                      >
                        再来一局
                      </button>
                    </div>
                  </div>
                ) : null
              }
            />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <ScorePill label="分数" value={state.score} />
              <ScorePill label="最高" value={best} />            </div>
          </div>

          <aside className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="grid gap-3">
              <Row label="难度">
                <Segmented
                  value={difficulty}
                  onChange={(v) => setDifficulty(v)}
                  options={DIFFICULTIES.map((d) => ({ value: d.id, label: d.label }))}
                />
              </Row>

              <Row label="设置">
                <div className="flex flex-wrap items-center gap-3">
                  <Toggle checked={wrapWalls} onChange={setWrapWalls} label="穿墙" />
                  <Toggle checked={sound} onChange={setSound} label="音效" />
                </div>
              </Row>

              <div className="rounded-lg bg-black/20 p-2 text-[11px] text-slate-300">
                小贴士：先选好难度/设置，再点开始～
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function Row(props: { label: string; children: any }) {
  return (
    <div className="grid grid-cols-[60px_1fr] items-center gap-2">
      <div className="text-xs text-slate-300">{props.label}</div>
      <div className="min-w-0">{props.children}</div>
    </div>
  )
}

function ScorePill(props: { label: string; value: any }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs ring-1 ring-white/10">
      <span className="text-slate-400">{props.label}</span>
      <span className="font-semibold tabular-nums">{props.value}</span>
    </div>
  )
}

