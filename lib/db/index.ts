import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not defined. Run `vercel env pull .env.local --environment=production` for local development.",
  );
}

const sql = neon(databaseUrl);
export const db = drizzle(sql);
