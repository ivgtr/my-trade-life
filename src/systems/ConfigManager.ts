const CONFIG_KEY = 'daytraderlife_config'

interface GameConfig {
  bgmVolume: number
  seVolume: number
  defaultSpeed: number
  invertColors: boolean
  [key: string]: unknown
}

const DEFAULT_CONFIG: GameConfig = {
  bgmVolume: 50,
  seVolume: 70,
  defaultSpeed: 1,
  invertColors: false,
}

const PROFIT_COLOR = '#26a69a'
const LOSS_COLOR = '#ef5350'

let cachedConfig: GameConfig | null = null

/**
 * ゲーム設定管理シングルトン。
 * localStorage で永続化し、セーブデータとは分離する。
 */
export const ConfigManager = {
  load(): GameConfig {
    try {
      const raw = localStorage.getItem(CONFIG_KEY)
      if (raw) {
        cachedConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
      } else {
        cachedConfig = { ...DEFAULT_CONFIG }
      }
    } catch {
      cachedConfig = { ...DEFAULT_CONFIG }
    }
    return cachedConfig!
  },

  set(key: string, value: unknown): void {
    if (!cachedConfig) this.load()
    cachedConfig![key] = value
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cachedConfig))
    } catch {
      // localStorage書き込み失敗は無視（メモリ上のキャッシュは更新済み）
    }
  },

  getAll(): GameConfig {
    if (!cachedConfig) this.load()
    return { ...cachedConfig! }
  },

  getBGMVolume01(): number {
    if (!cachedConfig) this.load()
    return cachedConfig!.bgmVolume / 100
  },

  getSEVolume01(): number {
    if (!cachedConfig) this.load()
    return cachedConfig!.seVolume / 100
  },

  applyColorTheme(): void {
    if (!cachedConfig) this.load()
    const inverted = cachedConfig!.invertColors
    const profit = inverted ? LOSS_COLOR : PROFIT_COLOR
    const loss = inverted ? PROFIT_COLOR : LOSS_COLOR
    document.documentElement.style.setProperty('--color-profit', profit)
    document.documentElement.style.setProperty('--color-loss', loss)
  },

  getChartColors(): { up: string; down: string } {
    if (!cachedConfig) this.load()
    const inverted = cachedConfig!.invertColors
    return {
      up: inverted ? LOSS_COLOR : PROFIT_COLOR,
      down: inverted ? PROFIT_COLOR : LOSS_COLOR,
    }
  },
}
