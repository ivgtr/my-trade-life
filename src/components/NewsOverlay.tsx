import { useEffect, useState, useRef } from 'react'
import { AudioSystem } from '../systems/AudioSystem'

interface NewsOverlayProps {
  newsEvent?: { id: string; headline: string } | null
  onComplete?: () => void
}

const PREMONITION_DURATION = 1500
const TICKER_DURATION = 2500
const FADEOUT_DURATION = 500

export default function NewsOverlay({ newsEvent, onComplete }: NewsOverlayProps) {
  type Phase = 'idle' | 'premonition' | 'ticker' | 'fadeout'
  const [phase, setPhase] = useState<Phase>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eventIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!newsEvent || newsEvent.id === eventIdRef.current) return
    eventIdRef.current = newsEvent.id

    setPhase('premonition')

    timerRef.current = setTimeout(() => {
      setPhase('ticker')
      AudioSystem.playSE('news')

      timerRef.current = setTimeout(() => {
        setPhase('fadeout')

        timerRef.current = setTimeout(() => {
          setPhase('idle')
          eventIdRef.current = null
          onComplete?.()
        }, FADEOUT_DURATION)
      }, TICKER_DURATION)
    }, PREMONITION_DURATION)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [newsEvent, onComplete])

  if (phase === 'idle') return null

  return (
    <>
      {phase === 'premonition' && (
        <div className="fixed inset-0 pointer-events-none z-[var(--z-news)] bg-[rgba(200,30,30,0.12)] animate-news-shake" />
      )}

      {(phase === 'ticker' || phase === 'fadeout') && (
        <div
          className="fixed top-[20%] left-0 w-full z-[var(--z-news-ticker)] pointer-events-none overflow-hidden"
          style={{
            opacity: phase === 'fadeout' ? 0 : 1,
            transition: `opacity ${FADEOUT_DURATION}ms ease-out`,
          }}
        >
          <span
            className="inline-block whitespace-nowrap text-lg sm:text-[28px] font-bold text-news-red [text-shadow:0_0_10px_rgba(255,68,68,0.6),0_2px_4px_rgba(0,0,0,0.8)] py-3 px-6 bg-black/85 border-y-2 border-news-red animate-news-ticker-scroll"
          >
            ⚡ {newsEvent?.headline}
          </span>
        </div>
      )}
    </>
  )
}
