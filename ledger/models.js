export const EntryType = Object.freeze({
  CREDIT: "CREDIT",
  DEBIT: "DEBIT",
  SETTLEMENT: "SETTLEMENT",
  REVERSAL: "REVERSAL",
  FEE: "FEE",
  INTEREST: "INTEREST",
});

export const AuthStatus = Object.freeze({
  APPROVED: "APPROVED",
  DECLINED: "DECLINED",
  SETTLED: "SETTLED",
  EXPIRED: "EXPIRED",
  RELEASED: "RELEASED",
});

export class Account {
  constructor(id, currency, openingBalance = 0) {
    this.id = id;
    this.currency = currency;
    this.openingBalance = openingBalance;
    this.entries = [];
    this.authorizations = new Map();
    this.dailyClose = new Map();
    this.dailyFee = new Map();
    this.dailyInterest = new Map();
    this.holdAtClose = new Map();
    this.asOfClose = new Map();
  }
}

export class LedgerEntry {
  constructor({
    id,
    accountId,
    type,
    amount,
    valueDate,
    bookedDay,
    reverses = null,
  }) {
    this.id = id;
    this.accountId = accountId;
    this.type = type;
    this.amount = amount;
    this.valueDate = valueDate;
    this.bookedDay = bookedDay;
    this.reverses = reverses;
    Object.freeze(this);
  }
}

export class Authorization {
  constructor({ id, accountId, amount, day }) {
    this.id = id;
    this.accountId = accountId;
    this.amount = amount;
    this.remainingHold = amount;
    this.day = day;
    this.status = AuthStatus.APPROVED;
    this.settledAmount = 0;
  }
}
