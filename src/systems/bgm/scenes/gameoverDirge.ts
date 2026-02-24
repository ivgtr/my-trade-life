import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeLPF, makeGain } from '../audioUtils'

/**
 * gameoverDirge — ダークソウル風
 * Dm、テンポなし。男声コーラス的ドローン + 30秒かけてゆっくり和声が変化
 */
export const buildGameoverDirge: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []
  const now = ctx.currentTime

  const reverb = makeReverb(ctx, 4.0, 1.0)
  reverb.connect(masterGain)

  // 全体音量LFO（0.05Hz = 20秒周期）
  const masterLfo = ctx.createOscillator()
  const masterLfoG = makeGain(ctx, 0.02)
  const masterMix = makeGain(ctx, 0.9)
  masterLfo.type = 'sine'
  masterLfo.frequency.value = 0.05
  masterLfo.connect(masterLfoG)
  masterLfoG.connect(masterMix.gain)
  masterMix.connect(reverb)
  masterLfo.start(now)
  nodes.push(masterLfo, masterLfoG, masterMix)

  // 基本ドローン: sawtooth D2 + LPF(250, Q=3)
  const droneOsc = ctx.createOscillator()
  const droneLpf = makeLPF(ctx, 250, 3)
  const droneGain = makeGain(ctx, 0.08)
  droneOsc.type = 'sawtooth'
  droneOsc.frequency.setValueAtTime(73.42, now) // D2
  droneOsc.connect(droneLpf)
  droneLpf.connect(droneGain)
  droneGain.connect(masterMix)
  droneOsc.start(now)
  nodes.push(droneOsc, droneLpf, droneGain)

  // ハーモニー: sine F2+A2
  const harmFreqs = [87.31, 110.00] // F2, A2
  harmFreqs.forEach((freq) => {
    const osc = ctx.createOscillator()
    const gain = makeGain(ctx, 0.05)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)
    osc.connect(gain)
    gain.connect(masterMix)
    osc.start(now)
    nodes.push(osc, gain)
  })

  // 上層: sine D4+F4
  const upperFreqs = [293.66, 349.23] // D4, F4
  upperFreqs.forEach((freq) => {
    const osc = ctx.createOscillator()
    const gain = makeGain(ctx, 0.015)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)
    osc.connect(gain)
    gain.connect(masterMix)
    osc.start(now)
    nodes.push(osc, gain)
  })

  // 和声シフト: 30秒周期で Dm → Ebm へクロスフェード往復
  // Dm: D2(73.42), F2(87.31), A2(110.00), D4(293.66), F4(349.23)
  // Ebm: Eb2(77.78), Gb2(92.50), Bb2(116.54), Eb4(311.13), Gb4(369.99)
  const dmFreqs = [73.42, 87.31, 110.00, 293.66, 349.23]
  const ebmFreqs = [77.78, 92.50, 116.54, 311.13, 369.99]

  let shiftDir = 0
  function shiftHarmony(): void {
    shiftDir++
    const target = shiftDir % 2 === 1 ? ebmFreqs : dmFreqs
    const t = ctx.currentTime
    // droneOsc は index 0
    droneOsc.frequency.linearRampToValueAtTime(target[0], t + 5)
    // harm/upperのオシレーターは nodes に入っている順
    let oscIdx = 1
    for (const node of nodes) {
      if (node instanceof OscillatorNode && node !== masterLfo && node !== droneOsc && oscIdx < target.length) {
        (node as OscillatorNode).frequency.linearRampToValueAtTime(target[oscIdx], t + 5)
        oscIdx++
      }
    }
  }

  timers.push(setInterval(shiftHarmony, 30000))
  return { nodes, timers }
}
