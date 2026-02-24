import { useState } from 'react'
import { formatCurrency } from '../utils/formatUtils'

const styles = {
  container: {
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    padding: '12px',
    borderRadius: '8px',
    fontFamily: 'monospace',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '14px',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '8px',
  },
  label: {
    fontSize: '12px',
    color: '#a0a0b0',
    minWidth: '52px',
  },
  input: {
    backgroundColor: '#2a2a3e',
    color: '#e0e0e0',
    border: '1px solid #3a3a4e',
    borderRadius: '4px',
    padding: '6px 8px',
    fontSize: '14px',
    width: '80px',
    textAlign: 'right',
  },
  select: {
    backgroundColor: '#2a2a3e',
    color: '#e0e0e0',
    border: '1px solid #3a3a4e',
    borderRadius: '4px',
    padding: '6px 8px',
    fontSize: '14px',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  buyButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#26a69a',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  sellButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#ef5350',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  positionList: {
    maxHeight: '200px',
    overflowY: 'auto',
  },
  positionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #2a2a3e',
    fontSize: '12px',
  },
  closeButton: {
    padding: '4px 8px',
    backgroundColor: '#555',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  pnlPositive: { color: '#26a69a' },
  pnlNegative: { color: '#ef5350' },
  pnlZero: { color: '#a0a0b0' },
  sectionTitle: {
    fontSize: '12px',
    color: '#a0a0b0',
    marginBottom: '6px',
    borderBottom: '1px solid #2a2a3e',
    paddingBottom: '4px',
  },
}

function getPnlStyle(value) {
  if (value > 0) return styles.pnlPositive
  if (value < 0) return styles.pnlNegative
  return styles.pnlZero
}

/**
 * トレード操作パネル。
 * ロット入力・BUY/SELL・レバレッジ選択・ポジション一覧を表示する。
 */
export default function TradePanel({
  balance,
  unrealizedPnL,
  positions,
  maxLeverage,
  unlockedLeverages,
  onBuy,
  onSell,
  onClose,
}) {
  const [lots, setLots] = useState(1)
  const [leverage, setLeverage] = useState(1)

  const leverageOptions = (unlockedLeverages ?? [1]).filter((l) => l <= maxLeverage)

  const handleLotChange = (e) => {
    const v = Math.max(1, parseInt(e.target.value, 10) || 1)
    setLots(v)
  }

  return (
    <div style={styles.container}>
      {/* 残高・含み損益 */}
      <div style={styles.header}>
        <span>残高: {formatCurrency(balance)}</span>
        <span style={getPnlStyle(unrealizedPnL)}>
          含み: {formatCurrency(unrealizedPnL)}
        </span>
      </div>

      {/* ロット入力・レバレッジ選択 */}
      <div style={styles.inputRow}>
        <span style={styles.label}>ロット</span>
        <input
          type="number"
          min="1"
          value={lots}
          onChange={handleLotChange}
          style={styles.input}
        />
        <span style={styles.label}>レバ</span>
        <select
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          style={styles.select}
        >
          {leverageOptions.map((l) => (
            <option key={l} value={l}>{l}x</option>
          ))}
        </select>
      </div>

      {/* BUY/SELL ボタン */}
      <div style={styles.buttonRow}>
        <button style={styles.buyButton} onClick={() => onBuy(lots, leverage)}>
          BUY
        </button>
        <button style={styles.sellButton} onClick={() => onSell(lots, leverage)}>
          SELL
        </button>
      </div>

      {/* ポジション一覧 */}
      {positions && positions.length > 0 && (
        <div>
          <div style={styles.sectionTitle}>保有ポジション</div>
          <div style={styles.positionList}>
            {positions.map((pos) => (
              <div key={pos.id} style={styles.positionItem}>
                <span style={{ color: pos.direction === 'LONG' ? '#26a69a' : '#ef5350' }}>
                  {pos.direction}
                </span>
                <span>{pos.lots}lot</span>
                <span>{formatCurrency(pos.entryPrice)}</span>
                <span style={getPnlStyle(pos.unrealizedPnL)}>
                  {formatCurrency(pos.unrealizedPnL)}
                </span>
                <button style={styles.closeButton} onClick={() => onClose(pos.id)}>
                  決済
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
