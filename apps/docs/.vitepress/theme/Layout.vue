<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import AutlanticFooter from "./AutlanticFooter.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #layout-bottom>
      <AutlanticFooter />
    </template>
  </Layout>
</template>
