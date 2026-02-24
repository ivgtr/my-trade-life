import { useEffect, useState } from 'react'
import { useGameContext } from '../state/GameContext'
import { AudioSystem } from '../systems/AudioSystem'
import { formatCurrency, formatPercent } from '../utils/formatUtils'
import MilestoneOverlay, { MILESTONE_TABLE } from '../components/MilestoneOverlay'

interface ReportScreenProps {
  onNext?: () => void
}

export default function ReportScreen({ onNext }: ReportScreenProps) {
  const { gameState } = useGameContext()
  const [milestone, setMilestone] = useState<{ threshold: number; message: string; duration: number } | null>(null)
  const [leveledUp, setLeveledUp] = useState(false)

  const sessionPnL = gameState.sessionPnL ?? 0
  const sessionTrades = gameState.sessionTrades ?? 0
  const sessionWins = gameState.sessionWins ?? 0
  const winRate = sessionTrades > 0 ? sessionWins / sessionTrades : 0

  useEffect(() => {
    if ((gameState as any)._justLeveledUp) {
      setLeveledUp(true)
      AudioSystem.playSE('levelup')
    }

    const balance = gameState.balance
    const passedMilestones = (gameState as any)._passedMilestones ?? []
    for (const ms of MILESTONE_TABLE) {
      if (balance >= ms.threshold && !passedMilestones.includes(ms.threshold)) {
        setMilestone(ms)
        break
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    if (onNext) onNext()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-deepest text-text-primary font-mono">
      <div className="text-xl font-bold mb-6">本日の成果</div>

      <div className={`text-[32px] font-bold mb-4 ${sessionPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
        {formatCurrency(sessionPnL)}
      </div>

      <div className="bg-bg-panel p-4 rounded-lg w-80 mb-4">
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">取引回数</span>
          <span>{sessionTrades}回</span>
        </div>
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">勝率</span>
          <span>{formatPercent(winRate)}</span>
        </div>
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">残高</span>
          <span>{formatCurrency(gameState.balance)}</span>
        </div>
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">レベル</span>
          <span>Lv.{gameState.level}</span>
        </div>
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">経験値</span>
          <span>{gameState.exp ?? 0} EXP</span>
        </div>
      </div>

      {leveledUp && (
        <div className="bg-accent/20 text-accent-light p-3 rounded-lg text-center mb-4 w-80 text-base font-bold border border-accent/40">
          ✨ Level Up! Lv.{gameState.level} に到達！
        </div>
      )}

      {gameState.previewEvent && (
        <div className="bg-warning/15 text-warning p-2.5 rounded-md text-[13px] text-center mb-4 w-80 border border-warning/30">
          ⚠ 明日は高インパクトイベントあり
        </div>
      )}

      <button
        className="py-3.5 px-8 text-base bg-accent text-white border-none rounded-lg cursor-pointer mt-2"
        onClick={handleNext}
      >
        翌日へ進む
      </button>

      <MilestoneOverlay milestone={milestone} onComplete={() => setMilestone(null)} />
    </div>
  )
}
