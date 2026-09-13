<script setup lang="ts">
import { useSidebar } from "vitepress/dist/client/theme-default/composables/sidebar";
import {
  COMPANY_ABOUT_URL,
  COMPANY_LEGAL_HUB_URL,
  COMPANY_LEGAL_NAME,
  COMPANY_PRIVACY_URL,
  COMPANY_TERMS_URL,
} from "../company-legal";

const { hasSidebar } = useSidebar();
const year = new Date().getFullYear();

const links = [
  { href: "/guide/getting-started", label: "Guide" },
  { href: "/api/nodejs", label: "API" },
  { href: "https://portal.autlantic.com", label: "Portal" },
  { href: "https://github.com/autlantic/payments-sdk", label: "GitHub" },
  { href: COMPANY_ABOUT_URL, label: "About" },
  { href: COMPANY_LEGAL_HUB_URL, label: "Legal" },
  { href: COMPANY_TERMS_URL, label: "Terms" },
  { href: COMPANY_PRIVACY_URL, label: "Privacy" },
] as const;
</script>

<template>
  <footer class="autlantic-footer" :class="{ 'has-sidebar': hasSidebar }">
    <div class="autlantic-footer__inner">
      <a class="autlantic-footer__mark-link" href="/" aria-label="Autlantic Docs">
        <!-- Same pattern as company/portal: square mark only (BrandMark 2xl). -->
        <img
          src="/brand/autlantic-icon-180-dark.png"
          width="80"
          height="80"
          alt=""
          aria-hidden="true"
          decoding="async"
          class="autlantic-footer__mark autlantic-footer__mark-light"
        />
        <img
          src="/brand/autlantic-icon-180-light.png"
          width="80"
          height="80"
          alt=""
          aria-hidden="true"
          decoding="async"
          class="autlantic-footer__mark autlantic-footer__mark-dark"
        />
      </a>
      <p class="autlantic-footer__blurb">
        Autlantic Limited. Billing for merchants. Docs for Autlantic Payments on Base.
      </p>
      <nav class="autlantic-footer__links" aria-label="Footer">
        <a v-for="link in links" :key="link.href" :href="link.href">{{ link.label }}</a>
      </nav>
      <p class="autlantic-footer__copy">© {{ year }} {{ COMPANY_LEGAL_NAME }}</p>
    </div>
  </footer>
</template>
