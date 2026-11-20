import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import Module from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const NativeModules: Record<string, unknown> = {};
const Platform = {
  select: (m: { ios?: string; default?: string }) => m.default ?? "",
};

const originalLoad = (Module as unknown as { _load: typeof Module.prototype.require })._load
  ? (Module as unknown as { _load: (...args: unknown[]) => unknown })._load
  : null;

// Patch CJS loader used when the TS file is compiled/executed by tsx.
const modAny = Module as unknown as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const prev = modAny._load.bind(Module);
modAny._load = (request: string, parent: unknown, isMain: boolean) => {
  if (request === "react-native") {
    return { NativeModules, Platform };
  }
  return prev(request, parent, isMain);
};

void originalLoad;

type PresentFn = (
  checkoutUrl: string,
  options: { returnUrlScheme: string },
) => Promise<{ status: string; error?: string }>;

describe("@autlantic/checkout validation", () => {
  it("rejects empty checkoutUrl", async () => {
    // Dynamic import after shim
    const mod = (await import("./index.ts")) as {
      default: { present: PresentFn };
      validateCheckoutUrl: (u: string) => string | null;
    };
    const r = await mod.default.present("", { returnUrlScheme: "myapp" });
    assert.equal(r.status, "failed");
    assert.match(String(r.error), /checkoutUrl/);
  });

  it("rejects non-http checkoutUrl", async () => {
    const mod = (await import("./index.ts")) as { default: { present: PresentFn } };
    const r = await mod.default.present("javascript:alert(1)", {
      returnUrlScheme: "myapp",
    });
    assert.equal(r.status, "failed");
    assert.match(String(r.error), /http\(s\) or sandbox/);
  });

  it("validateCheckoutUrl accepts https and sandbox", async () => {
    const mod = (await import("./index.ts")) as {
      validateCheckoutUrl: (u: string) => string | null;
    };
    assert.equal(
      mod.validateCheckoutUrl(
        "https://billing.autlantic.com/checkout/pay/pay_x",
      ),
      null,
    );
    assert.equal(mod.validateCheckoutUrl("sandbox://local/checkout"), null);
  });

  it("rejects empty returnUrlScheme", async () => {
    const mod = (await import("./index.ts")) as { default: { present: PresentFn } };
    const r = await mod.default.present(
      "https://billing.autlantic.com/checkout/pay/pay_x",
      { returnUrlScheme: "  " },
    );
    assert.equal(r.status, "failed");
    assert.match(String(r.error), /returnUrlScheme/);
  });

  it("source does not accept API keys or webhook secrets", () => {
    const src = readFileSync(join(here, "index.ts"), "utf8");
    assert.equal(/apiKey|abk_test|abk_live|webhookSecret/i.test(src), false);
  });
});

void require;
