import { registerView } from '../stores/router';
import BootView from './BootView.vue';
import HomeView from './HomeView.vue';

export function registerViews() {
  registerView('boot', BootView);
  registerView('home', HomeView);
}
