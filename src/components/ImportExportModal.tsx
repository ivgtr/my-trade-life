import { useState, useRef } from 'react'
import { SaveSystem } from '../systems/SaveSystem'
import type { GameState, ImportResult } from '../types'

interface ImportExportModalProps {
  isOpen?: boolean
  onImportSuccess?: (data: Record<string, unknown>) => void
  onClose: () => void
  gameState: GameState
}

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
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[var(--z-modal)]">
      <div className="bg-bg-panel text-text-primary p-6 rounded-xl min-w-[360px] max-w-[440px] shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="text-lg font-bold mb-4 text-center">データ管理</div>

        <div className="flex mb-4 border-b border-bg-button">
          <button
            className={`flex-1 p-2 text-center cursor-pointer text-sm bg-transparent border-none border-b-2 ${
              activeTab === 'export'
                ? 'text-text-primary border-b-accent'
                : 'text-text-secondary border-b-transparent'
            }`}
            onClick={() => { setActiveTab('export'); setImportResult(null); setPendingData(null) }}
          >
            Export
          </button>
          <button
            className={`flex-1 p-2 text-center cursor-pointer text-sm bg-transparent border-none border-b-2 ${
              activeTab === 'import'
                ? 'text-text-primary border-b-accent'
                : 'text-text-secondary border-b-transparent'
            }`}
            onClick={() => { setActiveTab('import'); setImportResult(null); setPendingData(null) }}
          >
            Import
          </button>
        </div>

        {activeTab === 'export' && (
          <button
            className="block w-full p-2.5 bg-accent text-white border-none rounded-md text-sm cursor-pointer mb-2"
            onClick={handleExport}
          >
            JSONファイルをダウンロード
          </button>
        )}

        {activeTab === 'import' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              className="block w-full p-2.5 bg-accent text-white border-none rounded-md text-sm cursor-pointer mb-2"
              onClick={() => fileInputRef.current?.click()}
            >
              ファイルを選択
            </button>

            {importResult && importResult.status === 'parseError' && (
              <div className="p-3 rounded-md mb-3 text-[13px] bg-loss/15 text-loss border border-loss/30">
                {importResult.warning}
              </div>
            )}

            {importResult && importResult.status === 'unknownVersion' && (
              <div className="p-3 rounded-md mb-3 text-[13px] bg-loss/15 text-loss border border-loss/30">
                {importResult.warning}
              </div>
            )}

            {importResult && importResult.status === 'tampered' && pendingData && (
              <>
                <div className="p-3 rounded-md mb-3 text-[13px] bg-warning/15 text-warning border border-warning/30">
                  {importResult.warning}
                </div>
                <button
                  className="block w-full p-2.5 bg-loss text-white border-none rounded-md text-sm cursor-pointer mb-2"
                  onClick={handleContinueTampered}
                >
                  続行する
                </button>
                <button
                  className="block w-full p-2.5 bg-bg-button text-text-primary border-none rounded-md text-sm cursor-pointer mb-2"
                  onClick={handleCancelImport}
                >
                  キャンセル
                </button>
              </>
            )}

            {importResult && importResult._done && (
              <div className="p-3 rounded-md mb-3 text-[13px] bg-profit/15 text-profit border border-profit/30">
                インポートに成功しました
              </div>
            )}
          </>
        )}

        <div className="mt-3 text-center">
          <button
            className="py-2 px-4 bg-transparent text-text-secondary border border-bg-button rounded-md text-[13px] cursor-pointer"
            onClick={onClose}
          >
            タイトルへ戻る
          </button>
        </div>
      </div>
    </div>
  )
}
