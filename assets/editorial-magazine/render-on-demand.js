/* Scheduler for the bundled StPageFlip 2.0.7 canvas renderer.
 * Keep the original geometry, shadows, resolution and animation timeline.
 * Only replace the unconditional idle redraw loop. */
window.startPageFlipOnDemand = function (render) {
  let frame = 0, dirty = true, drawing = false, disposed = false;
  let visible = !document.hidden, pausedAt = 0;
  const cleanups = [];
  const listen = (target, type, handler) => {
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  };
  function request() {
    if (!disposed && visible && !document.hidden && !frame && !drawing)
      frame = requestAnimationFrame(tick);
  }
  function invalidate() { dirty = true; request(); }
  function loadingVisiblePage() {
    return [render.leftPage, render.rightPage, render.flippingPage, render.bottomPage]
      .some(page => page?.image && !page.isLoad && !page.image.complete);
  }
  function tick(time) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    drawing = true;
    dirty = false;
    // RAF timestamps may precede a same-frame pointer event's performance.now().
    // Never feed a negative animation-frame index to the original renderer.
    try { render.render(Math.max(time, render.animation?.startedAt || 0)); }
    finally { drawing = false; }
    if (dirty || render.animation || loadingVisiblePage()) request();
  }
  // These are the renderer's actual mutation points, including drag/corner folds.
  for (const name of ['update', 'setLeftPage', 'setRightPage', 'setBottomPage',
    'setFlippingPage', 'setPageRect', 'setDirection', 'setShadowData', 'clearShadow',
    'finishAnimation']) {
    const original = render[name];
    render[name] = function (...args) {
      const result = original.apply(this, args);
      invalidate();
      return result;
    };
  }
  const animate = render.startAnimation;
  render.startAnimation = function (...args) {
    // An idle renderer's last timestamp is old; start the full animation now.
    this.timer = performance.now();
    const result = animate.apply(this, args);
    invalidate();
    return result;
  };
  function setVisible(value) {
    if (visible === value) return;
    visible = value;
    if (!value) {
      pausedAt = performance.now();
      cancelAnimationFrame(frame); frame = 0;
    } else {
      if (render.animation && pausedAt) render.animation.startedAt += performance.now() - pausedAt;
      pausedAt = 0;
      invalidate();
    }
  }
  listen(document, 'visibilitychange', () => setVisible(!document.hidden));
  listen(window, 'message', event => {
    if (event.source !== window.parent || event.origin !== location.origin) return;
    if (event.data?.type === 'suspendEditorialReader') setVisible(false);
    if (event.data?.type === 'resumeEditorialReader') setVisible(!document.hidden);
  });
  for (const page of render.app.getPageCollection().getPages()) {
    if (page.image) {
      listen(page.image, 'load', invalidate);
      listen(page.image, 'error', invalidate);
    }
  }
  function dispose() {
    disposed = true;
    cancelAnimationFrame(frame); frame = 0;
    cleanups.splice(0).forEach(cleanup => cleanup());
  }
  const destroy = render.app.destroy;
  render.app.destroy = function (...args) { dispose(); return destroy.apply(this, args); };
  listen(window, 'pagehide', event => { if (event.persisted) setVisible(false); else dispose(); });
  listen(window, 'pageshow', () => setVisible(!document.hidden));
  render.update();
  invalidate();
};
