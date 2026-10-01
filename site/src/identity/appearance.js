/* Identity v1. Shared presentation only; never writes a tool's model or history. */

const preferenceKey = 'mg:appearance';
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const appearance = document.querySelector('.mg-appearance');
const root = document.documentElement;
const savedTheme = (value) => value === 'light' || value === 'dark' ? value : null;
let preference = null;
try { preference = savedTheme(localStorage.getItem(preferenceKey)); } catch {}
const currentTheme = () => preference ?? (systemTheme.matches ? 'dark' : 'light');
let transition;
let reveal;
let revision = 0;
let fadeTimer;

function applyTheme(animate = false, origin) {
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
    root.dataset.mgReady = '';
    for (const select of document.querySelectorAll('[data-mg-theme-choice]')) select.value = preference ?? 'system';
    for (const button of document.querySelectorAll('[data-mg-theme-reset]')) {
      button.hidden = preference === null;
    }
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.removeAttribute('media');
      meta.content = theme === 'dark' ? '#24212c' : '#faf8f2';
    }
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
// Both the masthead and legacy tool preferences use this single page owner.
function chooseTheme(value, origin) {
  preference = savedTheme(value);
  try {
    if(preference === null) localStorage.removeItem(preferenceKey);
    else localStorage.setItem(preferenceKey, preference);
  } catch {}
  applyTheme(true, origin);
}
appearance.addEventListener('click', () => {
  const rect = appearance.querySelector('.mg-icon').getBoundingClientRect();
  chooseTheme(currentTheme() === 'light' ? 'dark' : 'light', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
});
for (const button of document.querySelectorAll('[data-mg-theme-reset]')) button.addEventListener('click', () => {
  chooseTheme(null);
  appearance.focus({ preventScroll: true });
});
for (const select of document.querySelectorAll('[data-mg-theme-choice]')) select.addEventListener('change', () => chooseTheme(select.value));
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
