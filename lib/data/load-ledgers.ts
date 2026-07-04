import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { customerLedgerSchema, type CustomerLedger } from "@/lib/schema";

const LEDGER_DIR = path.join(process.cwd(), "data", "ledger");

/**
 * data/ledger/*.json を profile.name で索引する。
 * ファイルが無い / 空ディレクトリの場合は空 Map（Pane 3 カード非表示）。
 */
export async function loadLedgersByCustomerName(): Promise<
  Map<string, CustomerLedger>
> {
  let files: string[];
  try {
    files = await readdir(LEDGER_DIR);
  } catch {
    return new Map();
  }

  const map = new Map<string, CustomerLedger>();

  for (const file of files.filter((f) => f.endsWith(".json"))) {
    const raw = JSON.parse(
      await readFile(path.join(LEDGER_DIR, file), "utf8"),
    );
    const parsed = customerLedgerSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn(
        `[loadLedgers] skip ${file}: ${parsed.error.issues[0]?.message}`,
      );
      continue;
    }
    map.set(parsed.data.customerName, parsed.data);
  }

  return map;
}

/** Neon join 後の customer id → 台帳 */
export function indexLedgersByCustomerId(
  customerIds: Array<{ id: string; name: string }>,
  byName: Map<string, CustomerLedger>,
): Record<string, CustomerLedger | null> {
  const out: Record<string, CustomerLedger | null> = {};
  for (const { id, name } of customerIds) {
    out[id] = byName.get(name) ?? null;
  }
  return out;
}
