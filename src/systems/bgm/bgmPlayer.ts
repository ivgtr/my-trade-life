import type { BGMSceneId } from '../../types/audio'
import type { BGMBuilder, BGMNodeSet } from './types'
import { fadeIn, fadeOut } from './audioUtils'
import { SCENE_BUILDERS, BUILDER_GAIN } from './scenes'

/** AudioContextをユーザー操作後に初期化（ブラウザポリシー対応） */
function getCtx(): AudioContext {
  if (!bgmPlayer._ctx) {
    bgmPlayer._ctx = new AudioContext()
  }
  if (bgmPlayer._ctx.state === 'suspended') {
    bgmPlayer._ctx.resume()
  }
  return bgmPlayer._ctx
}

export const bgmPlayer: {
  _ctx: AudioContext | null
  _nodes: BGMNodeSet | null
  _fadeGain: GainNode | null
  _volumeGain: GainNode | null
  _normGain: GainNode | null
  _volume: number
  _currentScene: BGMSceneId | null
  _transitioning: boolean
  _pending: (() => void) | null
  _epoch: number
  _expectedEnd: number
  play(sceneId: BGMSceneId): void
  playBuilder(builder: BGMBuilder): void
  stop(): void
  setVolume(volume: number): void
  _playWith(builder: BGMBuilder): void
  _fadeOutThen(ctx: AudioContext, duration: number, action: () => void): void
  _completeTransition(): void
  _resolveStalled(): void
  _stopNodes(): void
} = {
  _ctx:           null,
  _nodes:         null,
  _fadeGain:      null,
  _volumeGain:    null,
  _normGain:      null,
  _volume:        0.5,
  _currentScene:  null,
  _transitioning: false,
  _pending:       null,
  _epoch:         0,
  _expectedEnd:   0,

  play(sceneId: BGMSceneId): void {
    if (this._currentScene === sceneId) return
    const builders = SCENE_BUILDERS[sceneId]
    if (!builders?.length) return
    this._currentScene = sceneId
    this._playWith(builders[Math.floor(Math.random() * builders.length)])
  },

  playBuilder(builder: BGMBuilder): void {
    this._currentScene = null
    this._playWith(builder)
  },

  _playWith(builder: BGMBuilder): void {
    const ctx = getCtx()
    this._resolveStalled()

    const startNew = (): void => {
      this._stopNodes()

      // オーディオグラフ: builder → normGain → volumeGain → fadeGain → destination
      const fade = ctx.createGain()
      fade.gain.value = 0
      fade.connect(ctx.destination)
      this._fadeGain = fade

      const vol = ctx.createGain()
      vol.gain.value = this._volume
      vol.connect(fade)
      this._volumeGain = vol

      const normFactor = BUILDER_GAIN.get(builder) ?? 1.0
      const normGain = ctx.createGain()
      normGain.gain.value = normFactor
      normGain.connect(vol)
      this._normGain = normGain

      const nodeSet = builder(ctx, normGain, () => this._nodes === nodeSet)
      this._nodes = nodeSet

      fadeIn(fade, ctx, 1.4)
    }

    if (this._transitioning) {
      this._pending = startNew
      return
    }

    if (this._nodes) {
      this._fadeOutThen(ctx, 0.9, startNew)
    } else {
      startNew()
    }
  },

  stop(): void {
    this._resolveStalled()
    this._currentScene = null

    if (this._transitioning) {
      this._pending = () => this._stopNodes()
      return
    }

    if (!this._nodes) return
    const ctx = getCtx()
    if (this._fadeGain) {
      this._fadeOutThen(ctx, 1.0, () => this._stopNodes())
    }
  },

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume))
    if (this._volumeGain) {
      const ctx = getCtx()
      this._volumeGain.gain.cancelScheduledValues(ctx.currentTime)
      this._volumeGain.gain.linearRampToValueAtTime(
        this._volume,
        ctx.currentTime + 0.1
      )
    }
  },

  _fadeOutThen(ctx: AudioContext, duration: number, action: () => void): void {
    const epoch = ++this._epoch
    this._transitioning = true
    this._pending = action
    this._expectedEnd = ctx.currentTime + duration
    fadeOut(this._fadeGain!, ctx, duration, () => {
      if (this._epoch !== epoch) return
      this._completeTransition()
    })
  },

  _completeTransition(): void {
    this._transitioning = false
    this._expectedEnd = 0
    const action = this._pending
    this._pending = null
    action?.()
  },

  _resolveStalled(): void {
    if (!this._transitioning || this._expectedEnd <= 0) return
    const ctx = this._ctx
    if (!ctx || ctx.currentTime < this._expectedEnd) return
    this._epoch++
    this._transitioning = false
    this._expectedEnd = 0
    this._pending = null
    this._stopNodes()
  },

  _stopNodes(): void {
    if (!this._nodes) return
    const { nodes, timers } = this._nodes
    timers.forEach(t => clearInterval(t as ReturnType<typeof setInterval>))
    nodes.forEach(node => {
      if (!node) return
      try {
        if (typeof (node as OscillatorNode).stop === 'function') (node as OscillatorNode).stop()
        if (typeof node.disconnect === 'function') node.disconnect()
      } catch { /* audio node cleanup may fail silently */ }
    })
    this._nodes      = null
    this._fadeGain    = null
    this._volumeGain  = null
    this._normGain    = null
  },
}
