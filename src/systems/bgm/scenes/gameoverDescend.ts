import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain } from '../audioUtils'

// 音名→周波数
const N: Record<string, number> = {
  C3: 130.81, D3: 146.83, Eb3: 155.56, G3: 196.00,
  Ab3: 207.65, Bb3: 233.08,
  C4: 261.63, D4: 293.66, Eb4: 311.13, G4: 392.00,
  Ab4: 415.30, Bb4: 466.16,
  C5: 523.25, D5: 587.33, Eb5: 622.25,
}

/**
 * gameoverDescend — FFゲームオーバー風
 * Cm、Rubato。5フレーズが段階的に下降 + 最終ロングトーン、約20秒1周期
 */
export const buildGameoverDescend: BGMBuilder = (ctx, masterGain, isActive) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  const reverb = makeReverb(ctx, 3.0, 1.5)
  reverb.connect(masterGain)

  // メロディフレーズ（各フレーズ3音、800ms間隔、フレーズ間2000ms休符）
  const phrases = [
    [N.Eb5, N.D5, N.C5],
    [N.Bb4, N.Ab4, N.G4],
    [N.Eb4, N.D4, N.C4],
    [N.Bb3, N.Ab3, N.G3],
    [N.Eb3, N.D3, N.C3],
  ]

  // パッド: Cm和音 ゆっくりfadeout
  function startPad(): void {
    const now = ctx.currentTime
    const padFreqs = [N.C3, N.Eb3, N.G3]
    padFreqs.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.04, now + 1.0)
      // 20秒かけてフェードアウト
      gain.gain.linearRampToValueAtTime(0, now + 20)
      osc.start(now)
      osc.stop(now + 21)
      nodes.push(osc, gain)
    })
  }

  function playSequence(): void {
    if (!isActive()) return

    startPad()

    let offset = 0
    phrases.forEach((phrase, pIdx) => {
      phrase.forEach((freq, nIdx) => {
        const noteTime = offset + nIdx * 800
        const t = setTimeout(() => {
          if (!isActive()) return
          const now = ctx.currentTime

          // sine + triangle ユニゾン
          const osc1 = ctx.createOscillator()
          const osc2 = ctx.createOscillator()
          const gain = makeGain(ctx, 0)

          osc1.type = 'sine'
          osc1.frequency.setValueAtTime(freq, now)
          osc2.type = 'triangle'
          osc2.frequency.setValueAtTime(freq, now)

          const g2 = makeGain(ctx, 0.5)
          osc2.connect(g2)
          osc1.connect(gain)
          g2.connect(gain)
          gain.connect(reverb)

          gain.gain.setValueAtTime(0, now)
          gain.gain.linearRampToValueAtTime(0.08, now + 0.05)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5)

          osc1.start(now)
          osc1.stop(now + 1.6)
          osc2.start(now)
          osc2.stop(now + 1.6)
          nodes.push(osc1, osc2, gain, g2)
        }, noteTime)
        timers.push(t)
      })

      // 最終フレーズの後はロングトーン
      if (pIdx === phrases.length - 1) {
        const longTime = offset + 3 * 800
        const t = setTimeout(() => {
          if (!isActive()) return
          const now = ctx.currentTime
          const osc = ctx.createOscillator()
          const gain = makeGain(ctx, 0)
          osc.type = 'sine'
          osc.frequency.setValueAtTime(N.C3, now)
          osc.connect(gain)
          gain.connect(reverb)
          gain.gain.setValueAtTime(0, now)
          gain.gain.linearRampToValueAtTime(0.06, now + 0.1)
          gain.gain.linearRampToValueAtTime(0, now + 3.0)
          osc.start(now)
          osc.stop(now + 3.2)
          nodes.push(osc, gain)
        }, longTime)
        timers.push(t)
      }

      offset += 3 * 800 + 2000 // 3音(800ms) + 休符(2000ms)
    })

    // 全体 ≈ 5*(2400+2000) - 2000 + 3000 = 20000ms後にループ
    const loopTime = offset + 3000
    const loopTimer = setTimeout(() => {
      if (isActive()) playSequence()
    }, loopTime)
    timers.push(loopTimer)
  }

  playSequence()
  return { nodes, timers }
}
