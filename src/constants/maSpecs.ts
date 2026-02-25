export const MA_SPECS = [
  { period: 5, color: '#ffeb3b', label: 'MA5' },
  { period: 25, color: '#ff9800', label: 'MA25' },
  { period: 75, color: '#e91e63', label: 'MA75' },
] as const

export type MAPeriod = (typeof MA_SPECS)[number]['period'] // 5 | 25 | 75
