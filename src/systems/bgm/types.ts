export type TimerId = ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>

export interface BGMNodeSet {
  nodes: AudioNode[]
  timers: TimerId[]
}

export type BGMBuilder = (
  ctx: AudioContext,
  masterGain: GainNode,
  isActive: () => boolean,
) => BGMNodeSet
