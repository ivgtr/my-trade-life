import type { BGMSceneId } from '../../types/audio'
import type { BGMNodeSet } from './types'
import { fadeIn, fadeOut } from './audioUtils'
import { SCENE_BUILDERS } from './scenes'

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
  _masterGain: GainNode | null
  _volume: number
  _currentScene: BGMSceneId | null
  _fadingOut: boolean
  play(sceneId: BGMSceneId): void
  stop(): void
  setVolume(volume: number): void
  _stopNodes(): void
} = {
  _ctx:          null,
  _nodes:        null,
  _masterGain:   null,
  _volume:       0.5,
  _currentScene: null,
  _fadingOut:    false,

  play(sceneId: BGMSceneId): void {
    if (this._currentScene === sceneId) return
    const builders = SCENE_BUILDERS[sceneId]
    if (!builders?.length) return

    const ctx = getCtx()
    this._currentScene = sceneId

    const startNew = (): void => {
      this._stopNodes()
      const master = ctx.createGain()
      master.gain.value = 0
      master.connect(ctx.destination)
      this._masterGain = master

      const builder = builders[Math.floor(Math.random() * builders.length)]
      const nodeSet = builder(ctx, master, () => this._nodes === nodeSet)
      this._nodes = nodeSet

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
    this._masterGain = null
  },
}
