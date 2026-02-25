import { useState, useCallback } from 'react'
import type { Timeframe } from '../types'
import { MA_SPECS } from '../constants/maSpecs'

interface ChartControlsProps {
  layout: 'header' | 'leftMenu'
  timeframe: Timeframe
  onTimeframeChange: (tf: Timeframe) => void
  maVisible: boolean
  onMAToggle: (visible: boolean) => void
}

const TIMEFRAMES: Timeframe[] = [1, 5, 15]

const btnBase = 'border-none rounded cursor-pointer font-mono'
const btnSizePC = 'py-1.5 px-3 text-[13px]'
const btnSizeSP = 'py-1 px-2 text-xs'

function TimeframeButtons({
  timeframe,
  onTimeframeChange,
  size,
}: {
  timeframe: Timeframe
  onTimeframeChange: (tf: Timeframe) => void
  size: 'pc' | 'sp'
}) {
  const sizeClass = size === 'pc' ? btnSizePC : btnSizeSP
  return (
    <>
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          className={`${btnBase} ${sizeClass} ${
            timeframe === tf ? 'bg-accent text-white' : 'bg-bg-button text-text-primary'
          }`}
          onClick={() => onTimeframeChange(tf)}
        >
          {tf}分
        </button>
      ))}
    </>
  )
}

function MAToggle({
  maVisible,
  onMAToggle,
  size,
}: {
  maVisible: boolean
  onMAToggle: (visible: boolean) => void
  size: 'pc' | 'sp'
}) {
  const sizeClass = size === 'pc' ? btnSizePC : btnSizeSP
  return (
    <button
      className={`${btnBase} ${sizeClass} ${
        maVisible ? 'bg-accent text-white' : 'bg-bg-button text-text-primary'
      }`}
      onClick={() => onMAToggle(!maVisible)}
      title={MA_SPECS.map((s) => s.label).join(' / ')}
    >
      MA
    </button>
  )
}

function HeaderLayout({ timeframe, onTimeframeChange, maVisible, onMAToggle }: Omit<ChartControlsProps, 'layout'>) {
  return (
    <div className="flex gap-1 items-center">
      <TimeframeButtons timeframe={timeframe} onTimeframeChange={onTimeframeChange} size="pc" />
      <div className="w-px h-5 bg-bg-elevated mx-1" />
      <MAToggle maVisible={maVisible} onMAToggle={onMAToggle} size="pc" />
    </div>
  )
}

function LeftMenuLayout({ timeframe, onTimeframeChange, maVisible, onMAToggle }: Omit<ChartControlsProps, 'layout'>) {
  const [open, setOpen] = useState(false)

  const handleToggle = useCallback(() => setOpen((v) => !v), [])

  return (
    <div className="absolute left-1.5 top-1.5 z-[var(--z-content)]">
      <button
        className="w-7 h-7 rounded bg-bg-panel/80 border border-bg-elevated text-text-secondary text-xs cursor-pointer flex items-center justify-center"
        onClick={handleToggle}
      >
        {open ? '\u2715' : '\u2699'}
      </button>

      {open && (
        <div className="mt-1 bg-bg-panel/95 border border-bg-elevated rounded p-1.5 flex flex-col gap-1 backdrop-blur-sm min-w-[52px]">
          <TimeframeButtons timeframe={timeframe} onTimeframeChange={onTimeframeChange} size="sp" />
          <div className="h-px bg-bg-elevated my-0.5" />
          <MAToggle maVisible={maVisible} onMAToggle={onMAToggle} size="sp" />
        </div>
      )}
    </div>
  )
}

export default function ChartControls(props: ChartControlsProps) {
  const { layout, ...rest } = props
  return layout === 'header' ? <HeaderLayout {...rest} /> : <LeftMenuLayout {...rest} />
}
