import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import Layout from "./Layout.vue";
import "./custom.css";

// Nav title is swapped via vite resolve.alias → AutlanticNavBarTitle.vue
export default {
  extends: DefaultTheme,
  Layout,
} satisfies Theme;
