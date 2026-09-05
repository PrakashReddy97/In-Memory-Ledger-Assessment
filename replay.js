import { LedgerEngine } from "./ledger/engine.js";
import { ACCOUNTS, EVENTS } from "./ledger/events.js";
import { formatMoney } from "./ledger/money.js";

export function buildEngine() {
  const engine = new LedgerEngine();
  for (const [id, currency] of ACCOUNTS) engine.openAccount(id, currency);
  engine.replay(EVENTS);
  return engine;
}

export function printReport(engine) {
  console.log("IN-MEMORY ACCOUNT LEDGER");
  console.log("======================================");

  for (let day = 1; day <= 6; day += 1) {
    console.log(`\nDAY ${day}`);

    for (const account of engine.accounts.values()) {
      const currency = account.currency;

      const ledgerBalance = account.dailyClose.get(day) ?? 0;
      const activeHolds = account.holdAtClose.get(day) ?? 0;
      const availableBalance = ledgerBalance - activeHolds;

      const fee = account.dailyFee.get(day) ?? 0;
      const interest = account.dailyInterest.get(day) ?? 0;

      console.log(`  ${account.id} (${currency})`);

      console.log(
        `    Ledger balance         : ${formatMoney(ledgerBalance, currency)}`,
      );

      console.log(
        `    Active holds           : ${formatMoney(activeHolds, currency)}`,
      );

      console.log(
        `    Available balance      : ${formatMoney(
          availableBalance,
          currency,
        )}`,
      );

      console.log(`    Overdraft fee          : ${formatMoney(fee, currency)}`);

      console.log(
        `    Interest accrued today : ${formatMoney(interest, currency)}`,
      );

      // Interest is calculated every day.
      // On Day 6, all daily accruals are posted as one credit.
      if (day === 6) {
        let totalInterest = 0;

        for (const amount of account.dailyInterest.values()) {
          totalInterest += amount;
        }

        console.log(
          `    Interest capitalized   : ${formatMoney(
            totalInterest,
            currency,
          )}`,
        );
      }

      // Show only events belonging to this account and this day.
      for (const decision of engine.decisions.filter(
        (d) => d.day === day && d.accountId === account.id,
      )) {
        console.log(
          `    ${decision.eventId} ${decision.type}: ${decision.message}`,
        );
      }

      // Show only errors belonging to this account and this day.
      for (const error of engine.errors.filter(
        (e) => e.day === day && e.accountId === account.id,
      )) {
        console.log(`    ERROR ${error.eventId}: ${error.message}`);
      }
    }
  }

  console.log("\nFINAL AUTHORIZATIONS");
  for (const account of engine.accounts.values()) {
    for (const auth of account.authorizations.values()) {
      console.log(
        `  ${auth.id}: ${auth.status}, ` +
          `settled=${formatMoney(auth.settledAmount ?? 0, account.currency)}, ` +
          `remaining hold=${formatMoney(auth.remainingHold ?? 0, account.currency)}`,
      );
    }
  }

  console.log("\nFINAL BALANCES");
  for (const account of engine.accounts.values()) {
    const balance = engine.ledger.balance(account.id, 6);
    console.log(
      `  ${account.id}: ${formatMoney(balance, account.currency)} ${account.currency}`,
    );
  }

  console.log("\nBACKDATED ENTRY CHECK");
  const account = engine.accounts.get("ACC-001");
  const day5Snapshot = account.asOfClose.get(5);

  console.log(
    `  Day 2 operational close: ${formatMoney(account.dailyClose.get(2), "AED")} AED`,
  );
  console.log(
    `  Day 2 reconstructed at end of Day 5, before Day 5 fee: ` +
      `${formatMoney(day5Snapshot.get(2), "AED")} AED`,
  );
}

// Only print when this file is run directly (`node replay.js`), not when
// the tests import buildEngine/printReport - otherwise `npm test` prints
// the whole report as a side effect of loading the module.
if (import.meta.url === `file://${process.argv[1]}`) {
  printReport(buildEngine());
}
