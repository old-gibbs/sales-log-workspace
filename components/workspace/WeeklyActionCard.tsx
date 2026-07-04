"use client";

import { Lightbulb } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deriveWeeklyActions } from "@/lib/computed/weekly-actions";
import { PANE3_SECTION } from "@/lib/labels";
import {
  type CustomerNextActionItem,
  type Scorecard,
  type StageKey,
} from "@/lib/schema";

export function WeeklyActionCard({
  stage,
  archived,
  scorecards,
  availableStartDate,
  openNextAction,
}: {
  stage: StageKey;
  archived: boolean;
  scorecards: Scorecard[];
  availableStartDate: string;
  openNextAction: CustomerNextActionItem | null;
}) {
  const result = deriveWeeklyActions({
    stage,
    archived,
    scorecards,
    availableStartDate,
    openNextAction,
  });

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader>
        <CardTitle emphasis="prominent" className="flex items-center gap-2">
          <Lightbulb
            className="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          {PANE3_SECTION.weeklyAction}
        </CardTitle>
        <CardDescription>{PANE3_SECTION.weeklyActionDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {result.noticeMessage && (
          <p className="text-sm text-muted-foreground">{result.noticeMessage}</p>
        )}

        {result.suggestions.length > 0 && (
          <ul className="flex flex-col gap-3">
            {result.suggestions.map((item) => (
              <li
                key={item.ruleId}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <p className="text-sm leading-relaxed text-foreground">
                  {item.message}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {item.badges.map((badge) => (
                    <Badge key={badge} variant="secondary" size="xs">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        {result.alignedMessage && (
          <p className="text-sm text-muted-foreground">{result.alignedMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
