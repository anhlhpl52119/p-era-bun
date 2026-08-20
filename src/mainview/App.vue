<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAIStream } from "@/composables/useAIStream";
import { electroview } from "@/infrastructure/electroview";

const messages = ref<any[]>([]);
const { text, error, loading, submit, cancel } = useAIStream();
const wd = ref("");
const vercelAiKey = ref("");

const settingsLoading = ref(true);
const settingsSaving = ref(false);
const settingsError = ref<string | null>(null);
const settingsSaved = ref(false);

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

async function saveSettings() {
  settingsSaving.value = true;
  settingsError.value = null;
  settingsSaved.value = false;

  try {
    const settings = await getRpc().request.saveSettings({
      vercelAiKey: vercelAiKey.value,
    });
    vercelAiKey.value = settings.vercelAiKey;
    settingsSaved.value = true;
  }
  catch {
    settingsError.value = "Could not save settings.";
  }
  finally {
    settingsSaving.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});

function handleInputFile(e: Event) {
  const target = e.currentTarget as HTMLInputElement;
  const [f] = target.files || [];
  if (!f)
    return;

  console.warn(f.name);
  console.warn(f.webkitRelativePath);
}
async function handleOpenSelectWd() {
  try {
    const path = await getRpc().request.selectWd();
    wd.value = path || "No folder selected";
  }
  catch (cause) {
    wd.value = cause instanceof Error ? cause.message : String(cause);
  }
}
</script>

<template>
  <main>
    <div class="container">
      <!-- HTML Element -->
      <button @click="handleOpenSelectWd">
        Select Wd {{ wd }}
      </button>

      <hr>
      <div class="bg-red-200 min-h-30">
        <pre class="my-4">{{ error }}</pre>
      </div>
      <hr>
      <input
        id="folder-picker"
        type="file"
        webkitdirectory
        @input="handleInputFile"
      >

      <h1>Vue + Electrobun</h1>

      <p class="subtitle">
        A fast desktop app with hot module replacement
      </p>

      <section class="card settings-card">
        <h2>Settings</h2>
        <form @submit.prevent="saveSettings">
          <label for="vercel-ai-key">Vercel AI Key</label>
          <input
            id="vercel-ai-key"
            v-model="vercelAiKey"
            autocomplete="off"
            placeholder="Enter your Vercel AI Gateway key"
            :disabled="settingsLoading || settingsSaving"
          >
          <div class="settings-actions">
            <button
              class="primary"
              type="submit"
              :disabled="settingsLoading || settingsSaving"
            >
              {{ settingsSaving ? "saving..." : "Save settings" }}
            </button>
            <span v-if="settingsSaved" class="success">Saved.</span>
            <span v-if="settingsError" class="error">{{ settingsError }}</span>
          </div>
        </form>
      </section>
      <h2 class="text-red-800">
        Interactive Count
      </h2>

      <div class="card">
        <pre class="msg-code">{{ messages || "no message yet" }}</pre>
        <p>
          Click the button below to test Vue reactivity. With HMR enabled, you
          can edit this component and see changes instantly without losing
          state.
        </p>
        <div class="button-group">
          <button
            class="primary"
            :disabled="loading"
            @click="submit('hãy giới thiệu về bạn')"
          >
            {{ loading ? "running..." : "call API" }}
          </button>
          <button v-if="loading" class="secondary" @click="cancel">
            cancel
          </button>
          <pre v-if="text" class="result">{{ text }}</pre>

          <hr>
          <p v-if="error">
            {{ error }}
          </p>
        </div>
      </div>
    </div>
  </main>
</template>
