interface AudioPermissionModalProps {
  onChoice: (audioEnabled: boolean) => void
  previouslyMuted: boolean
}

export default function AudioPermissionModal({ onChoice, previouslyMuted }: AudioPermissionModalProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg-deepest font-mono">
      <div className="text-3xl font-bold tracking-[4px] mb-4 text-gold [text-shadow:0_0_20px_rgba(255,215,0,0.3)]">
        DAY TRADER LIFE
      </div>
      <p className="text-text-secondary text-sm mb-10">
        {previouslyMuted ? '音声はミュートに設定されています' : '音声の再生設定を選択してください'}
      </p>
      <div className="flex flex-col gap-3 w-[260px]">
        <button
          className="py-3.5 px-6 text-base bg-bg-panel text-text-primary border border-bg-button rounded-lg cursor-pointer text-center transition-colors duration-200 hover:bg-bg-elevated"
          onClick={() => onChoice(true)}
        >
          音声を再生する
        </button>
        <button
          className="py-3.5 px-6 text-base bg-bg-panel text-text-secondary border border-bg-button rounded-lg cursor-pointer text-center transition-colors duration-200 hover:bg-bg-elevated"
          onClick={() => onChoice(false)}
        >
          ミュートにする
        </button>
      </div>
    </div>
  )
}
