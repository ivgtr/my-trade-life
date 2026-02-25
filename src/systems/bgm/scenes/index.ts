import type { BGMSceneId } from '../../../types/audio'
import type { BGMBuilder } from '../types'
import { buildTitle } from './title'
import { buildTitlePrelude } from './titlePrelude'
import { buildTitleOcarina } from './titleOcarina'
import { buildTrading } from './trading'
import { buildTradingDecisive } from './tradingDecisive'
import { buildTradingInfiltrate } from './tradingInfiltrate'
import { buildCalendar } from './calendar'
import { buildCalendarMyLife } from './calendarMyLife'
import { buildCalendarVillage } from './calendarVillage'
import { buildCalendarOverworld } from './calendarOverworld'
import { buildReport } from './report'
import { buildReportFanfare } from './reportFanfare'
import { buildReportHealing } from './reportHealing'
import { buildGameover } from './gameover'
import { buildGameoverDirge } from './gameoverDirge'
import { buildGameoverDescend } from './gameoverDescend'
import { buildLunch } from './lunch'

export const SCENE_BUILDERS: Record<BGMSceneId, BGMBuilder[]> = {
  title:    [buildTitle, buildTitlePrelude, buildTitleOcarina],
  trading:  [buildTrading, buildTradingDecisive, buildTradingInfiltrate],
  lunch:    [buildLunch],
  calendar: [buildCalendar, buildCalendarMyLife, buildCalendarVillage, buildCalendarOverworld],
  report:   [buildReport, buildReportFanfare, buildReportHealing],
  gameover: [buildGameover, buildGameoverDirge, buildGameoverDescend],
}
