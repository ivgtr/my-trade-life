import { useState } from 'react'
import { useGameContext } from '../state/GameContext'
import { ACTIONS } from '../state/actions'
import { SaveSystem } from '../systems/SaveSystem'

interface TitleScreenProps {
  onNewGame?: () => void
  onLoadGame?: () => void
}

export default function TitleScreen({ onNewGame, onLoadGame }: TitleScreenProps) {
  const { dispatch } = useGameContext()
  const [showConfirm, setShowConfirm] = useState(false)
  const hasSave = SaveSystem.hasSaveData()

  const handleNewGame = () => {
    if (hasSave) {
      setShowConfirm(true)
    } else if (onNewGame) {
      onNewGame()
    }
  }

  const confirmNewGame = () => {
    setShowConfirm(false)
    SaveSystem.deleteSaveData()
    if (onNewGame) onNewGame()
  }

  const handleLoad = () => {
    if (onLoadGame) onLoadGame()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-deepest text-text-primary font-mono">
      <div className="text-4xl font-bold tracking-[4px] mb-12 text-gold [text-shadow:0_0_20px_rgba(255,215,0,0.3)]">
        DAY TRADER LIFE
      </div>
      <div className="flex flex-col gap-3 w-[260px]">
        <button
          className="py-3.5 px-6 text-base bg-bg-panel text-text-primary border border-bg-button rounded-lg cursor-pointer text-left transition-colors duration-200 hover:bg-bg-elevated"
          onClick={handleNewGame}
        >
          ▶ New Game
        </button>
        <button
          className={
            hasSave
              ? 'py-3.5 px-6 text-base bg-bg-panel text-text-primary border border-bg-button rounded-lg cursor-pointer text-left transition-colors duration-200 hover:bg-bg-elevated'
              : 'py-3.5 px-6 text-base bg-bg-panel text-text-muted border border-bg-elevated rounded-lg cursor-not-allowed text-left'
          }
          onClick={hasSave ? handleLoad : undefined}
          disabled={!hasSave}
        >
          Load Game
        </button>
        <button
          className="py-3.5 px-6 text-base bg-bg-panel text-text-primary border border-bg-button rounded-lg cursor-pointer text-left transition-colors duration-200 hover:bg-bg-elevated"
          onClick={() => dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'config' } })}
        >
          Config
        </button>
        <button
          className="py-3.5 px-6 text-base bg-bg-panel text-text-primary border border-bg-button rounded-lg cursor-pointer text-left transition-colors duration-200 hover:bg-bg-elevated"
          onClick={() => dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'importExport' } })}
        >
          Import / Export
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[var(--z-modal)]">
          <div className="bg-bg-panel p-6 rounded-xl text-center max-w-[360px]">
            <div className="mb-4 text-sm">
              既存のセーブデータを上書きしますが、よろしいですか？
            </div>
            <div className="flex gap-3 justify-center">
              <button
                className="py-2 px-5 bg-loss text-white border-none rounded-md cursor-pointer"
                onClick={confirmNewGame}
              >
                上書きする
              </button>
              <button
                className="py-2 px-5 bg-bg-button text-text-primary border-none rounded-md cursor-pointer"
                onClick={() => setShowConfirm(false)}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
