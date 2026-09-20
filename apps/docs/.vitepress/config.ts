import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const PRODUCT = "https://autlantic.com";
const GITHUB = "https://github.com/autlantic/payments-sdk";
const docsRoot = path.dirname(fileURLToPath(import.meta.url));

/** Portal/platform-style icons (dark mark on light UI, light mark on dark UI). */
const faviconHead: [string, Record<string, string>][] = [
  ["link", { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
  [
    "link",
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "/brand/autlantic-icon-32-dark.png",
      media: "(prefers-color-scheme: light)",
    },
  ],
  [
    "link",
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "/brand/autlantic-icon-32-light.png",
      media: "(prefers-color-scheme: dark)",
    },
  ],
  [
    "link",
    {
      rel: "apple-touch-icon",
      href: "/brand/autlantic-icon-180-dark.png",
    },
  ],
  ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
  ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
  [
    "link",
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Fira+Sans:wght@900&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap",
    },
  ],
];

export default withMermaid(
  defineConfig({
    // Markdown lives in ./docs; static assets live in ./public (not docs/public).
    srcDir: "docs",
    vite: {
      publicDir: path.resolve(docsRoot, "../public"),
      // Inject favicons into the bare VitePress index so the tab icon works in dev
      // before client head hydration (portal/platform use the same PNG pair).
      plugins: [
        {
          name: "autlantic-docs-index-head",
          transformIndexHtml(html) {
            const tags = faviconHead
              .map(([tag, attrs]) => {
                const attr = Object.entries(attrs)
                  .map(([k, v]) => (v === "" ? k : `${k}="${v}"`))
                  .join(" ");
                return `<${tag} ${attr}>`;
              })
              .join("\n    ");
            return html.replace("<head>", `<head>\n    ${tags}`);
          },
        },
      ],
      // pnpm does not hoist mermaid's CJS deps; without these, optimizeDeps.include
      // fails and dayjs.min.js is loaded as ESM → blank page (no default export).
      optimizeDeps: {
        include: [
          "mermaid",
          "dayjs",
          "debug",
          "@braintree/sanitize-url",
          "cytoscape",
          "cytoscape-cose-bilkent",
        ],
      },
      // Local imports in VPNavBar.vue win over app.component(); alias is the supported override.
      resolve: {
        alias: [
          {
            find: /^.*\/VPNavBarTitle\.vue$/,
            replacement: path.resolve(docsRoot, "theme/AutlanticNavBarTitle.vue"),
          },
        ],
      },
    },
    title: "Autlantic Billing",
    description:
      "USDC payments on Base. Recurring subscriptions, one-time payments, payment links, hosted API, and webhooks for Autlantic Payments.",
    lang: "en-US",
    cleanUrls: true,
    lastUpdated: true,
    head: faviconHead,
    themeConfig: {
      // Custom VPNavBarTitle theme component renders the Autlantic wordmark.
      siteTitle: false,
      nav: [
        { text: "Guide", link: "/guide/getting-started", activeMatch: "/guide/" },
        { text: "API", link: "/api/nodejs", activeMatch: "/api/" },
        { text: "Languages", link: "/guide/languages" },
        { text: "GitHub", link: GITHUB },
        { text: "Product", link: PRODUCT },
      ],
      sidebar: [
        {
          text: "Introduction",
          items: [
            { text: "Overview", link: "/" },
            { text: "Packages", link: "/guide/packages" },
            { text: "Languages and SDKs", link: "/guide/languages" },
            { text: "Commerce plugins", link: "/guide/commerce" },
          ],
        },
        {
          text: "Guide",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "15-minute integration", link: "/guide/integration" },
            { text: "Commerce plugins", link: "/guide/commerce" },
            { text: "Mobile apps", link: "/guide/mobile" },
            { text: "Device smoke test", link: "/guide/device-smoke" },
            { text: "One-time payments", link: "/guide/one-time-payments" },
            { text: "Payment links", link: "/guide/payment-links" },
            { text: "Coupons", link: "/guide/coupons" },
            { text: "Customer portal", link: "/guide/customer-portal" },
            { text: "Lifecycle", link: "/guide/lifecycle" },
            { text: "API versioning", link: "/guide/api-versioning" },
            { text: "Rate limits", link: "/guide/rate-limits" },
            { text: "Idempotency", link: "/guide/idempotency" },
            { text: "Error codes", link: "/guide/errors" },
            { text: "Debugging", link: "/guide/debugging" },
            { text: "Retries", link: "/guide/retries" },
            { text: "Sandbox & testing", link: "/guide/sandbox" },
            { text: "Test clock", link: "/guide/test-clock" },
            { text: "Webhooks", link: "/guide/webhooks" },
            { text: "Local webhooks", link: "/guide/local-webhooks" },
            { text: "Reconciliation", link: "/guide/reconciliation" },
            { text: "Security", link: "/guide/security" },
            { text: "Trust center", link: "/guide/trust" },
            { text: "SOC 2 readiness", link: "/guide/soc2-readiness" },
            { text: "FAQ", link: "/guide/faq" },
          ],
        },
        {
          text: "Legal & policies",
          items: [
            { text: "About Autlantic", link: "https://autlantic.com/about" },
            { text: "Legal hub", link: "https://autlantic.com/legal" },
            { text: "Terms of Service", link: "https://autlantic.com/terms" },
            { text: "Privacy Policy", link: "https://autlantic.com/privacy" },
            { text: "Refund Policy", link: "https://autlantic.com/refunds" },
            { text: "Billing Terms (portal)", link: "https://portal.autlantic.com/terms" },
            { text: "Non-custodial", link: "https://autlantic.com/non-custodial" },
            { text: "Security FAQ", link: "https://autlantic.com/security" },
            { text: "DPA outline", link: "https://autlantic.com/dpa" },
            { text: "DPA outline (docs mirror)", link: "/resources/dpa-template" },
          ],
        },
        {
          text: "API reference",
          items: [
            { text: "Node.js SDK", link: "/api/nodejs" },
            { text: "Python SDK", link: "/api/python" },
            { text: "Go SDK", link: "/api/go" },
            { text: "PHP SDK", link: "/api/php" },
            { text: "Java SDK", link: "/api/java" },
            { text: ".NET SDK", link: "/api/dotnet" },
            { text: "iOS Checkout", link: "/api/ios" },
            { text: "Android Checkout", link: "/api/android" },
            { text: "Flutter Checkout", link: "/api/flutter" },
            { text: "React Native Checkout", link: "/api/react-native" },
            { text: "TypeScript types", link: "/api/types" },
            { text: "Hosted HTTP API", link: "/api/http" },
            { text: "OpenAPI", link: "/api/openapi" },
          ],
        },
        {
          text: "Resources",
          items: [
            { text: "Changelog", link: "/resources/changelog" },
            { text: "Status", link: "/resources/status" },
            { text: "DPA outline (template)", link: "/resources/dpa-template" },
            { text: "Deploy on Railway", link: "/resources/deploy-railway" },
            { text: "Postman collection", link: "/resources/postman" },
          ],
        },
      ],
      socialLinks: [{ icon: "github", link: GITHUB }],
      // Footer rendered by AutlanticFooter.vue (layout-bottom).
    },
  }),
);
