import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "DATABASE_URL is not defined. Run `vercel env pull .env.local --environment=production` first.",
  );
  process.exit(1);
}

const sql = neon(databaseUrl);
const rows = await sql`select 1 as ok, now() as ts, current_database() as db, version() as version`;
console.log("Neon connection OK:");
console.log(rows[0]);
