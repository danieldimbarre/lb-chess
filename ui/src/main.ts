import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { registerViews } from './views';

registerViews();
createApp(App).mount('#app');
