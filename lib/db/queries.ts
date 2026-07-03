import { asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/index";
import {
  customerNextActions,
  customers,
  type CustomerNextAction,
} from "@/lib/db/schema";
import { type CustomerNextActionItem } from "@/lib/schema";

/** Neon customers テーブルから全顧客を取得（name 昇順）。 */
export async function getCustomers() {
  return db.select().from(customers).orderBy(asc(customers.name));
}

function toNextActionItem(row: CustomerNextAction): CustomerNextActionItem {
  return {
    id: row.id,
    customerId: row.customerId,
    body: row.body,
    dueDate: row.dueDate,
    isDone: row.isDone,
  };
}

/** 指定顧客の次回アクションを新しい順で取得。 */
export async function getNextActionsForCustomers(customerIds: string[]) {
  if (customerIds.length === 0) {
    return [] as CustomerNextActionItem[];
  }

  const rows = await db
    .select()
    .from(customerNextActions)
    .where(inArray(customerNextActions.customerId, customerIds))
    .orderBy(desc(customerNextActions.createdAt));

  return rows.map(toNextActionItem);
}

export async function insertNextAction(input: {
  customerId: string;
  body: string;
  dueDate: string | null;
}) {
  const [row] = await db
    .insert(customerNextActions)
    .values({
      customerId: input.customerId,
      body: input.body,
      dueDate: input.dueDate,
    })
    .returning();

  if (!row) {
    throw new Error("次回アクションの作成に失敗しました。");
  }

  return toNextActionItem(row);
}

export async function updateNextActionRow(input: {
  id: string;
  body: string;
  dueDate: string | null;
}) {
  const [row] = await db
    .update(customerNextActions)
    .set({
      body: input.body,
      dueDate: input.dueDate,
      updatedAt: new Date(),
    })
    .where(eq(customerNextActions.id, input.id))
    .returning();

  if (!row) {
    return null;
  }

  return toNextActionItem(row);
}

export async function updateNextActionDone(input: {
  id: string;
  isDone: boolean;
}) {
  const [row] = await db
    .update(customerNextActions)
    .set({
      isDone: input.isDone,
      updatedAt: new Date(),
    })
    .where(eq(customerNextActions.id, input.id))
    .returning();

  if (!row) {
    return null;
  }

  return toNextActionItem(row);
}
