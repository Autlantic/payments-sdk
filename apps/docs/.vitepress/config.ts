import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { DOCS_FOOTER_COPYRIGHT, DOCS_FOOTER_MESSAGE } from "./company-legal";

const PRODUCT = "https://autlantic.com";
const GITHUB = "https://github.com/autlantic/payments-sdk";
const docsRoot = path.dirname(fileURLToPath(import.meta.url));

export default withMermaid(
  defineConfig({
    // Markdown lives in ./docs; static assets live in ./public (not docs/public).
    srcDir: "docs",
    vite: {
      publicDir: path.resolve(docsRoot, "../public"),
    },
    title: "Autlantic Billing",
    description:
      "USDC payments on Base. Recurring subscriptions, one-time payments, payment links, hosted API, and webhooks for Autlantic Payments.",
    lang: "en-US",
    cleanUrls: true,
    lastUpdated: true,
    head: [["link", { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }]],
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
          ],
        },
        {
          text: "Guide",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "15-minute integration", link: "/guide/integration" },
            { text: "Mobile apps", link: "/guide/mobile" },
            { text: "One-time payments", link: "/guide/one-time-payments" },
            { text: "Payment links", link: "/guide/payment-links" },
            { text: "Lifecycle", link: "/guide/lifecycle" },
            { text: "API versioning", link: "/guide/api-versioning" },
            { text: "Error codes", link: "/guide/errors" },
            { text: "Debugging", link: "/guide/debugging" },
            { text: "Retries", link: "/guide/retries" },
            { text: "Sandbox & testing", link: "/guide/sandbox" },
            { text: "Webhooks", link: "/guide/webhooks" },
            { text: "Local webhooks", link: "/guide/local-webhooks" },
            { text: "Security", link: "/guide/security" },
            { text: "FAQ", link: "/guide/faq" },
          ],
        },
        {
          text: "Legal & policies",
          items: [
            { text: "About Autlantic", link: "https://autlantic.com/about" },
            { text: "Terms of Service", link: "https://autlantic.com/terms" },
            { text: "Privacy Policy", link: "https://autlantic.com/privacy" },
            { text: "Refund Policy", link: "https://autlantic.com/refunds" },
            { text: "Billing Terms (portal)", link: "https://portal.autlantic.com/terms" },
            { text: "Non-custodial", link: "https://autlantic.com/non-custodial" },
            { text: "Security (product)", link: "https://autlantic.com/security" },
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
            { text: "iOS Checkout", link: "/api/ios" },
            { text: "Android Checkout", link: "/api/android" },
            { text: "TypeScript types", link: "/api/types" },
            { text: "Hosted HTTP API", link: "/api/http" },
            { text: "OpenAPI", link: "/api/openapi" },
          ],
        },
        {
          text: "Resources",
          items: [
            { text: "Changelog", link: "/resources/changelog" },
            { text: "Deploy on Railway", link: "/resources/deploy-railway" },
            { text: "Postman collection", link: "/resources/postman" },
          ],
        },
      ],
      socialLinks: [{ icon: "github", link: GITHUB }],
      footer: {
        message: DOCS_FOOTER_MESSAGE,
        copyright: DOCS_FOOTER_COPYRIGHT,
      },
    },
  }),
);