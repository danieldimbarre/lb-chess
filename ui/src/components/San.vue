<script setup lang="ts">
import { computed } from 'vue';
import { settings } from '../stores/settings';
import { pieceUrl } from '../chess/pieces';
import type { Role } from '../chess/util';

/**
 * SAN with figurines. Unicode chess glyphs (♞) render as colour emoji or tofu in the
 * game's browser, so piece letters are drawn with the piece SVG as a mask filled with
 * the current text colour instead.
 */
const props = defineProps<{ san: string }>();

type Part = { text: string } | { role: Role };

const parts = computed<Part[]>(() => {
  if (!settings.figurine) return [{ text: props.san }];
  const out: Part[] = [];
  let buf = '';
  for (const ch of props.san) {
    if ('KQRBN'.includes(ch)) {
      if (buf) out.push({ text: buf });
      buf = '';
      out.push({ role: ch.toLowerCase() as Role });
    } else buf += ch;
  }
  if (buf) out.push({ text: buf });
  return out;
});

const mask = (role: Role) => {
  const url = `url(${pieceUrl('b', role)})`;
  return { maskImage: url, WebkitMaskImage: url };
};
</script>

<template>
  <span class="inline-flex items-center whitespace-nowrap">
    <template v-for="(p, i) in parts" :key="i">
      <span v-if="'role' in p" class="fig" :style="mask(p.role)" />
      <template v-else>{{ p.text }}</template>
    </template>
  </span>
</template>

<style scoped>
.fig {
  display: inline-block;
  width: 1.08em;
  height: 1.08em;
  margin-right: 0.04em;
  background-color: currentColor;
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
}
</style>
