import { useState } from 'react'
import { formatCurrency } from '../utils/formatUtils'

function getPnlStyle(value) {
  if (value > 0) return { color: '#26a69a' }
  if (value < 0) return { color: '#ef5350' }
  return { color: '#a0a0b0' }
}

/* ─── デスクトップスタイル ─── */
const desktopStyles = {
  container: {
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    padding: '12px',
    fontFamily: 'monospace',
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
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
  quickButtonRow: {
    display: 'flex',
    gap: '4px',
    marginBottom: '8px',
  },
  quickButton: {
    padding: '4px 10px',
    backgroundColor: '#2a2a3e',
    color: '#e0e0e0',
    border: '1px solid #3a3a4e',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  resetButton: {
    padding: '4px 10px',
    backgroundColor: '#3a2a2e',
    color: '#ef5350',
    border: '1px solid #4a3a3e',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
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
  sectionTitle: {
    fontSize: '12px',
    color: '#a0a0b0',
    marginBottom: '6px',
    borderBottom: '1px solid #2a2a3e',
    paddingBottom: '4px',
  },
}

/* ─── モバイルスタイル ─── */
const mobileStyles = {
  footerBar: {
    display: 'flex',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#1a1a2e',
    borderTop: '1px solid #2a2a3e',
    flexShrink: 0,
    height: '56px',
    alignItems: 'center',
    fontFamily: 'monospace',
  },
  footerButton: {
    flex: 1,
    padding: '0',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    minHeight: '44px',
  },
  positionSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#1a1a2e',
    borderTop: '1px solid #2a2a3e',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#e0e0e0',
    flexShrink: 0,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 900,
    display: 'flex',
    alignItems: 'flex-end',
  },
  modal: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
    padding: '20px 16px',
    fontFamily: 'monospace',
    color: '#e0e0e0',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  modalInputRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '12px',
  },
  modalLabel: {
    fontSize: '13px',
    color: '#a0a0b0',
    minWidth: '60px',
  },
  modalInput: {
    backgroundColor: '#2a2a3e',
    color: '#e0e0e0',
    border: '1px solid #3a3a4e',
    borderRadius: '4px',
    padding: '10px 12px',
    fontSize: '16px',
    flex: 1,
    textAlign: 'right',
    minHeight: '44px',
  },
  modalSelect: {
    backgroundColor: '#2a2a3e',
    color: '#e0e0e0',
    border: '1px solid #3a3a4e',
    borderRadius: '4px',
    padding: '10px 12px',
    fontSize: '16px',
    minHeight: '44px',
  },
  modalQuickRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  modalQuickButton: {
    flex: 1,
    padding: '10px 0',
    backgroundColor: '#2a2a3e',
    color: '#e0e0e0',
    border: '1px solid #3a3a4e',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    minHeight: '44px',
  },
  modalResetButton: {
    flex: 1,
    padding: '10px 0',
    backgroundColor: '#3a2a2e',
    color: '#ef5350',
    border: '1px solid #4a3a3e',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    minHeight: '44px',
  },
  modalConfirmButton: {
    width: '100%',
    padding: '14px',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    minHeight: '48px',
    marginTop: '8px',
  },
}

/* ─── デスクトップ版 ─── */
function DesktopTradePanel({
  balance,
  unrealizedPnL,
  positions,
  leverageOptions,
  shares,
  setShares,
  leverage,
  setLeverage,
  onBuy,
  onSell,
  onClose,
}) {
  const addShares = (amount) => setShares((prev) => Math.max(1, prev + amount))

  return (
    <div style={desktopStyles.container}>
      <div style={desktopStyles.header}>
        <span>残高: {formatCurrency(balance)}</span>
        <span style={getPnlStyle(unrealizedPnL)}>
          含み: {formatCurrency(unrealizedPnL)}
        </span>
      </div>

      <div style={desktopStyles.inputRow}>
        <span style={desktopStyles.label}>株数</span>
        <input
          type="number"
          min="1"
          value={shares}
          onChange={(e) => setShares(Math.max(1, parseInt(e.target.value, 10) || 1))}
          style={desktopStyles.input}
        />
        <span style={desktopStyles.label}>信用倍率</span>
        <select
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          style={desktopStyles.select}
        >
          {leverageOptions.map((l) => (
            <option key={l} value={l}>{l}x</option>
          ))}
        </select>
      </div>

      <div style={desktopStyles.quickButtonRow}>
        <button style={desktopStyles.quickButton} onClick={() => addShares(1)}>+1</button>
        <button style={desktopStyles.quickButton} onClick={() => addShares(10)}>+10</button>
        <button style={desktopStyles.quickButton} onClick={() => addShares(100)}>+100</button>
        <button style={desktopStyles.resetButton} onClick={() => setShares(1)}>C</button>
      </div>

      <div style={desktopStyles.buttonRow}>
        <button style={desktopStyles.buyButton} onClick={() => onBuy(shares, leverage)}>
          BUY
        </button>
        <button style={desktopStyles.sellButton} onClick={() => onSell(shares, leverage)}>
          SELL
        </button>
      </div>

      {positions && positions.length > 0 && (
        <div>
          <div style={desktopStyles.sectionTitle}>保有ポジション</div>
          <div style={desktopStyles.positionList}>
            {positions.map((pos) => (
              <div key={pos.id} style={desktopStyles.positionItem}>
                <span style={{ color: pos.direction === 'LONG' ? '#26a69a' : '#ef5350' }}>
                  {pos.direction}
                </span>
                <span>{pos.shares}株</span>
                <span>{formatCurrency(pos.entryPrice)}</span>
                <span style={getPnlStyle(pos.unrealizedPnL)}>
                  {formatCurrency(pos.unrealizedPnL)}
                </span>
                <button style={desktopStyles.closeButton} onClick={() => onClose(pos.id)}>
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

/* ─── モバイル版: ポジション概要行 ─── */
function MobilePositionSummary({ positions }) {
  if (!positions || positions.length === 0) return null

  const totalPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnL ?? 0), 0)
  const totalShares = positions.reduce((sum, p) => sum + p.shares, 0)
  const direction = positions[0]?.direction ?? ''

  return (
    <div style={mobileStyles.positionSummary}>
      <span>
        ポジション:{' '}
        <span style={{ color: direction === 'LONG' ? '#26a69a' : '#ef5350' }}>
          {direction}
        </span>{' '}
        {totalShares}株
      </span>
      <span style={getPnlStyle(totalPnl)}>{formatCurrency(totalPnl)}</span>
    </div>
  )
}

/* ─── モバイル版: フッターバー ─── */
function MobileFooterBar({ onBuyTap, onSellTap }) {
  return (
    <div style={mobileStyles.footerBar}>
      <button
        style={{ ...mobileStyles.footerButton, backgroundColor: '#26a69a' }}
        onClick={onBuyTap}
      >
        BUY
      </button>
      <button
        style={{ ...mobileStyles.footerButton, backgroundColor: '#ef5350' }}
        onClick={onSellTap}
      >
        SELL
      </button>
    </div>
  )
}

/* ─── モバイル版: 注文モーダル ─── */
function OrderModal({
  side,
  shares,
  setShares,
  leverage,
  setLeverage,
  leverageOptions,
  onConfirm,
  onCancel,
}) {
  const isBuy = side === 'BUY'
  const color = isBuy ? '#26a69a' : '#ef5350'
  const label = isBuy ? '買い注文' : '売り注文'

  const addShares = (amount) => setShares((prev) => Math.max(1, prev + amount))

  return (
    <div style={mobileStyles.overlay} onClick={onCancel}>
      <div style={mobileStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...mobileStyles.modalTitle, color }}>{label}</div>

        <div style={mobileStyles.modalInputRow}>
          <span style={mobileStyles.modalLabel}>株数</span>
          <input
            type="number"
            min="1"
            value={shares}
            onChange={(e) => setShares(Math.max(1, parseInt(e.target.value, 10) || 1))}
            style={mobileStyles.modalInput}
          />
        </div>

        <div style={mobileStyles.modalQuickRow}>
          <button style={mobileStyles.modalQuickButton} onClick={() => addShares(1)}>+1</button>
          <button style={mobileStyles.modalQuickButton} onClick={() => addShares(10)}>+10</button>
          <button style={mobileStyles.modalQuickButton} onClick={() => addShares(100)}>+100</button>
          <button style={mobileStyles.modalResetButton} onClick={() => setShares(1)}>C</button>
        </div>

        <div style={mobileStyles.modalInputRow}>
          <span style={mobileStyles.modalLabel}>信用倍率</span>
          <select
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            style={mobileStyles.modalSelect}
          >
            {leverageOptions.map((l) => (
              <option key={l} value={l}>{l}x</option>
            ))}
          </select>
        </div>

        <button
          style={{ ...mobileStyles.modalConfirmButton, backgroundColor: color }}
          onClick={() => onConfirm(shares, leverage)}
        >
          注文確定 ({side})
        </button>
      </div>
    </div>
  )
}

/* ─── メインエクスポート ─── */
export default function TradePanel({
  balance,
  unrealizedPnL,
  positions,
  maxLeverage,
  unlockedLeverages,
  onBuy,
  onSell,
  onClose,
  compact = false,
}) {
  const [shares, setShares] = useState(1)
  const [leverage, setLeverage] = useState(1)
  const [modalSide, setModalSide] = useState(null)

  const leverageOptions = (unlockedLeverages ?? [1]).filter((l) => l <= maxLeverage)

  if (!compact) {
    return (
      <DesktopTradePanel
        balance={balance}
        unrealizedPnL={unrealizedPnL}
        positions={positions}
        leverageOptions={leverageOptions}
        shares={shares}
        setShares={setShares}
        leverage={leverage}
        setLeverage={setLeverage}
        onBuy={onBuy}
        onSell={onSell}
        onClose={onClose}
      />
    )
  }

  /* ─── モバイルモード ─── */
  const handleConfirm = (s, l) => {
    if (modalSide === 'BUY') onBuy(s, l)
    else onSell(s, l)
    setModalSide(null)
  }

  return (
    <>
      <MobilePositionSummary positions={positions} />
      <MobileFooterBar
        onBuyTap={() => setModalSide('BUY')}
        onSellTap={() => setModalSide('SELL')}
      />
      {modalSide && (
        <OrderModal
          side={modalSide}
          shares={shares}
          setShares={setShares}
          leverage={leverage}
          setLeverage={setLeverage}
          leverageOptions={leverageOptions}
          onConfirm={handleConfirm}
          onCancel={() => setModalSide(null)}
        />
      )}
    </>
  )
}
