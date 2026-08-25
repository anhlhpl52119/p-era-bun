<script setup lang="ts">
import { onMounted, ref } from "vue";
import { electroview } from "@/electroview";

const vercelAiKey = ref("");

const settingsLoading = ref(true);
const settingsError = ref<string | null>(null);

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
</script>

<template>
  <main>
    <div class="container">
      <RouterView />
    </div>
  </main>
</template>
