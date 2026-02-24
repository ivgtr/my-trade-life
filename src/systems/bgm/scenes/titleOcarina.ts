import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain } from '../audioUtils'

// 音名→周波数
const N: Record<string, number> = {
  D3: 146.83, A3: 220.00, G3: 196.00, D4: 293.66, E4: 329.63, A4: 440.00,
  'F#4': 369.99, D5: 587.33, E5: 659.25, 'F#5': 739.99, A5: 880.00,
  G4: 392.00, B4: 493.88, G5: 783.99, 'F#5h': 739.99,
}

/**
 * titleOcarina — ゼルダ風
 * 4フレーズ構成（A-B-A'-C）、オカリナ的純音
 */
export const buildTitleOcarina: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  const reverb = makeReverb(ctx, 3.5, 1.2)
  reverb.connect(masterGain)

  // メロディ（0=休符、400ms間隔）
  const melody = [
    // A (8音)
    N.D5, N.A4, N['F#4'], N.A4, N.D5, N.E5, N['F#5'], N.D5,
    // 休符(3)
    0, 0, 0,
    // B (8音)
    N.B4, N.A4, N.G4, N['F#4'], N.E4, N.D4, N.E4, N.G4,
    // 休符(3)
    0, 0, 0,
    // A' (8音)
    N.D5, N.A4, N['F#4'], N.A4, N.D5, N.E5, N['F#5'], N.A5,
    // 休符(3)
    0, 0, 0,
    // C (8音)
    N.G5, N['F#5h'], N.E5, N.D5, N.B4, N.A4, N.D4, N.D5,
    // 休符(3)
    0, 0, 0,
  ]
  let melStep = 0

  function playMelody(): void {
    const freq = melody[melStep % melody.length]
    if (freq > 0) {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)

      // オカリナ的な柔らかいアタック
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.10, now + 0.06)
      gain.gain.linearRampToValueAtTime(0.08, now + 0.25)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55)

      osc.start(now)
      osc.stop(now + 0.6)
      nodes.push(osc, gain)
    }
    melStep++
  }

  // パッド（8秒周期でローテーション）
  // D3+A3 → G3+D4 → D3+A3 → A3+E4
  const padChords = [
    [N.D3, N.A3],
    [N.G3, N.D4],
    [N.D3, N.A3],
    [N.A3, N.E4],
  ]
  let padIdx = 0
  const padOscs: OscillatorNode[] = []

  function startPad(): void {
    const now = ctx.currentTime
    const chord = padChords[0]
    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.05, now + 1.0)
      osc.start(now)
      nodes.push(osc, gain)
      padOscs.push(osc)
    })
  }

  function switchPad(): void {
    padIdx++
    const chord = padChords[padIdx % padChords.length]
    const now = ctx.currentTime
    padOscs.forEach((osc, i) => {
      osc.frequency.linearRampToValueAtTime(chord[i], now + 0.8)
    })
  }

  startPad()
  timers.push(setInterval(playMelody, 400))
  timers.push(setInterval(switchPad, 8000))
  return { nodes, timers }
}
