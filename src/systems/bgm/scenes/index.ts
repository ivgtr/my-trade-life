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
import { buildGameoverRetire } from './gameoverRetire'
import { buildLunch } from './lunch'
import { buildTradingMatch } from './tradingMatch'

/**
 * 各ビルダーの音量正規化係数。
 * 曲ごとのピークゲイン合計に基づき、知覚音量を均一化する。
 * 基準: calendarVillage = 1.0 (実効出力 ≈ 0.20)
 */
export const BUILDER_GAIN = new Map<BGMBuilder, number>([
  // title系 — 静かなアンビエントなので大きく補正
  [buildTitle,              2.5],
  [buildTitlePrelude,       3.5],
  [buildTitleOcarina,       2.2],
  // trading系 — ドローン+ドラムで大きいので抑制
  [buildTrading,            0.45],
  [buildTradingDecisive,    0.50],
  [buildTradingInfiltrate,  0.80],
  [buildTradingMatch,       0.55],
  // lunch
  [buildLunch,              1.2],
  // calendar系
  [buildCalendar,           1.1],
  [buildCalendarMyLife,     0.50],
  [buildCalendarVillage,    1.0],
  [buildCalendarOverworld,  0.65],
  // report系 — 穏やかな曲なので補正
  [buildReport,             2.0],
  [buildReportFanfare,      1.5],
  [buildReportHealing,      1.4],
  // gameover系
  [buildGameover,           0.85],
  [buildGameoverDirge,      0.20],
  [buildGameoverDescend,    0.70],
  [buildGameoverRetire,     1.25],
])

export const SCENE_BUILDERS: Record<BGMSceneId, BGMBuilder[]> = {
  title:    [buildTitle, buildTitlePrelude, buildTitleOcarina],
  trading:  [buildTrading, buildTradingDecisive, buildTradingInfiltrate, buildTradingMatch],
  lunch:    [buildLunch],
  calendar: [buildCalendar, buildCalendarMyLife, buildCalendarVillage, buildCalendarOverworld],
  report:   [buildReport, buildReportFanfare, buildReportHealing],
  gameover: [buildGameover, buildGameoverDirge, buildGameoverDescend, buildGameoverRetire],
}

export interface BGMTrackEntry {
  id: string
  sceneId: BGMSceneId
  name: string
  description: string
  builder: BGMBuilder
}

export const BGM_CATALOG: BGMTrackEntry[] = [
  { id: 'title',               sceneId: 'title',    name: 'Ambient Arpeggio',  description: 'アンビエント・アルペジオ',     builder: buildTitle },
  { id: 'titlePrelude',        sceneId: 'title',    name: 'Prelude',           description: '上昇アルペジオ',             builder: buildTitlePrelude },
  { id: 'titleOcarina',        sceneId: 'title',    name: 'Ocarina',           description: '牧歌的メロディ',             builder: buildTitleOcarina },
  { id: 'trading',             sceneId: 'trading',  name: 'Tension Pulse',     description: '緊迫する電子パルス',          builder: buildTrading },
  { id: 'tradingDecisive',     sceneId: 'trading',  name: 'Decisive Battle',   description: '力強い行進曲',              builder: buildTradingDecisive },
  { id: 'tradingInfiltrate',   sceneId: 'trading',  name: 'Infiltrate',        description: 'ステルス・サスペンス',        builder: buildTradingInfiltrate },
  { id: 'tradingMatch',        sceneId: 'trading',  name: 'Full Swing',        description: '疾走感ポップ',              builder: buildTradingMatch },
  { id: 'lunch',               sceneId: 'lunch',    name: 'Lunch Break',       description: '軽快なほのぼのメロディ',      builder: buildLunch },
  { id: 'calendar',            sceneId: 'calendar', name: 'Marimba Loop',      description: 'マリンバ・ループ',           builder: buildCalendar },
  { id: 'calendarMyLife',      sceneId: 'calendar', name: 'My Life',           description: '日常系ポップ',              builder: buildCalendarMyLife },
  { id: 'calendarVillage',     sceneId: 'calendar', name: 'Village',           description: 'スウィング・ジャズ',         builder: buildCalendarVillage },
  { id: 'calendarOverworld',   sceneId: 'calendar', name: 'Overworld',         description: 'レトロ・チップチューン',      builder: buildCalendarOverworld },
  { id: 'report',              sceneId: 'report',   name: 'Warm Piano',        description: '穏やかなピアノ・コード',      builder: buildReport },
  { id: 'reportFanfare',       sceneId: 'report',   name: 'Fanfare',           description: '華やかなファンファーレ',      builder: buildReportFanfare },
  { id: 'reportHealing',       sceneId: 'report',   name: 'Healing',           description: 'ワルツ風ヒーリング',         builder: buildReportHealing },
  { id: 'gameover',            sceneId: 'gameover', name: 'Chiptune Lament',   description: 'FC風チップチューン哀歌',     builder: buildGameover },
  { id: 'gameoverDirge',       sceneId: 'gameover', name: 'Dirge',             description: '荘厳なコーラス',             builder: buildGameoverDirge },
  { id: 'gameoverDescend',     sceneId: 'gameover', name: 'Descend',           description: '下降する終焉メロディ',       builder: buildGameoverDescend },
  { id: 'gameoverRetire',      sceneId: 'gameover', name: 'Twilight',          description: '感傷バラード',              builder: buildGameoverRetire },
]
