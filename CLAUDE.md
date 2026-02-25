# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 最優先の注意点

破壊的変更を恐れずコードのクオリティを最優先にして、シンプルで拡張性を考慮した設計を意識して、DRY原則と単一責任の原則に習って考えてください。

## コマンド

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # 型チェック + ビルド (tsc -b && vite build)
pnpm lint         # ESLint実行
pnpm typecheck    # 型チェックのみ (tsc --noEmit)
pnpm test         # テスト実行 (vitest run)
pnpm preview      # ビルド成果物のプレビュー
```

## 技術スタック

- Vite v7 + React 19 + TypeScript (strict) + Tailwind CSS v4 (Viteプラグイン)
- 状態管理: useReducer + Context（グローバル）, Zustand v5（セッション局所状態）
- チャート: lightweight-charts v5
- テスト: Vitest v4 + jsdom
- パッケージマネージャー: pnpm
- ESLint v9 flat config (TypeScript形式: `eslint.config.ts`)

## アーキテクチャ

### 全体構造

トレーディングシミュレーションゲーム。React Routerは不使用で、`GameState.phase`の値による`switch`文で画面遷移する。

```
App → GameProvider(useReducer + Context) → AppContent → switch(phase) → 各Screen
```

### フェーズ遷移

```
title → config / importExport / bgmTheater / license
      → calendar → morning → session → closing → report → calendar
                            ↘ weekend → calendar
                            ↘ monthlyReport → [yearlyReport →] calendar
title ← gameOver / billionaire
```

### レイヤー構成

| レイヤー | ディレクトリ | 役割 |
|---|---|---|
| エンジン | `src/engine/` | React非依存の純粋クラス群。Private class fields(`#`)でカプセル化。MarketEngine(価格変動), TradingEngine(ポジション管理), MicrostructureEngine(板構造), VolumeModel(出来高), NewsSystem(ニュース), CalendarSystem(日付), MacroRegimeManager(マルコフ連鎖レジーム), GrowthSystem(経験値/レベル), priceGrid(価格グリッド) |
| システム | `src/systems/` | SaveSystem(localStorage+ファイルI/O), AudioSystem(BGM/SE), ConfigManager, audioPreference(音声設定), se(効果音定義)。オブジェクトリテラルのシングルトン |
| 状態管理 | `src/state/` | `useReducer` + `createContext`。`gameReducer.ts`にreducer、`actions.ts`にACTIONS定数(23種)、`gameContextDef.ts`にContext定義 |
| ストア | `src/stores/` | Zustand v5。sessionStore(セッション状態), tickStore(ティックデータ) |
| フック | `src/hooks/` | `useGameFlow`(ゲーム全体フロー、エンジンをuseRefで保持), `useSessionEngine`(セッション中リアルタイムロジック), `useGameContext`(Context取得), `useAudio`(BGM自動切替), `useAutoSave`(自動保存), `useChartAutoScroll`(チャート自動スクロール), `useMAOverlay`(移動平均オーバーレイ), `useMediaQuery`(レスポンシブ) |
| 画面 | `src/screens/` | 14画面コンポーネント |
| UI部品 | `src/components/` | Chart, ChartControls, TradePanel, SessionTradePanel, PositionSheet, SessionHeader, TickerTape, NewsOverlay, MilestoneOverlay, LevelUpOverlay, MonthlyPnLChart, ImportExportModal, AudioPermissionModal, SessionCalendarPopup, GridPrimitive |
| 定数 | `src/constants/` | maSpecs(移動平均設定), milestones(マイルストーン定義), sessionTime(セッション時間) |
| 型定義 | `src/types/` | game, market, trading, calendar, news, growth, audio, save |
| ユーティリティ | `src/utils/` | calendarSummary, calendarUtils, chartBarBuilder, chartTime, formatUtils, hashUtils, maCalculator, mathUtils, taxUtils |

### 定数・パラメータ

`src/engine/marketParams.ts` にエンジン全体の定数テーブルが集約されている（TICK_INTERVAL, PRICE_MOVE, VOL_TRANSITION, REGIME_PARAMS, MARKOV_MATRIX等）。

### スタイリング

Tailwind CSS v4。テーマ定義は`src/index.css`の`@theme`ブロックに集約。ダーク系トレーディングターミナル風デザイン。`font-mono`基本。

カスタムカラー: `bg-deepest`, `bg-panel`, `bg-elevated`, `bg-button`, `bg-darkest`, `bg-black`, `bg-danger`, `text-primary`, `text-secondary`, `text-muted`, `text-dim`, `text-dimmer`, `profit`, `loss`, `accent`, `accent-light`, `gold`, `gold-dark`, `warning`, `news-red`, `border-danger`, `border-ticker`。

z-indexスケール: `z-content(10)`, `z-flash(100)`, `z-modal(500)`, `z-overlay(900)`, `z-news(1000)`, `z-news-ticker(1001)`。

ブレークポイント: `sm: 768px`。アニメーション: `newsShake`, `newsTickerScroll`, `confettiFall`。
