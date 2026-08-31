<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from "vue";
import { electroview } from "@/electroview";

const vercelAiKey = ref("");
const settingsLoading = ref(true);
const settingsError = ref<string | null>(null);
const defaultLayout = defineAsyncComponent(() => import("@/layouts/DefaultLayout.vue"));
const adminLayout = defineAsyncComponent(() => import("@/layouts/AdminLayout.vue"));

function getRpc() {
  const rpc = electroview.rpc;
  if (!rpc) {
    throw new Error("ElectroBun RPC is unavailable.");
  }

  return rpc;
}

async function loadSettings() {
  settingsLoading.value = true;
  settingsError.value = null;
  try {
    const settings = await getRpc().request.getSettings();
    vercelAiKey.value = settings.vercelAiKey;
  }
  catch {
    settingsError.value = "Could not load settings.";
  }
  finally {
    settingsLoading.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});

const layouts: Record<string, any> = {
  default: defaultLayout,
  admin: adminLayout,
};
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <!-- blank -->
    <component
      :is="Component"
      v-if="route.meta.layout === false"
    />

    <!-- layout -->
    <component
      :is="layouts[route.meta.layout as string || 'default']"
      v-else
    >
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </component>
  </RouterView>
</template>
