import type { BGMSceneId } from '../../../types/audio'
import type { BGMBuilder } from '../types'
import { buildTitle } from './title'
import { buildTrading } from './trading'
import { buildCalendar } from './calendar'
import { buildReport } from './report'
import { buildGameover } from './gameover'

export const SCENE_BUILDERS: Record<BGMSceneId, BGMBuilder[]> = {
  title:    [buildTitle],
  trading:  [buildTrading],
  calendar: [buildCalendar],
  report:   [buildReport],
  gameover: [buildGameover],
}
