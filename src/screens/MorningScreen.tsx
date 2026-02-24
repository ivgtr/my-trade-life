import { useGameContext } from '../hooks/useGameContext'

interface MorningScreenProps {
  onStartSession?: () => void
}

const SENTIMENT_LABELS = {
  bullish: '強気',
  bearish: '弱気',
  range: 'レンジ',
  turbulent: '荒れ',
  bubble: 'バブル',
  crash: '暴落',
}

const SENTIMENT_ICONS = {
  bullish: '📈',
  bearish: '📉',
  range: '➡️',
  turbulent: '🌊',
  bubble: '🚀',
  crash: '💥',
}

function getSentimentClass(sentiment: string) {
  if (sentiment === 'bullish' || sentiment === 'bubble') return 'text-profit'
  if (sentiment === 'bearish' || sentiment === 'crash') return 'text-loss'
  return 'text-text-secondary'
}

export default function MorningScreen({ onStartSession }: MorningScreenProps) {
  const { gameState } = useGameContext()
  const level = gameState.level ?? 1
  const dailyCondition = gameState.dailyCondition
  const previewEvent = gameState.previewEvent
  const anomaly = gameState.anomalyInfo

  const handleEnter = () => {
    if (onStartSession) onStartSession()
  }

  const displaySentiment = dailyCondition?.displaySentiment ?? 'range'

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-deepest text-text-primary font-mono">
      <div className="text-xl font-bold mb-6 text-gold">朝の地合い確認</div>

      <div className="bg-bg-panel p-5 rounded-lg w-80 mb-4">
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-text-secondary">今日の地合い</span>
          <span className={getSentimentClass(displaySentiment)}>
            {level >= 2 && SENTIMENT_ICONS[displaySentiment as keyof typeof SENTIMENT_ICONS]}{' '}
            {SENTIMENT_LABELS[displaySentiment as keyof typeof SENTIMENT_LABELS] ?? '不明'}
          </span>
        </div>

        {level >= 3 && dailyCondition && (
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-text-secondary">強度</span>
            <span>{(dailyCondition.actualStrength * 100).toFixed(0)}%</span>
          </div>
        )}

        {level >= 4 && anomaly && anomaly.tendency && (
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-text-secondary">月次傾向</span>
            <span>{anomaly.tendency}</span>
          </div>
        )}
      </div>

      {previewEvent && (
        <div className="bg-warning/15 text-warning p-2.5 rounded-md text-[13px] text-center mb-4 w-80 border border-warning/30">
          ⚠ 高インパクトイベントあり
        </div>
      )}

      <button
        className="py-3.5 px-8 text-base bg-accent text-white border-none rounded-lg cursor-pointer mt-2"
        onClick={handleEnter}
      >
        場に入る
      </button>
    </div>
  )
}
