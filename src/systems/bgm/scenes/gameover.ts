import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeLPF, makeGain } from '../audioUtils'

/**
 * gameover — 不気味なドローン・LFO変調
 * 音楽的特徴: 低周波の不協和音・ゆっくりとした揺らぎ・金属的な響き
 */
export const buildGameover: BGMBuilder = (ctx, masterGain, isActive) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []
  const now = ctx.currentTime

  // 不協和音ドローン（tritone: A + D#）
  const droneFreqs = [55, 77.78, 103.83, 146.83]  // A1, D#2, G#2, D3
  droneFreqs.forEach((freq, i) => {
    const osc   = ctx.createOscillator()
    const gain  = makeGain(ctx, 0.07 - i * 0.01)
    const lfo   = ctx.createOscillator()
    const lfoG  = makeGain(ctx, freq * 0.012)
    lfo.type            = 'sine'
    lfo.frequency.value = 0.08 + i * 0.03  // 非常にゆっくり揺れる
    lfo.connect(lfoG)
    lfoG.connect(osc.frequency)
    osc.type = i % 2 === 0 ? 'sawtooth' : 'square'
    osc.frequency.setValueAtTime(freq, now)
    const lpf = makeLPF(ctx, 400 + i * 80, 4)
    osc.connect(lpf)
    lpf.connect(gain)
    gain.connect(masterGain)
    osc.start(now)
    lfo.start(now)
    nodes.push(osc, gain, lfo, lfoG, lpf)
  })

  // 金属的な高音（断続的にうめくような）
  const metalOsc  = ctx.createOscillator()
  const metalGain = makeGain(ctx, 0)
  const metalLfo  = ctx.createOscillator()
  const metalLfoG = makeGain(ctx, 8)
  metalLfo.type            = 'sine'
  metalLfo.frequency.value = 0.22
  metalLfo.connect(metalLfoG)
  metalLfoG.connect(metalGain.gain)
  metalOsc.type            = 'sine'
  metalOsc.frequency.value = 523.25  // C5
  const metalReverb = makeReverb(ctx, 3.5, 1.0)
  metalOsc.connect(metalReverb)
  metalReverb.connect(metalGain)
  metalGain.connect(masterGain)
  metalGain.gain.setValueAtTime(0.015, now)
  metalOsc.start(now)
  metalLfo.start(now)
  nodes.push(metalOsc, metalGain, metalLfo, metalLfoG, metalReverb)

  // ランダムなノイズバースト（不規則な間隔で）
  function scheduleBurst(): void {
    const delay = 3000 + Math.random() * 5000
    const t = setTimeout(() => {
      if (!isActive()) return
      const ct     = ctx.currentTime
      const bufLen = ctx.sampleRate * 0.8
      const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const data   = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2.5)
      }
      const src = ctx.createBufferSource()
      const g   = makeGain(ctx, 0)
      const bpf = ctx.createBiquadFilter()
      bpf.type            = 'bandpass'
      bpf.frequency.value = 200 + Math.random() * 400
      bpf.Q.value         = 5
      src.buffer = buf
      src.connect(bpf)
      bpf.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0.04, ct)
      g.gain.linearRampToValueAtTime(0, ct + 0.8)
      src.start(ct)
      scheduleBurst()
    }, delay)
    timers.push(t)
  }
  scheduleBurst()

  return { nodes, timers }
}
