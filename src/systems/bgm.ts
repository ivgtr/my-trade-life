/**
 * bgm.ts — DAY TRADER LIFE プロシージャルBGM
 *
 * Web Audio APIで全シーンのBGMをリアルタイム生成する。
 * 外部音源ファイル不要。差し替えはこのファイルの実装を置き換えるだけでよい。
 *
 * 使い方:
 *   import { bgmPlayer } from './bgm'
 *   bgmPlayer.play('trading')
 *   bgmPlayer.stop()
 *   bgmPlayer.setVolume(0.6)
 */

import type { BGMSceneId } from '../types/audio'

type TimerId = ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>
type BGMNodeSet = AudioNode[] & { _timers?: TimerId[] }
type BGMBuilder = (ctx: AudioContext, masterGain: GainNode) => BGMNodeSet

// ─── ユーティリティ ────────────────────────────────────────────────

/** AudioContextをユーザー操作後に初期化（ブラウザポリシー対応） */
function getCtx(): AudioContext {
  if (!bgmPlayer._ctx) {
    bgmPlayer._ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)()
  }
  if (bgmPlayer._ctx!.state === 'suspended') {
    bgmPlayer._ctx!.resume()
  }
  return bgmPlayer._ctx!
}

/** リバーブ用のImpulse Responseをノイズで生成 */
function makeReverb(ctx: AudioContext, duration: number = 1.8, decay: number = 2.0): ConvolverNode {
  const len    = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  const conv = ctx.createConvolver()
  conv.buffer = buffer
  return conv
}

/** ローパスフィルターを生成 */
function makeLPF(ctx: AudioContext, freq: number, q: number = 1): BiquadFilterNode {
  const f = ctx.createBiquadFilter()
  f.type            = 'lowpass'
  f.frequency.value = freq
  f.Q.value         = q
  return f
}

/** ゲインノードを生成 */
function makeGain(ctx: AudioContext, value: number = 1): GainNode {
  const g    = ctx.createGain()
  g.gain.value = value
  return g
}

/** フェードイン用のスケジュール */
function fadeIn(gainNode: GainNode, ctx: AudioContext, duration: number = 1.2): void {
  const g = gainNode.gain
  g.cancelScheduledValues(ctx.currentTime)
  g.setValueAtTime(0, ctx.currentTime)
  g.linearRampToValueAtTime(1, ctx.currentTime + duration)
}

function fadeOut(gainNode: GainNode, ctx: AudioContext, duration: number = 1.0, then?: () => void): void {
  const g = gainNode.gain
  g.cancelScheduledValues(ctx.currentTime)
  g.setValueAtTime(g.value, ctx.currentTime)
  g.linearRampToValueAtTime(0, ctx.currentTime + duration)
  if (then) setTimeout(then, duration * 1000 + 50)
}

// ─── シーン別BGM生成関数 ───────────────────────────────────────────

/**
 * title — 静かなアンビエント・スローアルペジオ
 * 音楽的特徴: Cmajスケールのゆったりしたアルペジオ + パッドコード
 */
function buildTitle(ctx: AudioContext, masterGain: GainNode): BGMNodeSet {
  const nodes: BGMNodeSet = [] as unknown as BGMNodeSet
  const reverb = makeReverb(ctx, 2.5, 1.8)
  const lpf    = makeLPF(ctx, 3200)
  reverb.connect(lpf)
  lpf.connect(masterGain)

  // コードパッド（C - Am - F - G）
  const chords = [
    [261.63, 329.63, 392.00],  // C
    [220.00, 261.63, 329.63],  // Am
    [174.61, 220.00, 261.63],  // F
    [196.00, 246.94, 293.66],  // G
  ]
  const chordDur = 3.2
  let   chordIdx = 0

  function playChord(): void {
    const now   = ctx.currentTime
    const chord = chords[chordIdx % chords.length]
    chord.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type      = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.10 - i * 0.02, now + 0.4)
      gain.gain.linearRampToValueAtTime(0.06 - i * 0.01, now + chordDur - 0.5)
      gain.gain.linearRampToValueAtTime(0, now + chordDur)
      osc.start(now)
      osc.stop(now + chordDur)
      nodes.push(osc, gain)
    })
    chordIdx++
  }

  // アルペジオ
  const arpNotes = [261.63, 329.63, 392.00, 329.63, 293.66, 261.63]
  let   arpStep  = 0
  function playArp(): void {
    const now  = ctx.currentTime
    const freq = arpNotes[arpStep % arpNotes.length]
    const osc  = ctx.createOscillator()
    const gain = makeGain(ctx, 0)
    osc.type      = 'triangle'
    osc.frequency.setValueAtTime(freq * 2, now)
    osc.connect(gain)
    gain.connect(reverb)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.06, now + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc.start(now)
    osc.stop(now + 0.65)
    nodes.push(osc, gain)
    arpStep++
  }

  playChord()
  const chordTimer = setInterval(playChord, chordDur * 1000)
  const arpTimer   = setInterval(playArp,   600)
  nodes._timers    = [chordTimer, arpTimer]
  return nodes
}

/**
 * trading — 緊張感のある電子音楽
 * 音楽的特徴: 低音ドローン + リズミカルなパルス + 高音ノイズ
 */
function buildTrading(ctx: AudioContext, masterGain: GainNode): BGMNodeSet {
  const nodes: BGMNodeSet = [] as unknown as BGMNodeSet
  const now   = ctx.currentTime

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

  const beatTimer  = setInterval(playBeat, beatMs)
  nodes._timers    = [beatTimer]
  return nodes
}

/**
 * calendar — 軽めの中立ループ
 * 音楽的特徴: シンプルなマリンバ風ループ
 */
function buildCalendar(ctx: AudioContext, masterGain: GainNode): BGMNodeSet {
  const nodes: BGMNodeSet = [] as unknown as BGMNodeSet
  const reverb  = makeReverb(ctx, 1.0, 3.0)
  reverb.connect(masterGain)

  // マリンバ風ノート
  const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 440.00, 523.25]
  let   step   = 0

  function playNote(): void {
    const now  = ctx.currentTime
    const freq = melody[step % melody.length]
    const osc  = ctx.createOscillator()
    const gain = makeGain(ctx, 0)
    osc.type      = 'sine'
    osc.frequency.setValueAtTime(freq, now)

    // ハーモニクス（倍音を少し加えてマリンバらしく）
    const osc2  = ctx.createOscillator()
    const gain2 = makeGain(ctx, 0)
    osc2.type      = 'sine'
    osc2.frequency.setValueAtTime(freq * 2, now)

    osc.connect(gain)
    osc2.connect(gain2)
    gain.connect(reverb)
    gain2.connect(reverb)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.10, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    gain2.gain.setValueAtTime(0, now)
    gain2.gain.linearRampToValueAtTime(0.03, now + 0.01)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

    osc.start(now); osc.stop(now + 0.55)
    osc2.start(now); osc2.stop(now + 0.35)
    nodes.push(osc, gain, osc2, gain2)
    step++
  }

  const timer     = setInterval(playNote, 480)
  nodes._timers   = [timer]
  return nodes
}

/**
 * report — 落ち着いた・やや温かみのある
 * 音楽的特徴: ゆったりしたピアノ風コード＋パッド
 */
function buildReport(ctx: AudioContext, masterGain: GainNode): BGMNodeSet {
  const nodes: BGMNodeSet = [] as unknown as BGMNodeSet
  const reverb = makeReverb(ctx, 2.8, 1.5)
  reverb.connect(masterGain)

  const progression = [
    [261.63, 329.63, 392.00, 523.25],  // C
    [246.94, 311.13, 369.99, 493.88],  // B7
    [220.00, 277.18, 329.63, 440.00],  // Am
    [196.00, 261.63, 329.63, 392.00],  // G
  ]
  let cIdx = 0

  function playChord(): void {
    const now   = ctx.currentTime
    const chord = progression[cIdx % progression.length]
    chord.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type      = i === 0 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(freq, now + i * 0.04)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now + i * 0.04)
      gain.gain.linearRampToValueAtTime(0.07 - i * 0.01, now + i * 0.04 + 0.3)
      gain.gain.linearRampToValueAtTime(0.04, now + 3.5)
      gain.gain.linearRampToValueAtTime(0, now + 4.0)
      osc.start(now + i * 0.04)
      osc.stop(now + 4.2)
      nodes.push(osc, gain)
    })
    cIdx++
  }

  playChord()
  const timer    = setInterval(playChord, 4000)
  nodes._timers  = [timer]
  return nodes
}

/**
 * gameover — 不気味なドローン・LFO変調
 * 音楽的特徴: 低周波の不協和音・ゆっくりとした揺らぎ・金属的な響き
 */
function buildGameover(ctx: AudioContext, masterGain: GainNode): BGMNodeSet {
  const nodes: BGMNodeSet = [] as unknown as BGMNodeSet
  const now   = ctx.currentTime

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
      if (!bgmPlayer._nodes) return
      const ct   = ctx.currentTime
      const bufLen = ctx.sampleRate * 0.8
      const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const data   = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2.5)
      }
      const src  = ctx.createBufferSource()
      const g    = makeGain(ctx, 0)
      const bpf  = ctx.createBiquadFilter()
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
    nodes._timers = nodes._timers || []
    nodes._timers.push(t)
  }
  scheduleBurst()

  nodes._timers = nodes._timers || []
  return nodes
}

// ─── Scene -> Builder のマッピング ─────────────────────────────────

const SCENE_BUILDERS: Record<BGMSceneId, BGMBuilder> = {
  title:    buildTitle,
  trading:  buildTrading,
  calendar: buildCalendar,
  report:   buildReport,
  gameover: buildGameover,
}

// ─── bgmPlayer シングルトン ────────────────────────────────────────

export const bgmPlayer: {
  _ctx: AudioContext | null
  _nodes: BGMNodeSet | null
  _masterGain: GainNode | null
  _volume: number
  _currentScene: BGMSceneId | null
  _fadingOut: boolean
  play(sceneId: BGMSceneId): void
  stop(): void
  setVolume(volume: number): void
  _stopNodes(): void
} = {
  _ctx:        null,
  _nodes:      null,
  _masterGain: null,
  _volume:     0.5,
  _currentScene: null,
  _fadingOut:  false,

  play(sceneId: BGMSceneId): void {
    if (this._currentScene === sceneId) return
    const builder = SCENE_BUILDERS[sceneId]
    if (!builder) return

    const ctx = getCtx()
    this._currentScene = sceneId

    const startNew = (): void => {
      this._stopNodes()
      const master = ctx.createGain()
      master.gain.value = 0
      master.connect(ctx.destination)
      this._masterGain = master
      this._nodes = builder(ctx, master)
      fadeIn(master, ctx, 1.4)
      master.gain.value = 0  // fadeIn内で設定される
      // 音量を反映
      setTimeout(() => {
        if (this._masterGain === master) {
          master.gain.cancelScheduledValues(ctx.currentTime)
          master.gain.linearRampToValueAtTime(
            this._volume,
            ctx.currentTime + 0.1
          )
        }
      }, 1450)
    }

    if (this._nodes && !this._fadingOut) {
      this._fadingOut = true
      fadeOut(this._masterGain!, ctx, 0.9, () => {
        this._fadingOut = false
        startNew()
      })
    } else if (!this._fadingOut) {
      startNew()
    }
  },

  stop(): void {
    if (!this._nodes) return
    this._currentScene = null
    const ctx = getCtx()
    if (this._masterGain && !this._fadingOut) {
      this._fadingOut = true
      fadeOut(this._masterGain, ctx, 1.0, () => {
        this._fadingOut = false
        this._stopNodes()
      })
    }
  },

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume))
    if (this._masterGain && !this._fadingOut) {
      const ctx = getCtx()
      this._masterGain.gain.cancelScheduledValues(ctx.currentTime)
      this._masterGain.gain.linearRampToValueAtTime(
        this._volume,
        ctx.currentTime + 0.1
      )
    }
  },

  _stopNodes(): void {
    if (!this._nodes) return
    const nodes = this._nodes
    ;(nodes._timers || []).forEach((t: TimerId) => clearInterval(t as ReturnType<typeof setInterval>))
    nodes.forEach((node: AudioNode) => {
      if (!node) return
      try {
        if (typeof (node as OscillatorNode).stop === 'function') (node as OscillatorNode).stop()
        if (typeof node.disconnect === 'function') node.disconnect()
      } catch { /* audio node cleanup may fail silently */ }
    })
    this._nodes      = null
    this._masterGain = null
  },
}
