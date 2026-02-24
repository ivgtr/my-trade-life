import { useEffect, useRef, useCallback } from 'react'
import { AudioSystem } from '../systems/AudioSystem'

interface NewsOverlayProps {
  newsEvent?: { id: string; headline: string } | null
  onComplete?: () => void
}

const PREMONITION_DURATION = 1500
const TICKER_DURATION = 2500
const FADEOUT_DURATION = 500

type Phase = 'idle' | 'premonition' | 'ticker' | 'fadeout'

export default function NewsOverlay({ newsEvent, onComplete }: NewsOverlayProps) {
  const phaseRef = useRef<Phase>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eventIdRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const updateDOM = useCallback((phase: Phase) => {
    phaseRef.current = phase
    const el = containerRef.current
    if (!el) return
    // data属性で全フェーズをCSSから参照可能にする
    el.dataset.phase = phase
  }, [])

  useEffect(() => {
    if (!newsEvent || newsEvent.id === eventIdRef.current) return
    eventIdRef.current = newsEvent.id

    updateDOM('premonition')

    timerRef.current = setTimeout(() => {
      updateDOM('ticker')
      AudioSystem.playSE('news')

      timerRef.current = setTimeout(() => {
        updateDOM('fadeout')

        timerRef.current = setTimeout(() => {
          updateDOM('idle')
          eventIdRef.current = null
          onComplete?.()
        }, FADEOUT_DURATION)
      }, TICKER_DURATION)
    }, PREMONITION_DURATION)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [newsEvent, onComplete, updateDOM])

  if (!newsEvent) return null

  return (
    <div ref={containerRef} data-phase="idle" className="contents group">
      {/* 前兆フェーズ: 赤フラッシュ + 微振動 */}
      <div className="fixed inset-0 pointer-events-none z-[var(--z-news)] bg-[rgba(200,30,30,0.12)] animate-news-shake hidden group-data-[phase=premonition]:block" />

      {/* テロップフェーズ */}
      <div
        className="fixed top-[20%] left-0 w-full z-[var(--z-news-ticker)] pointer-events-none overflow-hidden hidden group-data-[phase=ticker]:block group-data-[phase=fadeout]:block group-data-[phase=fadeout]:opacity-0 transition-opacity duration-500 ease-out"
      >
        <span
          className="inline-block whitespace-nowrap text-lg sm:text-[28px] font-bold text-news-red [text-shadow:0_0_10px_rgba(255,68,68,0.6),0_2px_4px_rgba(0,0,0,0.8)] py-3 px-6 bg-black/85 border-y-2 border-news-red animate-news-ticker-scroll"
        >
          ⚡ {newsEvent.headline}
        </span>
      </div>
    </div>
  )
}
