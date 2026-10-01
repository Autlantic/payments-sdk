import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryBillingStore } from "./memory-store";
import {
  createPaymentLink,
  deletePaymentLink,
  resolvePaymentLinkStatus,
} from "./payment-links";
import {
  createWriteThroughBillingStore,
  reloadPersistedBillingStore,
  type BillingPersistAdapter,
} from "./write-through-store";
import type { BillingStoreSnapshot } from "./types";
import type { PaymentLink } from "./payment-links";

describe("write-through reload must not resurrect deletes", () => {
  it("replaceSnapshot clears deleted links and reload does not upsert", async () => {
    const memory = createMemoryBillingStore();
    const persisted = new Map<string, PaymentLink>();
    const upserts: string[] = [];
    const deletes: string[] = [];

    const persist: BillingPersistAdapter = {
      async saveSubscription() {},
      async saveCustomer() {},
      async saveMandate() {},
      async saveInvoice() {},
      async saveOneTimePayment() {},
      async savePaymentLink(link) {
        upserts.push(link.id);
        persisted.set(link.id, link);
      },
      async deletePaymentLink(id) {
        deletes.push(id);
        persisted.delete(id);
      },
      async loadSnapshot(): Promise<BillingStoreSnapshot> {
        return {
          subscriptions: [],
          customers: [],
          mandates: [],
          invoices: [],
          oneTimePayments: [],
          paymentLinks: [...persisted.values()],
        };
      },
    };

    const store = createWriteThroughBillingStore(memory, persist);
    const link = createPaymentLink(store, {
      merchantId: "mer_test",
      merchantRefPrefix: "inv",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 10,
      chainId: 84532,
    });
    await store.flushPersist();
    assert.equal(persisted.has(link.id), true);

    upserts.length = 0;
    assert.equal(deletePaymentLink(store, link.id), true);
    await store.flushPersist();
    assert.deepEqual(deletes, [link.id]);
    assert.equal(persisted.has(link.id), false);
    assert.equal(store.getPaymentLink(link.id), null);

    // Reload from Prisma/DB snapshot must not queue upserts of remaining (empty) set
    // via write-through savePaymentLink, and must clear orphans from memory.
    upserts.length = 0;
    // Poison memory with a ghost the DB no longer has (simulates multi-instance stale).
    memory.savePaymentLink({
      ...link,
      status: "disabled",
      disabledAt: new Date(),
    });
    assert.equal(store.getPaymentLink(link.id)?.status, "disabled");

    await reloadPersistedBillingStore(store, persist);
    assert.equal(store.getPaymentLink(link.id), null);
    assert.deepEqual(upserts, [], "reload must not write-through upsert");
  });

  it("resolvePaymentLinkStatus still treats disabledAt as disabled", () => {
    const store = createMemoryBillingStore();
    const link = createPaymentLink(store, {
      merchantId: "mer_test",
      merchantRefPrefix: "x",
      payoutAddressEvm: "0x1111111111111111111111111111111111111111",
      amountUsdc: 1,
      chainId: 84532,
    });
    store.savePaymentLink({ ...link, status: "active", disabledAt: new Date() });
    assert.equal(resolvePaymentLinkStatus(store.getPaymentLink(link.id)!), "disabled");
  });
});
