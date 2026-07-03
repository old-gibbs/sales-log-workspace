"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  insertNextAction,
  updateNextActionDone,
  updateNextActionRow,
} from "@/lib/db/queries";
import { type CustomerNextActionItem } from "@/lib/schema";

const uuidSchema = z.uuid();
const dueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

const createSchema = z.object({
  customerId: uuidSchema,
  body: z.string().trim().min(1, "内容を入力してください"),
  dueDate: dueDateSchema,
});

const updateSchema = z.object({
  id: uuidSchema,
  body: z.string().trim().min(1, "内容を入力してください"),
  dueDate: dueDateSchema,
});

const toggleSchema = z.object({
  id: uuidSchema,
  isDone: z.boolean(),
});

type ActionResult =
  | { ok: true; data: CustomerNextActionItem }
  | { ok: false; error: string };

function toErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "入力内容が正しくありません";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "保存に失敗しました";
}

export async function createNextAction(input: {
  customerId: string;
  body: string;
  dueDate: string | null;
}): Promise<ActionResult> {
  try {
    const parsed = createSchema.parse(input);
    const data = await insertNextAction(parsed);
    revalidatePath("/");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function updateNextAction(input: {
  id: string;
  body: string;
  dueDate: string | null;
}): Promise<ActionResult> {
  try {
    const parsed = updateSchema.parse(input);
    const data = await updateNextActionRow(parsed);
    if (!data) {
      return { ok: false, error: "次回アクションが見つかりません" };
    }
    revalidatePath("/");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function toggleNextActionDone(input: {
  id: string;
  isDone: boolean;
}): Promise<ActionResult> {
  try {
    const parsed = toggleSchema.parse(input);
    const data = await updateNextActionDone(parsed);
    if (!data) {
      return { ok: false, error: "次回アクションが見つかりません" };
    }
    revalidatePath("/");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
