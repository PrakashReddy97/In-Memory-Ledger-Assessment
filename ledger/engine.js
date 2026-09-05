import { Ledger } from "./ledger.js";
import { AuthStatus, EntryType } from "./models.js";
import {
  dailyInterest,
  formatMoney,
  OVERDRAFT_FEE,
  parseMoney,
  splitEqual,
} from "./money.js";

export class LedgerEngine {
  constructor() {
    this.ledger = new Ledger();
    this.decisions = [];
    this.errors = [];
    this.lastDay = new Map();
  }

  get accounts() {
    return this.ledger.accounts;
  }

  openAccount(id, currency) {
    this.ledger.openAccount(id, currency);
  }

  replay(events) {
    for (const event of events) {
      this.advanceDay(event.accountId, event.day);
      this.apply(event);
    }
    for (const [accountId, day] of this.lastDay) this.closeDay(accountId, day);
    this.closeRemainingDays(6);
  }

  advanceDay(accountId, day) {
    const previous = this.lastDay.get(accountId);
    if (previous === undefined) {
      this.lastDay.set(accountId, day);
      return;
    }
    if (day < previous)
      throw new Error(`${accountId}: event days must be non-decreasing`);
    if (day > previous) {
      this.closeDay(accountId, previous);
      for (let d = previous + 1; d < day; d += 1) this.closeDay(accountId, d);
      this.lastDay.set(accountId, day);
    }
  }

  apply(event) {
    const account = this.ledger.account(event.accountId);
    const amount =
      event.amount === undefined
        ? 0
        : parseMoney(event.amount, account.currency);

    if (event.type === "CREDIT") {
      const parts = event.instalments
        ? splitEqual(amount, event.instalments)
        : [amount];
      parts.forEach((part, index) =>
        this.ledger.post({
          id: event.instalments ? `${event.id}-${index + 1}` : event.id,
          accountId: event.accountId,
          type: EntryType.CREDIT,
          amount: part,
          valueDate: event.valueDate,
          bookedDay: event.day,
        }),
      );
      return;
    }

    if (event.type === "DEBIT") {
      this.ledger.post({
        id: event.id,
        accountId: event.accountId,
        type: EntryType.DEBIT,
        amount: -amount,
        valueDate: event.valueDate,
        bookedDay: event.day,
      });
      return;
    }

    if (event.type === "AUTHORIZATION") {
      const result = this.ledger.authorize({
        accountId: event.accountId,
        authId: event.authId,
        amount,
        day: event.day,
      });
      this.decisions.push({
        accountId: event.accountId,
        day: event.day,
        eventId: event.id,
        type: "AUTHORIZATION",
        message: `${event.authId}: ${result.auth.status}`,
      });
      return;
    }

    if (event.type === "SETTLEMENT") {
      const failure = this.ledger.settle({
        accountId: event.accountId,
        authId: event.authId,
        amount,
        eventId: event.id,
        day: event.day,
        valueDate: event.valueDate,
      });
      if (failure) {
        const messages = {
          unknown: `Unknown authorization: ${event.authId}`,
          "not-active": `Authorization ${event.authId} is not active`,
          "exceeds-hold": `Settlement exceeds remaining hold for ${event.authId}`,
        };
        this.errors.push({
          accountId: event.accountId,
          day: event.day,
          eventId: event.id,
          message: messages[failure],
        });
      } else {
        this.decisions.push({
          accountId: event.accountId,
          day: event.day,
          eventId: event.id,
          type: "SETTLEMENT",
          message: `${event.authId}: settled ${formatMoney(amount, account.currency)} ${account.currency}; unused hold released`,
        });
      }
      return;
    }

    if (event.type === "REVERSAL") {
      const original = account.entries.find(
        (entry) => entry.id === event.reverses,
      );
      if (!original) {
        this.errors.push({
          accountId: event.accountId,
          day: event.day,
          eventId: event.id,
          message: `Cannot reverse unknown entry: ${event.reverses}`,
        });
        return;
      }
      this.ledger.post({
        id: event.id,
        accountId: event.accountId,
        type: EntryType.REVERSAL,
        amount: -original.amount,
        valueDate: event.valueDate,
        bookedDay: event.day,
        reverses: event.reverses,
      });
      this.decisions.push({
        accountId: event.accountId,
        day: event.day,
        eventId: event.id,
        type: "REVERSAL",
        message: `Reversed ${event.reverses}; earlier fee decisions are not deleted`,
      });
    }
  }

  closeDay(accountId, day) {
    const account = this.ledger.account(accountId);
    if (account.dailyClose.has(day)) return;

    // Snapshot historical balances before today's fee. A later backdated
    // entry can change this historical view, but it must not rewrite the
    // decision that was already made for the day.
    const historicalBalances = new Map();
    for (let d = 1; d <= day; d += 1) {
      historicalBalances.set(d, this.ledger.balance(accountId, d));
    }
    account.asOfClose.set(day, historicalBalances);

    let balance = historicalBalances.get(day);
    let fee = 0;
    if (balance < 0) {
      if (OVERDRAFT_FEE[account.currency] === undefined)
        throw new Error(`No overdraft fee configured for ${account.currency}`);
      fee = OVERDRAFT_FEE[account.currency];
      this.ledger.post({
        id: `FEE-${accountId}-D${day}`,
        accountId,
        type: EntryType.FEE,
        amount: -fee,
        valueDate: day,
        bookedDay: day,
      });
      balance = this.ledger.balance(accountId, day);
    }

    account.dailyFee.set(day, fee);
    account.dailyClose.set(day, balance);
    account.holdAtClose.set(day, this.ledger.activeHold(accountId));
    account.dailyInterest.set(day, dailyInterest(balance));
  }

  closeRemainingDays(endDay) {
    for (const account of this.accounts.values()) {
      // Every account gets a close for every day in the six-day window.
      for (let day = 1; day <= endDay; day += 1) this.closeDay(account.id, day);
      const interest = [...account.dailyInterest.values()].reduce(
        (a, b) => a + b,
        0,
      );
      if (
        interest > 0 &&
        !account.entries.some((entry) => entry.type === EntryType.INTEREST)
      ) {
        this.ledger.post({
          id: `INTEREST-${account.id}`,
          accountId: account.id,
          type: EntryType.INTEREST,
          amount: interest,
          valueDate: endDay,
          bookedDay: endDay,
        });
        account.dailyClose.set(endDay, this.ledger.balance(account.id, endDay));
      }
    }
  }

  historicalBalance(accountId, day) {
    return this.ledger.balance(accountId, day);
  }
  availableBalance(accountId, day) {
    return this.ledger.availableBalance(accountId, day);
  }
}
