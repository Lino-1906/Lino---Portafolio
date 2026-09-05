/* Scheduler for the bundled StPageFlip 2.0.7 canvas renderer.
 * Keep the original geometry, shadows, resolution and normal animation speed.
 * Avoid idle redraws and soften catch-up after delayed browser frames. */
window.startPageFlipOnDemand = function (render) {
  let frame = 0, dirty = true, drawing = false, disposed = false;
  let visible = !document.hidden, pausedAt = 0;
  let parentVisible = true;
  let activeAnimation = null, lastAnimationTime = 0;
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
    // A delayed browser frame must not skip a large portion of the fold.
    // Stretch only the missed time, keeping the original geometry and easing.
    const animation = render.animation;
    const animationTime = Math.max(time, animation?.startedAt || 0);
    if (animation) {
      if (activeAnimation !== animation) {
        activeAnimation = animation;
        lastAnimationTime = animation.startedAt;
      }
      const elapsed = animationTime - lastAnimationTime;
      if (elapsed > 32) animation.startedAt += elapsed - 32;
      lastAnimationTime = animationTime;
    } else {
      activeAnimation = null;
    }
    try { render.render(animationTime); }
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
      activeAnimation = null;
      pausedAt = 0;
      invalidate();
    }
  }
  listen(document, 'visibilitychange', () => setVisible(parentVisible && !document.hidden));
  listen(window, 'message', event => {
    if (event.source !== window.parent || event.origin !== location.origin) return;
    if (event.data?.type === 'suspendEditorialReader') { parentVisible = false; setVisible(false); }
    if (event.data?.type === 'resumeEditorialReader') { parentVisible = true; setVisible(!document.hidden); }
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
  listen(window, 'pageshow', () => setVisible(parentVisible && !document.hidden));
  render.update();
  invalidate();
};
