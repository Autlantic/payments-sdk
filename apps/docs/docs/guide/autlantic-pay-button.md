# Autlantic PAY / SUBSCRIBE button

Ready-to-use React CTA for your product page. Drop it on **Buy** / **Subscribe** to start Autlantic checkout. Chip is always Autlantic indigo (your store theme does not recolor it).

Hosted checkout steps (Connect wallet, Allow USDC, enroll, Send USDC) stay **plain**. Do not put this chip inside the hosted checkout path.

## Install

```bash
npm install @autlantic/billing-checkout-ui
```

Peer deps: `react` and `react-dom` (18 or 19).

## Drop-in (subscription)

Open hosted checkout when the member taps SUBSCRIBE:

```tsx
import { AutlanticPayButton } from "@autlantic/billing-checkout-ui";
import "@autlantic/billing-checkout-ui/pay-button.css";

export function PlanSubscribeButton({ checkoutUrl }: { checkoutUrl: string }) {
  return (
    <AutlanticPayButton
      word="SUBSCRIBE"
      size="lg"
      fullWidth
      href={checkoutUrl}
    />
  );
}
```

Create `checkoutUrl` with `@autlantic/payments-recurring` (`createSubscription` → `checkoutUrl`). See [15-minute integration](/guide/integration).

## Drop-in (one-time / pass)

```tsx
<AutlanticPayButton word="PAY" size="lg" fullWidth href={checkoutUrl} />
```

Or `onClick` instead of `href` if you navigate in your router:

```tsx
<AutlanticPayButton
  word="SUBSCRIBE"
  size="lg"
  fullWidth
  loading={busy}
  onClick={() => {
    void startCheckout();
  }}
/>
```

## Props

| Prop | Notes |
|------|--------|
| `word` | `"PAY"` or `"SUBSCRIBE"` (default `"PAY"`) |
| `size` | `"sm"` \| `"md"` \| `"lg"` |
| `fullWidth` | Stretch to card width |
| `loading` / `disabled` | Busy and disabled states |
| `href` | Link mode (product start → hosted checkout) |
| `onClick` | Button mode |
| `markSrc` | Optional mark URL; default is embedded PNG |

Mark assets ship inside the package (data URI). No CDN setup.

## Theme

- Always Autlantic indigo (`#5672cd` → `#3451b2`).
- Your store accent may style the rest of the page. This chip does not follow it.

## Where it belongs

| Surface | Use |
|---------|-----|
| Your product / plan / catalog **start** CTA | `AutlanticPayButton` |
| Hosted checkout path | Plain buttons only |

## Related

- [Packages](/guide/packages)
- [15-minute integration](/guide/integration)
- [Payment links](/guide/payment-links) (no custom UI; share a URL)
