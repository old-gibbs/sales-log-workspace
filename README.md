# sales-log-workspace

営業活動ログ用のワークスペース UI プロトタイプ（**4ペイン、Next.js 16 + shadcn/ui**）。
朝1分で「対応待ち顧客の状況把握」と「今日やる追客の優先順位決定」を完了するための画面。

> 第5〜第7回 月次課題の提出物。
> - 第5・6回（自分の思想を画面にする月）: 配布雛形 `workspace-ui-kit`（採用管理サンプル）をベースに、営業活動ログ向けに retheme した踏襲ルート案件として提出。
> - 第7回（データを保存できる Web アプリにして Vercel に公開する月）: P0 として顧客マスタと「次回アクション」を Neon Postgres に永続化、P1 として GAS の週次集計をツールに取り込む同期機能を追加。
> 段階定義は本 README の「段階定義（P0/P1/P2 以降）」を参照。

## 関連する既存物

| 項目 | 場所 | 内容 |
|------|------|------|
| 営業活動ログ MVP（運用中） | `personal-visual-explainers/.claude/skills/weekly-sales-log/` | Googleフォーム + GAS + スプレッドシート。**入力・蓄積・週次集計の SoT**（Source of Truth = 正本）として運用中 |
| **本リポジトリ** | このリポ | 営業活動ログ向け Viewer + 報告組み立てツール。Layer 1（第5・6回提出時点）はモックのみ。**P0（第7回）以降は Neon Postgres に「次回アクション」と顧客マスタを永続化** |

第5・6回提出時点では `weekly-sales-log` MVP の `activity_log` スキーマ（`timestamp` / `customer_name` / `temperature` / `next_action` 等）を**モックデータとして流用**していた。第7回以降は GAS との責任分界を明示し、**GAS が SoT、本ツールがミラー + ツール固有データ**として振る舞う構成に進化させる（詳細は CLAUDE.md「データ責任分界」表を参照）。

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

## 段階定義（P0 / P1 / P2 以降）

第7回課題で「データを保存できる Web アプリ」化するため、以下の段階で育てる。各段階の入る順番（P0 → P1 → P2）と、**何を Neon に置き、何を GAS に残すか** は CLAUDE.md「データ責任分界」表に従う。

### Layer 1（第5・6回提出時点 / 完了済み）

- 配布雛形 `workspace-ui-kit` を営業活動ログドメインに retheme
- データ保存なし、モック JSON を `useState` で読み込むだけ
- 型名は採用管理ドメインのまま（`Candidate` / `Profile` / `Scorecard` 等）

### P0（第7回課題の必須要件）

- Neon プロジェクト作成 + Vercel ストレージ連携 + Drizzle ORM 導入
- DB スキーマ: `customers`（顧客マスタ）+ `customer_next_actions`（ツール固有の「次回アクション」）
- 顧客マスタ 8 社を Neon に手動 INSERT（`name` は GAS `customer_master.official_name` と完全一致）
- ツール側の顧客読み込み源を `data/candidates.json` から Neon に切り替え
- Pane 3 or 4 に「次回アクション」UI を追加（Server Action で保存・更新・完了切替）
- Vercel デプロイ + 環境変数（`DATABASE_URL`）設定

### P1（第7回課題の推奨範囲・連携の中核）

- Google Sheets API 認証セットアップ（GCP プロジェクト + サービスアカウント発行 + シート共有設定）
- DB スキーマ追加: `weekly_summary_snapshots(id, period_start, period_end, payload_json, imported_at)`
- Server Action「GAS から `weekly_summary` 取り込み」（最新 + 過去4週、手動「同期」ボタン）
- 取り込み結果の表示 UI（Pane 1 の対応待ち上部に「今週のサマリ」バナー等）

### P2 以降（第8回課題以降に持ち越し）

- **Layer 2**: Pane 4 を「接触記録の詳細編集」→「今日やる追客リスト」に再設計（同期動作・state lifting・「今日やる」「対応済み」フラグ）
- **Layer 3**: 型名を営業ドメインに改名（`Candidate` → `Customer` 等）、`data/candidates.json` を `data/customers.json` にリネーム、`__tests__/` を新スキーマに合わせて書き直し、`.claude/skills/designing-workspace-ui/` を営業活動ログ向けに書き直し
- Pane 1 のフィルタを実際に動作させる（クリックで Pane 2 を絞り込み）
- GAS `customer_master` 同期 Server Action（P0 の手動 INSERT を自動化）
- GAS `activity_log` を Neon に snapshot ミラー（蓄積振り返り画面の素材）
- 蓄積振り返り画面（時系列で温度遷移を表示）
- 報告フォーマット生成（Markdown テンプレに `weekly_summary` を流し込み、上司報告作成を支援）
- AI 機能組み込み（任意発展課題：「来週優先顧客」AI 提案、報告ドラフト生成）

## 採用しなかった案（記録）

設計で検討して却下した代替案を記録しておく（数週間後・数か月後の自分が再検討時にゼロから議論せずに済むように）。

| 案 | 内容 | 却下理由 |
|---|---|---|
| 完全 DB 移行（GAS 廃止） | GAS を捨てて Neon 一本化 | 既存運用破壊、Google フォーム入力継続性を失う |
| JSON ハイブリッド | DB なし、GAS から JSON を書き出して PR で反映 | 第7回課題「データを保存できる」要件に正面から答えない、スケールしない |
| ローカル SQLite（Vercel 公開せず） | 公開せずローカル保存 | 公開課題と相性悪い、外部公開で講師に見せられない |
| P0 に Pane 4「今日やる」UI 改修を含める | UI 改修を P0 に同梱 | Pane 4 設計が未確定、雑にやると手戻り（Layer 2 として P2 に分離） |
| P1 で `customer_master` / `activity_log` も同期 | フル同期を前倒し | P0 直後は手戻りリスク、価値が薄い（P2 で実施） |
| P1 で報告フォーマット生成も実装 | テンプレ化を前倒し | 実データを Neon で見てから設計する方が手戻り少ない（P3 で実施） |

## デプロイ

Vercel に接続済み（GitHub 連携、`main` ブランチへの push で自動デプロイ）。

- **Production URL**: https://sales-log-workspace.vercel.app/
- Preview: 各PRごとに Vercel が自動生成

### 環境変数（P0 以降）

| 変数名 | 用途 | 設定タイミング |
|---|---|---|
| `DATABASE_URL` | Neon Postgres 接続文字列 | P0（Vercel ストレージ連携で自動設定される想定） |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google Sheets API サービスアカウント JSON（base64 等で1行化） | P1 |
| `SHEETS_SPREADSHEET_ID` | GAS が書き込むスプレッドシートの ID | P1 |

いずれもリポジトリにコミット禁止（CLAUDE.md「やらないこと」を参照）。ローカル開発時は `.env.local`（`.gitignore` 配下）に置く。

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
- GAS MVP の現状まとめ: `personal-visual-explainers/.claude/skills/weekly-sales-log/現状まとめ.md`
- 第5・6回 課題提出計画: `personal-visual-explainers/.claude/skills/weekly-sales-log/第5回6回課題_提出計画.md`
- **第7回 課題方針確定（grill-me セッション結果）**: `personal-visual-explainers/.claude/skills/weekly-sales-log/引継ぎ_2026-06-07_第7回課題grill完了.md`
- 第5回講義文字起こし: `ads-lecture/第5回講義_文字起こし.md`
- 第6回講義文字起こし: `ads-lecture/第6回講義_文字起こし.md`
- 第7回講義文字起こし: `ads-lecture/第7回講義_文字起こし.md`
