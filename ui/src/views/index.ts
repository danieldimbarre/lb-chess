import { registerView } from '../stores/router';
import BootView from './BootView.vue';
import HomeView from './HomeView.vue';
import AnalysisView from './AnalysisView.vue';
import SettingsView from './SettingsView.vue';

export function registerViews() {
  registerView('boot', BootView);
  registerView('home', HomeView);
  registerView('analysis', AnalysisView);
  registerView('settings', SettingsView);
}
