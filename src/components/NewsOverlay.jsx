import { useEffect, useState, useRef } from 'react'
import { AudioSystem } from '../systems/AudioSystem'

/** 前兆フェーズの実時間（ms） */
const PREMONITION_DURATION = 1500
/** テロップフェーズの実時間（ms） */
const TICKER_DURATION = 2500
/** フェードアウトフェーズの実時間（ms） */
const FADEOUT_DURATION = 500

const overlayBase = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 1000,
}

const flashStyle = {
  ...overlayBase,
  backgroundColor: 'rgba(200, 30, 30, 0.12)',
}

const tickerContainerStyle = {
  position: 'fixed',
  top: '20%',
  left: 0,
  width: '100%',
  zIndex: 1001,
  pointerEvents: 'none',
  overflow: 'hidden',
}

const tickerTextBase = {
  display: 'inline-block',
  whiteSpace: 'nowrap',
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#ff4444',
  textShadow: '0 0 10px rgba(255, 68, 68, 0.6), 0 2px 4px rgba(0,0,0,0.8)',
  padding: '12px 24px',
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  borderTop: '2px solid #ff4444',
  borderBottom: '2px solid #ff4444',
}

/** 微振動アニメーション用のCSS keyframes を注入する */
let injectedStyle = false
function injectShakeStyle() {
  if (injectedStyle) return
  injectedStyle = true
  const style = document.createElement('style')
  style.textContent = `
    @keyframes newsShake {
      0%, 100% { transform: translate(0, 0); }
      10% { transform: translate(-2px, 1px); }
      20% { transform: translate(2px, -1px); }
      30% { transform: translate(-1px, 2px); }
      40% { transform: translate(1px, -2px); }
      50% { transform: translate(-2px, 0); }
      60% { transform: translate(2px, 1px); }
      70% { transform: translate(-1px, -1px); }
      80% { transform: translate(1px, 2px); }
      90% { transform: translate(0, -1px); }
    }
    @keyframes newsTickerScroll {
      0% { transform: translateX(100vw); }
      100% { transform: translateX(-100%); }
    }
  `
  document.head.appendChild(style)
}

/**
 * ブレイキングニュース演出オーバーレイ。
 * 前兆→テロップ→フェードアウトの演出シーケンスを実時間固定で再生する。
 */
export default function NewsOverlay({ newsEvent, onComplete }) {
  // 'idle' | 'premonition' | 'ticker' | 'fadeout'
  const [phase, setPhase] = useState('idle')
  const timerRef = useRef(null)
  const eventIdRef = useRef(null)

  useEffect(() => {
    injectShakeStyle()
  }, [])

  useEffect(() => {
    if (!newsEvent || newsEvent.id === eventIdRef.current) return
    eventIdRef.current = newsEvent.id

    // 前兆フェーズ開始
    setPhase('premonition')

    timerRef.current = setTimeout(() => {
      // テロップフェーズ開始 + SE発火
      setPhase('ticker')
      AudioSystem.playSE('news')

      timerRef.current = setTimeout(() => {
        // フェードアウト
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
      {/* 前兆フェーズ: 赤フラッシュ + 微振動 */}
      {phase === 'premonition' && (
        <div
          style={{
            ...flashStyle,
            animation: 'newsShake 0.15s infinite',
          }}
        />
      )}

      {/* テロップフェーズ */}
      {(phase === 'ticker' || phase === 'fadeout') && (
        <div
          style={{
            ...tickerContainerStyle,
            opacity: phase === 'fadeout' ? 0 : 1,
            transition: `opacity ${FADEOUT_DURATION}ms ease-out`,
          }}
        >
          <span
            style={{
              ...tickerTextBase,
              animation: `newsTickerScroll ${TICKER_DURATION}ms linear`,
            }}
          >
            ⚡ {newsEvent?.headline}
          </span>
        </div>
      )}
    </>
  )
}
