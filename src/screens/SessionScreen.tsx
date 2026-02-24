import { useRef, useState, useEffect, useCallback } from 'react'
import { useGameContext } from '../state/GameContext'
import { ACTIONS } from '../state/actions'
import { MarketEngine } from '../engine/MarketEngine'
import { TradingEngine } from '../engine/TradingEngine'
import { NewsSystem } from '../engine/NewsSystem'
import { AudioSystem } from '../systems/AudioSystem'
import { useResponsive } from '../hooks/useMediaQuery'
import Chart from '../components/Chart'
import TradePanel from '../components/TradePanel'
import TickerTape from '../components/TickerTape'
import NewsOverlay from '../components/NewsOverlay'
import { formatCurrency } from '../utils/formatUtils'
import type { NewsEvent } from '../types/news'

interface SessionScreenProps {
  onEndSession?: (data: { results: unknown; summary: unknown }) => void
}

function getStyles(isMobile: boolean) {
  return {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      overflow: 'hidden',
      backgroundColor: '#0a0a1a',
      color: '#e0e0e0',
      fontFamily: 'monospace',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isMobile ? '6px 10px' : '8px 16px',
      backgroundColor: '#1a1a2e',
      borderBottom: '1px solid #2a2a3e',
      fontSize: isMobile ? '12px' : '14px',
      flexShrink: 0,
      flexWrap: isMobile ? 'wrap' : 'nowrap',
      gap: isMobile ? '4px' : '0',
    },
    headerRow1: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    headerRow2: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      fontSize: '12px',
    },
    main: {
      display: 'flex',
      flexDirection: 'row',
      flex: 1,
      overflow: 'hidden',
      minHeight: 0,
    },
    tickerColumn: {
      width: '180px',
      flexShrink: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      borderRight: '1px solid #2a2a3e',
    },
    chartArea: {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      overflow: 'hidden',
    },
    tradePanel: {
      width: '300px',
      flexShrink: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      borderLeft: '1px solid #2a2a3e',
    },
    /* モバイル用 */
    tabBar: {
      display: 'flex',
      flexShrink: 0,
      height: '36px',
      backgroundColor: '#1a1a2e',
      borderBottom: '1px solid #2a2a3e',
    },
    tab: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '13px',
      cursor: 'pointer',
      border: 'none',
      backgroundColor: 'transparent',
      color: '#a0a0b0',
      fontFamily: 'monospace',
    },
    tabActive: {
      color: '#e0e0e0',
      borderBottom: '2px solid #6366f1',
    },
    mobileContent: {
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
    },
    speedButton: {
      padding: isMobile ? '4px 8px' : '6px 12px',
      backgroundColor: '#3a3a4e',
      color: '#e0e0e0',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '12px' : '13px',
    },
    speedActive: {
      backgroundColor: '#6366f1',
      color: '#fff',
    },
    timeDisplay: {
      fontSize: isMobile ? '16px' : '18px',
      fontWeight: 'bold',
    },
  } as const
}

export default function SessionScreen({ onEndSession }: SessionScreenProps) {
  const { gameState, dispatch } = useGameContext()
  const { isMobile } = useResponsive()
  const chartRef = useRef<any>(null)
  const marketEngineRef = useRef<any>(null)
  const tradingEngineRef = useRef<any>(null)
  const newsSystemRef = useRef<any>(null)
  const [ticks, setTicks] = useState<any[]>([])
  const [gameTime, setGameTime] = useState('09:00')
  const [activeNews, setActiveNews] = useState<NewsEvent | null>(null)
  const [speed, setSpeed] = useState(gameState.speed ?? 1)
  const [mobileTab, setMobileTab] = useState('chart')

  const styles = getStyles(isMobile)

  useEffect(() => {
    const regimeParams = gameState.regimeParams ?? { drift: 0, volMult: 1.0, regime: 'range' as const }
    const anomalyParams = gameState.anomalyParams ?? { driftBias: 0, volBias: 1.0, tendency: '' }
    const openPrice = gameState.currentPrice ?? 30000

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
    newsSystem.scheduleSessionEvents(180000)
    newsSystemRef.current = newsSystem

    const tradingEngine = new TradingEngine({
      balance: gameState.balance,
      maxLeverage: gameState.maxLeverage ?? 1,
    })
    tradingEngineRef.current = tradingEngine

    const marketEngine = new MarketEngine({
      openPrice,
      regimeParams,
      anomalyParams,
      speed,
      onTick: (tickData) => {
        chartRef.current?.updateTick(tickData)
        setTicks((prev) => [...prev.slice(-99), tickData])

        const time = marketEngineRef.current?.getCurrentTime()
        if (time) setGameTime(time.formatted)

        const { total: unrealizedPnL } = tradingEngine.recalculateUnrealized(tickData.price)

        dispatch({
          type: ACTIONS.TICK_UPDATE,
          payload: {
            currentPrice: tickData.price,
            unrealizedPnL,
            positions: tradingEngine.getPositions(),
          },
        })

        newsSystem.checkTriggers(tickData.timestamp)
      },
      onSessionEnd: () => {
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

  const handleBuy = useCallback((shares: number, leverage: number) => {
    const te = tradingEngineRef.current
    if (!te) return
    const pos = te.openPosition('LONG', shares, gameState.currentPrice, leverage)
    if (pos) {
      dispatch({ type: ACTIONS.OPEN_POSITION, payload: { position: pos } })
      AudioSystem.playSE('entry')
    }
  }, [gameState.currentPrice, dispatch])

  const handleSell = useCallback((shares: number, leverage: number) => {
    const te = tradingEngineRef.current
    if (!te) return
    const pos = te.openPosition('SHORT', shares, gameState.currentPrice, leverage)
    if (pos) {
      dispatch({ type: ACTIONS.OPEN_POSITION, payload: { position: pos } })
      AudioSystem.playSE('entry')
    }
  }, [gameState.currentPrice, dispatch])

  const handleClose = useCallback((positionId: string) => {
    const te = tradingEngineRef.current
    if (!te) return
    const result = te.closePosition(positionId, gameState.currentPrice)
    if (result) {
      dispatch({ type: ACTIONS.CLOSE_POSITION, payload: result })
      AudioSystem.playSE(result.pnl >= 0 ? 'profit' : 'loss')
    }
  }, [gameState.currentPrice, dispatch])

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed)
    marketEngineRef.current?.setSpeed(newSpeed)
    dispatch({ type: ACTIONS.SET_SPEED, payload: { speed: newSpeed } })
  }

  const handleNewsComplete = useCallback(() => {
    setActiveNews(null)
  }, [])

  const unrealizedPnL = gameState.unrealizedPnL ?? 0
  const positions = gameState.positions ?? []
  const leverageOptions = [1, 2, 3, 3.3].filter((l) => l <= (gameState.maxLeverage ?? 1))

  const speedButtons = (
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
  )

  /* ─── モバイルレイアウト ─── */
  if (isMobile) {
    return (
      <div style={styles.container}>
        {/* ヘッダー2行 */}
        <div style={styles.header}>
          <div style={styles.headerRow1}>
            <span style={styles.timeDisplay}>{gameTime}</span>
            {speedButtons}
          </div>
          <div style={styles.headerRow2}>
            <span>残高: {formatCurrency(gameState.balance)}</span>
            <span style={{ color: unrealizedPnL >= 0 ? '#26a69a' : '#ef5350' }}>
              含み: {formatCurrency(unrealizedPnL)}
            </span>
          </div>
        </div>

        {/* タブバー */}
        <div style={styles.tabBar}>
          <button
            style={{ ...styles.tab, ...(mobileTab === 'chart' ? styles.tabActive : {}) }}
            onClick={() => setMobileTab('chart')}
          >
            チャート
          </button>
          <button
            style={{ ...styles.tab, ...(mobileTab === 'ticker' ? styles.tabActive : {}) }}
            onClick={() => setMobileTab('ticker')}
          >
            歩み値
          </button>
        </div>

        {/* メインコンテンツ */}
        <div style={styles.mobileContent}>
          {mobileTab === 'chart' ? (
            <Chart ref={chartRef} autoSize />
          ) : (
            <TickerTape ticks={ticks} maxDisplay={50} compact />
          )}
        </div>

        {/* ポジション概要 + フッターバー（TradePanel compact） */}
        <TradePanel
          balance={gameState.balance}
          unrealizedPnL={unrealizedPnL}
          positions={positions}
          maxLeverage={gameState.maxLeverage ?? 1}
          unlockedLeverages={leverageOptions}
          onBuy={handleBuy}
          onSell={handleSell}
          onClose={handleClose}
          compact
        />

        <NewsOverlay newsEvent={activeNews} onComplete={handleNewsComplete} />
      </div>
    )
  }

  /* ─── PCレイアウト: 3カラム ─── */
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.timeDisplay}>{gameTime}</span>
        <span>残高: {formatCurrency(gameState.balance)}</span>
        <span style={{ color: unrealizedPnL >= 0 ? '#26a69a' : '#ef5350' }}>
          含み: {formatCurrency(unrealizedPnL)}
        </span>
        {speedButtons}
      </div>

      <div style={styles.main}>
        {/* 歩み値 左カラム */}
        <div style={styles.tickerColumn}>
          <TickerTape ticks={ticks} maxDisplay={50} />
        </div>

        {/* チャート 中央 */}
        <div style={styles.chartArea}>
          <Chart ref={chartRef} autoSize />
        </div>

        {/* トレードパネル 右カラム */}
        <div style={styles.tradePanel}>
          <TradePanel
            balance={gameState.balance}
            unrealizedPnL={unrealizedPnL}
            positions={positions}
            maxLeverage={gameState.maxLeverage ?? 1}
            unlockedLeverages={leverageOptions}
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
