"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import {
  createNextAction,
  toggleNextActionDone,
  updateNextAction,
} from "@/app/actions/next-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InlineDateField } from "@/components/primitives";
import { PANE3_SECTION } from "@/lib/labels";
import { type CustomerNextActionItem } from "@/lib/schema";

type NextActionCardProps = {
  customerId: string;
  initialAction: CustomerNextActionItem | null;
};

export function NextActionCard({
  customerId,
  initialAction,
}: NextActionCardProps) {
  const [action, setAction] = useState(initialAction);
  const [body, setBody] = useState(initialAction?.body ?? "");
  const [dueDate, setDueDate] = useState(initialAction?.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setError("内容を入力してください");
      return;
    }

    startTransition(async () => {
      setError(null);
      const dueDateValue = dueDate.trim() === "" ? null : dueDate.trim();

      if (action) {
        const result = await updateNextAction({
          id: action.id,
          body: trimmedBody,
          dueDate: dueDateValue,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setAction(result.data);
        setBody(result.data.body);
        setDueDate(result.data.dueDate ?? "");
        return;
      }

      const result = await createNextAction({
        customerId,
        body: trimmedBody,
        dueDate: dueDateValue,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAction(result.data);
      setBody(result.data.body);
      setDueDate(result.data.dueDate ?? "");
    });
  };

  const handleToggleDone = () => {
    if (!action) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await toggleNextActionDone({
        id: action.id,
        isDone: true,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAction(null);
      setBody("");
      setDueDate("");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle emphasis="prominent">{PANE3_SECTION.nextAction}</CardTitle>
        <CardDescription>{PANE3_SECTION.nextActionDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`next-action-body-${customerId}`}>内容</Label>
            <Textarea
              id={`next-action-body-${customerId}`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="例: 見積回答を確認し、9月切替の条件を電話で詰める"
              className="min-h-24 bg-card leading-relaxed"
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>期限（任意）</Label>
            <InlineDateField
              value={dueDate}
              onSave={setDueDate}
              ariaLabel="次回アクションの期限"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSave} disabled={pending}>
              {pending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              {action ? "更新" : "保存"}
            </Button>
            {action && (
              <Button
                type="button"
                variant="outline"
                onClick={handleToggleDone}
                disabled={pending}
              >
                <CheckCircle2 aria-hidden="true" />
                完了にする
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
