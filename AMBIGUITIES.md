1. I treat day as the day the event arrives in the replay and valueDate as the accounting day the entry belongs to. E7 arrives on Day 5 but has a value date of Day 2.

2. E7 does not reopen the Day 2 operational close. Day 2 was already closed before E7 arrived, so no Day 2 overdraft fee is created. The reconstructed Day 2 balance becomes AED -370.00, and the overdraft fee is charged on Day 5.

3. E9 is treated as a new reversal entry. It reverses the effect of E7 but does not remove or change the fee that was already booked on Day 5.

4. I only apply the available-balance check to authorizations, since that rule is explicitly given in the assessment. Normal debits are allowed to make the ledger balance negative.

5. A settlement can be smaller than the original authorization hold. For E5, AED 185 is settled against the AED 200 hold and the remaining AED 15 hold is released. The authorization is then marked as SETTLED.

6. A settlement for an unknown authorization does not create a ledger entry. The event is recorded as an error instead.

7. Events are replayed in the exact order provided. I don't reorder the global event stream by account or value date.

8. For interest, I first calculate the closing balance, apply the overdraft fee if required, and then calculate interest on the resulting positive balance. The daily interest amounts are capitalized as one entry at the end of Day 6.
