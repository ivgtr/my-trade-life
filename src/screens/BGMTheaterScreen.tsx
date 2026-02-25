import { useState, useCallback } from 'react'
import { useGameContext } from '../hooks/useGameContext'
import { ACTIONS } from '../state/actions'
import { AudioSystem } from '../systems/AudioSystem'
import { BGM_CATALOG } from '../systems/bgm/scenes'
import type { BGMSceneId } from '../types/audio'

const SCENE_LABELS: Record<BGMSceneId, string> = {
  title:    'Title',
  trading:  'Trading',
  lunch:    'Lunch',
  calendar: 'Calendar',
  report:   'Report',
  gameover: 'Game Over',
}

const SCENE_ORDER: BGMSceneId[] = ['title', 'trading', 'lunch', 'calendar', 'report', 'gameover']

export default function BGMTheaterScreen() {
  const { dispatch } = useGameContext()
  const [playingId, setPlayingId] = useState<string | null>(null)

  const handleTrackClick = useCallback((trackId: string) => {
    if (playingId === trackId) {
      AudioSystem.stopBGM()
      setPlayingId(null)
      return
    }
    const track = BGM_CATALOG.find(t => t.id === trackId)
    if (!track) return
    AudioSystem.playBGMBuilder(track.builder)
    setPlayingId(trackId)
  }, [playingId])

  const handleBack = useCallback(() => {
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'title' } })
  }, [dispatch])

  const grouped = SCENE_ORDER.map(sceneId => ({
    sceneId,
    label: SCENE_LABELS[sceneId],
    tracks: BGM_CATALOG.filter(t => t.sceneId === sceneId),
  }))

  return (
    <div className="flex flex-col items-center min-h-dvh bg-bg-deepest text-text-primary font-mono py-8 px-4">
      <h1 className="text-2xl font-bold tracking-[3px] mb-8 text-gold [text-shadow:0_0_16px_rgba(255,215,0,0.3)]">
        BGM THEATER
      </h1>

      <div className="w-full max-w-[600px] flex flex-col gap-6 mb-8">
        {grouped.map(({ sceneId, label, tracks }) => (
          <div key={sceneId}>
            <div className="text-xs text-text-muted tracking-[2px] uppercase mb-3 pl-1">
              {label}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {tracks.map(track => {
                const isPlaying = playingId === track.id
                return (
                  <button
                    key={track.id}
                    className={
                      isPlaying
                        ? 'flex flex-col items-center text-center p-3 rounded-lg border transition-colors duration-200 cursor-pointer bg-bg-elevated border-accent text-accent'
                        : 'flex flex-col items-center text-center p-3 rounded-lg border transition-colors duration-200 cursor-pointer bg-bg-panel border-bg-button text-text-primary hover:bg-bg-elevated'
                    }
                    onClick={() => handleTrackClick(track.id)}
                  >
                    <span className="text-2xl mb-1.5">
                      {isPlaying ? '\u25B6' : '\u266A'}
                    </span>
                    <span className="text-xs font-bold leading-tight">{track.name}</span>
                    <span className="text-[10px] text-text-muted mt-1 leading-tight">
                      {track.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        className="py-3 px-8 text-sm bg-bg-panel text-text-primary border border-bg-button rounded-lg cursor-pointer transition-colors duration-200 hover:bg-bg-elevated"
        onClick={handleBack}
      >
        Back to Title
      </button>
    </div>
  )
}
