<script setup lang="ts">
import { onMounted } from 'vue';
import { reset } from '../stores/router';
import { asset } from '../lib/asset';

onMounted(() => setTimeout(() => reset('home'), 400));
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-5 bg-bg">
    <img :src="asset('icon.svg')" alt="" class="size-20 rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,.35)]" />
    <div class="font-display text-2xl font-extrabold tracking-tight">Chess</div>
  </div>
</template>
