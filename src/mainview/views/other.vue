<script setup lang="ts">
import { ArrowDown, X } from "lucide";
import { MorphIcon } from "morphicons/vue";
import { ref } from "vue";
import { Button } from "@/components/ui/button";

const open = ref(false);
</script>

<template>
  <Button :aria-expanded="open" @click="open = !open">
    <MorphIcon :icon="open ? X : ArrowDown" />
  </Button>
</template>
