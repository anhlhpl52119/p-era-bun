import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import "./app.css";
import "./infrastructure/electroview";

const pinia = createPinia();

createApp(App)
  .use(pinia)
  .mount("#app");
