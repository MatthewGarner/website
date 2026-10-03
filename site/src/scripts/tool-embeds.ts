const instances = [...document.querySelectorAll<HTMLElement>('[data-tool-src]')].map(figure => {
  const button = figure.querySelector<HTMLButtonElement>('[data-tool-start]')!;
  const stage = figure.querySelector<HTMLElement>('.tool-demo-stage')!;
  const status = figure.querySelector<HTMLElement>('.tool-demo-status')!;
  const src = new URL(figure.dataset.toolSrc!);
  // Explicitly identify the embedding origin without exposing the article URL.
  src.searchParams.set('parent', location.origin);
  let frame: HTMLIFrameElement | null = null;
  let timeout = 0;
  const theme = () => frame?.contentWindow?.postMessage({ type: 'mg-tool:theme', version: 1,
    theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light' }, src.origin);
  const stop = () => { clearTimeout(timeout); frame?.remove(); frame = null; delete figure.dataset.toolState; };
  const failed = () => {
    stop(); button.textContent = 'Try interactive example';
    status.textContent = 'The interactive example could not load. The illustration and full tool link are still available.';
  };
  button.hidden = false;
  button.addEventListener('click', () => {
    if (frame) {
      stop(); button.textContent = 'Explore this example'; status.textContent = ''; return;
    }
    figure.dataset.toolState = 'loading';
    button.textContent = 'Cancel loading';
    status.textContent = 'Loading the interactive example…';
    frame = document.createElement('iframe');
    frame.title = figure.dataset.toolTitle!;
    frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    frame.src = src.href;
    frame.addEventListener('load', theme);
    stage.append(frame);
    // iframe load also fires on CSP/network failure. Only the ready handshake replaces the figure.
    timeout = window.setTimeout(failed, 10_000);
  });
  return { theme, receive(event: MessageEvent) {
    if (!frame || event.source !== frame.contentWindow || event.origin !== src.origin || event.data?.version !== 1) return;
    if (event.data.type === 'mg-tool:error') { failed(); return; }
    if (event.data.type === 'mg-tool:ready') {
      clearTimeout(timeout); figure.dataset.toolState = 'ready';
      button.textContent = 'Show illustration'; status.textContent = ''; theme();
    }
    if (event.data.type === 'mg-tool:resize' && typeof event.data.height === 'number' && Number.isFinite(event.data.height)) {
      frame.style.height = `${Math.min(1600, Math.max(200, Math.ceil(event.data.height)))}px`;
    }
  } };
});
if (instances.length) {
  addEventListener('message', event => instances.forEach(instance => instance.receive(event)));
  new MutationObserver(() => instances.forEach(instance => instance.theme()))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
