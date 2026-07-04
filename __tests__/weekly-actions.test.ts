import { describe, it, expect } from "vitest";

import { deriveWeeklyActions } from "@/lib/computed/weekly-actions";
import { type Scorecard, type StageKey } from "@/lib/schema";

const AS_OF = "2026-07-04";

function scorecard(over: Partial<Scorecard>): Scorecard {
  return {
    stage: "screening",
    label: "情報収集",
    date: "",
    format: "",
    interviewer: "",
    axisScores: {
      achievements: null,
      thinkingAbility: null,
      communication: null,
      cultureFit: null,
    },
    attachments: [],
    ...over,
  };
}

function baseInput(
  over: Partial<Parameters<typeof deriveWeeklyActions>[0]> = {},
) {
  return {
    stage: "screening" as StageKey,
    archived: false,
    scorecards: [] as Scorecard[],
    availableStartDate: "",
    openNextAction: null,
    asOfDate: AS_OF,
    ...over,
  };
}

describe("deriveWeeklyActions", () => {
  it("returns notice when scorecards are empty", () => {
    const result = deriveWeeklyActions(baseInput());
    expect(result.suggestions).toHaveLength(0);
    expect(result.noticeMessage).toContain("接触記録がない");
  });

  it("R-A1: overdue next action", () => {
    const result = deriveWeeklyActions(
      baseInput({
        scorecards: [
          scorecard({
            date: "2026-06-01",
            decision: "前向き",
          }),
        ],
        openNextAction: {
          id: "1",
          customerId: "c1",
          body: "見積回答を確認する",
          dueDate: "2026-07-01",
          isDone: false,
        },
      }),
    );
    expect(result.suggestions[0]?.ruleId).toBe("R-A1");
    expect(result.suggestions[0]?.message).toContain("期限が過ぎています");
  });

  it("R-A2: archived with 見送り", () => {
    const result = deriveWeeklyActions(
      baseInput({
        archived: true,
        scorecards: [
          scorecard({
            date: "2026-04-20",
            decision: "見送り",
          }),
        ],
      }),
    );
    expect(result.suggestions[0]?.ruleId).toBe("R-A2");
  });

  it("R-B4: cold but positive and stale contact", () => {
    const result = deriveWeeklyActions(
      baseInput({
        stage: "screening",
        scorecards: [
          scorecard({
            date: "2026-06-20",
            decision: "前向き",
          }),
        ],
      }),
    );
    expect(result.suggestions.some((s) => s.ruleId === "R-B4")).toBe(true);
  });

  it("Q1: suppresses extra rules when next action is planned far ahead", () => {
    const result = deriveWeeklyActions(
      baseInput({
        stage: "first",
        scorecards: [
          scorecard({
            date: "2026-07-01",
            decision: "前向き",
          }),
        ],
        openNextAction: {
          id: "1",
          customerId: "c1",
          body: "来月フォロー",
          dueDate: "2026-07-20",
          isDone: false,
        },
      }),
    );
    expect(result.suggestions).toHaveLength(0);
    expect(result.alignedMessage).toBe("次回アクションに沿って進めてください。");
  });

  it("R-C2: due within 7 days still shows alongside Q1", () => {
    const result = deriveWeeklyActions(
      baseInput({
        scorecards: [
          scorecard({
            date: "2026-07-01",
            decision: "前向き",
          }),
        ],
        openNextAction: {
          id: "1",
          customerId: "c1",
          body: "今週中に電話",
          dueDate: "2026-07-08",
          isDone: false,
        },
      }),
    );
    expect(result.suggestions.some((s) => s.ruleId === "R-C2")).toBe(true);
  });

  it("returns at most 2 suggestions sorted by priority", () => {
    const result = deriveWeeklyActions(
      baseInput({
        stage: "second",
        scorecards: [
          scorecard({
            date: "2026-05-01",
            decision: "前向き",
          }),
        ],
        availableStartDate: "2026-08-01",
        openNextAction: {
          id: "1",
          customerId: "c1",
          body: "期限切れタスク",
          dueDate: "2026-06-01",
          isDone: false,
        },
      }),
    );
    expect(result.suggestions.length).toBeLessThanOrEqual(2);
    expect(result.suggestions[0]?.ruleId).toBe("R-A1");
  });
});
