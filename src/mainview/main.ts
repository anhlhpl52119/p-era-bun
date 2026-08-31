import { GalleryVerticalEnd } from "@lucide/vue";
import { useColorMode } from "@vueuse/core";
import { createPinia } from "pinia";
import { createApp, markRaw } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "@/App.vue";
import "@/electroview";
import "@/styles/main.css";

useColorMode({
  modes: { dark: "dark" },
});

const pinia = createPinia();

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { name: "home", path: "/", component: () => import("@/views/index.vue") },
    { name: "debug", path: "/debug", component: () => import("@/views/debug.vue") },
    { name: "blank", path: "/blank", component: () => import("@/views/blank.vue"), meta: {
      layout: false,
      icon: markRaw(GalleryVerticalEnd),
    } },
  ],
});

createApp(App)
  .use(pinia)
  .use(router)
  .mount("#app");
