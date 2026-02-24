import { useEffect, useState } from 'react'
import { useGameContext } from '../state/GameContext'
import { AudioSystem } from '../systems/AudioSystem'
import { formatCurrency } from '../utils/formatUtils'

interface BillionaireScreenProps {
  onContinue?: () => void
  onRestart?: () => void
}

const CONFETTI_COUNT = 40

const confettiColors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7']

export default function BillionaireScreen({ onContinue, onRestart }: BillionaireScreenProps) {
  const { gameState } = useGameContext()
  const [showFlash, setShowFlash] = useState(true)
  const [confettiItems] = useState(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    })),
  )

  useEffect(() => {
    AudioSystem.playSE('milestoneBig')
    const timer = setTimeout(() => setShowFlash(false), 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative flex flex-col items-center justify-center min-h-dvh bg-bg-black text-gold font-mono overflow-hidden">
      {showFlash && (
        <div
          className="fixed inset-0 bg-white z-[var(--z-flash)] pointer-events-none transition-opacity duration-300"
          style={{ opacity: showFlash ? 1 : 0 }}
        />
      )}

      {confettiItems.map((c) => (
        <div
          key={c.id}
          className="fixed top-[-20px] rounded-sm z-5 pointer-events-none"
          style={{
            left: `${c.left}%`,
            width: `${c.size}px`,
            height: `${c.size}px`,
            backgroundColor: c.color,
            animation: `confettiFall ${c.duration}s linear ${c.delay}s infinite`,
          }}
        />
      ))}

      <div className="text-5xl font-bold tracking-[8px] [text-shadow:0_0_30px_rgba(255,215,0,0.6),0_0_60px_rgba(255,215,0,0.3)] mb-8 z-[var(--z-content)]">
        BILLIONAIRE
      </div>

      <div className="bg-gold/8 border border-gold/30 p-5 rounded-xl w-80 mb-8 z-[var(--z-content)]">
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-gold-dark">最終残高</span>
          <span className="text-gold">{formatCurrency(gameState.balance)}</span>
        </div>
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-gold-dark">達成日数</span>
          <span className="text-gold">{gameState.day ?? 0}日</span>
        </div>
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-gold-dark">総取引回数</span>
          <span className="text-gold">{gameState.totalTrades ?? 0}回</span>
        </div>
      </div>

      <div className="flex gap-4 z-[var(--z-content)]">
        <button
          className="py-3 px-6 text-sm bg-gold text-bg-black border-none rounded-lg cursor-pointer font-bold"
          onClick={() => onContinue?.()}
        >
          エンドレスモードで続ける
        </button>
        <button
          className="py-3 px-6 text-sm bg-transparent text-gold border border-gold rounded-lg cursor-pointer"
          onClick={() => onRestart?.()}
        >
          最初からやり直す
        </button>
      </div>
    </div>
  )
}
