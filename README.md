# In-Memory Account Ledger

This is my implementation of the account ledger assessment.

## Project structure

```text
ledger/
  money.js       Money handling and rounding
  models.js      Account, ledger entry and authorization
  ledger.js      Ledger and authorization operations
  engine.js      Event processing, fees and interest
  events.js      E1-E10 test events

replay.js        Runs the events and prints the report

test/
  ledger.test.js
  failing.test.js
```

## Run

```bash
npm install
npm start
npm test
```
`npm start` runs the code and prints the ledger.
`npm test` runs the normal tests.

## How it works

1. Events are processed in the order they are provided.
2. Ledger entries are append-only. Corrections are added as new entries.
3. Money is stored as integer units so AED and BHD don't rely on floating-point calculations.
4. Authorization holds are kept separate from the ledger and reduce the available balance.
5. Authorizations are approved only when the available balance remains non-negative after the hold.
6. Normal debits are allowed to make the ledger balance negative because the assessment does not require an available-balance check for them.
7. E7 arrives on Day 5 but has a Day 2 value date. I don't reopen the completed Day 2 close, so the overdraft fee is charged on Day 5.
8. Daily interest is calculated at the end of each day and the total is posted at the end of Day 6.

The main decisions and assumptions are in `AMBIGUITIES.md`.

The expected calculations are in `NUMBERS.md`.
