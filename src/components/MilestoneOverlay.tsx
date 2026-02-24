import { useEffect, useRef, useCallback } from 'react'
import { AudioSystem } from '../systems/AudioSystem'

interface MilestoneOverlayProps {
  milestone?: { threshold: number; message: string; duration: number } | null
  onComplete?: () => void
}

export default function MilestoneOverlay({ milestone, onComplete }: MilestoneOverlayProps) {
  const bannerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const milestoneRef = useRef<number | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!milestone || milestone.threshold === milestoneRef.current) return
    milestoneRef.current = milestone.threshold

    AudioSystem.playSE('milestone')

    const el = bannerRef.current
    if (el) {
      el.style.display = 'block'
      requestAnimationFrame(() => {
        el.style.opacity = '1'
        el.style.transform = 'translateX(-50%) translateY(0)'
      })
    }

    timerRef.current = setTimeout(() => {
      if (el) {
        el.style.opacity = '0'
        el.style.transform = 'translateX(-50%) translateY(-20px)'
      }
      timerRef.current = setTimeout(() => {
        if (el) el.style.display = 'none'
        milestoneRef.current = null
        onComplete?.()
      }, 400)
    }, milestone.duration)

    return cleanup
  }, [milestone, onComplete, cleanup])

  if (!milestone) return null

  return (
    <div
      ref={bannerRef}
      className="fixed top-15 left-1/2 z-[var(--z-overlay)] bg-black/88 text-gold py-3.5 px-8 rounded-lg text-lg font-bold text-center shadow-[0_0_20px_rgba(255,215,0,0.3)] border border-gold/40 pointer-events-none whitespace-nowrap"
      style={{
        display: 'none',
        opacity: 0,
        transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-out',
        transform: 'translateX(-50%) translateY(-20px)',
      }}
    >
      {milestone.message}
    </div>
  )
}
