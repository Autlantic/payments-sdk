<script setup lang="ts">
import { useSidebar } from "vitepress/dist/client/theme-default/composables/sidebar";
import logoLight from "./assets/autlantic-wordmark-nav-lg-light.png";
import logoDark from "./assets/autlantic-wordmark-nav-lg-dark.png";

const { hasSidebar } = useSidebar();
</script>

<template>
  <div class="VPNavBarTitle" :class="{ 'has-sidebar': hasSidebar }">
    <a class="title autlantic-nav-title" href="/">
      <span class="autlantic-nav-lockup" aria-hidden="true">
        <img
          :src="logoLight"
          width="152"
          height="52"
          alt=""
          class="autlantic-nav-wordmark autlantic-nav-wordmark-light brand-wordmark-img"
        />
        <img
          :src="logoDark"
          width="152"
          height="52"
          alt=""
          class="autlantic-nav-wordmark autlantic-nav-wordmark-dark brand-wordmark-img"
        />
        <span class="autlantic-nav-caption">Docs</span>
      </span>
      <span class="autlantic-sr-only">Autlantic Docs</span>
    </a>
  </div>
</template>

<style scoped>
.title {
  display: flex;
  align-items: center;
  border-bottom: 1px solid transparent;
  width: 100%;
  height: var(--vp-nav-height);
  transition: opacity 0.25s;
}

@media (min-width: 960px) {
  .title {
    flex-shrink: 0;
  }

  .VPNavBarTitle.has-sidebar .title {
    border-bottom-color: var(--vp-c-divider);
  }
}
</style>
