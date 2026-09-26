export {};

const buttons = document.querySelectorAll<HTMLButtonElement>('[data-preview]');
const panels = [...document.querySelectorAll<HTMLElement>('[data-panel]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const animations = new Set<Animation>();

function settle() {
  animations.forEach(animation => animation.cancel());
  animations.clear();
  panels.forEach(panel => panel.removeAttribute('data-leaving'));
}
function animate(element: HTMLElement, frames: Keyframe[], duration: number, done?: () => void) {
  if (reducedMotion.matches || typeof element.animate !== 'function') { done?.(); return; }
  const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.22, .68, .15, 1)' });
  animations.add(animation);
  void animation.finished.then(() => { animations.delete(animation); done?.(); }, () => {});
}
buttons.forEach((button) => button.addEventListener('click', () => {
  if (button.getAttribute('aria-pressed') === 'true') return;
  settle();
  const outgoing = panels.find(panel => !panel.inert);
  buttons.forEach((item) => {
    const selected = item === button;
    item.setAttribute('aria-pressed', String(selected));
    item.closest('.writing-row')?.classList.toggle('is-selected', selected);
  });
  panels.forEach((panel) => {
    const selected = panel.dataset.panel === button.dataset.preview;
    panel.inert = !selected;
    panel.setAttribute('aria-hidden', String(!selected));
    if (selected) animate(panel, [
      { opacity: .35, transform: 'translate(12px, 18px) rotate(1.6deg) scale(.975)' },
      { opacity: 1, transform: 'translate(0, -3px) rotate(-.25deg) scale(1)', offset: .72 },
      { opacity: 1, transform: 'none' },
    ], 480);
  });
  if (outgoing) {
    outgoing.setAttribute('data-leaving', '');
    animate(outgoing, [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: 'translate(-12px, 10px) rotate(-2deg) scale(.975)' },
    ], 320, () => outgoing.removeAttribute('data-leaving'));
  }
  document.querySelector('#preview-announcement')!.textContent = button.getAttribute('aria-label')!.replace('Preview ', 'Previewing ');
}));
document.querySelectorAll<HTMLDetailsElement>('.mobile-preview').forEach((details) => {
  details.addEventListener('toggle', () => {
    settle();
    if (details.open) animate(details.querySelector<HTMLElement>('.preview-copy')!, [
      { opacity: .4, transform: 'translateY(12px) rotate(.6deg)' },
      { opacity: 1, transform: 'translateY(-2px)', offset: .75 },
      { opacity: 1, transform: 'none' },
    ], 400);
  });
});
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) settle(); });
addEventListener('pagehide', settle);
document.querySelector('.writing-preview')?.setAttribute('data-preview-ready', '');
