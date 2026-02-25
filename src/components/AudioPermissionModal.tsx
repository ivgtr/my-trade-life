interface AudioPermissionModalProps {
  onChoice: (audioEnabled: boolean) => void
  previouslyMuted: boolean
}

export default function AudioPermissionModal({ onChoice, previouslyMuted }: AudioPermissionModalProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg-deepest font-mono">
      <div className="text-3xl font-bold tracking-[4px] mb-4 text-gold [text-shadow:0_0_20px_rgba(255,215,0,0.3)]">
        MY TRADE LIFE
      </div>
      <p className="text-text-secondary text-sm mb-10">
        {previouslyMuted ? '音声はミュートに設定されています' : '音声の再生設定を選択してください'}
      </p>
      <div className="flex gap-8">
        <button
          className="group flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none"
          onClick={() => onChoice(true)}
        >
          <div className="w-16 h-16 rounded-full bg-bg-panel border-2 border-bg-button flex items-center justify-center transition-all duration-200 group-hover:border-profit group-hover:bg-bg-elevated group-hover:shadow-[0_0_16px_rgba(38,166,154,0.3)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary transition-colors duration-200 group-hover:text-profit">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </div>
          <span className="text-xs text-text-secondary transition-colors duration-200 group-hover:text-text-primary">ON</span>
        </button>
        <button
          className="group flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none"
          onClick={() => onChoice(false)}
        >
          <div className="w-16 h-16 rounded-full bg-bg-panel border-2 border-bg-button flex items-center justify-center transition-all duration-200 group-hover:border-loss group-hover:bg-bg-elevated group-hover:shadow-[0_0_16px_rgba(239,83,80,0.3)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary transition-colors duration-200 group-hover:text-loss">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          </div>
          <span className="text-xs text-text-secondary transition-colors duration-200 group-hover:text-text-primary">MUTE</span>
        </button>
      </div>
    </div>
  )
}
