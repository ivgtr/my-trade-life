import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeLPF, makeGain } from '../audioUtils'

/**
 * trading — 緊張感のある電子音楽
 * 音楽的特徴: 低音ドローン + リズミカルなパルス + 高音ノイズ
 */
export const buildTrading: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []
  const now = ctx.currentTime

  // 低音ドローン
  const bassFreqs = [55, 82.41, 110]
  bassFreqs.forEach((freq, i) => {
    const osc   = ctx.createOscillator()
    const gain  = makeGain(ctx, 0.08 - i * 0.02)
    const lfo   = ctx.createOscillator()
    const lfoG  = makeGain(ctx, freq * 0.008)
    lfo.type            = 'sine'
    lfo.frequency.value = 0.18 + i * 0.07
    lfo.connect(lfoG)
    lfoG.connect(osc.frequency)
    osc.type = i === 0 ? 'sawtooth' : 'sine'
    osc.frequency.setValueAtTime(freq, now)
    const lpf = makeLPF(ctx, 320, 2)
    osc.connect(lpf)
    lpf.connect(gain)
    gain.connect(masterGain)
    osc.start(now)
    lfo.start(now)
    nodes.push(osc, gain, lfo, lfoG, lpf)
  })

  // 高音緊張ドローン
  const hiOsc  = ctx.createOscillator()
  const hiGain = makeGain(ctx, 0.025)
  const hiLfo  = ctx.createOscillator()
  const hiLfoG = makeGain(ctx, 2.5)
  hiLfo.type            = 'sine'
  hiLfo.frequency.value = 0.4
  hiLfo.connect(hiLfoG)
  hiLfoG.connect(hiOsc.frequency)
  hiOsc.type            = 'sine'
  hiOsc.frequency.value = 880
  const hiReverb = makeReverb(ctx, 1.2, 3)
  hiOsc.connect(hiReverb)
  hiReverb.connect(hiGain)
  hiGain.connect(masterGain)
  hiOsc.start(now)
  hiLfo.start(now)
  nodes.push(hiOsc, hiGain, hiLfo, hiLfoG, hiReverb)

  // リズミカルなパルス（4つ打ちビート）
  const bpm      = 124
  const beatMs   = (60 / bpm) * 1000
  let   beatPhase = 0

  function playBeat(): void {
    const t     = ctx.currentTime
    const isKick = beatPhase % 4 === 0
    const isHat  = beatPhase % 2 === 1

    if (isKick) {
      const o = ctx.createOscillator()
      const g = makeGain(ctx, 0)
      o.type  = 'sine'
      o.frequency.setValueAtTime(160, t)
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12)
      o.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.25, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      o.start(t); o.stop(t + 0.2)
      nodes.push(o, g)
    }
    if (isHat) {
      const bufLen = ctx.sampleRate * 0.05
      const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const data   = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1
      const src  = ctx.createBufferSource()
      const g    = makeGain(ctx, 0)
      const hpf  = ctx.createBiquadFilter()
      hpf.type            = 'highpass'
      hpf.frequency.value = 8000
      src.buffer = buf
      src.connect(hpf)
      hpf.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.06, t + 0.002)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
      src.start(t)
      nodes.push(src, g, hpf)
    }
    beatPhase++
  }

  timers.push(setInterval(playBeat, beatMs))
  return { nodes, timers }
}
