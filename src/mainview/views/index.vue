<script setup lang="ts">
import type { ChatStatus, SourceUrlUIPart, UIMessage } from "ai";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Check, CopyIcon, GlobeIcon, RefreshCcwIcon } from "@lucide/vue";
import { multiply, round } from "es-toolkit/compat";
import { computed, onMounted, ref } from "vue";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputProvider,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { useAIStream } from "@/composables/useAIStream";

interface Model {
  id: string;
  name: string;
  chef: string;
  owner: string;
  providers: string[];
  pricing: {
    input: number;
    output: number;
    input_cache_write: number | null;
    input_cache_read: number | null;
  };
}

const webSearch = ref(false);
const { conversation, loading, submit } = useAIStream();

const status = computed<ChatStatus>(() =>
  loading.value ? "streaming" : "ready",
);
const messages = computed(() => [] as any);
const lastMessageId = computed(() => messages.value.at(-1)?.id ?? null);
const lastAssistantMessageId = computed(() => {
  for (let index = messages.value.length - 1; index >= 0; index -= 1) {
    const current = messages.value[index];
    if (current && current.role === "assistant")
      return current.id;
  }
  return null;
});

async function handleSubmit(message: PromptInputMessage) {
  await submit(message.text);
}

function handlePromptError(error: { code: string; message: string }) {
  console.error(`Input error (${error.code})`, error.message);
}

const promptInput = usePromptInputProvider({
  onSubmit: handleSubmit,
  onError: handlePromptError,
});

const hasPendingInput = computed(() => {
  return Boolean(promptInput.textInput.value.trim()) || promptInput.files.value.length > 0;
});

const submitDisabled = computed(() => !hasPendingInput.value && !status.value);

function getSourceUrlParts(message: UIMessage) {
  return message.parts.filter((part): part is SourceUrlUIPart => part.type === "source-url");
}

function shouldShowActions(message: UIMessage, partIndex: number) {
  if (message.role !== "assistant")
    return false;
  if (lastAssistantMessageId.value !== message.id)
    return false;
  return isLastTextPart(message, partIndex);
}

function isLastTextPart(message: UIMessage, partIndex: number) {
  for (let index = partIndex + 1; index < message.parts.length; index += 1) {
    const nextPart = message.parts[index];
    if (nextPart && nextPart.type === "text")
      return false;
  }
  return true;
}

function isReasoningStreaming(message: UIMessage, partIndex: number) {
  return status.value === "streaming"
    && message.id === lastMessageId.value
    && partIndex === message.parts.length - 1;
}

function toggleWebSearch() {
  webSearch.value = !webSearch.value;
}

async function copyToClipboard(text: string) {
  if (!text)
    return;

  if (typeof navigator === "undefined" || !navigator.clipboard)
    return;

  try {
    await navigator.clipboard.writeText(text);
  }
  catch (error) {
    console.error("Failed to copy to clipboard", error);
  }
}

const open = ref(false);
const selectedModel = ref<string>("gpt-4o");

const supportedModels = ref<Model[]>([]);

const selectedModelData = computed(() => supportedModels.value.find(m => m.id === selectedModel.value));
const chefs = computed(() => Array.from(new Set(supportedModels.value.map(model => model.chef))));

function handleSelect(id: string) {
  selectedModel.value = id;
  open.value = false;
}

function handleRegenerate() {}

onMounted(async () => {
  try {
    const { data: models } = await fetch("https://ai-gateway.vercel.sh/v1/models")
      .then(res => res.json());

    const conversionRate = 1_000_000;
    // filter language model https://vercel.com/docs/ai-gateway/models-and-providers#filtering-models-by-type
    const textModels: Model[] = models
      .filter((m: any) => m.type === "language") // filter `language model`
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        chef: m.owned_by,
        owner: m.owned_by,
        providers: [],
        pricing: {
          input: round(multiply(conversionRate, Number(m.pricing.input)), 2),
          output: round(multiply(conversionRate, Number(m.pricing.output)), 2),
          input_cache_read: round(multiply(conversionRate, Number(m.pricing.input_cache_read)), 2),
          input_cache_write: round(multiply(conversionRate, Number(m.pricing.input_cache_write)), 2),
        },
      }));

    supportedModels.value = textModels.slice();
    selectedModel.value = textModels[0].id;
  }
  catch (err) {
    console.error(err);
  }
});
</script>

<template>
  <div class="flex h-full flex-col">
    <Conversation class="h-full">
      <ConversationContent>
        <div
          v-for="message in conversation"
          :key="message.id"
        >
          <Sources
            v-if="message.role === 'assistant' && getSourceUrlParts(message).length > 0"
          >
            <SourcesTrigger :count="getSourceUrlParts(message).length" />
            <SourcesContent
              v-for="(source, index) in getSourceUrlParts(message)"
              :key="`${message.id}-source-${index}`"
            >
              <Source
                :href="source.url"
                :title="source.title ?? source.url"
              />
            </SourcesContent>
          </Sources>
          <template
            v-for="(part, partIndex) in message.parts"
            :key="`${message.id}-${partIndex}`"
          >
            {{ message.parts }}
            <Message
              v-if="part.type === 'text'"
              :from="message.role"
            >
              <div>
                <MessageContent>
                  <MessageResponse :content="part.text" />
                </MessageContent>

                <MessageActions v-if="shouldShowActions(message, partIndex)">
                  <MessageAction
                    label="Retry"
                    @click="handleRegenerate"
                  >
                    <RefreshCcwIcon class="size-3" />
                  </MessageAction>
                  <MessageAction
                    label="Copy"
                    @click="copyToClipboard(part.text)"
                  >
                    <CopyIcon class="size-3" />
                  </MessageAction>
                </MessageActions>
              </div>
            </Message>

            <Reasoning
              v-else-if="part.type === 'reasoning'"
              class="w-full"
              :is-streaming="isReasoningStreaming(message, partIndex)"
            >
              <ReasoningTrigger />
              <ReasoningContent :content="part.text" />
            </Reasoning>

            <Tool v-if="part.type === 'dynamic-tool'">
              <ToolHeader
                :state="part.state || 'input-streaming'"
                :title="part.toolName"
                type="tool-database_query"
              />
              <ToolContent>
                <ToolInput :input="part.input" />
                <ToolOutput v-if="part.state === 'output-available'" :error-text="part.errorText" :output="part.output" />
              </ToolContent>
            </Tool>
          </template>
        </div>

        <Loader v-if="status === 'submitted'" class="mx-auto" />
      </ConversationContent>

      <ConversationScrollButton />
    </Conversation>

    <PromptInput class="mt-4" global-drop multiple>
      <PromptInputBody>
        <PromptInputTextarea />
      </PromptInputBody>

      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>

          <PromptInputButton
            :variant="webSearch ? 'default' : 'ghost'"
            @click="toggleWebSearch"
          >
            <GlobeIcon class="size-4" />
            <span>Search</span>
          </PromptInputButton>

          <ModelSelector v-model:open="open">
            <ModelSelectorTrigger>
              <Button class="w-50 justify-between" variant="outline">
                <ModelSelectorLogo v-if="selectedModelData?.owner" :provider="selectedModelData.owner" />
                <ModelSelectorName>{{ selectedModelData?.name }}</ModelSelectorName>
              </Button>
            </ModelSelectorTrigger>

            <ModelSelectorContent>
              <ModelSelectorInput placeholder="Search models..." />

              <ModelSelectorList>
                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>

                <ModelSelectorGroup
                  v-for="chef in chefs"
                  :key="chef"
                  :heading="chef"
                >
                  <ModelSelectorItem
                    v-for="model in supportedModels.filter(m => m.chef === chef)"
                    :key="model.id"
                    :value="model.id"
                    @select="handleSelect(model.id)"
                  >
                    <ModelSelectorLogo :provider="model.owner" />
                    <ModelSelectorName>{{ model.name }}</ModelSelectorName>
                    <!-- <ModelSelectorLogoGroup>
                      <ModelSelectorLogo
                        v-for="provider in model.providers"
                        :key="provider"
                        :provider="provider"
                      />
                    </ModelSelectorLogoGroup> -->
                    <div class="text-xs opacity-20">
                      {{ model.pricing.input }}$ / {{ model.pricing.output }}$
                    </div>
                    <Check v-if="selectedModel === model.id" class="ml-auto size-4" />
                    <div v-else class="ml-auto size-4" />
                  </ModelSelectorItem>
                </ModelSelectorGroup>
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
        </PromptInputTools>

        <PromptInputSubmit
          :disabled="submitDisabled"
          :status="status"
        />
      </PromptInputFooter>
    </PromptInput>
  </div>
</template>
