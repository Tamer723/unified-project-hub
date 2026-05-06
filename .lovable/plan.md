## Card number UX: spaced groups + brand auto-detection

### Changes in `src/components/site/CheckoutSection.tsx`

**1. State + helpers (top of component)**
- Add `cardNumber` state.
- Add `formatCardNumber(raw)` — strip non-digits, cap at 16, insert a space every 4 digits → `"4242 4242 4242 4242"`. For Amex (15 digits) use `4-6-5` grouping.
- Add `detectCardBrand(digits)`:
  - `4` → `visa`
  - `51-55` or `2221-2720` → `mastercard`
  - `34` / `37` → `amex`
  - `6011` / `65` / `64[4-9]` → `discover`
  - `9792` / starts `9` (TR local) → `troy`
  - else → `unknown`
- Adjust max length per brand (Amex 17 chars incl. spaces, others 19).

**2. Card number input**
- `value={formatted}`, `onChange` keeps only digits then formats.
- Replace the static `VISA / MC` badges on the right with a single dynamic logo box that swaps based on `cardBrand`:
  - `visa` → blue VISA pill
  - `mastercard` → red/yellow overlapping circles
  - `amex` → blue AMEX pill
  - `discover` → orange DISCOVER pill
  - `troy` → TROY pill (useful for local TR bank gateway)
  - `unknown` → faded generic card icon (`CreditCard` from lucide)
- Use a small inline SVG/colored span for each brand — no extra deps. All colors via existing tokens (`bg-primary`, `bg-destructive`, etc.) plus a few literal hex values acceptable for brand marks.

**3. Visual**
- Keep `tracking-widest` so groups read clearly.
- Add `font-mono` for even spacing of digits.
- Right padding `pe-20` stays so logo doesn't overlap input text.

### No other files affected
No new dependencies, no schema changes, no translations needed (brand names are universal).
