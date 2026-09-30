import { registerView } from '../stores/router';
import BootView from './BootView.vue';
import OnboardingView from './OnboardingView.vue';
import HomeView from './HomeView.vue';
import TimeControlView from './TimeControlView.vue';
import SearchingView from './SearchingView.vue';
import ChallengeView from './ChallengeView.vue';
import OnlineGameView from './OnlineGameView.vue';
import BotsView from './BotsView.vue';
import BotGameView from './BotGameView.vue';
import AnalysisView from './AnalysisView.vue';
import LeaderboardView from './LeaderboardView.vue';
import ProfileView from './ProfileView.vue';
import SettingsView from './SettingsView.vue';

export function registerViews() {
  registerView('boot', BootView);
  registerView('onboarding', OnboardingView);
  registerView('home', HomeView);
  registerView('timeControl', TimeControlView);
  registerView('searching', SearchingView);
  registerView('challenge', ChallengeView);
  registerView('online', OnlineGameView);
  registerView('bots', BotsView);
  registerView('botGame', BotGameView);
  registerView('analysis', AnalysisView);
  registerView('leaderboard', LeaderboardView);
  registerView('profile', ProfileView);
  registerView('settings', SettingsView);
}
