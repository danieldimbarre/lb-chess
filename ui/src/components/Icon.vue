<script setup lang="ts">
defineProps<{ name: string; size?: number | string; stroke?: number }>();

// 24x24 stroke icons (lucide-style, drawn for this app).
const paths: Record<string, string> = {
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  prev: 'M15 5l-7 7 7 7',
  first: 'M17 5l-7 7 7 7M7 5v14',
  last: 'M7 5l7 7-7 7M17 5v14',
  flip: 'M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3',
  menu: 'M4 7h16M4 12h16M4 17h16',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  settings:
    'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3',
  users: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  swords: 'M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 17.5L21 6V3h-3L6.5 14.5M11 19l-6-6M8 16l-4 4M5 21l-2-2',
  bot: 'M12 8V4H8M4 12h16v8H4zM2 14h2M20 14h2M9 13v2M15 13v2M8 8h8a4 4 0 014 4H4a4 4 0 014-4z',
  board: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
  bolt: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  bullet: 'M5 19l4-4M9 15c-1-3 1-7 5-10l5-2-2 5c-3 4-7 6-10 5l2 2M14 10l0 0',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  timer: 'M10 2h4M12 14l3-3M12 22a8 8 0 100-16 8 8 0 000 16z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  share: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  flag: 'M4 22V4M4 4h13l-2 4 2 4H4',
  handshake: 'M11 17l2 2a1.4 1.4 0 002-2M14 16l2.5 2.5a1.4 1.4 0 002-2l-3.9-3.9a2 2 0 00-2.8 0l-.9.9a1.4 1.4 0 01-2-2l2.8-2.8a3.9 3.9 0 015.5 0l1.9 1.9M21 3l1 11h-2M3 3L2 14l6.5 6.5a1.4 1.4 0 002-2M3 4h8',
  x: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  undo: 'M3 7v6h6M3 13a9 9 0 103-7.7L3 8',
  home: 'M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  crown: 'M2 7l5 5 5-8 5 8 5-5-2 12H4L2 7z',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  refresh: 'M3 12a9 9 0 0115.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.3L3 16M3 21v-5h5',
  bell: 'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 003.4 0',
  analysis: 'M3 3v18h18M7 14l3-3 3 3 6-6M15 8h4v4',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  phone: 'M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2zM11 18h2',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  wifi: 'M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M2 8.8a15 15 0 0120 0M12 20h.01',
  hourglass: 'M5 22h14M5 2h14M17 22v-4.2a2 2 0 00-.6-1.4L12 12l-4.4 4.4a2 2 0 00-.6 1.4V22M7 2v4.2a2 2 0 00.6 1.4L12 12l4.4-4.4a2 2 0 00.6-1.4V2',
};
</script>

<template>
  <svg
    :width="size ?? 22"
    :height="size ?? 22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke ?? 2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
  >
    <path :d="paths[name] ?? ''" />
  </svg>
</template>
