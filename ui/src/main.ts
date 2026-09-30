import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { registerViews } from './views';
import { fitToViewport } from './lib/fit';
import { applyInitial } from './stores/appearance';

fitToViewport(document.getElementById('app')!);
applyInitial();
registerViews();
createApp(App).mount('#app');
