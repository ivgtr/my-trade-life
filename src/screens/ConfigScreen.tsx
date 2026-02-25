import { useGameContext } from '../hooks/useGameContext'
import { ACTIONS } from '../state/actions'
import ConfigPanel from '../components/ConfigPanel'

export default function ConfigScreen() {
  const { dispatch } = useGameContext()

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-deepest text-text-primary font-mono">
      <div className="text-2xl font-bold mb-8">Config</div>
      <ConfigPanel />
      <button
        className="mt-8 py-2.5 px-6 bg-bg-button text-text-primary border-none rounded-md cursor-pointer text-sm"
        onClick={() => dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'title' } })}
      >
        タイトルへ戻る
      </button>
    </div>
  )
}
