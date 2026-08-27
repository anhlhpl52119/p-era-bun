<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";

const open = ref(false);
</script>

<template>
  <Button :aria-expanded="open" @click="open = !open" />
</template>
