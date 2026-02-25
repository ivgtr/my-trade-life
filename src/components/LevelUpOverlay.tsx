import { useEffect } from 'react'
import { AudioSystem } from '../systems/AudioSystem'
import type { LevelUpResult } from '../types/growth'

interface LevelUpOverlayProps {
  levelUp: LevelUpResult
  onDismiss: () => void
}

export default function LevelUpOverlay({ levelUp, onDismiss }: LevelUpOverlayProps) {
  useEffect(() => {
    AudioSystem.playSE('levelup')
  }, [])

  return (
    <div className="fixed inset-0 z-[var(--z-overlay)] bg-black/80 flex items-center justify-center font-mono">
      <div className="bg-bg-panel border-2 border-gold rounded-xl p-8 max-w-sm w-full mx-4 text-center shadow-[0_0_30px_rgba(255,215,0,0.2)]">
        <div className="text-gold text-2xl font-bold mb-2">LEVEL UP!</div>
        <div className="text-text-primary text-lg mb-6">Lv.{levelUp.newLevel}</div>

        {levelUp.unlocks.length > 0 ? (
          <ul className="text-left space-y-2 mb-6">
            {levelUp.unlocks.map((entry) => (
              <li key={entry.level} className="text-text-secondary text-sm">
                <span className="text-accent">{entry.label}</span>
                {entry.leverage != null && (
                  <span className="text-gold ml-2">({entry.leverage}x)</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-text-secondary text-sm mb-6">レベルが上がりました</div>
        )}

        <button
          className="py-2.5 px-10 bg-gold text-bg-deepest font-bold rounded-lg cursor-pointer border-none text-base"
          onClick={onDismiss}
        >
          OK
        </button>
      </div>
    </div>
  )
}
