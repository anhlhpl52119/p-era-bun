import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "@/App.vue";
import "@/styles/index.css";
import "@/infrastructure/electroview";

const pinia = createPinia();

createApp(App)
  .use(pinia)
  .mount("#app");
