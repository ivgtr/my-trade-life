import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeLPF, makeGain } from '../audioUtils'

// 音名→周波数
const N: Record<string, number> = {
  Bb3: 233.08, C4: 261.63, D4: 293.66, Eb4: 311.13, F4: 349.23, G4: 392.00,
  Ab4: 415.30, Bb4: 466.16, Bb5: 932.33,
  Bb2: 116.54, Eb3: 155.56, F3: 174.61, G3: 196.00, Cm: 130.81,
}

/**
 * reportFanfare — FFリザルト風
 * ファンファーレ(約3秒) → リザルトBGMループ
 */
export const buildReportFanfare: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  const reverb = makeReverb(ctx, 2.0, 2.0)
  reverb.connect(masterGain)

  // ファンファーレ（sawtooth + LPF 1800）
  const fanfareLpf = makeLPF(ctx, 1800)
  fanfareLpf.connect(reverb)

  const fanfareNotes: [number, number][] = [
    // [周波数, 開始時刻(秒)]
    [N.Bb4, 0], [N.Bb4, 0.187], [N.Bb4, 0.374], [N.Bb4, 0.561],
    [N.Ab4, 0.937], [N.Bb4, 1.124], [N.Bb4, 1.311],
    [N.Ab4, 1.875], [N.Bb4, 2.062], [N.Bb5, 2.812],
  ]
  const fanfareDurs = [
    0.187, 0.187, 0.187, 0.375,
    0.187, 0.187, 0.562,
    0.187, 0.750, 0.500,
  ]

  const startTime = ctx.currentTime
  fanfareNotes.forEach(([freq, offset], i) => {
    const t = startTime + offset
    const dur = fanfareDurs[i]
    const osc = ctx.createOscillator()
    const gain = makeGain(ctx, 0)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(freq, t)
    osc.connect(gain)
    gain.connect(fanfareLpf)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.06, t + 0.01)
    gain.gain.setValueAtTime(0.06, t + dur - 0.02)
    gain.gain.linearRampToValueAtTime(0, t + dur)
    osc.start(t)
    osc.stop(t + dur + 0.01)
    nodes.push(osc, gain)
  })

  // リザルトBGM（3.3秒後に開始）
  const resultDelay = 3300
  const resultInterval = 500

  // リザルトメロディ
  const resultMelody = [
    N.F4, 0, N.D4, 0, N.Bb3, 0, N.C4, N.D4,
    N.Eb4, N.F4, 0, N.D4, N.Bb3, 0, 0, 0,
    N.G4, 0, N.F4, 0, N.Eb4, 0, N.D4, N.C4,
    N.D4, N.Eb4, 0, N.F4, N.Bb3, 0, 0, 0,
  ]
  let resultStep = 0

  // リザルトコード進行（各2拍=1000ms、8コード）
  // Bb→Eb→F→Bb → Gm→Cm→F→Bb
  const resultChords = [
    [N.Bb2, N.D4, N.F4],         // Bb
    [N.Eb3, N.G3, N.Bb3],        // Eb
    [N.F3, N.Ab4 / 2, N.C4],     // F (A3=220)
    [N.Bb2, N.D4, N.F4],         // Bb
    [N.G3, N.Bb3, N.D4],         // Gm
    [N.Cm, N.Eb3, N.G3],         // Cm
    [N.F3, N.Ab4 / 2, N.C4],     // F
    [N.Bb2, N.D4, N.F4],         // Bb
  ]
  let chordStep = 0

  function playResultNote(): void {
    const freq = resultMelody[resultStep % resultMelody.length]
    if (freq > 0) {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48)
      osc.start(now)
      osc.stop(now + 0.5)
      nodes.push(osc, gain)
    }

    // コード（2ステップに1回=1000ms）
    if (resultStep % 2 === 0) {
      const now = ctx.currentTime
      const chord = resultChords[(chordStep++) % resultChords.length]
      chord.forEach((freq) => {
        const osc = ctx.createOscillator()
        const gain = makeGain(ctx, 0)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)
        osc.connect(gain)
        gain.connect(reverb)
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.035, now + 0.03)
        gain.gain.linearRampToValueAtTime(0.02, now + 0.8)
        gain.gain.linearRampToValueAtTime(0, now + 1.0)
        osc.start(now)
        osc.stop(now + 1.05)
        nodes.push(osc, gain)
      })
    }
    resultStep++
  }

  const t = setTimeout(() => {
    timers.push(setInterval(playResultNote, resultInterval))
  }, resultDelay)
  timers.push(t)

  return { nodes, timers }
}
