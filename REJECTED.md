# Acceptance criteria I would reject or clarify

1. “Day 2 gets an overdraft fee because E7 is value-dated Day 2.”
   I would reject this. E7 arrives on Day 5, after the Day 2 close has already happened, so I don't reopen Day 2.

2. “E9 should remove the overdraft fee.”
   I would reject this. E9 is a new reversal entry for E7. It does not change or remove a fee that was already booked.

3. “Auth-B is approved.”
   I would reject this for the given event stream. By the time Auth-B arrives, E7 has made the account balance negative, so the authorization is declined.

4. “The remaining AED 15 from Auth-A is still held after E5.”
   I would reject this. E5 settles AED 185 out of the AED 200 hold, so the remaining AED 15 is released.

5. “Discard any rounding remainder when capitalizing interest.”
   I would reject this. The Day 6 interest entry should match the sum of the rounded daily interest amounts exactly.
