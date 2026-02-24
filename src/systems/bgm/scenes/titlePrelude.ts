import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeLPF, makeGain } from '../audioUtils'

// 音名→周波数
const N: Record<string, number> = {
  C3: 130.81, E3: 164.81, G3: 196.00, A2: 110.00, A3: 220.00, B3: 246.94,
  C4: 261.63, E4: 329.63, G4: 392.00, B4: 493.88,
  C5: 523.25, E5: 659.25, G5: 783.99, B5: 987.77,
  C6: 1046.50, E6: 1318.51, G6: 1567.98, B6: 1975.53, A6: 1760.00,
}

/**
 * titlePrelude — FFプレリュード風
 * 3オクターブにわたる上昇→下降アルペジオ + 持続パッド
 */
export const buildTitlePrelude: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  const reverb = makeReverb(ctx, 3.0, 1.5)
  const lpf = makeLPF(ctx, 4000)
  reverb.connect(lpf)
  lpf.connect(masterGain)

  // 32音アルペジオ（上昇16音 + 下降16音）
  const arpNotes = [
    // 上昇
    N.C3, N.E3, N.G3, N.B3, N.C4, N.E4, N.G4, N.B4,
    N.C5, N.E5, N.G5, N.B5, N.C6, N.E6, N.G6, N.B6,
    // 下降
    N.A6, N.G6, N.E6, N.C6, N.B5, N.G5, N.E5, N.C5,
    N.B4, N.G4, N.E4, N.C4, N.B3, N.G3, N.E3, N.C3,
  ]
  let arpStep = 0

  function playArp(): void {
    const freq = arpNotes[arpStep % arpNotes.length]
    const now = ctx.currentTime

    // triangle + sine倍音(30%)
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = makeGain(ctx, 0)

    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(freq, now)

    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(freq, now)
    const g2 = makeGain(ctx, 0.3)
    osc2.connect(g2)

    osc1.connect(gain)
    g2.connect(gain)
    gain.connect(reverb)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.06, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

    osc1.start(now)
    osc1.stop(now + 0.85)
    osc2.start(now)
    osc2.stop(now + 0.85)
    nodes.push(osc1, osc2, gain, g2)
    arpStep++
  }

  // 持続パッド（8小節ごとにC→Amに切替）
  // CMaj: C3+E3+G3、Am: A2+C3+E3
  const padChords = [
    [N.C3, N.E3, N.G3],
    [N.A2, N.C3, N.E3],
  ]
  let padIdx = 0
  const padDuration = 32 * 150 / 1000 // ≈4.8秒（32音1周期）

  const padOscs: OscillatorNode[] = []
  const padGains: GainNode[] = []

  function startPad(): void {
    const now = ctx.currentTime
    const chord = padChords[0]
    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      const lfo = ctx.createOscillator()
      const lfoGain = makeGain(ctx, 0.003)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      lfo.type = 'sine'
      lfo.frequency.value = 0.15
      lfo.connect(lfoGain)
      lfoGain.connect(gain.gain)

      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.04, now + 1.0)

      osc.start(now)
      lfo.start(now)
      nodes.push(osc, gain, lfo, lfoGain)
      padOscs.push(osc)
      padGains.push(gain)
    })
  }

  function switchPad(): void {
    padIdx++
    const chord = padChords[padIdx % padChords.length]
    const now = ctx.currentTime
    padOscs.forEach((osc, i) => {
      osc.frequency.linearRampToValueAtTime(chord[i], now + 0.5)
    })
  }

  startPad()
  timers.push(setInterval(playArp, 150))
  timers.push(setInterval(switchPad, padDuration * 1000))
  return { nodes, timers }
}
