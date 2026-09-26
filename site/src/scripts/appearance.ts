// These entry points are modules; their media queries must not share a global scope.
export {};

const preferenceKey = 'mg:appearance';
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const appearance = document.querySelector<HTMLButtonElement>('.appearance')!;
const root = document.documentElement;
type Theme = 'light' | 'dark';
const savedTheme = (value: string | null): Theme | null => value === 'light' || value === 'dark' ? value : null;
let preference: Theme | null = null;
try { preference = savedTheme(localStorage.getItem(preferenceKey)); } catch {}
const currentTheme = (): Theme => preference ?? (systemTheme.matches ? 'dark' : 'light');
let transition: ViewTransition | undefined;
let reveal: Animation | undefined;
let revision = 0;
let fadeTimer: ReturnType<typeof setTimeout>;

function applyTheme(animate = false, origin?: { x: number; y: number }) {
  const theme = currentTheme();
  const change = ++revision;
  transition?.skipTransition();
  reveal?.cancel();
  reveal = undefined;
  delete root.dataset.themeReveal;
  root.classList.remove('theme-fade');
  clearTimeout(fadeTimer);
  const update = () => {
    // A fast second tap must win even if the previous snapshot is pending.
    if (change !== revision) return;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const action = `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`;
    appearance.setAttribute('aria-label', `Appearance: ${action.toLowerCase()}`);
    appearance.title = action;
  };
  if (!animate || reducedMotion.matches || root.dataset.theme === theme) {
    update();
  } else if (typeof document.startViewTransition === 'function') {
    const radial = origin && typeof root.animate === 'function';
    if (radial) root.dataset.themeReveal = '';
    const next = document.startViewTransition(update);
    transition = next;
    void next.ready.then(() => {
      if (!radial || change !== revision || reducedMotion.matches) return;
      const { x, y } = origin;
      const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 2;
      // Only the snapshot is clipped; the page remains in place and interactive.
      reveal = root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, {
        duration: 620,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        pseudoElement: '::view-transition-new(root)',
      });
    }).catch(() => {
      // Skipped snapshots and browsers without pseudo-element animation still switch themes.
      if (change === revision) next.skipTransition();
    });
    void next.finished.then(() => {
      if (transition !== next) return;
      transition = undefined;
      reveal = undefined;
      delete root.dataset.themeReveal;
    });
  } else {
    root.classList.add('theme-fade');
    update();
    fadeTimer = setTimeout(() => root.classList.remove('theme-fade'), 400);
  }
}
appearance.addEventListener('click', () => {
  preference = currentTheme() === 'light' ? 'dark' : 'light';
  try { localStorage.setItem(preferenceKey, preference); } catch {}
  const rect = appearance.querySelector('.icon')!.getBoundingClientRect();
  applyTheme(true, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
});
systemTheme.addEventListener('change', () => { if (preference === null) applyTheme(true); });
window.addEventListener('storage', (event) => {
  if (event.key === preferenceKey || event.key === null) {
    preference = savedTheme(event.newValue);
    applyTheme(true);
  }
});
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) applyTheme(); });
addEventListener('pagehide', () => applyTheme());
applyTheme();
