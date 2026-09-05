import {
  Account,
  Authorization,
  AuthStatus,
  EntryType,
  LedgerEntry,
} from "./models.js";

export class Ledger {
  constructor() {
    this.accounts = new Map();
    this.allEntries = [];
    this.sequence = 0;
  }

  openAccount(id, currency) {
    this.accounts.set(id, new Account(id, currency));
  }

  account(id) {
    const account = this.accounts.get(id);
    if (!account) throw new Error(`Unknown account: ${id}`);
    return account;
  }

  post({ id, accountId, type, amount, valueDate, bookedDay, reverses = null }) {
    if (this.allEntries.some((entry) => entry.id === id)) {
      throw new Error(`Duplicate ledger entry: ${id}`);
    }
    const entry = new LedgerEntry({
      id,
      accountId,
      type,
      amount,
      valueDate,
      bookedDay,
      reverses,
    });
    this.account(accountId).entries.push(entry);
    this.allEntries.push(entry);
    this.sequence += 1;
    return entry;
  }

  balance(accountId, valueDate) {
    const account = this.account(accountId);
    return (
      account.openingBalance +
      account.entries
        .filter((entry) => entry.valueDate <= valueDate)
        .reduce((total, entry) => total + entry.amount, 0)
    );
  }

  activeHold(accountId) {
    return [...this.account(accountId).authorizations.values()]
      .filter((auth) => auth.status === AuthStatus.APPROVED)
      .reduce((total, auth) => total + auth.remainingHold, 0);
  }

  availableBalance(accountId, valueDate) {
    return this.balance(accountId, valueDate) - this.activeHold(accountId);
  }

  authorize({ eventId, accountId, authId, amount, day }) {
    const available = this.availableBalance(accountId, day);
    const auth = new Authorization({ id: authId, accountId, amount, day });
    if (available - amount < 0) {
      auth.status = AuthStatus.DECLINED;
      auth.remainingHold = 0;
    }
    this.account(accountId).authorizations.set(authId, auth);
    return {
      auth,
      availableBefore: available,
      availableAfter: available - amount,
    };
  }

  settle({ accountId, authId, amount, eventId, day, valueDate }) {
    const account = this.account(accountId);
    const auth = account.authorizations.get(authId);
    if (!auth || auth.status !== AuthStatus.APPROVED) return false;
    if (amount > auth.remainingHold)
      throw new Error(`Settlement exceeds remaining hold for ${authId}`);

    this.post({
      id: eventId,
      accountId,
      type: EntryType.SETTLEMENT,
      amount: -amount,
      valueDate,
      bookedDay: day,
    });
    auth.settledAmount += amount;
    auth.remainingHold -= amount;

    if (auth.remainingHold === 0) {
      auth.status = AuthStatus.SETTLED;
    } else {
      // Assessment simplification: unused part of a partially settled hold is released.
      auth.remainingHold = 0;
      auth.status = AuthStatus.SETTLED;
    }
    return true;
  }
}
