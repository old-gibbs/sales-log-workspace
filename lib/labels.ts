/**
 * 営業活動ログ ワークスペースの表示文言（labels）。
 *
 * 雛形の workspace-ui-kit（採用管理サンプル）から、営業活動ログ向けに
 * 用語を書き換えたバージョン。型名（AxisKey / StageKey / Candidate 等）は
 * 互換性のため変更せず、key → 日本語ラベルのマッピングだけを差し替えている。
 *
 * 用語マッピング（採用管理 → 営業活動ログ）:
 *   - Candidate（候補者）   → Customer（顧客）
 *   - Profile（プロフィール）→ 顧客基本情報
 *   - Scorecard（スコアカード）→ 接触記録
 *   - Stage（選考ステージ） → 温度感ステージ
 *   - 4 軸（実績/思考力/CM/CF） → BANT 寄りの 4 軸（後述）
 */

import { type AxisKey, type StageKey } from "@/lib/schema";

// ===== 評価 4 軸（BANT フレームワーク寄り） =====
// 営業現場で顧客の有望度を見立てる 4 観点。
//   - interestLevel（旧 achievements）: 関心度 — 製品・サービスへの興味の高さ
//   - budgetFit（旧 thinkingAbility）  : 予算合致度 — 想定予算と提示価格のフィット
//   - decisionPower（旧 communication）: 決裁権合致度 — 接触相手が決裁に近いか
//   - timingFit（旧 cultureFit）       : タイミング合致度 — 導入想定時期の現実性

export const EVALUATION_AXIS: Record<AxisKey, string> = {
  achievements: "関心度",
  thinkingAbility: "予算合致度",
  communication: "決裁権合致度",
  cultureFit: "タイミング合致度",
} as const;

// Pane 2 のグループ見出しに出す温度感ステージ表示名（日本語）。
// 採用管理の「書類選考/一次/二次/最終」を、営業活動ログの温度感に置き換え。
// 内部キーは型互換のため screening/first/second/final のまま据え置く。
export const STAGE_LABELS: Record<StageKey, string> = {
  screening: "情報収集（Cold）",
  first: "ニーズ確認（Warm）",
  second: "提案中（Hot）",
  final: "クロージング（決裁直前）",
};

// Pane 2 末尾の「アーカイブ済み」グループの見出しラベル。
// 営業活動ログでは「失注 / 保留」になった顧客を束ねる仮想グループとして扱う。
export const ARCHIVED_GROUP_LABEL = "失注・保留";

// ===== Pane 3 ダッシュボードのセクション見出し =====

export const PANE3_SECTION = {
  applicationInfo: "顧客基本情報",
  recruitingConditions: "想定条件（予算・導入時期）",
  screeningFlow: "接触履歴",
  screeningFlowDescription: "過去の接触記録",
  nextAction: "次回アクション",
  nextActionDescription: "追客メモと期限（Neon に保存）",
  ledgerItems: "取引品目（台帳）",
  ledgerItemsDescription: "直近出荷順・閲覧専用（CSV 取込・マスク済）",
  weeklyAction: "今週の打ち手",
  weeklyActionDescription:
    "接触記録と次回アクションから導いた提案（閲覧専用・Neon には保存しない）",
} as const;

/** Pane 3「顧客基本情報」カード内のフィールドラベル（profile 型キーは雛形互換のまま）。 */
export const PROFILE_FIELD = {
  name: "顧客名",
  firstContactDate: "初回接触日",
  source: "流入経路",
  recruiter: "自社担当",
  contactSection: "連絡先",
  email: "メールアドレス",
  phone: "電話番号",
  address: "住所",
  activityTimeline: "活動タイムライン",
  backgroundAndNeeds: "背景・ニーズ",
  budgetMin: "想定予算（下限）",
  budgetMax: "想定予算（上限）",
  budgetUnit: "万円",
  availableStartDate: "導入想定日",
} as const;

// ===== Pane 4 セクション id（ADR-0015 §19 でモード 1 廃止、m2 のみ） =====

export const PANE4_SECTION_IDS = {
  m2: {
    info: "pane4-m2-info",
    evaluation: "pane4-m2-evaluation",
    comment: "pane4-m2-comment",
    summary: "pane4-m2-summary",
    attachments: "pane4-m2-attachments",
  },
} as const;
