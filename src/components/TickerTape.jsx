import { useEffect, useRef } from 'react'
import { formatCurrency } from '../utils/formatUtils'

function getStyles(compact) {
  const fontSize = compact ? '11px' : '12px'
  const padding = compact ? '2px' : '8px'

  return {
    container: {
      backgroundColor: '#1a1a2e',
      color: '#e0e0e0',
      padding,
      fontFamily: 'monospace',
      fontSize,
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
    },
    title: {
      fontSize,
      color: '#a0a0b0',
      marginBottom: '4px',
      borderBottom: '1px solid #2a2a3e',
      paddingBottom: '4px',
    },
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: compact ? '1px 2px' : '2px 4px',
      borderBottom: '1px solid #1e1e30',
    },
    time: {
      color: '#a0a0b0',
      minWidth: compact ? '36px' : '42px',
    },
    volume: {
      color: '#a0a0b0',
      minWidth: compact ? '40px' : '50px',
      textAlign: 'right',
    },
    up: { color: '#26a69a' },
    down: { color: '#ef5350' },
    neutral: { color: '#a0a0b0' },
  }
}

function formatTime(timestamp) {
  const hours = Math.floor(timestamp / 60)
  const minutes = Math.floor(timestamp % 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export default function TickerTape({ ticks, maxDisplay = 50, compact = false }) {
  const scrollRef = useRef(null)
  const styles = getStyles(compact)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [ticks])

  if (!ticks || ticks.length === 0) return null

  const displayTicks = ticks.slice(-maxDisplay)

  return (
    <div style={styles.container} ref={scrollRef}>
      <div style={styles.title}>歩み値</div>
      {displayTicks.map((tick, i) => {
        const prevPrice = i > 0 ? displayTicks[i - 1].price : tick.price
        let priceStyle = styles.neutral
        if (tick.price > prevPrice) priceStyle = styles.up
        else if (tick.price < prevPrice) priceStyle = styles.down

        return (
          <div key={i} style={styles.row}>
            <span style={styles.time}>{formatTime(tick.timestamp)}</span>
            <span style={priceStyle}>{formatCurrency(tick.price)}</span>
            <span style={styles.volume}>{tick.volume.toLocaleString()}</span>
          </div>
        )
      })}
    </div>
  )
}
