import { describe, it, expect } from "vitest";

import {
  maskUnitPrice,
  maskSupplierName,
  maskItemName,
  mergeMotivationFull,
  mergeCareerText,
  parseLedgerCsv,
  resolveCandidateId,
  summarizeLedgerRows,
  buildCustomerLedger,
  abstractItemName,
  demoItemName,
  DEMO_PRICE_MARKUP,
  LEDGER_SUMMARY_MARKER,
} from "../scripts/lib/ledger-csv.mjs";

describe("ledger-csv", () => {
  it("resolveCandidateId maps filename to c2", () => {
    expect(resolveCandidateId("カシマ水産ダミー台帳.csv")).toBe("c2");
    expect(resolveCandidateId("unknown.csv")).toBeNull();
  });

  it("maskUnitPrice applies ~30% markup with small deterministic jitter", () => {
    const a = maskUnitPrice("100", "123456");
    const b = maskUnitPrice("100", "123456");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(100 * DEMO_PRICE_MARKUP * 0.97);
    expect(a).toBeLessThanOrEqual(100 * DEMO_PRICE_MARKUP * 1.03);
  });

  it("maskSupplierName assigns stable aliases", () => {
    const registry = new Map();
    expect(maskSupplierName("001", "Real Corp", registry)).toBe("仕入先A");
    expect(maskSupplierName("001", "Real Corp", registry)).toBe("仕入先A");
    expect(maskSupplierName("002", "Other Corp", registry)).toBe("仕入先B");
  });

  it("abstractItemName simplifies vendor-specific product names", () => {
    expect(abstractItemName("舞皿2ｰ4 本体 ｴｺ笹陶青")).toBe("M皿2-4本体　青");
    expect(abstractItemName("FLｽﾃｰｼﾞ25ｰ15(32) DX黒")).toBe("ステージ25-15　黒");
  });

  it("demoItemName chains billing mask and abstraction", () => {
    expect(
      demoItemName("舞皿2-4 本体 ｴｺ青", [], "フレッシュタウン"),
    ).toBe("M皿2-4本体　青");
  });

  it("maskItemName redacts billing names embedded in item names", () => {
    expect(
      maskItemName("フレッシュ園渡辺 イチゴカップ", ["フレッシュ園　渡辺"], "つくば農産"),
    ).toContain("つくば農産向け");
    expect(
      maskItemName("フレッシュ園渡辺 イチゴカップ", ["フレッシュ園　渡辺"], "つくば農産"),
    ).not.toContain("フレッシュ園");
  });

  it("buildCustomerLedger produces masked snapshot for UI", () => {
    const csv = `"No.","請求先名","品目コード","品目名","在庫数","販売（台帳）単価","購買単価","旧大分類","最終出荷日","最終入荷日","ケース入り数","重量","主要仕入れ先","仕入れ先名"
1,"Real Customer","100001","テスト品目A",,"10.000000",8.000000,"07","2026/06/01",,1000.0000,"1","000001","Real Supplier"`;

    const { rows } = parseLedgerCsv(csv);
    const ledger = buildCustomerLedger(rows, "c9", "株式会社テスト");

    expect(ledger.candidateJsonId).toBe("c9");
    expect(ledger.itemCount).toBe(1);
    expect(ledger.items[0]?.supplierLabel).toMatch(/^仕入先/);
    expect(ledger.items[0]?.itemName).not.toMatch(/Real|Supplier/i);
    expect(JSON.stringify(ledger)).not.toContain("Real Supplier");
  });

  it("summarizeLedgerRows masks billing context and estimates budget", () => {
    const csv = `"No.","請求先名","品目コード","品目名","在庫数","販売（台帳）単価","購買単価","旧大分類","最終出荷日","最終入荷日","ケース入り数","重量","主要仕入れ先","仕入れ先名"
1,"Real Customer","100001","テスト品目A",,"10.000000",8.000000,"07","2026/06/01",,1000.0000,"1","000001","Real Supplier"
2,"Real Customer","100002","テスト品目B",,"20.000000",15.000000,"01","2026/05/15",,500.0000,"2","000002","Other Supplier"`;

    const { rows } = parseLedgerCsv(csv);
    const summary = summarizeLedgerRows(rows, "株式会社テスト");

    expect(summary.summaryBlock).toContain(LEDGER_SUMMARY_MARKER);
    expect(summary.summaryBlock).toContain("株式会社テスト");
    expect(summary.summaryBlock).not.toContain("Real Customer");
    expect(summary.summaryBlock).not.toContain("Real Supplier");
    expect(summary.budgetMin).toMatch(/^\d+$/);
    expect(summary.shipBlock).toContain("2026-06-01");
  });

  it("mergeMotivationFull replaces prior summary block", () => {
    const merged = mergeMotivationFull(
      `手書きの背景。\n\n${LEDGER_SUMMARY_MARKER}\n古いサマリ`,
      `${LEDGER_SUMMARY_MARKER}\n新しいサマリ`,
    );
    expect(merged).toBe(
      `手書きの背景。\n\n${LEDGER_SUMMARY_MARKER}\n新しいサマリ`,
    );
  });

  it("mergeCareerText keeps sales activity and appends ship block", () => {
    const merged = mergeCareerText(
      "2026-06-01  訪問ヒアリング",
      "--- 出荷実績（台帳・マスク済） ---\n2026-06-01  品目 出荷",
    );
    expect(merged).toContain("訪問ヒアリング");
    expect(merged).toContain("出荷実績");
  });
});
