import { useEffect, useState, useRef } from 'react'
import { AudioSystem } from '../systems/AudioSystem'

interface MilestoneOverlayProps {
  milestone?: { threshold: number; message: string; duration: number } | null
  onComplete?: () => void
}

export const MILESTONE_TABLE = [
  { threshold: 10_000_000,  message: '一千万円。夢が現実になり始めた。',     duration: 2500 },
  { threshold: 30_000_000,  message: '三千万円。もう普通じゃない。',         duration: 2500 },
  { threshold: 50_000_000,  message: '五千万円。億が見えてきた。',           duration: 3500 },
  { threshold: 100_000_000, message: '一億円。億トレーダー誕生。',           duration: 3500 },
  { threshold: 300_000_000, message: '三億円。伝説になりつつある。',         duration: 3500 },
  { threshold: 500_000_000, message: '五億円。もはや別次元。',               duration: 3500 },
]

export default function MilestoneOverlay({ milestone, onComplete }: MilestoneOverlayProps) {
  const [visible, setVisible] = useState(false)
  const [opacity, setOpacity] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const milestoneRef = useRef<number | null>(null)

  useEffect(() => {
    if (!milestone || milestone.threshold === milestoneRef.current) return
    milestoneRef.current = milestone.threshold

    AudioSystem.playSE('milestone')

    setVisible(true)
    requestAnimationFrame(() => setOpacity(1))

    timerRef.current = setTimeout(() => {
      setOpacity(0)
      timerRef.current = setTimeout(() => {
        setVisible(false)
        milestoneRef.current = null
        onComplete?.()
      }, 400)
    }, milestone.duration)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [milestone, onComplete])

  if (!visible || !milestone) return null

  return (
    <div
      className="fixed top-15 left-1/2 z-[var(--z-overlay)] bg-black/88 text-gold py-3.5 px-8 rounded-lg text-lg font-bold text-center shadow-[0_0_20px_rgba(255,215,0,0.3)] border border-gold/40 pointer-events-none whitespace-nowrap"
      style={{
        opacity,
        transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-out',
        transform: `translateX(-50%) translateY(${opacity === 1 ? '0' : '-20px'})`,
      }}
    >
      {milestone.message}
    </div>
  )
}
