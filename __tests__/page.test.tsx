import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/data/load-candidates", () => ({
  loadCandidates: vi.fn(),
}));

vi.mock("@/components/workspace/Workspace", () => ({
  Workspace: () => null,
}));

describe("workspace-ui-kit smoke tests", () => {
  it("page module can be imported", async () => {
    const mod = await import("../app/page");
    expect(mod).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});
