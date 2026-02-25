import { ConfigManager } from './ConfigManager'
import { AudioSystem } from './AudioSystem'

/** ConfigManager永続化 + AudioSystemランタイム反映を統合するヘルパー */
export function applyBgmPreference(enabled: boolean): void {
  ConfigManager.set('bgmEnabled', enabled)
  AudioSystem.setBGMPreferred(enabled)
}
