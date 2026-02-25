import { useState } from 'react'
import { useGameContext } from '../hooks/useGameContext'
import { ACTIONS } from '../state/actions'
import { SaveSystem } from '../systems/SaveSystem'

interface TitleScreenProps {
  onNewGame?: () => void
  onLoadGame?: () => void
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ArrowsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3l4 4-4 4" />
      <path d="M20 7H4" />
      <path d="M8 21l-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  )
}

function MusicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

const menuItemBase =
  'flex items-center gap-4 py-3.5 px-5 text-left cursor-pointer transition-colors duration-200 bg-transparent border-none w-full font-mono'

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
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-deepest text-text-primary font-mono px-6">
      <div className="text-3xl sm:text-4xl font-bold tracking-[4px] mb-12 text-gold [text-shadow:0_0_20px_rgba(255,215,0,0.3)] text-center">
        MY TRADE LIFE
      </div>
      <div className="w-full max-w-[320px] rounded-xl overflow-hidden border border-bg-button bg-bg-panel">
        <button
          className={`${menuItemBase} text-text-primary hover:bg-bg-elevated`}
          onClick={handleNewGame}
        >
          <span className="text-accent"><PlayIcon /></span>
          <span className="text-base">New Game</span>
        </button>
        <div className="h-px bg-bg-button" />
        <button
          className={
            hasSave
              ? `${menuItemBase} text-text-primary hover:bg-bg-elevated`
              : `${menuItemBase} text-text-muted cursor-not-allowed`
          }
          onClick={hasSave ? handleLoad : undefined}
          disabled={!hasSave}
        >
          <span className={hasSave ? 'text-text-secondary' : 'text-text-muted'}><FolderIcon /></span>
          <span className="text-base">Load Game</span>
        </button>
        <div className="h-px bg-bg-button" />
        <button
          className={`${menuItemBase} text-text-primary hover:bg-bg-elevated`}
          onClick={() => dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'config' } })}
        >
          <span className="text-text-secondary"><GearIcon /></span>
          <span className="text-base">Config</span>
        </button>
        <div className="h-px bg-bg-button" />
        <button
          className={`${menuItemBase} text-text-primary hover:bg-bg-elevated`}
          onClick={() => dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'importExport' } })}
        >
          <span className="text-text-secondary"><ArrowsIcon /></span>
          <span className="text-base">Import / Export</span>
        </button>
        <div className="h-px bg-bg-button" />
        <button
          className={`${menuItemBase} text-text-primary hover:bg-bg-elevated`}
          onClick={() => dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'bgmTheater' } })}
        >
          <span className="text-text-secondary"><MusicIcon /></span>
          <span className="text-base">BGM Theater</span>
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
