/**
 * The phone iframe can be very narrow in CSS pixels (LB Phone renders it at the
 * on-screen size, which depends on the game resolution and phone scale). The UI is
 * designed on a 390px-wide canvas; scale that canvas to whatever the iframe is so
 * every layout keeps its proportions. A transform (not `zoom`) keeps
 * getBoundingClientRect/clientX consistent for the board's pointer maths.
 */
export const DESIGN_WIDTH = 390;
/** Shortest canvas we lay out for; wider/shorter windows (desktop dev) scale by height. */
const MIN_DESIGN_HEIGHT = 720;

export const uiScale = { value: 1 };

export function fitToViewport(app: HTMLElement) {
  const apply = () => {
    const w = window.innerWidth || DESIGN_WIDTH;
    const h = window.innerHeight || MIN_DESIGN_HEIGHT;
    const scale = Math.min(w / DESIGN_WIDTH, h / MIN_DESIGN_HEIGHT);
    uiScale.value = scale;
    app.style.position = 'absolute';
    app.style.left = '0';
    app.style.top = '0';
    app.style.width = `${w / scale}px`;
    app.style.height = `${h / scale}px`;
    app.style.transformOrigin = '0 0';
    app.style.transform = Math.abs(scale - 1) < 0.001 ? '' : `scale(${scale})`;
  };
  apply();
  window.addEventListener('resize', apply);
}
