import { useColorMode } from "@vueuse/core";
import { createPinia } from "pinia";
import { createApp } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "@/App.vue";
import "@/styles/main.css";
import "@/electroview";

useColorMode({
  modes: { dark: "dark" },
});

const pinia = createPinia();

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { name: "home", path: "/", component: () => import("@/views/index.vue") },
    { name: "register", path: "/regis", component: () => import("@/views/register.vue"), meta: { layout: "admin" } },
    { name: "legacy", path: "/legacy", component: () => import("@/views/legacy-app.vue") },
  ],
});

createApp(App)
  .use(pinia)
  .use(router)
  .mount("#app");
