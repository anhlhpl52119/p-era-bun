import { createPinia } from "pinia";
import { createApp } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "@/App.vue";
import "@/styles/index.css";
import "@/infrastructure/electroview";

const pinia = createPinia();

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { name: "home", path: "/", component: () => import("@/views/index.vue") },
    { name: "register", path: "/regis", component: () => import("@/views/register.vue") },
  ],
});

createApp(App)
  .use(pinia)
  .use(router)
  .mount("#app");
