/* Identity v1. Preferences stay on this origin; model URLs never carry them. */
(() => {
  let preference;
  try { preference = localStorage.getItem('mg:appearance'); } catch {}
  const theme = preference === 'light' || preference === 'dark' ? preference :
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
