import { expect } from "chai";
import { buildEngine } from "../replay.js";

describe("DELIBERATELY FAILING TEST - assessment artifact", () => {
  it("alternative interpretation: E7 creates a Day-2 overdraft fee", () => {
    const engine = buildEngine();

    // Intentionally fails.
    // Our design does not reopen the Day-2 operational close when E7 arrives on Day 5.
    // Therefore, the overdraft fee is assessed on Day 5 instead.

    expect(engine.accounts.get("ACC-001").dailyFee.get(2)).to.equal(2500);
  });
});
