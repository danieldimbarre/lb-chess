<script setup lang="ts">
import { push } from '../stores/router';
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-5 bg-bg pt-(--safe-top)">
    <button class="btn btn-primary h-16 w-72 text-2xl" @click="push('analysis')">Analysis</button>
    <button class="btn btn-secondary h-12 w-72 text-lg" @click="push('settings')">Settings</button>
  </div>
</template>
