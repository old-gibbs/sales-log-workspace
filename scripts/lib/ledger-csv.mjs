/**
 * 顧客台帳 CSV の decode / parse / マスク / 要約。
 * enrich-candidates-from-ledger.mjs から利用。
 */

import iconv from "iconv-lite";

/** CSV ファイル名 → candidates.json の id */
export const LEDGER_FILE_TO_CANDIDATE_ID = [
  { pattern: /フレッシュタウン/, id: "c1" },
  { pattern: /カシマ水産/, id: "c2" },
  { pattern: /グリーンキッチン/, id: "c3" },
  { pattern: /マルカネ/, id: "c4" },
  { pattern: /ナスノミート/, id: "c5" },
  { pattern: /上州フレッシュファーム/, id: "c6" },
  { pattern: /赤城ベーカリー/, id: "c7" },
  { pattern: /つくば農産/, id: "c8" },
];

/** 旧大分類コード → 営業向けラベル（デモ用） */
export const CATEGORY_LABELS = {
  "01": "真空パック・梱包材",
  "02": "衛生・消耗品",
  "03": "プラ容器",
  "04": "包装資材（その他）",
  "05": "機械部品",
  "06": "計量・包装機器",
  "07": "食品トレー・ボンドン",
  "08": "ラベル・シール",
  "09": "シーリング・ラップ",
  "10": "什器",
  "11": "調理・厨房資材",
  "12": "ギフト箱",
  "14": "袋・包装紙",
  "15": "緩衝材",
  "16": "店舗什器",
  "17": "その他",
  "19": "レジ・店舗用品",
  "30": "雑品",
};

const LEDGER_SUMMARY_MARKER = "【取引台帳サマリ（デモ）】";
const SHIP_TIMELINE_MARKER = "--- 出荷実績（台帳・マスク済） ---";

export function resolveCandidateId(filename) {
  const hit = LEDGER_FILE_TO_CANDIDATE_ID.find(({ pattern }) =>
    pattern.test(filename),
  );
  return hit?.id ?? null;
}

export function decodeLedgerCsv(buffer) {
  for (const enc of ["utf8", "shift_jis", "cp932"]) {
    const text = iconv.decode(buffer, enc);
    if (text.includes("品目") && text.includes("単価")) {
      return { encoding: enc, text };
    }
  }
  return { encoding: "utf8", text: buffer.toString("utf8") };
}

export function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseLedgerCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { header: [], rows: [] };

  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    /** @type {Record<string, string>} */
    const row = {};
    header.forEach((key, i) => {
      row[key] = cols[i] ?? "";
    });
    return row;
  });

  return { header, rows };
}

/** デモ表示用: 台帳単価に約 30% 上乗せ */
export const DEMO_PRICE_MARKUP = 1.3;

/** 品目コードから決定的に微調整（±3%）しつつ、ベースは 30% 上乗せ */
export function maskUnitPrice(price, itemCode, salt = 0) {
  const n = Number.parseFloat(price);
  if (Number.isNaN(n) || n <= 0) return null;
  const code = String(itemCode ?? "");
  let hash = salt;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  }
  const jitter = ((hash % 7) - 3) / 100;
  const masked = n * DEMO_PRICE_MARKUP * (1 + jitter);
  if (masked >= 100) return Math.round(masked);
  if (masked >= 10) return Math.round(masked * 10) / 10;
  return Math.round(masked * 100) / 100;
}

export function maskSupplierName(supplierCode, supplierName, registry) {
  const key = supplierCode?.trim() || supplierName?.trim() || "unknown";
  if (!registry.has(key)) {
    const label = String.fromCharCode(65 + (registry.size % 26));
    registry.set(key, `仕入先${label}`);
  }
  return registry.get(key);
}

export function parseShipDate(value) {
  const m = String(value ?? "").match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function categoryLabel(code) {
  return CATEGORY_LABELS[code] ?? `分類${code}`;
}

function billingNamePattern(billing) {
  const parts = String(billing).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const escaped = parts.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(escaped.join("\\s*"), "g");
}

export function maskItemName(itemName, billingNames, customerShortName = "当社") {
  let name = String(itemName ?? "").trim();
  for (const billing of billingNames) {
    const pattern = billingNamePattern(billing);
    if (!pattern) continue;
    name = name.replace(pattern, `${customerShortName}向け`);
  }
  return name.replace(/\s{2,}/g, " ").trim();
}

/**
 * 品目名をデモ用に抽象化（メーカー記号・材質タグを落とし、サイズ/形状/色だけ残す）。
 * 例: 舞皿2ｰ4 本体 ｴｺ笹陶青 → M皿2-4本体　青
 */
export function abstractItemName(name) {
  let s = String(name ?? "").trim();
  if (!s) return s;

  s = s.normalize("NFKC");
  s = s.replace(/[ｰ―−–－]/g, "-");
  s = s.replace(/([0-9A-Za-z])ー([0-9A-Za-z])/g, "$1-$2");

  s = s.replace(/舞皿/g, "M皿");
  s = s.replace(/FL芝舟/g, "舟型");
  s = s.replace(/FLステージ/g, "ステージ");
  s = s.replace(/FLB-/gi, "トレー");
  s = s.replace(/FLB/gi, "トレー");
  s = s.replace(/バイオカップ/g, "BC");

  s = s.replace(/\([^)]*\)/g, "");

  const noise = [
    /ｴｺ|エコ/g,
    /笹陶/g,
    /OPET|APET|APFC|OPERA/gi,
    /DX/gi,
    /SW/gi,
    /嵌合蓋/g,
    /嵌合/g,
    /氷結/g,
    /FUL-/gi,
    /PET/gi,
    /輝/g,
    /\sAP\s/g,
    /T-/g,
  ];
  for (const pattern of noise) {
    s = s.replace(pattern, "");
  }
  s = s.replace(/\sW\s*$/i, "");
  s = s.replace(/^(APFC|AP|FL)-/gi, "");

  const colorMatch = s.match(/(透明|青|黒|白|赤|黄|緑|金|銀)/);
  const color = colorMatch?.[1] ?? "";
  if (color) s = s.replace(color, "");

  const bodyMatch = s.match(/(本体|蓋|身)/);
  const body = bodyMatch?.[1] ?? "";
  if (body) s = s.replace(body, "");

  s = s.replace(/^BOX-/i, "BOX");
  s = s.replace(/^FL(?!ステ)/i, "");
  s = s.replace(/^ー+/g, "");
  s = s.replace(/^[-]+/g, "");
  s = s.replace(/Tー?ステージ/gi, "ステージ");
  s = s.replace(/(トレー|[Mm]皿|ステージ|舟型|BOX)A(?=\d)/g, "$1");
  s = s.replace(/[- ]?(AP|TC|OPET|V)$/gi, "");
  s = s.replace(/[- ]?[A-Z]$/i, "");

  s = s.replace(/\s+/g, " ").trim();
  let core = s.replace(/\s+/g, "");
  core = core.replace(/^A(?=\d)/, "");
  core = core.replace(/(\d)A$/i, "$1");

  if (!core && !body && !color) return String(name ?? "").trim();

  let result = core;
  if (body) result += body;
  if (color) result += `　${color}`;
  return result.trim();
}

/** 請求先マスク → 品目名抽象化 */
export function demoItemName(rawName, billingNames, customerShortName = "当社") {
  return abstractItemName(maskItemName(rawName, billingNames, customerShortName));
}

/**
 * @param {Record<string, string>[]} rows
 * @param {string} customerDisplayName
 */
export function summarizeLedgerRows(rows, customerDisplayName) {
  const supplierRegistry = new Map();
  const billingNames = [
    ...new Set(
      rows.map((row) => (row["請求先名"] ?? "").trim()).filter(Boolean),
    ),
  ];
  const customerShortName = customerDisplayName.replace(/^株式会社\s*/u, "").slice(0, 8);
  /** @type {Array<{date: string, itemName: string, category: string, sell: number}>} */
  const events = [];

  let annualProxy = 0;
  const categoryCounts = new Map();

  for (const row of rows) {
    const itemCode = row["品目コード"] ?? "";
    const itemName = demoItemName(
      row["品目名"] ?? "",
      billingNames,
      customerShortName,
    );
    const sell = maskUnitPrice(row["販売（台帳）単価"], itemCode);
    const caseQty = Number.parseFloat(row["ケース入り数"] ?? "1");
    const cat = row["旧大分類"] ?? "";
    const shipIso = parseShipDate(row["最終出荷日"]);

    if (sell !== null && !Number.isNaN(caseQty) && caseQty > 0) {
      annualProxy += sell * caseQty;
    }

    if (cat) {
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }

    maskSupplierName(row["主要仕入れ先"], row["仕入れ先名"], supplierRegistry);

    if (shipIso && itemName) {
      events.push({
        date: shipIso,
        itemName,
        category: cat,
        sell: sell ?? 0,
      });
    }
  }

  events.sort((a, b) => b.date.localeCompare(a.date));

  const annualMan = Math.max(10, Math.round(annualProxy / 10_000));
  const budgetMin = String(Math.max(10, Math.round((annualMan * 0.75) / 10) * 10));
  const budgetMax = String(Math.round((annualMan * 1.15) / 10) * 10);

  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([code, count]) => `${categoryLabel(code)} ${count}品目`);

  const recentShipLines = events.slice(0, 6).map((ev) => {
    const shortName =
      ev.itemName.length > 28 ? `${ev.itemName.slice(0, 28)}…` : ev.itemName;
    return `${ev.date}  ${shortName} 出荷（${categoryLabel(ev.category)}・台帳）`;
  });

  const latestShip = events[0]?.date ?? null;
  const earliestShip = events.at(-1)?.date ?? null;

  const summaryBlock = [
    LEDGER_SUMMARY_MARKER,
    `${customerDisplayName}向け取引品目 ${rows.length} 件（うち仕入先 ${supplierRegistry.size} 社・単価はデモ用にマスク済）。`,
    `主要カテゴリ: ${topCategories.join(" / ") || "—"}.`,
    `直近出荷: ${latestShip ?? "—"}、台帳上の最古出荷: ${earliestShip ?? "—"}.`,
    `年間取引規模（概算・万円）: ${budgetMin}〜${budgetMax}.`,
    `※ 品目名・単価はデモ用（名称抽象化 + 約30%上乗せ）。`,
  ].join("\n");

  const shipBlock =
    recentShipLines.length > 0
      ? [SHIP_TIMELINE_MARKER, ...recentShipLines].join("\n")
      : "";

  return {
    summaryBlock,
    shipBlock,
    budgetMin,
    budgetMax,
    firstContactDate: earliestShip,
    itemCount: rows.length,
    supplierCount: supplierRegistry.size,
    latestShipDate: latestShip,
    earliestShipDate: earliestShip,
  };
}

/** Pane 3「取引品目」カード用 JSON（上位 N 件、マスク済） */
export const LEDGER_DISPLAY_ITEM_LIMIT = 10;

/**
 * @param {Record<string, string>[]} rows
 * @param {string} candidateJsonId
 * @param {string} customerDisplayName
 */
export function buildCustomerLedger(
  rows,
  candidateJsonId,
  customerDisplayName,
  { itemLimit = LEDGER_DISPLAY_ITEM_LIMIT } = {},
) {
  const supplierRegistry = new Map();
  const billingNames = [
    ...new Set(
      rows.map((row) => (row["請求先名"] ?? "").trim()).filter(Boolean),
    ),
  ];
  const customerShortName = customerDisplayName
    .replace(/^株式会社\s*/u, "")
    .slice(0, 8);
  const categoryCounts = new Map();
  /** @type {Array<{itemCode: string, itemName: string, categoryCode: string, categoryLabel: string, sellPrice: number | null, lastShipDate: string | null, supplierLabel: string}>} */
  const items = [];

  for (const row of rows) {
    const itemCode = row["品目コード"] ?? "";
    const itemName = demoItemName(
      row["品目名"] ?? "",
      billingNames,
      customerShortName,
    );
    const sell = maskUnitPrice(row["販売（台帳）単価"], itemCode);
    const cat = row["旧大分類"] ?? "";
    const shipIso = parseShipDate(row["最終出荷日"]);
    const supplierLabel = maskSupplierName(
      row["主要仕入れ先"],
      row["仕入れ先名"],
      supplierRegistry,
    );

    if (cat) {
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }

    items.push({
      itemCode,
      itemName,
      categoryCode: cat,
      categoryLabel: categoryLabel(cat),
      sellPrice: sell,
      lastShipDate: shipIso,
      supplierLabel,
    });
  }

  items.sort((a, b) =>
    (b.lastShipDate ?? "").localeCompare(a.lastShipDate ?? ""),
  );

  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([code, count]) => ({
      code,
      label: categoryLabel(code),
      count,
    }));

  return {
    candidateJsonId,
    customerName: customerDisplayName,
    itemCount: rows.length,
    supplierCount: supplierRegistry.size,
    latestShipDate: items[0]?.lastShipDate ?? null,
    topCategories,
    items: items.slice(0, itemLimit),
  };
}

export function mergeMotivationFull(existing, summaryBlock) {
  const base = String(existing ?? "")
    .split(LEDGER_SUMMARY_MARKER)[0]
    .trimEnd();
  if (!base) return summaryBlock;
  return `${base}\n\n${summaryBlock}`;
}

export function mergeCareerText(existing, shipBlock) {
  if (!shipBlock) return String(existing ?? "").trimEnd();
  const base = String(existing ?? "")
    .split(SHIP_TIMELINE_MARKER)[0]
    .trimEnd();
  if (!base) return shipBlock;
  return `${base}\n\n${shipBlock}`;
}

export { LEDGER_SUMMARY_MARKER, SHIP_TIMELINE_MARKER };
