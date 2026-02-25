import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeGain, makeLPF } from '../audioUtils'

/**
 * gameover — ロックマンリスペクトなゲームオーバーBGM
 * E minor, BPM 90, チップチューン風の哀愁メロディ
 * Square波リード + Triangle波ベースで FC/NES サウンドを再現
 */
export const buildGameover: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  // BPM 90: quarter = 667ms, eighth ≈ 333ms
  const EIGHTH = 333

  const lpf = makeLPF(ctx, 6000)
  lpf.connect(masterGain)

  // --- E minor frequencies ---
  const E2 = 82.41, G2 = 98.00, A2 = 110.00, B2 = 123.47
  const C3 = 130.81, D3 = 146.83
  const E4 = 329.63, Fs4 = 369.99, G4 = 392.00, A4 = 440.00, B4 = 493.88
  const C5 = 523.25, D5 = 587.33, E5 = 659.26

  // --- Lead melody (square wave): 8 bars × 8 eighths = 64 steps ---
  const melody: [number, number][] = [
    // Bar 1 (Em): 冒頭の嘆き
    [E5, 2], [D5, 1], [E5, 1], [B4, 2], [G4, 2],
    // Bar 2 (C): 下降して着地
    [A4, 2], [G4, 1], [A4, 1], [E4, 4],
    // Bar 3 (Am): 少し持ち上がる
    [A4, 2], [B4, 2], [C5, 1], [B4, 1], [A4, 2],
    // Bar 4 (B): トニックへ落下
    [B4, 3], [A4, 1], [G4, 1], [Fs4, 1], [E4, 2],
    // Bar 5 (Em): 冒頭の変奏
    [B4, 2], [G4, 1], [A4, 1], [B4, 2], [G4, 2],
    // Bar 6 (C): 穏やかな動き
    [E4, 2], [G4, 2], [A4, 2], [G4, 2],
    // Bar 7 (D): 希望の上昇
    [Fs4, 2], [A4, 2], [D5, 2], [C5, 2],
    // Bar 8 (Em): 解決
    [B4, 4], [E4, 4],
  ]

  // --- Bass line (triangle wave): half-note motion ---
  const bass: [number, number][] = [
    [E2, 4], [B2, 4],
    [C3, 4], [G2, 4],
    [A2, 4], [E2, 4],
    [B2, 4], [B2, 4],
    [E2, 4], [B2, 4],
    [C3, 4], [G2, 4],
    [D3, 4], [A2, 4],
    [E2, 6], [0, 2],
  ]

  // --- Melody sequencer ---
  let mIdx = 0
  let mWait = 0

  function stepMelody(): void {
    if (mWait > 0) { mWait--; return }
    const [freq, dur] = melody[mIdx % melody.length]
    mWait = dur - 1
    if (freq > 0) {
      const now = ctx.currentTime
      const len = dur * EIGHTH / 1000
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(lpf)
      // チップチューン・エンベロープ: 鋭いアタック → 軽いディケイ
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.045, now + 0.008)
      gain.gain.linearRampToValueAtTime(0.035, now + len * 0.2)
      gain.gain.linearRampToValueAtTime(0.02, now + len * 0.8)
      gain.gain.linearRampToValueAtTime(0, now + len)
      osc.start(now)
      osc.stop(now + len + 0.02)
      nodes.push(osc, gain)
    }
    mIdx++
  }

  // --- Bass sequencer ---
  let bIdx = 0
  let bWait = 0

  function stepBass(): void {
    if (bWait > 0) { bWait--; return }
    const [freq, dur] = bass[bIdx % bass.length]
    bWait = dur - 1
    if (freq > 0) {
      const now = ctx.currentTime
      const len = dur * EIGHTH / 1000
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(lpf)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.06, now + 0.015)
      gain.gain.linearRampToValueAtTime(0.045, now + len - 0.2)
      gain.gain.linearRampToValueAtTime(0, now + len)
      osc.start(now)
      osc.stop(now + len + 0.05)
      nodes.push(osc, gain)
    }
    bIdx++
  }

  stepMelody()
  stepBass()
  timers.push(setInterval(stepMelody, EIGHTH))
  timers.push(setInterval(stepBass, EIGHTH))
  return { nodes, timers }
}
