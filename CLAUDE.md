# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## コマンド

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # 型チェック + ビルド (tsc -b && vite build)
pnpm lint         # ESLint実行
pnpm typecheck    # 型チェックのみ (tsc --noEmit)
pnpm preview      # ビルド成果物のプレビュー
```

テストフレームワークは未導入。

## 技術スタック

- Vite v7 + React 19 + TypeScript (strict) + Tailwind CSS v4 (Viteプラグイン)
- チャート: lightweight-charts v5
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
title → config / importExport
      → calendar → morning → session → report → calendar
                            ↘ weekend → calendar
                            ↘ monthlyReport → [yearlyReport →] calendar
title ← gameOver / billionaire
```

### レイヤー構成

| レイヤー | ディレクトリ | 役割 |
|---|---|---|
| エンジン | `src/engine/` | React非依存の純粋クラス群。Private class fields(`#`)でカプセル化。MarketEngine(価格変動), TradingEngine(ポジション管理), NewsSystem(ニュース), CalendarSystem(日付), MacroRegimeManager(マルコフ連鎖レジーム), GrowthSystem(経験値/レベル) |
| システム | `src/systems/` | SaveSystem(localStorage+ファイルI/O), AudioSystem(BGM/SE), ConfigManager。オブジェクトリテラルのシングルトン |
| 状態管理 | `src/state/` | `useReducer` + `createContext`。`gameReducer.ts`にreducer、`actions.ts`にACTIONS定数(18種)、`gameContextDef.ts`にContext定義 |
| フック | `src/hooks/` | `useGameFlow`(ゲーム全体フロー、エンジンをuseRefで保持), `useSessionEngine`(セッション中リアルタイムロジック), `useGameContext`(Context取得), `useAudio`(BGM自動切替), `useMediaQuery`/`useResponsive`(レスポンシブ) |
| 画面 | `src/screens/` | 11画面コンポーネント |
| UI部品 | `src/components/` | Chart(forwardRef+useImperativeHandle), TradePanel, TickerTape, NewsOverlay, MilestoneOverlay, ImportExportModal |

### 定数・パラメータ

`src/engine/marketParams.ts` にエンジン全体の定数テーブルが集約されている（TICK_INTERVAL, PRICE_MOVE, VOL_TRANSITION, REGIME_PARAMS, MARKOV_MATRIX等）。

### スタイリング

Tailwind CSS v4。テーマ定義は`src/index.css`の`@theme`ブロックに集約。ダーク系トレーディングターミナル風デザイン。`font-mono`基本。カスタムカラー: `bg-deepest`, `bg-panel`, `profit`, `loss`, `accent`, `gold`。ブレークポイント: `sm: 768px`。
