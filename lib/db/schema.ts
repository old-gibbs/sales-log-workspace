// Drizzle のテーブル定義はここに集約する。
// 詳細は CLAUDE.md「データ責任分界」表 / README.md「段階定義 (P0/P1/P2)」を参照。
//
// P0（第7回課題・第2週）で追加した 2 テーブル:
// - customers: 顧客マスタ（最小列。住所・担当者等は data/candidates.json から join して表示）
// - customer_next_actions: ツール固有データ「次回アクション」（1 顧客 N アクション）

import {
  boolean,
  date,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  // GAS customer_master.official_name と完全一致させる前提（CLAUDE.md「やらないこと」参照）
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const customerNextActions = pgTable("customer_next_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  // 朝の追客で必要な粒度は「今日/今週」程度なので時刻なしの date 型
  dueDate: date("due_date"),
  isDone: boolean("is_done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type CustomerNextAction = typeof customerNextActions.$inferSelect;
export type NewCustomerNextAction = typeof customerNextActions.$inferInsert;
