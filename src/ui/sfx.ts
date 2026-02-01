type SfxName = 'eat' | 'gameover' | 'start'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  return ctx
}

export function primeAudio(): void {
  try {
    const c = getCtx()
    if (c.state === 'suspended') void c.resume()
  } catch {
    // ignore
  }
}

export function playSfx(name: SfxName): void {
  try {
    const c = getCtx()
    const now = c.currentTime

    const osc = c.createOscillator()
    const gain = c.createGain()

    const settings: Record<SfxName, { f0: number; f1: number; dur: number }> = {
      start: { f0: 520, f1: 880, dur: 0.08 },
      eat: { f0: 720, f1: 960, dur: 0.06 },
      gameover: { f0: 220, f1: 110, dur: 0.22 },
    }

    const s = settings[name]
    osc.type = 'square'
    osc.frequency.setValueAtTime(s.f0, now)
    osc.frequency.exponentialRampToValueAtTime(s.f1, now + s.dur)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + s.dur)

    osc.connect(gain)
    gain.connect(c.destination)

    osc.start(now)
    osc.stop(now + s.dur + 0.02)
  } catch {
    // ignore
  }
}

export function haptic(pattern: number | number[]): void {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    // ignore
  }
}
