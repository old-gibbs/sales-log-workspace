/**
 * Phase 2: 「今週の打ち手」ルールエンジン（派生表示のみ、永続化しない）。
 *
 * 入力: scorecards + next_action + candidate.stage / archived / 導入想定日
 * 台帳・LLM は使わない。
 */

import {
  getLatestDoneScorecard,
  getScorecardsAverageScore,
} from "@/lib/computed/scorecards";
import { STAGE_LABELS } from "@/lib/labels";
import {
  type CustomerNextActionItem,
  type Scorecard,
  type StageKey,
} from "@/lib/schema";

export const WEEKLY_ACTION_MAX_SUGGESTIONS = 2;

const HOT_STAGES: StageKey[] = ["second", "final"];
const CONTACT_STALE_HOT_DAYS = 14;
const CONTACT_FOLLOWUP_DAYS = 7;
const TARGET_SOON_DAYS = 60;
const NEXT_ACTION_PLANNED_DAYS = 7;

export type WeeklyActionSuggestion = {
  ruleId: string;
  priority: "A" | "B" | "C";
  message: string;
  badges: string[];
};

export type WeeklyActionResult = {
  /** 最大 2 件の打ち手提案 */
  suggestions: WeeklyActionSuggestion[];
  /** 次回アクションあり・抑制時の短文（Q1 案A） */
  alignedMessage: string | null;
  /** 接触記録ゼロ等 */
  noticeMessage: string | null;
};

export type WeeklyActionInput = {
  stage: StageKey;
  archived: boolean;
  scorecards: Scorecard[];
  availableStartDate: string;
  openNextAction: CustomerNextActionItem | null;
  /** テスト用。省略時はローカル今日 */
  asOfDate?: string;
};

type RuleContext = {
  asOfDate: string;
  stage: StageKey;
  archived: boolean;
  scorecards: Scorecard[];
  availableStartDate: string;
  openNextAction: CustomerNextActionItem | null;
  latestDone: ReturnType<typeof getLatestDoneScorecard>;
  latestDecision: string | null;
  daysSinceContact: number | null;
  daysUntilTarget: number | null;
  averageScore: number | null;
};

type RuleDef = {
  id: string;
  priority: "A" | "B" | "C";
  matches: (ctx: RuleContext) => boolean;
  build: (ctx: RuleContext) => Omit<WeeklyActionSuggestion, "ruleId" | "priority">;
  suppressWhenArchivedUnless?: "見送り";
};

const RULES: RuleDef[] = [
  {
    id: "R-A1",
    priority: "A",
    matches: (ctx) => {
      const action = ctx.openNextAction;
      if (!action?.dueDate) return false;
      return action.dueDate < ctx.asOfDate;
    },
    build: (ctx) => {
      const body = ctx.openNextAction?.body.trim() ?? "";
      const snippet = body
        ? `「${truncateText(body, 30)}」を`
        : "設定済みの内容を";
      return {
        message: `次回アクションの期限が過ぎています。${snippet}今日中に実行してください。`,
        badges: ["期限超過"],
      };
    },
  },
  {
    id: "R-A2",
    priority: "A",
    matches: (ctx) =>
      ctx.archived && ctx.latestDecision === "見送り",
    build: () => ({
      message:
        "失注・保留案件です。再アプローチ時期（半年後など）を次回アクションにメモしておく。",
      badges: ["見送り", "失注・保留"],
    }),
  },
  {
    id: "R-A3",
    priority: "A",
    matches: (ctx) =>
      !ctx.archived &&
      HOT_STAGES.includes(ctx.stage) &&
      ctx.latestDecision === "前向き" &&
      ctx.daysSinceContact !== null &&
      ctx.daysSinceContact >= CONTACT_STALE_HOT_DAYS,
    build: (ctx) => ({
      message:
        "Hot 案件で 2 週間以上接触なし。決裁・進捗確認のフォローを入れる。",
      badges: [
        stageBadge(ctx.stage),
        `最終接触 ${ctx.daysSinceContact}日前`,
        "前向き",
      ],
    }),
    suppressWhenArchivedUnless: "見送り",
  },
  {
    id: "R-B1",
    priority: "B",
    matches: (ctx) =>
      !ctx.openNextAction &&
      ctx.stage !== "screening" &&
      ctx.latestDecision === "前向き",
    build: (ctx) => ({
      message:
        "次回アクションが未設定です。最新接触のフォロー内容を 1 行で書き留める。",
      badges: [stageBadge(ctx.stage), "次回アクション未設定"],
    }),
    suppressWhenArchivedUnless: "見送り",
  },
  {
    id: "R-B2",
    priority: "B",
    matches: (ctx) =>
      !ctx.archived &&
      HOT_STAGES.includes(ctx.stage) &&
      ctx.daysUntilTarget !== null &&
      ctx.daysUntilTarget > 0 &&
      ctx.daysUntilTarget <= TARGET_SOON_DAYS,
    build: (ctx) => ({
      message: `導入想定日まで ${ctx.daysUntilTarget} 日。切替条件・サンプル評価の期限を次回アクションに落とす。`,
      badges: [stageBadge(ctx.stage), `導入まで ${ctx.daysUntilTarget}日`],
    }),
    suppressWhenArchivedUnless: "見送り",
  },
  {
    id: "R-B3",
    priority: "B",
    matches: (ctx) =>
      !ctx.archived &&
      ctx.latestDecision === "保留" &&
      ctx.daysSinceContact !== null &&
      ctx.daysSinceContact >= CONTACT_FOLLOWUP_DAYS,
    build: (ctx) => ({
      message:
        "保留中の案件。保留理由の変化がないか、短い確認連絡を入れる。",
      badges: ["保留", `最終接触 ${ctx.daysSinceContact}日前`],
    }),
    suppressWhenArchivedUnless: "見送り",
  },
  {
    id: "R-B4",
    priority: "B",
    matches: (ctx) =>
      !ctx.archived &&
      ctx.stage === "screening" &&
      ctx.latestDecision === "前向き" &&
      ctx.daysSinceContact !== null &&
      ctx.daysSinceContact >= CONTACT_FOLLOWUP_DAYS,
    build: (ctx) => ({
      message:
        "Cold だが前向き反応あり。ニーズ深掘りの第 2 接触を今週入れる。",
      badges: [
        stageBadge(ctx.stage),
        `最終接触 ${ctx.daysSinceContact}日前`,
        "前向き",
      ],
    }),
    suppressWhenArchivedUnless: "見送り",
  },
  {
    id: "R-C1",
    priority: "C",
    matches: (ctx) => ctx.latestDecision === "受注",
    build: () => ({
      message:
        "受注済み。導入・初回出荷のフォローを次回アクションに整理する。",
      badges: ["受注"],
    }),
    suppressWhenArchivedUnless: "見送り",
  },
  {
    id: "R-C2",
    priority: "C",
    matches: (ctx) => {
      const action = ctx.openNextAction;
      if (!action?.dueDate) return false;
      if (action.dueDate < ctx.asOfDate) return false;
      const days = daysBetween(ctx.asOfDate, action.dueDate);
      return days <= NEXT_ACTION_PLANNED_DAYS;
    },
    build: () => ({
      message: "今週期限の次回アクションあり。優先的に対応する。",
      badges: ["今週期限"],
    }),
  },
  {
    id: "R-C3",
    priority: "C",
    matches: (ctx) =>
      !ctx.archived &&
      ctx.stage === "screening" &&
      ctx.averageScore !== null &&
      ctx.averageScore <= 2.0,
    build: () => ({
      message:
        "温度感低め。追加接触より情報整理（背景・ニーズの更新）を優先する。",
      badges: ["温度感低め"],
    }),
    suppressWhenArchivedUnless: "見送り",
  },
];

const PRIORITY_ORDER: Record<WeeklyActionSuggestion["priority"], number> = {
  A: 0,
  B: 1,
  C: 2,
};

export function formatIsoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split("-").map(Number);
  const [y2, m2, d2] = toIso.split("-").map(Number);
  const from = Date.UTC(y1, m1 - 1, d1);
  const to = Date.UTC(y2, m2 - 1, d2);
  return Math.round((to - from) / 86_400_000);
}

function truncateText(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function stageBadge(stage: StageKey): string {
  return STAGE_LABELS[stage];
}

function buildContext(input: WeeklyActionInput): RuleContext {
  const asOfDate = input.asOfDate ?? formatIsoLocal(new Date());
  const latestDone = getLatestDoneScorecard(input.scorecards);
  const latestDecision = latestDone?.decision?.trim() || null;
  const daysSinceContact = latestDone?.date
    ? daysBetween(latestDone.date, asOfDate)
    : null;
  const daysUntilTarget =
    input.availableStartDate.trim() !== ""
      ? daysBetween(asOfDate, input.availableStartDate.trim())
      : null;

  return {
    asOfDate,
    stage: input.stage,
    archived: input.archived,
    scorecards: input.scorecards,
    availableStartDate: input.availableStartDate,
    openNextAction: input.openNextAction,
    latestDone,
    latestDecision,
    daysSinceContact,
    daysUntilTarget,
    averageScore: getScorecardsAverageScore(input.scorecards),
  };
}

function isSuppressedByArchived(
  rule: RuleDef,
  ctx: RuleContext,
): boolean {
  if (!ctx.archived) return false;
  if (!rule.suppressWhenArchivedUnless) return false;
  return ctx.latestDecision !== rule.suppressWhenArchivedUnless;
}

function isSuppressedByNextAction(
  rule: RuleDef,
  ctx: RuleContext,
): boolean {
  const action = ctx.openNextAction;
  if (!action) return false;

  // R-A1 / R-C2 は次回アクション連動のため常に評価
  if (rule.id === "R-A1" || rule.id === "R-C2") return false;

  const overdue = action.dueDate !== null && action.dueDate < ctx.asOfDate;
  if (overdue) return false;

  // Hot 放置 (R-A3) は Q1 案A で残す
  if (rule.id === "R-A3") return false;

  // 期限が 7 日以上先 → R-B1 抑制 (S-2)
  if (rule.id === "R-B1" && action.dueDate) {
    const daysUntilDue = daysBetween(ctx.asOfDate, action.dueDate);
    if (daysUntilDue >= NEXT_ACTION_PLANNED_DAYS) return true;
  }

  // Q1 案A: 次回アクションあり → A 系（A1/A3）と C2 以外は抑制
  if (rule.priority !== "A") return true;

  return false;
}

function shouldShowAlignedMessage(
  ctx: RuleContext,
  suggestions: WeeklyActionSuggestion[],
): boolean {
  if (!ctx.openNextAction) return false;
  if (suggestions.length > 0) return false;

  const action = ctx.openNextAction;
  const overdue = action.dueDate !== null && action.dueDate < ctx.asOfDate;
  if (overdue) return false;

  const hotNeglected =
    !ctx.archived &&
    HOT_STAGES.includes(ctx.stage) &&
    ctx.latestDecision === "前向き" &&
    ctx.daysSinceContact !== null &&
    ctx.daysSinceContact >= CONTACT_STALE_HOT_DAYS;
  if (hotNeglected) return false;

  return true;
}

export function deriveWeeklyActions(input: WeeklyActionInput): WeeklyActionResult {
  if (input.scorecards.length === 0) {
    return {
      suggestions: [],
      alignedMessage: null,
      noticeMessage:
        "接触記録がないため打ち手を提案できません。フォーム入力後に再表示されます。",
    };
  }

  const ctx = buildContext(input);
  const matched: WeeklyActionSuggestion[] = [];

  for (const rule of RULES) {
    if (isSuppressedByArchived(rule, ctx)) continue;
    if (isSuppressedByNextAction(rule, ctx)) continue;
    if (!rule.matches(ctx)) continue;

    const built = rule.build(ctx);
    matched.push({
      ruleId: rule.id,
      priority: rule.priority,
      ...built,
    });
  }

  matched.sort((a, b) => {
    const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (p !== 0) return p;
    return a.ruleId.localeCompare(b.ruleId);
  });

  const suggestions = matched.slice(0, WEEKLY_ACTION_MAX_SUGGESTIONS);
  const alignedMessage = shouldShowAlignedMessage(ctx, suggestions)
    ? "次回アクションに沿って進めてください。"
    : null;

  if (suggestions.length === 0 && !alignedMessage) {
    return {
      suggestions: [],
      alignedMessage: null,
      noticeMessage: "現時点でルール上の打ち手はありません。次回アクションを更新してください。",
    };
  }

  return {
    suggestions,
    alignedMessage,
    noticeMessage: null,
  };
}
