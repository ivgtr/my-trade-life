import { useState, useEffect } from 'react'
import { useGameContext } from '../hooks/useGameContext'
import { formatCurrency } from '../utils/formatUtils'

interface GameOverScreenProps {
  onRetry?: () => void
}

const GAME_OVER_MESSAGES = [
  '市場はあなたを忘れた。',
  'また来世。',
  '残高：¥0　経験：プライスレス',
  '相場は続く。あなたは続かなかった。',
  '損切りは早く、利確は遅く。逆でしたね。',
  '次は必ずうまくいく。きっと。たぶん。',
  '板の向こうで誰かが今日も儲けている。',
  'お疲れ様でした。市場はお疲れではありません。',
  '証拠金維持率：計算不能',
  'これはゲームです。現実ではありません。たぶん。',
]

export default function GameOverScreen({ onRetry }: GameOverScreenProps) {
  const { gameState } = useGameContext()
  const [visible, setVisible] = useState(false)
  const [message] = useState(
    () => GAME_OVER_MESSAGES[Math.floor(Math.random() * GAME_OVER_MESSAGES.length)],
  )

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-dvh bg-bg-darkest text-text-muted font-mono transition-opacity duration-2000 ease-in"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="text-[22px] font-bold text-center max-w-[400px] leading-relaxed mb-12 text-text-dim transition-opacity duration-3000 ease-in"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {message}
      </div>

      <div
        className="mb-12 text-center transition-opacity duration-2000 ease-in delay-2000"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <div className="text-[13px] mb-1.5 text-text-dimmer">最終残高: {formatCurrency(gameState.balance ?? 0)}</div>
        <div className="text-[13px] mb-1.5 text-text-dimmer">到達日数: {gameState.day ?? 0}日</div>
        <div className="text-[13px] mb-1.5 text-text-dimmer">総取引回数: {gameState.totalTrades ?? 0}回</div>
      </div>

      <button
        className="py-2 px-5 bg-transparent text-text-muted border border-[#333] rounded-md text-xs cursor-pointer transition-opacity duration-2000 ease-in delay-4000"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={() => onRetry?.()}
      >
        もう一度
      </button>
    </div>
  )
}
