(() => {
  const ctx = tp;
  const container = ctx.container || this;
  const root = container.querySelector('[data-role="place-root"]');
  if (!root) return;

  const doc = ctx.activeDocument || root.ownerDocument;
  const win = ctx.activeWindow || doc.defaultView;
  const mapHost = root.querySelector('[data-role="local-map-embed"]');
  if (!mapHost || !win?.MutationObserver) return;

  function polishControls() {
    const controls = [
      ...mapHost.querySelectorAll('button.maplibregl-ctrl-zoom-in'),
      ...mapHost.querySelectorAll('button.maplibregl-ctrl-zoom-out'),
    ];

    for (const control of controls) {
      // Remove browser hover tooltips while preserving aria-label accessibility text.
      control.removeAttribute('title');
    }
  }

  polishControls();
  const observer = new win.MutationObserver(() => polishControls());
  observer.observe(mapHost, { childList: true, subtree: true, attributes: true, attributeFilter: ['title'] });
})();
