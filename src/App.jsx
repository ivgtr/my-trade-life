import { GameProvider, useGameContext } from './state/GameContext'

function AppContent() {
  const { gameState } = useGameContext()

  return (
    <div>
      <h1>DAY TRADER LIFE</h1>
      <p>Phase: {gameState.phase}</p>
    </div>
  )
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  )
}

export default App
