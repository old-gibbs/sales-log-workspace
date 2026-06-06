# sales-log-workspace

営業活動ログ用のワークスペース UI プロトタイプ（**4ペイン、Next.js 16 + shadcn/ui**）。
朝1分で「対応待ち顧客の状況把握」と「今日やる追客の優先順位決定」を完了するための画面。

> 第5回・第6回 月次課題（自分の思想を画面にする月）の提出物。
> 配布雛形 `workspace-ui-kit`（採用管理サンプル）をベースに、営業活動ログ向けに retheme した「踏襲ルート」案件。

## 関連する既存物

| 項目 | 場所 | 内容 |
|------|------|------|
| 営業活動ログ MVP（運用中） | `personal-visual-explainers/.claude/skills/weekly-sales-log/` | Googleフォーム + GAS + スプレッドシート。実データの入力・保存・週次メール送信を担当 |
| **本リポジトリ** | このリポ | UI プロトタイプ。**データ保存なし**（モックデータのみ）、見た目と操作感の検証用 |

`weekly-sales-log` MVP の `activity_log` スキーマ（`timestamp` / `customer_name` / `temperature` / `next_action` 等）を**モックデータとして流用**することで、課題提出と将来の本物ワークスペース設計検証を兼ねている。

## このワークスペースで何ができる（=設計意図）

### ユースケース

- **主**: 朝（毎朝必ずではない）に開いて、対応待ち顧客の状況を把握 → 今日やる追客の優先順位リストを完成させる
- **副**: 顧客との接触直前のジャストインタイム確認（過去履歴・次回アクションの確認）
- **副**: 金曜の週次振り返り（自動配信の週次サマリメールでは見えない、顧客ごとの解像度を補完）

### 4ペイン構成

```
┌──────────┬─────────────────┬─────────────────┬────────────────┐
│ ペイン1   │   ペイン2        │   ペイン3        │  ペイン4        │
│ (左・細)  │  (中央左・広)    │  (中央右・広)    │  (右・中)       │
│           │                 │                 │                │
│ フィルタ  │ 対応待ち         │ 選択顧客の       │ 接触記録の      │
│ ・期限切れ │ 顧客一覧         │ 履歴・属性       │ 詳細編集        │
│ ・今週期限 │ (温度感バッジ、 │ + 接触履歴       │ (Pane 3 で      │
│ ・ホット   │  最終接触日、    │   タイムライン   │  選んだ接触     │
│ ・全対応待│  期限バッジ)    │                 │  記録の編集)    │
│           │ ←選択でP3に表示│ ←履歴クリックで│                │
│           │                 │  P4に編集表示    │                │
└──────────┴─────────────────┴─────────────────┴────────────────┘
```

- **Pane 1 (左)**: フィルタ・ステータスナビゲーション（雛形の「部署/ポジション」を流入経路カテゴリに転用）
- **Pane 2 (中央左)**: 対応待ち顧客一覧（温度感ごとにグループ化、各顧客行に名前・温度感バッジ・最新接触日を表示）
- **Pane 3 (中央右)**: 選択顧客の詳細（顧客基本情報・想定条件・接触履歴の3カード）
- **Pane 4 (右)**: 接触記録の詳細編集（Pane 3 の履歴クリックで開く、基本情報・評価4軸・コメント・サマリ・添付）

### 評価4軸（BANT フレームワーク寄り）

雛形の採用管理4軸を、営業の有望度判定に転用：

- **関心度**（旧 achievements）: 製品・サービスへの興味の高さ
- **予算合致度**（旧 thinkingAbility）: 想定予算と提示価格のフィット
- **決裁権合致度**（旧 communication）: 接触相手が決裁に近いか
- **タイミング合致度**（旧 cultureFit）: 導入想定時期の現実性

## 動かす

```powershell
git clone https://github.com/old-gibbs/sales-log-workspace.git
cd sales-log-workspace
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開くと、営業活動ログのワークスペースが表示される。

### 開発コマンド

| コマンド | 役割 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint チェック |
| `npm run test` | スモークテスト（Vitest） |
| `npm run format` | Prettier で整形 |
| `npm run check:radius` | 角丸ドリフト検出（独自スクリプト、雛形由来） |

## 技術スタック

- **Next.js 16** / **React 19** / **TypeScript**（strict）
- **Tailwind CSS v4**（`app/globals.css` の `@theme` で CSS 変数を一元管理）
- **shadcn/ui**（`base-nova` スタイル / `@base-ui/react` ベース）
- **lucide-react**（アイコン）/ **zod**（実行時の型検証）
- **dnd-kit**（ドラッグ＆ドロップ、雛形由来。Pane 2 のステージ間移動で使用）

## ファイル構成

```
app/
  page.tsx          トップ。data/*.json を zod parse → Workspace に渡す
  layout.tsx        ルートレイアウト（メタデータ）
  globals.css       Tailwind v4 + デザイントークン
components/
  ui/               shadcn/ui 部品（Card, Button, Dialog, Sidebar 等）
  primitives/       インライン編集プリミティブ（InlineTextField 等）
  workspace/        4ペイン本体（Workspace, PositionPane, CandidateListPane 等）
data/
  workspace.json    ワークスペース名・アイコン
  positions.json    Pane 1 のフィルタカテゴリ（雛形の「部署/ポジション」構造を流用）
  candidates.json   モック顧客データ（8社、温度感ごとに分散）
lib/
  schema.ts         zod スキーマと型定義（**雛形由来の名前のまま**: Candidate / Profile / Scorecard 等）
  labels.ts         表示文言（営業活動ログ用に更新済み）
  computed/         派生計算ヘルパー
  data/             ファクトリ関数
hooks/
  use-mobile.ts     雛形由来
.claude/
  skills/           AI 用スキル定義（designing-workspace-ui / shadcn / next-best-practices / vercel-react-best-practices）
```

## 雛形からの retheme 戦略（Layer 1）

3時間スプリントで完成させるため、以下の方針で改造：

| 変えた | 変えない（あえて） |
|---|---|
| `data/*.json` 全部（営業活動ログのモック8社に） | `lib/schema.ts` の型名（Candidate, Scorecard, Stage 等） |
| `lib/labels.ts` の表示文言 | `components/workspace/*.tsx` の関数名・ファイル名 |
| Pane 3 のフィールドラベル（流入経路 / 自社担当 / 想定予算 / 導入想定日） | shadcn/ui 部品の中身 |
| Pane 4 の選択肢（FORMAT_OPTIONS / DECISION_OPTIONS / INTERVIEWER_OPTIONS） | `dnd-kit` の DnD ロジック |
| ダイアログ文言 |   |
| ページタイトル・メタデータ |   |

### 用語マッピング（雛形 → 営業活動ログ）

| 雛形（採用管理） | 本リポ（営業活動ログ） |
|------|------|
| Candidate（候補者） | Customer（顧客） |
| Profile（プロフィール） | 顧客基本情報 |
| Scorecard（スコアカード） | 接触記録 |
| Stage（選考ステージ） | 温度感ステージ |
| 部署/ポジション | フィルタカテゴリ/フィルタ |
| 応募経路 | 流入経路 |
| 採用担当 | 自社担当 |
| 希望年収 | 想定予算 |
| 入社可能日 | 導入想定日 |
| 面接官 / 審査担当 | 対応者 |

## 既知の制限・今後のアップデート予定

### Layer 1（提出時点）の限界

- **型名は採用管理ドメインのまま**: `Candidate` / `Profile` / `Scorecard` 等。コードを読むときに目障りだが、提出物の見た目には影響しない
- **データは保存されない**: モック JSON を `useState` で読み込むだけ。リロードで初期状態に戻る
- **Pane 4 は接触記録の詳細編集のまま**: Phase 1 設計で詰めた「今日やる」リストはまだ実装されていない（Layer 2 として後付け予定）
- **Pane 1 のフィルタはまだ動かない**: 表示だけで、クリックしても Pane 2 の絞り込みは効かない（Layer 3 として後付け予定）

### Layer 2 で計画している変更

- Pane 4 を「接触記録の詳細編集」→「今日やる追客リスト」に**再設計**
  - 顧客カードをドラッグ or ボタンで Pane 4 に追加
  - チェックで完了、ペイン2 の対応待ちリストから自動で消える（state lifting）
  - 同期動作（ペイン2 ⇄ ペイン4）
- 「今日やる」マークと「対応済み」マークのフラグを `Candidate` に追加

### Layer 3 で計画している変更

- `lib/schema.ts` の型名を営業活動ログドメインに改名（`Candidate` → `Customer` 等）
- Pane 1 のフィルタを実際に動作させる（クリックで Pane 2 を絞り込み）
- `__tests__/` のテストを新スキーマに合わせて書き直し
- `data/candidates.json` を `data/customers.json` 等にリネーム
- `.claude/skills/designing-workspace-ui/` を「営業活動ログ向け」に書き直す

## デプロイ

Vercel に接続済み（手動 Import 経由）。

- Production URL: （Vercel デプロイ後に追記）
- Preview: 各PRごとにVercelが自動生成

## 同梱スキル

`.claude/skills/` に以下のスキルが入っており、Cursor または Claude Code で UI 編集すると自動で参照される。

| スキル | 役割 |
|---|---|
| `designing-workspace-ui` | 雛形由来。4ペイン構造と shadcn idiom を守らせる規律スキル（営業活動ログ向けに書き直すのは Layer 3） |
| `shadcn` | shadcn/ui 部品の追加・カスタマイズの公式ルール |
| `next-best-practices` | Next.js 16 のファイル規約・RSC 境界・async パターン |
| `vercel-react-best-practices` | React 性能最適化（70ルール / 8カテゴリ） |

## ライセンス・クレジット

- 雛形 `workspace-ui-kit` をベースに改造。雛形の作者・配布元のライセンスに従う
- shadcn/ui / Next.js / Tailwind CSS / 各種 npm パッケージは各々のライセンスに従う

## 関連リンク

- 既存運用中の MVP（GAS版）: `personal-visual-explainers/.claude/skills/weekly-sales-log/`
- 課題提出計画: `personal-visual-explainers/.claude/skills/weekly-sales-log/第5回6回課題_提出計画.md`
- 第5回講義文字起こし: `ads-lecture/第5回講義_文字起こし.md`
- 第6回講義文字起こし: `ads-lecture/第6回講義_文字起こし.md`
