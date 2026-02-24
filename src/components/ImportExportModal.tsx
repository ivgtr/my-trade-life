import { useState, useRef } from 'react'
import { SaveSystem } from '../systems/SaveSystem'
import type { GameState, ImportResult } from '../types'

interface ImportExportModalProps {
  isOpen?: boolean
  onImportSuccess?: (data: Record<string, unknown>) => void
  onClose: () => void
  gameState: GameState
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 500,
  },
  modal: {
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    padding: '24px',
    borderRadius: '12px',
    minWidth: '360px',
    maxWidth: '440px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    textAlign: 'center',
  },
  tabs: {
    display: 'flex',
    marginBottom: '16px',
    borderBottom: '1px solid #3a3a4e',
  },
  tab: {
    flex: 1,
    padding: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    fontSize: '14px',
    backgroundColor: 'transparent',
    color: '#a0a0b0',
    border: 'none',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: '#e0e0e0',
    borderBottomColor: '#6366f1',
  },
  button: {
    display: 'block',
    width: '100%',
    padding: '10px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '8px',
  },
  buttonSecondary: {
    display: 'block',
    width: '100%',
    padding: '10px',
    backgroundColor: '#3a3a4e',
    color: '#e0e0e0',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '8px',
  },
  buttonDanger: {
    backgroundColor: '#ef5350',
    color: '#fff',
  },
  message: {
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '13px',
  },
  warning: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    color: '#ffc107',
    border: '1px solid rgba(255, 193, 7, 0.3)',
  },
  error: {
    backgroundColor: 'rgba(239, 83, 80, 0.15)',
    color: '#ef5350',
    border: '1px solid rgba(239, 83, 80, 0.3)',
  },
  success: {
    backgroundColor: 'rgba(38, 166, 154, 0.15)',
    color: '#26a69a',
    border: '1px solid rgba(38, 166, 154, 0.3)',
  },
  fileInput: {
    display: 'none',
  },
  closeRow: {
    marginTop: '12px',
    textAlign: 'center',
  },
  closeButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#a0a0b0',
    border: '1px solid #3a3a4e',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
} as const

/**
 * Import/Exportモーダル。
 * セーブデータのJSONエクスポート・インポートを行う。
 */
export default function ImportExportModal({ onImportSuccess, onClose, gameState }: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [importResult, setImportResult] = useState<(ImportResult & { _done?: boolean }) | null>(null)
  const [pendingData, setPendingData] = useState<Record<string, unknown> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    SaveSystem.exportToFile(gameState as any)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await SaveSystem.importFromFile(file)
    setImportResult(result)

    if (result.status === 'valid') {
      onImportSuccess?.(result.data as any)
      setImportResult({ ...result, _done: true })
    } else if (result.status === 'tampered') {
      setPendingData(result.data as any)
    }

    // ファイル入力をリセット
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleContinueTampered = () => {
    if (pendingData) {
      onImportSuccess?.(pendingData)
      setPendingData(null)
      setImportResult(null)
    }
  }

  const handleCancelImport = () => {
    setImportResult(null)
    setPendingData(null)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.title}>データ管理</div>

        {/* タブ */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'export' ? styles.tabActive : {}) }}
            onClick={() => { setActiveTab('export'); setImportResult(null); setPendingData(null) }}
          >
            Export
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'import' ? styles.tabActive : {}) }}
            onClick={() => { setActiveTab('import'); setImportResult(null); setPendingData(null) }}
          >
            Import
          </button>
        </div>

        {/* Export タブ */}
        {activeTab === 'export' && (
          <button style={styles.button} onClick={handleExport}>
            JSONファイルをダウンロード
          </button>
        )}

        {/* Import タブ */}
        {activeTab === 'import' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={styles.fileInput}
              onChange={handleFileSelect}
            />
            <button
              style={styles.button}
              onClick={() => fileInputRef.current?.click()}
            >
              ファイルを選択
            </button>

            {/* インポート結果表示 */}
            {importResult && importResult.status === 'parseError' && (
              <div style={{ ...styles.message, ...styles.error }}>
                {importResult.warning}
              </div>
            )}

            {importResult && importResult.status === 'unknownVersion' && (
              <div style={{ ...styles.message, ...styles.error }}>
                {importResult.warning}
              </div>
            )}

            {importResult && importResult.status === 'tampered' && pendingData && (
              <>
                <div style={{ ...styles.message, ...styles.warning }}>
                  {importResult.warning}
                </div>
                <button
                  style={{ ...styles.button, ...styles.buttonDanger }}
                  onClick={handleContinueTampered}
                >
                  続行する
                </button>
                <button style={styles.buttonSecondary} onClick={handleCancelImport}>
                  キャンセル
                </button>
              </>
            )}

            {importResult && importResult._done && (
              <div style={{ ...styles.message, ...styles.success }}>
                インポートに成功しました
              </div>
            )}
          </>
        )}

        {/* 閉じるボタン */}
        <div style={styles.closeRow}>
          <button style={styles.closeButton} onClick={onClose}>
            タイトルへ戻る
          </button>
        </div>
      </div>
    </div>
  )
}
