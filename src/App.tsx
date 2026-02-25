import { useEffect, useState } from 'react'
import { GameProvider } from './state/GameContext'
import { useGameFlow } from './hooks/useGameFlow'
import { useAudio } from './hooks/useAudio'
import { ConfigManager } from './systems/ConfigManager'
import { AudioSystem } from './systems/AudioSystem'
import { applyAudioPreference } from './systems/audioPreference'

import TitleScreen from './screens/TitleScreen'
import ConfigScreen from './screens/ConfigScreen'
import CalendarScreen from './screens/CalendarScreen'
import MorningScreen from './screens/MorningScreen'
import SessionScreen from './screens/SessionScreen'
import ReportScreen from './screens/ReportScreen'
import WeekendScreen from './screens/WeekendScreen'
import MonthlyReportScreen from './screens/MonthlyReportScreen'
import YearlyReportScreen from './screens/YearlyReportScreen'
import GameOverScreen from './screens/GameOverScreen'
import BillionaireScreen from './screens/BillionaireScreen'
import ClosingScreen from './screens/ClosingScreen'
import BGMTheaterScreen from './screens/BGMTheaterScreen'
import LicenseScreen from './screens/LicenseScreen'
import ImportExportModal from './components/ImportExportModal'
import AudioPermissionModal from './components/AudioPermissionModal'

function AppContent() {
  const flow = useGameFlow()
  const { phase, gameState } = flow

  useAudio()

  const [showAudioModal, setShowAudioModal] = useState(true)
  const [previouslyMuted] = useState(() => !ConfigManager.getAll().audioEnabled)

  function handleAudioChoice(audioEnabled: boolean) {
    applyAudioPreference(audioEnabled)
    AudioSystem.unlockAudio()
    setShowAudioModal(false)
  }

  // 起動時にカラーテーマを適用
  useEffect(() => {
    ConfigManager.applyColorTheme()
  }, [])

  // セッション中断時の復帰: sessionActive が true の状態で起動した場合
  useEffect(() => {
    if (gameState.sessionActive && phase === 'session') {
      flow.endSession({ interrupted: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const screen = (() => {
    switch (phase) {
      case 'title':
        return (
          <TitleScreen
            onNewGame={flow.startNewGame}
            onLoadGame={flow.loadGame}
          />
        )

      case 'config':
        return <ConfigScreen />

      case 'importExport':
        return (
          <ImportExportModal
            isOpen={true}
            onClose={flow.returnToTitle}
            gameState={gameState}
          />
        )

      case 'bgmTheater':
        return <BGMTheaterScreen />

      case 'license':
        return <LicenseScreen />

      case 'calendar':
        return <CalendarScreen onAdvance={flow.advanceFromCalendar} />

      case 'morning':
        return <MorningScreen onStartSession={flow.enterSession} />

      case 'session':
        return <SessionScreen onEndSession={flow.endSession} />

      case 'closing':
        return <ClosingScreen onCloseAll={flow.closeAllAtClose} onCarryOver={flow.carryOver} />

      case 'report':
        return <ReportScreen onNext={flow.closeReport} />

      case 'weekend':
        return <WeekendScreen onNext={flow.closeWeekend} />

      case 'monthlyReport':
        return <MonthlyReportScreen onNext={flow.closeMonthlyReport} />

      case 'yearlyReport':
        return <YearlyReportScreen onNext={flow.closeYearlyReport} />

      case 'gameOver':
        return <GameOverScreen onRetry={flow.restartFromTitle} />

      case 'billionaire':
        return (
          <BillionaireScreen
            onContinue={flow.continueEndless}
            onRestart={flow.restartFromTitle}
          />
        )

      default:
        return (
          <TitleScreen
            onNewGame={flow.startNewGame}
            onLoadGame={flow.loadGame}
          />
        )
    }
  })()

  return (
    <>
      {screen}
      {showAudioModal && (
        <AudioPermissionModal
          onChoice={handleAudioChoice}
          previouslyMuted={previouslyMuted}
        />
      )}
    </>
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
