# Examples

Runnable apps that show how to integrate Autlantic Billing (USDC on Base, settlement to your merchant wallet).

| Example | What it shows |
|---------|----------------|
| [`subscription-store`](./subscription-store) | **Recurring**, **one-time**, and **payment links** via `@autlantic/payments-recurring` in one Next.js store |
| [`mobile-checkout`](./mobile-checkout) | Merchant backend for **iOS/Android Checkout**: create session, webhook verify, access poll |

```bash
pnpm example:store
# → http://localhost:3040

pnpm example:mobile
# → http://localhost:3055
```
