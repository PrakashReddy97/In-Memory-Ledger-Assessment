1. AED uses 2 decimal places. Internally, AED 1.00 is stored as 100 units.

2. BHD uses 3 decimal places. Internally, BHD 1.000 is stored as 1000 units.

3. The overdraft fee is AED 25.00, stored as 2500 units. No BHD overdraft fee is added because the assessment doesn't specify one.

4. Daily interest is 0.04%, which is 4 / 10,000.

5. Interest is rounded to the currency's normal precision using half-up rounding.

6. The interest posted on Day 6 is the sum of the rounded daily interest amounts. This makes sure no small rounding remainder is lost.

7. BHD 10.000 split into 3 instalments becomes 3.333, 3.333 and 3.334. The extra 0.001 goes into the last instalment so the total remains exactly 10.000.
