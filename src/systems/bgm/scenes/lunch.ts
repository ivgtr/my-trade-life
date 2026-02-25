import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain, makeLPF } from '../audioUtils'

/**
 * lunch — ほのぼの神社リスペクトな昼休みBGM
 * F major, BPM 75, ゆったり脱力系メロディ
 * コード進行: F - Am/E - Bb - C/G → F - Dm - Bb→C - F
 */
export const buildLunch: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []
  const reverb = makeReverb(ctx, 2.5, 1.5)
  const lpf = makeLPF(ctx, 3500)
  reverb.connect(lpf)
  lpf.connect(masterGain)

  // BPM 75: quarter = 800ms, eighth = 400ms
  const EIGHTH = 400

  // --- F major frequencies ---
  const E3 = 164.81, F3 = 174.61, G3 = 196.00, A3 = 220.00, Bb3 = 233.08
  const C4 = 261.63, D4 = 293.66, F4 = 349.23
  const G4 = 392.00, A4 = 440.00, Bb4 = 466.16
  const C5 = 523.25, D5 = 587.33, E5 = 659.26, F5 = 698.46

  // --- Melody: [freq, durationInEighths][] ---
  // Phrase A (bars 1-4): ド-ド シ♭-レ ド-ファ シ♭ラソラ ファ--- ド-シ♭ミファ ド-
  const melodyA: [number, number][] = [
    [C5, 3], [C5, 1], [Bb4, 2], [D5, 2],
    [C5, 3], [F5, 1], [Bb4, 1], [A4, 1], [G4, 1], [A4, 1],
    [F4, 6], [C5, 2],
    [Bb4, 1], [E5, 1], [F5, 2], [C5, 4],
  ]
  // Phrase B (bars 5-8): 応答フレーズ
  const melodyB: [number, number][] = [
    [A4, 3], [G4, 1], [F4, 2], [A4, 2],
    [Bb4, 2], [A4, 2], [G4, 3], [F4, 1],
    [G4, 2], [A4, 2], [Bb4, 2], [C5, 2],
    [F4, 6], [0, 2],
  ]
  const melody = [...melodyA, ...melodyB]

  // --- Chords: [frequencies[], durationInEighths][] ---
  const chords: [number[], number][] = [
    [[F3, A3, C4], 8],                         // bar 1: F
    [[E3, A3, C4], 8],                          // bar 2: Am/E
    [[Bb3, D4, F4], 8],                         // bar 3: Bb
    [[G3, C4, 329.63], 8],                      // bar 4: C/G  (E4=329.63)
    [[F3, A3, C4], 8],                          // bar 5: F
    [[D4, F4, A4], 8],                          // bar 6: Dm
    [[Bb3, D4, F4], 4], [[G3, C4, 329.63], 4], // bar 7: Bb → C
    [[F3, A3, C4], 8],                          // bar 8: F
  ]

  // --- Melody sequencer ---
  let mIdx = 0
  let mWait = 0

  function stepMelody(): void {
    if (mWait > 0) { mWait--; return }
    const [freq, dur] = melody[mIdx % melody.length]
    mWait = dur - 1
    if (freq > 0) {
      const now = ctx.currentTime
      const len = dur * EIGHTH / 1000
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.06, now + 0.04)
      gain.gain.setValueAtTime(0.06, now + len * 0.3)
      gain.gain.exponentialRampToValueAtTime(0.008, now + len * 0.85)
      gain.gain.linearRampToValueAtTime(0, now + len)
      osc.start(now)
      osc.stop(now + len + 0.05)
      nodes.push(osc, gain)
    }
    mIdx++
  }

  // --- Chord sequencer ---
  let cIdx = 0
  let cWait = 0

  function stepChord(): void {
    if (cWait > 0) { cWait--; return }
    const [freqs, dur] = chords[cIdx % chords.length]
    cWait = dur - 1
    const now = ctx.currentTime
    const len = dur * EIGHTH / 1000
    for (const freq of freqs) {
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.035, now + 0.4)
      gain.gain.linearRampToValueAtTime(0.02, now + len - 0.4)
      gain.gain.linearRampToValueAtTime(0, now + len)
      osc.start(now)
      osc.stop(now + len + 0.1)
      nodes.push(osc, gain)
    }
    cIdx++
  }

  stepMelody()
  stepChord()
  timers.push(setInterval(stepMelody, EIGHTH))
  timers.push(setInterval(stepChord, EIGHTH))
  return { nodes, timers }
}
