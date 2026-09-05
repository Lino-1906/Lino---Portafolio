// Keep the existing resolution, lighting, rotation speed and damping.
// Only idle frames and offscreen work are removed.
export function demand3D({ renderer, scene, camera, controls, stage, onLost, onRestored }) {
  let frame = 0, visible = true, lost = false, dirty = true, previous = 0;
  function invalidate() {
    dirty = true;
    if (!frame && visible && !document.hidden && !lost) frame = requestAnimationFrame(tick);
  }
  function tick(time) {
    frame = 0;
    if (!visible || document.hidden || lost) return;
    const dt = previous ? Math.min((time - previous) / 1000, .05) : 1 / 60;
    previous = time;
    const changed = controls.update(dt);
    if (dirty || changed || controls.autoRotate) renderer.render(scene, camera);
    dirty = false;
    if (changed || controls.autoRotate) invalidate();
  }
  function suspend() { cancelAnimationFrame(frame); frame = 0; previous = 0; }
  controls.addEventListener('change', invalidate);
  controls.addEventListener('start', invalidate);
  controls.addEventListener('end', invalidate);
  stage.addEventListener('click', invalidate);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) invalidate(); else suspend();
  });
  observer.observe(stage);
  const resize = new ResizeObserver(invalidate);
  resize.observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend(); else invalidate();
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    lost = true; suspend(); onLost();
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    lost = false; onRestored(); invalidate();
  });
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', invalidate);
  invalidate();
  return invalidate;
}
