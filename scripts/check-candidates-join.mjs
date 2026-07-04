// Neon × candidates.json の join 件数を確認
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(databaseUrl);
const dbCustomers = await sql`SELECT id, name FROM customers ORDER BY name`;
const json = JSON.parse(
  await readFile(new URL("../data/candidates.json", import.meta.url), "utf8"),
);
const jsonByName = new Map(json.map((c) => [c.profile.name, c]));

console.log(`Neon: ${dbCustomers.length} rows`);
console.log(`JSON: ${json.length} rows`);

const joined = [];
const unmatchedDb = [];
const unmatchedJson = [];

for (const row of dbCustomers) {
  if (jsonByName.has(row.name)) joined.push(row.name);
  else unmatchedDb.push(row.name);
}

for (const c of json) {
  if (!dbCustomers.some((r) => r.name === c.profile.name)) {
    unmatchedJson.push(c.profile.name);
  }
}

console.log(`Joined: ${joined.length}`);
joined.forEach((n) => console.log(`  ✓ ${n}`));
if (unmatchedDb.length) {
  console.log("Neon only (no JSON):");
  unmatchedDb.forEach((n) => console.log(`  ? ${n}`));
}
if (unmatchedJson.length) {
  console.log("JSON only (not in Neon):");
  unmatchedJson.forEach((n) => console.log(`  ✗ ${n}`));
}
