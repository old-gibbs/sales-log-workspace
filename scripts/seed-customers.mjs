// 顧客マスタ 8 社を Neon の customers テーブルに INSERT する seed script。
//
// 設計方針:
// - data/candidates.json の profile.name を正本として読み込む（CLAUDE.md「やらないこと」: customers.name は GAS official_name と完全一致）
// - ON CONFLICT (name) DO NOTHING で冪等化（何度実行しても 8 行のまま）
// - migration とは分離（migration 0000 は構造のみ。データ投入は seed の責務）
//
// 実行: npm run db:seed

import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "DATABASE_URL is not defined. Ensure .env.local is populated (vercel env pull or via Vercel Storage Quickstart).",
  );
  process.exit(1);
}

const candidatesJsonUrl = new URL("../data/candidates.json", import.meta.url);
const candidates = JSON.parse(await readFile(candidatesJsonUrl, "utf8"));
const names = candidates.map((c) => c.profile.name);

if (names.length === 0) {
  console.error("No candidates found in data/candidates.json.");
  process.exit(1);
}

const sql = neon(databaseUrl);

let inserted = 0;
let skipped = 0;

for (const name of names) {
  const rows = await sql`
    INSERT INTO customers (name)
    VALUES (${name})
    ON CONFLICT (name) DO NOTHING
    RETURNING id, name
  `;
  if (rows.length > 0) {
    inserted++;
    console.log(`inserted: ${name} (id=${rows[0].id})`);
  } else {
    skipped++;
    console.log(`skipped (already exists): ${name}`);
  }
}

const [{ count }] =
  await sql`SELECT count(*)::int AS count FROM customers`;

console.log("");
console.log(
  `done. inserted=${inserted} skipped=${skipped} customers.total=${count}`,
);
