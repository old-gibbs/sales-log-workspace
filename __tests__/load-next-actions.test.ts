import { describe, it, expect } from "vitest";

import { pickOpenNextAction } from "@/lib/data/load-next-actions";
import { type CustomerNextActionItem } from "@/lib/schema";

const actions: CustomerNextActionItem[] = [
  {
    id: "a1",
    customerId: "c1",
    body: "done action",
    dueDate: null,
    isDone: true,
  },
  {
    id: "a2",
    customerId: "c1",
    body: "open old",
    dueDate: "2026-07-01",
    isDone: false,
  },
  {
    id: "a3",
    customerId: "c1",
    body: "open new",
    dueDate: "2026-07-10",
    isDone: false,
  },
  {
    id: "a4",
    customerId: "c2",
    body: "other customer",
    dueDate: null,
    isDone: false,
  },
];

describe("pickOpenNextAction", () => {
  it("returns the first open action for the customer", () => {
    expect(pickOpenNextAction(actions, "c1")).toMatchObject({
      id: "a2",
      body: "open old",
    });
  });

  it("returns null when only done actions exist", () => {
    expect(
      pickOpenNextAction(
        actions.filter((action) => action.customerId === "c1" && action.isDone),
        "c1",
      ),
    ).toBeNull();
  });
});

describe("loadOpenNextActionsByCustomerId", () => {
  it("module can be imported", async () => {
    const mod = await import("@/lib/data/load-next-actions");
    expect(mod.loadOpenNextActionsByCustomerId).toBeTypeOf("function");
  });
});
