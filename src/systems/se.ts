/**
 * se.ts — DAY TRADER LIFE プロシージャルSE
 *
 * Web Audio APIで全SEをリアルタイム生成する。
 * 外部音源ファイル不要。差し替えはこのファイルの実装を置き換えるだけでよい。
 *
 * 使い方:
 *   import { sePlayer } from './se'
 *   sePlayer.play('entry')
 *   sePlayer.setVolume(0.8)
 */

import type { SEId } from '../types/audio'

type SEBuilder = (ctx: AudioContext, masterGain: GainNode) => void

function getCtx(): AudioContext {
  if (!sePlayer._ctx) {
    sePlayer._ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)()
  }
  if (sePlayer._ctx!.state === 'suspended') {
    sePlayer._ctx!.resume()
  }
  return sePlayer._ctx!
}

// ─── SE 生成関数群 ─────────────────────────────────────────────────

/**
 * entry — LONG/SHORTエントリー時のクリック音
 * 硬質で短いパーカッシブな電子音
 */
function playEntry(ctx: AudioContext, masterGain: GainNode): void {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const g   = ctx.createGain()
  osc.type  = 'square'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.06)
  osc.connect(g)
  g.connect(masterGain)
  g.gain.setValueAtTime(0, now)
  g.gain.linearRampToValueAtTime(0.4, now + 0.005)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
  osc.start(now)
  osc.stop(now + 0.15)
}

/** exit — 決済時の音（エントリーより少し重め） */
function playExit(ctx: AudioContext, masterGain: GainNode): void {
  const now = ctx.currentTime
  ;[0, 0.05].forEach((delay, i) => {
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.type  = 'square'
    osc.frequency.setValueAtTime(660 - i * 110, now + delay)
    osc.frequency.exponentialRampToValueAtTime(330 - i * 55, now + delay + 0.08)
    osc.connect(g)
    g.connect(masterGain)
    g.gain.setValueAtTime(0, now + delay)
    g.gain.linearRampToValueAtTime(0.3, now + delay + 0.005)
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14)
    osc.start(now + delay)
    osc.stop(now + delay + 0.18)
  })
}

/**
 * profit — 利益確定時の上昇音
 * 明るく短い上昇グリッサンド
 */
function playProfit(ctx: AudioContext, masterGain: GainNode): void {
  const now = ctx.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.type      = 'triangle'
    osc.frequency.setValueAtTime(freq, now + i * 0.07)
    osc.connect(g)
    g.connect(masterGain)
    g.gain.setValueAtTime(0, now + i * 0.07)
    g.gain.linearRampToValueAtTime(0.22, now + i * 0.07 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18)
    osc.start(now + i * 0.07)
    osc.stop(now + i * 0.07 + 0.22)
  })
}

/**
 * loss — 損失確定時の下降音
 * 鈍く短い下降グリッサンド
 */
function playLoss(ctx: AudioContext, masterGain: GainNode): void {
  const now   = ctx.currentTime
  const notes = [440, 349.23, 261.63, 196.00]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.type      = 'sine'
    osc.frequency.setValueAtTime(freq, now + i * 0.07)
    osc.connect(g)
    g.connect(masterGain)
    g.gain.setValueAtTime(0, now + i * 0.07)
    g.gain.linearRampToValueAtTime(0.18, now + i * 0.07 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.22)
    osc.start(now + i * 0.07)
    osc.stop(now + i * 0.07 + 0.28)
  })
}

/**
 * losscut — ロスカット時の不快な警告音
 * 不協和音 + ノイズバースト
 */
function playLosscut(ctx: AudioContext, masterGain: GainNode): void {
  const now = ctx.currentTime

  // 警告ブザー（tritone）
  ;[220, 311.13].forEach(freq => {
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    const lpf = ctx.createBiquadFilter()
    lpf.type            = 'lowpass'
    lpf.frequency.value = 1200
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(freq, now)
    osc.connect(lpf)
    lpf.connect(g)
    g.connect(masterGain)
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(0.25, now + 0.01)
    g.gain.setValueAtTime(0.25, now + 0.15)
    g.gain.linearRampToValueAtTime(0, now + 0.45)
    osc.start(now)
    osc.stop(now + 0.5)
  })

  // ノイズバースト
  const bufLen = ctx.sampleRate * 0.3
  const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate)
  const data   = buf.getChannelData(0)
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1
  const src  = ctx.createBufferSource()
  const g    = ctx.createGain()
  const hpf  = ctx.createBiquadFilter()
  hpf.type            = 'highpass'
  hpf.frequency.value = 2000
  src.buffer = buf
  src.connect(hpf)
  hpf.connect(g)
  g.connect(masterGain)
  g.gain.setValueAtTime(0.15, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  src.start(now)
}

/**
 * news — ブレイキングニュース警告音
 * 緊急感のある2音アラート（繰り返し）
 */
function playNews(ctx: AudioContext, masterGain: GainNode): void {
  const now    = ctx.currentTime
  const tones  = [880, 1108.73]  // A5 + C#6
  const repeat = 3

  for (let r = 0; r < repeat; r++) {
    tones.forEach((freq, i) => {
      const t   = now + r * 0.28 + i * 0.12
      const osc = ctx.createOscillator()
      const g   = ctx.createGain()
      osc.type      = 'square'
      osc.frequency.setValueAtTime(freq, t)
      osc.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.2, t + 0.008)
      g.gain.setValueAtTime(0.2, t + 0.08)
      g.gain.linearRampToValueAtTime(0, t + 0.11)
      osc.start(t)
      osc.stop(t + 0.15)
    })
  }
}

/**
 * levelup — レベルアップ時のファンファーレ
 * 短い上昇アルペジオ + チャイム
 */
function playLevelup(ctx: AudioContext, masterGain: GainNode): void {
  const now   = ctx.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]

  notes.forEach((freq, i) => {
    const t   = now + i * 0.09
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.type      = 'triangle'
    osc.frequency.setValueAtTime(freq, t)
    osc.connect(g)
    g.connect(masterGain)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.28, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    osc.start(t)
    osc.stop(t + 0.4)

    // 倍音（金属感）
    const osc2 = ctx.createOscillator()
    const g2   = ctx.createGain()
    osc2.type      = 'sine'
    osc2.frequency.setValueAtTime(freq * 2, t)
    osc2.connect(g2)
    g2.connect(masterGain)
    g2.gain.setValueAtTime(0, t)
    g2.gain.linearRampToValueAtTime(0.08, t + 0.01)
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
    osc2.start(t)
    osc2.stop(t + 0.25)
  })
}

/**
 * milestone — 資産マイルストーン通過（小〜中演出用）
 * 明るい上昇コード
 */
function playMilestone(ctx: AudioContext, masterGain: GainNode): void {
  const now   = ctx.currentTime
  const chord = [523.25, 659.25, 783.99, 1046.5]
  chord.forEach((freq, i) => {
    const t   = now + i * 0.04
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.type      = 'triangle'
    osc.frequency.setValueAtTime(freq, t)
    osc.connect(g)
    g.connect(masterGain)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.2 - i * 0.02, t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    osc.start(t)
    osc.stop(t + 0.65)
  })
}

/**
 * milestoneBig — 10億達成（ビリオネア達成大演出用）
 * 派手なファンファーレ + バス
 */
function playMilestoneBig(ctx: AudioContext, masterGain: GainNode): void {
  const now = ctx.currentTime

  // バスドラム的なロー
  const kick = ctx.createOscillator()
  const kickG = ctx.createGain()
  kick.type = 'sine'
  kick.frequency.setValueAtTime(200, now)
  kick.frequency.exponentialRampToValueAtTime(40, now + 0.3)
  kick.connect(kickG)
  kickG.connect(masterGain)
  kickG.gain.setValueAtTime(0, now)
  kickG.gain.linearRampToValueAtTime(0.6, now + 0.01)
  kickG.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
  kick.start(now)
  kick.stop(now + 0.4)

  // ファンファーレ（3重和音を段階的に）
  const fanfareNotes = [
    [261.63, 329.63, 392.00],  // C
    [329.63, 415.30, 493.88],  // E/B
    [392.00, 523.25, 659.25],  // G
    [523.25, 659.25, 783.99],  // C high
  ]
  fanfareNotes.forEach((chord, ci) => {
    chord.forEach((freq, ni) => {
      const t   = now + ci * 0.18 + 0.05
      const osc = ctx.createOscillator()
      const g   = ctx.createGain()
      osc.type      = ni === 0 ? 'sawtooth' : 'triangle'
      osc.frequency.setValueAtTime(freq, t)
      osc.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime((0.25 - ni * 0.04), t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2)
      osc.start(t)
      osc.stop(t + 1.4)
    })
  })

  // 最後にシンバル的なノイズ
  const delay = now + 0.65
  const bufLen = ctx.sampleRate * 1.0
  const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate)
  const data   = buf.getChannelData(0)
  for (let i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.5)
  }
  const src  = ctx.createBufferSource()
  const g    = ctx.createGain()
  const hpf  = ctx.createBiquadFilter()
  hpf.type            = 'highpass'
  hpf.frequency.value = 5000
  src.buffer = buf
  src.connect(hpf)
  hpf.connect(g)
  g.connect(masterGain)
  g.gain.setValueAtTime(0.2, delay)
  g.gain.exponentialRampToValueAtTime(0.001, delay + 1.0)
  src.start(delay)
}

/** calendarFlip — カレンダー日付送り時の軽い音 */
function playCalendarFlip(ctx: AudioContext, masterGain: GainNode): void {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const g   = ctx.createGain()
  osc.type  = 'sine'
  osc.frequency.setValueAtTime(1200, now)
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.04)
  osc.connect(g)
  g.connect(masterGain)
  g.gain.setValueAtTime(0, now)
  g.gain.linearRampToValueAtTime(0.12, now + 0.005)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
  osc.start(now)
  osc.stop(now + 0.1)
}

// ─── SE ID -> 関数 のマッピング ────────────────────────────────────

const SE_MAP: Record<SEId, SEBuilder> = {
  entry:          playEntry,
  exit:           playExit,
  profit:         playProfit,
  loss:           playLoss,
  losscut:        playLosscut,
  news:           playNews,
  levelup:        playLevelup,
  milestone:      playMilestone,
  milestoneBig:   playMilestoneBig,
  calendarFlip:   playCalendarFlip,
}

// ─── sePlayer シングルトン ─────────────────────────────────────────

export const sePlayer: {
  _ctx: AudioContext | null
  _volume: number
  play(seId: SEId): void
  setVolume(volume: number): void
} = {
  _ctx:     null,
  _volume:  0.7,

  play(seId: SEId): void {
    const fn = SE_MAP[seId]
    if (!fn) return
    const ctx  = getCtx()
    const gain = ctx.createGain()
    gain.gain.value = this._volume
    gain.connect(ctx.destination)
    fn(ctx, gain)
  },

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume))
  },
}
