import { Workspace } from "@/components/workspace/Workspace";
import positionsData from "@/data/positions.json";
import workspaceData from "@/data/workspace.json";
import { loadCandidates } from "@/lib/data/load-candidates";
import {
  indexLedgersByCustomerId,
  loadLedgersByCustomerName,
} from "@/lib/data/load-ledgers";
import { loadOpenNextActionsByCustomerId } from "@/lib/data/load-next-actions";
import { departmentsSchema, workspaceSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialCandidates = await loadCandidates();
  const [deptResult, wsResult] = await Promise.all([
    Promise.resolve(departmentsSchema.safeParse(positionsData)),
    Promise.resolve(workspaceSchema.safeParse(workspaceData)),
  ]);

  if (!deptResult.success || !wsResult.success) {
    const errors = [
      !deptResult.success &&
        `positions.json: ${deptResult.error.issues[0]?.message}`,
      !wsResult.success &&
        `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  if (initialCandidates.length === 0) {
    throw new Error(
      "顧客データが 0 件です。Neon の customers テーブルと data/candidates.json の name が一致しているか確認してください。",
    );
  }

  const initialNextActionsByCustomerId =
    await loadOpenNextActionsByCustomerId(
      initialCandidates.map((candidate) => candidate.id),
    );

  const ledgersByName = await loadLedgersByCustomerName();
  const initialLedgersByCustomerId = indexLedgersByCustomerId(
    initialCandidates.map((c) => ({ id: c.id, name: c.profile.name })),
    ledgersByName,
  );

  return (
    <Workspace
      initialDepartments={deptResult.data}
      initialCandidates={initialCandidates}
      initialNextActionsByCustomerId={initialNextActionsByCustomerId}
      initialLedgersByCustomerId={initialLedgersByCustomerId}
      workspace={wsResult.data}
    />
  );
}
