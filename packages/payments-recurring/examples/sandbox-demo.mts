/**
 * Run: pnpm --filter @autlantic/payments-recurring example
 */
import { AutlanticBilling, signBillingWebhook } from "@autlantic/payments-recurring";

const billing = AutlanticBilling.sandbox({ merchantId: "mer_demo" });

const created = await billing.createSubscription({
  merchantRef: "demo_sub_001",
  customerWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  payoutAddressEvm: "0x1111111111111111111111111111111111111111",
  amountUsdc: 29,
  interval: "month",
  planId: "plan_premium",
});

console.log("Subscription:", created.subscription.id, created.subscription.status);
console.log("Checkout (sandbox):", created.checkoutUrl);
console.log("Invoice:", created.invoice.id, created.invoice.amountUsdc, "USDC");

const activated = await billing.activateSubscription(created.subscription.id);
console.log(
  "Activated:",
  activated.subscription.status,
  "first invoice:",
  activated.charge?.invoice.status,
  activated.charge?.invoice.txHash ?? "",
);

if (activated.charge?.events[0]) {
  const signed = signBillingWebhook("demo_secret", activated.charge.events[0]);
  console.log("Webhook signature:", signed.signature.slice(0, 16) + "…");
}

console.log("\nDone. Use AutlanticBilling.fromEnv() against https://billing.autlantic.com for hosted Test/Live.");
