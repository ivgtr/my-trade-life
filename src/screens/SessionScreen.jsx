import { useRef, useState, useEffect, useCallback } from 'react'
import { useGameContext } from '../state/GameContext'
import { ACTIONS } from '../state/actions'
import { MarketEngine } from '../engine/MarketEngine'
import { TradingEngine } from '../engine/TradingEngine'
import { NewsSystem } from '../engine/NewsSystem'
import { AudioSystem } from '../systems/AudioSystem'
import Chart from '../components/Chart'
import TradePanel from '../components/TradePanel'
import TickerTape from '../components/TickerTape'
import NewsOverlay from '../components/NewsOverlay'
import { formatCurrency } from '../utils/formatUtils'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#0a0a1a',
    color: '#e0e0e0',
    fontFamily: 'monospace',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid #2a2a3e',
    fontSize: '14px',
  },
  main: {
    display: 'flex',
    flex: 1,
    gap: '8px',
    padding: '8px',
  },
  chartArea: {
    flex: 1,
    minWidth: 0,
  },
  sidebar: {
    width: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  speedButton: {
    padding: '6px 12px',
    backgroundColor: '#3a3a4e',
    color: '#e0e0e0',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  speedActive: {
    backgroundColor: '#6366f1',
    color: '#fff',
  },
  timeDisplay: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
}

/**
 * セッション画面。チャート・歩み値・トレードパネル・ニュースオーバーレイを統合する。
 */
export default function SessionScreen({ onEndSession }) {
  const { gameState, dispatch } = useGameContext()
  const chartRef = useRef(null)
  const marketEngineRef = useRef(null)
  const tradingEngineRef = useRef(null)
  const newsSystemRef = useRef(null)
  const [ticks, setTicks] = useState([])
  const [gameTime, setGameTime] = useState('09:00')
  const [activeNews, setActiveNews] = useState(null)
  const [speed, setSpeed] = useState(gameState.speed ?? 1)

  // セッション開始
  useEffect(() => {
    const regimeParams = gameState.regimeParams ?? { drift: 0, volMult: 1.0 }
    const anomalyParams = gameState.anomalyParams ?? { driftBias: 0, volBias: 1.0 }
    const openPrice = gameState.currentPrice ?? 30000

    // NewsSystem
    const newsSystem = new NewsSystem({
      currentRegime: regimeParams.regime ?? 'range',
      onNewsTriggered: (event) => {
        setActiveNews(event)
        const force = newsSystem.getExternalForce(event)
        if (marketEngineRef.current) {
          marketEngineRef.current.injectExternalForce(force)
        }
      },
    })
    newsSystem.scheduleSessionEvents(600000)
    newsSystemRef.current = newsSystem

    // TradingEngine
    const tradingEngine = new TradingEngine({
      balance: gameState.balance,
      maxLeverage: gameState.maxLeverage ?? 1,
    })
    tradingEngineRef.current = tradingEngine

    // MarketEngine
    const marketEngine = new MarketEngine({
      openPrice,
      regimeParams,
      anomalyParams,
      speed,
      onTick: (tickData) => {
        // Chart更新（React再レンダリング回避）
        chartRef.current?.updateTick(tickData)

        // 歩み値追加
        setTicks((prev) => [...prev.slice(-99), tickData])

        // ゲーム内時刻更新
        const time = marketEngineRef.current?.getCurrentTime()
        if (time) setGameTime(time.formatted)

        // 含み損益再計算
        tradingEngine.recalculateUnrealized(tickData.price)

        // state更新
        dispatch({
          type: ACTIONS.TICK_UPDATE,
          payload: {
            currentPrice: tickData.price,
            unrealizedPnL: tradingEngine.getUnrealizedPnL(),
            positions: tradingEngine.getPositions(),
          },
        })

        // ニュース発動チェック
        newsSystem.checkTriggers(tickData.timestamp)
      },
      onSessionEnd: () => {
        // 強制決済
        const results = tradingEngine.forceCloseAll(marketEngine.getCurrentTime().totalMinutes)
        const summary = tradingEngine.getDailySummary()

        if (onEndSession) {
          onEndSession({ results, summary })
        } else {
          dispatch({
            type: ACTIONS.END_SESSION,
            payload: { results, summary },
          })
          dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'report' } })
        }
      },
    })
    marketEngineRef.current = marketEngine
    marketEngine.start()

    dispatch({ type: ACTIONS.START_SESSION })

    return () => {
      marketEngine.stop()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuy = useCallback((lots, leverage) => {
    const te = tradingEngineRef.current
    if (!te) return
    const pos = te.openPosition('LONG', lots, gameState.currentPrice, leverage)
    if (pos) {
      dispatch({ type: ACTIONS.OPEN_POSITION, payload: pos })
      AudioSystem.playSE('entry')
    }
  }, [gameState.currentPrice, dispatch])

  const handleSell = useCallback((lots, leverage) => {
    const te = tradingEngineRef.current
    if (!te) return
    const pos = te.openPosition('SHORT', lots, gameState.currentPrice, leverage)
    if (pos) {
      dispatch({ type: ACTIONS.OPEN_POSITION, payload: pos })
      AudioSystem.playSE('entry')
    }
  }, [gameState.currentPrice, dispatch])

  const handleClose = useCallback((positionId) => {
    const te = tradingEngineRef.current
    if (!te) return
    const result = te.closePosition(positionId, gameState.currentPrice)
    if (result) {
      dispatch({ type: ACTIONS.CLOSE_POSITION, payload: result })
      AudioSystem.playSE(result.pnl >= 0 ? 'profit' : 'loss')
    }
  }, [gameState.currentPrice, dispatch])

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed)
    marketEngineRef.current?.setSpeed(newSpeed)
    dispatch({ type: ACTIONS.SET_SPEED, payload: { speed: newSpeed } })
  }

  const handleNewsComplete = useCallback(() => {
    setActiveNews(null)
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.timeDisplay}>{gameTime}</span>
        <span>残高: {formatCurrency(gameState.balance)}</span>
        <span style={{ color: (gameState.unrealizedPnL ?? 0) >= 0 ? '#26a69a' : '#ef5350' }}>
          含み: {formatCurrency(gameState.unrealizedPnL ?? 0)}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            style={{ ...styles.speedButton, ...(speed === 1 ? styles.speedActive : {}) }}
            onClick={() => handleSpeedChange(1)}
          >
            1x
          </button>
          <button
            style={{ ...styles.speedButton, ...(speed === 2 ? styles.speedActive : {}) }}
            onClick={() => handleSpeedChange(2)}
          >
            2x
          </button>
        </div>
      </div>

      <div style={styles.main}>
        <div style={styles.chartArea}>
          <Chart ref={chartRef} height={360} />
          <TickerTape ticks={ticks} maxDisplay={30} />
        </div>
        <div style={styles.sidebar}>
          <TradePanel
            balance={gameState.balance}
            unrealizedPnL={gameState.unrealizedPnL ?? 0}
            positions={gameState.positions ?? []}
            maxLeverage={gameState.maxLeverage ?? 1}
            unlockedLeverages={[1, 2, 3, 5, 10].filter((l) => l <= (gameState.maxLeverage ?? 1))}
            onBuy={handleBuy}
            onSell={handleSell}
            onClose={handleClose}
          />
        </div>
      </div>

      <NewsOverlay newsEvent={activeNews} onComplete={handleNewsComplete} />
    </div>
  )
}
