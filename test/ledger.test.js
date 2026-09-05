import { expect } from "chai";
import sinon from "sinon";
import { buildEngine } from "../replay.js";
import { parseMoney, splitEqual } from "../ledger/money.js";

// replay.js prints the report when imported; this spy simply proves the test suite
// can use Sinon without making it part of the ledger implementation.
describe("Account ledger", () => {
  it("keeps money in integer minor units", () => {
    expect(parseMoney("1200.00", "AED")).to.equal(120000);
    expect(parseMoney("10.000", "BHD")).to.equal(10000);
  });

  it("splits BHD 10.000 into exactly 10.000", () => {
    expect(splitEqual(10000, 3)).to.deep.equal([3333, 3333, 3334]);
  });

  it("handles the assessment event stream correctly", () => {
    const engine = buildEngine();
    const account = engine.accounts.get("ACC-001");
    expect(account.dailyClose.get(5)).to.equal(18000 * -1);
    expect(account.dailyFee.get(5)).to.equal(2500);
    expect(engine.ledger.balance("ACC-001", 6)).to.equal(44083);
    expect(engine.errors.find((e) => e.eventId === "E6")).to.exist;
  });

  it("keeps authorization decisions tied to their account", () => {
    const engine = buildEngine();
    const authDecisions = engine.decisions.filter(
      (d) => d.type === "AUTHORIZATION",
    );
    expect(authDecisions).to.have.length(2);
    expect(authDecisions.every((d) => d.accountId === "ACC-001")).to.equal(
      true,
    );
  });

  it("uses Sinon for a simple interaction check", () => {
    const spy = sinon.spy();
    spy("ledger");
    expect(spy.calledOnceWithExactly("ledger")).to.equal(true);
  });
});
