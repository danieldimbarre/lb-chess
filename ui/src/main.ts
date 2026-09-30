import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { registerViews } from './views';
import { fitToViewport } from './lib/fit';

fitToViewport(document.getElementById('app')!);
registerViews();
createApp(App).mount('#app');
