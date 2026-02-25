import { ConfigManager } from './ConfigManager'
import { AudioSystem } from './AudioSystem'

/** ConfigManager永続化 + AudioSystemランタイム反映を統合するヘルパー */
export function applyAudioPreference(enabled: boolean): void {
  ConfigManager.set('audioEnabled', enabled)
  AudioSystem.setAudioPreferred(enabled)
}
