import { reactive, markRaw, type Component } from 'vue';

export type RouteName =
  | 'boot'
  | 'onboarding'
  | 'home'
  | 'play'
  | 'timeControl'
  | 'searching'
  | 'challenge'
  | 'online'
  | 'bots'
  | 'botGame'
  | 'analysis'
  | 'leaderboard'
  | 'profile'
  | 'settings';

export interface Route {
  key: number;
  name: RouteName;
  props: Record<string, unknown>;
}

let seq = 0;

export const router = reactive({
  stack: [{ key: seq++, name: 'boot', props: {} }] as Route[],
  /** 'forward' when pushing, 'back' when popping; drives the slide direction. */
  direction: 'forward' as 'forward' | 'back' | 'fade',
});

export function current(): Route {
  return router.stack[router.stack.length - 1];
}

export function push(name: RouteName, props: Record<string, unknown> = {}) {
  router.direction = 'forward';
  router.stack.push({ key: seq++, name, props });
}

export function replace(name: RouteName, props: Record<string, unknown> = {}) {
  router.direction = 'fade';
  router.stack.splice(router.stack.length - 1, 1, { key: seq++, name, props });
}

/** Clears history and makes `name` the only route (tab switches, game start). */
export function reset(name: RouteName, props: Record<string, unknown> = {}, direction: 'forward' | 'back' | 'fade' = 'fade') {
  router.direction = direction;
  router.stack.splice(0, router.stack.length, { key: seq++, name, props });
}

export function back() {
  if (router.stack.length <= 1) return reset('home', {}, 'back');
  router.direction = 'back';
  router.stack.pop();
}

export const views = new Map<RouteName, Component>();
export function registerView(name: RouteName, component: Component) {
  views.set(name, markRaw(component));
}
