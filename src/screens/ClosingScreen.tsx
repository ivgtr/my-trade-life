import { useGameContext } from '../hooks/useGameContext'
import { formatCurrency } from '../utils/formatUtils'

interface ClosingScreenProps {
  onCloseAll: () => void
  onCarryOver: () => void
}

export default function ClosingScreen({ onCloseAll, onCarryOver }: ClosingScreenProps) {
  const { gameState } = useGameContext()
  const positions = gameState.positions
  const unrealizedPnL = gameState.unrealizedPnL

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-deepest text-text-primary font-mono">
      <div className="text-xl font-bold mb-6 text-gold">大引け</div>

      <div className="bg-bg-panel p-5 rounded-lg w-80 mb-4">
        <div className="text-sm text-text-secondary mb-3">未決済ポジション</div>
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-text-secondary">ポジション数</span>
          <span>{positions.length}件</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">含み損益</span>
          <span className={unrealizedPnL >= 0 ? 'text-profit' : 'text-loss'}>
            {formatCurrency(unrealizedPnL)}
          </span>
        </div>
      </div>

      <div className="bg-warning/10 text-warning p-3 rounded-md text-xs text-center mb-6 w-80 border border-warning/30">
        持ち越した場合、翌朝の寄り付き(GU/GD後)で全ポジションが強制決済されます
      </div>

      <div className="flex gap-4">
        <button
          className="py-3 px-6 text-sm bg-accent text-white border-none rounded-lg cursor-pointer"
          onClick={onCloseAll}
        >
          全決済する
        </button>
        <button
          className="py-3 px-6 text-sm bg-bg-panel text-text-primary border border-text-secondary/30 rounded-lg cursor-pointer"
          onClick={onCarryOver}
        >
          翌日に持ち越す
        </button>
      </div>
    </div>
  )
}
