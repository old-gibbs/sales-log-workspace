import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/queries", () => ({
  getCustomers: vi.fn(),
}));

import { getCustomers } from "@/lib/db/queries";
import { loadCandidates } from "@/lib/data/load-candidates";

const mockedGetCustomers = vi.mocked(getCustomers);

describe("loadCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("joins Neon customers with JSON attributes by name", async () => {
    mockedGetCustomers.mockResolvedValue([
      {
        id: "uuid-kashima",
        name: "株式会社カシマ水産加工",
        createdAt: new Date("2026-06-01"),
        updatedAt: new Date("2026-06-01"),
      },
      {
        id: "uuid-tsukuba",
        name: "株式会社つくば農産",
        createdAt: new Date("2026-06-01"),
        updatedAt: new Date("2026-06-01"),
      },
    ]);

    const candidates = await loadCandidates();

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      id: "uuid-kashima",
      profile: { name: "株式会社カシマ水産加工" },
      archived: false,
    });
    expect(candidates[1]).toMatchObject({
      id: "uuid-tsukuba",
      profile: { name: "株式会社つくば農産" },
      archived: true,
    });
  });

  it("skips Neon rows that have no JSON match", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockedGetCustomers.mockResolvedValue([
      {
        id: "uuid-known",
        name: "株式会社カシマ水産加工",
        createdAt: new Date("2026-06-01"),
        updatedAt: new Date("2026-06-01"),
      },
      {
        id: "uuid-unknown",
        name: "存在しない株式会社",
        createdAt: new Date("2026-06-01"),
        updatedAt: new Date("2026-06-01"),
      },
    ]);

    const candidates = await loadCandidates();

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.id).toBe("uuid-known");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("存在しない株式会社"),
    );

    warnSpy.mockRestore();
  });
});
