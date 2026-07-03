import candidatesData from "@/data/candidates.json";
import { getCustomers } from "@/lib/db/queries";
import { candidatesSchema, type Candidate } from "@/lib/schema";

/**
 * P0 ハイブリッド読み込み: 顧客リストは Neon が正本、属性は candidates.json が正本。
 * customers.name ↔ profile.name で in-memory join する。
 */
export async function loadCandidates(): Promise<Candidate[]> {
  const jsonResult = candidatesSchema.safeParse(candidatesData);
  if (!jsonResult.success) {
    throw new Error(
      `candidates.json: ${jsonResult.error.issues[0]?.message ?? "invalid format"}`,
    );
  }

  const dbCustomers = await getCustomers();
  const jsonByName = new Map(
    jsonResult.data.map((candidate) => [candidate.profile.name, candidate]),
  );

  const joined: Candidate[] = [];
  const unmatched: string[] = [];

  for (const dbCustomer of dbCustomers) {
    const jsonCandidate = jsonByName.get(dbCustomer.name);
    if (!jsonCandidate) {
      unmatched.push(dbCustomer.name);
      continue;
    }

    joined.push({
      id: dbCustomer.id,
      profile: jsonCandidate.profile,
      scorecards: jsonCandidate.scorecards,
      stage: jsonCandidate.stage,
      archived: jsonCandidate.archived,
    });
  }

  if (unmatched.length > 0) {
    console.warn(
      `[loadCandidates] Neon customers without JSON attributes: ${unmatched.join(", ")}`,
    );
  }

  return joined;
}
