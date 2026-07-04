/**
 * Desktop 等の顧客台帳 CSV から candidates.json の profile を要約・マスクして拡充する。
 *
 * 更新対象（scorecards / stage / archived は触らない）:
 *   - profile.motivationFull … 【取引台帳サマリ】ブロックを差し替え
 *   - profile.careerText       … 出荷実績タイムラインを追記（既存の営業活動行は維持）
 *   - profile.desiredSalaryMin/Max … 台帳から概算（--keep-budget でスキップ）
 *   - profile.birthday         … 最古出荷日（--set-first-contact、未設定時のみ）
 *
 * マスク:
 *   - 請求先名は CSV に出さず candidates.json の profile.name を使用
 *   - 仕入先名 → 仕入先A/B/…（コードベースで安定マッピング）
 *   - 単価 → 品目コードから決定的に ±8% 程度ジッター
 *
 * 実行例:
 *   node scripts/enrich-candidates-from-ledger.mjs --dry-run
 *   node scripts/enrich-candidates-from-ledger.mjs --input "C:/Users/.../顧客台帳ダミー/(件名なし)"
 */

import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCustomerLedger,
  decodeLedgerCsv,
  mergeCareerText,
  mergeMotivationFull,
  parseLedgerCsv,
  resolveCandidateId,
  summarizeLedgerRows,
} from "./lib/ledger-csv.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_INPUT = path.join(
  process.env.USERPROFILE ?? "",
  "OneDrive",
  "デスクトップ",
  "顧客台帳ダミー",
  "(件名なし)",
);
const CANDIDATES_PATH = path.join(REPO_ROOT, "data", "candidates.json");
const LEDGER_DIR = path.join(REPO_ROOT, "data", "ledger");

function parseArgs(argv) {
  const opts = {
    inputDir: DEFAULT_INPUT,
    dryRun: false,
    keepBudget: false,
    setFirstContact: true,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--keep-budget") opts.keepBudget = true;
    else if (arg === "--no-set-first-contact") opts.setFirstContact = false;
    else if (arg === "--input") {
      opts.inputDir = argv[++i];
      if (!opts.inputDir) throw new Error("--input requires a directory path");
    } else if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`Usage: node scripts/enrich-candidates-from-ledger.mjs [options]

Options:
  --input <dir>           CSV フォルダ（既定: Desktop/顧客台帳ダミー/(件名なし)）
  --dry-run               書き込まず変更内容だけ表示
  --keep-budget           desiredSalaryMin/Max を上書きしない
  --no-set-first-contact  birthday（初回接触日）を自動設定しない
  --help                  このヘルプ
`);
}

async function loadLedgerCsvFiles(inputDir) {
  const entries = await readdir(inputDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".csv"))
    .map((e) => e.name);

  /** @type {Map<string, { filename: string, summary: ReturnType<typeof summarizeLedgerRows> }>} */
  const byCandidateId = new Map();

  for (const filename of files.sort()) {
    const candidateId = resolveCandidateId(filename);
    if (!candidateId) {
      console.warn(`skip (no mapping): ${filename}`);
      continue;
    }

    const buf = await readFile(path.join(inputDir, filename));
    const { encoding, text } = decodeLedgerCsv(buf);
    const { rows } = parseLedgerCsv(text);

    if (rows.length === 0) {
      console.warn(`skip (empty): ${filename}`);
      continue;
    }

    console.log(
      `read: ${filename} → ${candidateId} (${rows.length} rows, ${encoding})`,
    );

    byCandidateId.set(candidateId, {
      filename,
      rowCount: rows.length,
      encoding,
      rows,
    });
  }

  return byCandidateId;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    return;
  }

  const ledgerFiles = await loadLedgerCsvFiles(opts.inputDir);
  if (ledgerFiles.size === 0) {
    console.error(`No CSV files found in: ${opts.inputDir}`);
    process.exit(1);
  }

  const candidates = JSON.parse(await readFile(CANDIDATES_PATH, "utf8"));
  let updated = 0;

  for (const candidate of candidates) {
    const ledger = ledgerFiles.get(candidate.id);
    if (!ledger) continue;

    const summary = summarizeLedgerRows(ledger.rows, candidate.profile.name);
    const before = {
      motivationFull: candidate.profile.motivationFull,
      careerText: candidate.profile.careerText,
      desiredSalaryMin: candidate.profile.desiredSalaryMin,
      desiredSalaryMax: candidate.profile.desiredSalaryMax,
      birthday: candidate.profile.birthday,
    };

    candidate.profile.motivationFull = mergeMotivationFull(
      candidate.profile.motivationFull,
      summary.summaryBlock,
    );
    candidate.profile.careerText = mergeCareerText(
      candidate.profile.careerText,
      summary.shipBlock,
    );

    if (!opts.keepBudget) {
      candidate.profile.desiredSalaryMin = summary.budgetMin;
      candidate.profile.desiredSalaryMax = summary.budgetMax;
    }

    if (
      opts.setFirstContact &&
      !candidate.profile.birthday &&
      summary.firstContactDate
    ) {
      candidate.profile.birthday = summary.firstContactDate;
    }

    const ledgerSnapshot = buildCustomerLedger(
      ledger.rows,
      candidate.id,
      candidate.profile.name,
    );

    if (!opts.dryRun) {
      ledger._snapshot = ledgerSnapshot;
    }

    updated++;
    console.log("");
    console.log(
      `[${candidate.id}] ${candidate.profile.name} ← ${ledger.filename}`,
    );
    console.log(
      `  items=${summary.itemCount} suppliers(masked)=${summary.supplierCount} budget=${summary.budgetMin}-${summary.budgetMax}万`,
    );

    if (opts.dryRun) {
      console.log("  motivationFull (tail):");
      console.log(
        candidate.profile.motivationFull.split("\n").slice(-4).join("\n    "),
      );
      if (summary.shipBlock) {
        console.log("  careerText (ship tail):");
        console.log(
          candidate.profile.careerText.split("\n").slice(-3).join("\n    "),
        );
      }
      // restore for dry-run
      candidate.profile.motivationFull = before.motivationFull;
      candidate.profile.careerText = before.careerText;
      candidate.profile.desiredSalaryMin = before.desiredSalaryMin;
      candidate.profile.desiredSalaryMax = before.desiredSalaryMax;
      candidate.profile.birthday = before.birthday;
    }
  }

  console.log("");
  console.log(`matched ${updated} / ${candidates.length} candidates`);

  if (opts.dryRun) {
    console.log("dry-run: data/candidates.json / data/ledger/*.json は更新しませんでした");
    return;
  }

  if (updated === 0) {
    console.error("No candidates updated.");
    process.exit(1);
  }

  await mkdir(LEDGER_DIR, { recursive: true });

  for (const candidate of candidates) {
    const ledger = ledgerFiles.get(candidate.id);
    if (!ledger?._snapshot) continue;
    const outPath = path.join(LEDGER_DIR, `${candidate.id}.json`);
    await writeFile(
      outPath,
      `${JSON.stringify(ledger._snapshot, null, 2)}\n`,
      "utf8",
    );
    console.log(`wrote ledger: ${outPath}`);
  }

  await writeFile(
    CANDIDATES_PATH,
    `${JSON.stringify(candidates, null, 2)}\n`,
    "utf8",
  );
  console.log(`wrote: ${CANDIDATES_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
