// Load the lightweight status UI before importing the larger 3D dependency tree.
(() => {
  const script = document.currentScript;
  const stage = document.getElementById(script.dataset.stage);
  const status = document.getElementById(script.dataset.status);
  const moduleUrl = new URL(script.dataset.module, script.src).href;
  const overlay = document.createElement('div');
  overlay.className = 'model-loading';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  const icon = document.createElement('span');
  icon.className = 'model-loading-icon';
  icon.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = 'Cargando modelo 3D…';
  overlay.append(icon, label);
  stage.setAttribute('aria-busy', 'true');
  status.textContent = 'Cargando modelo 3D…';
  stage.append(overlay);
  let started = false;
  const loadViewer = () => {
    if (started) return;
    started = true;
    import(moduleUrl)
      .then(module => module.default)
      .catch(error => {
        status.textContent = 'Vista fotográfica de respaldo';
        console.warn('No se pudo cargar el visor 3D:', error);
      })
      .finally(() => {
        stage.setAttribute('aria-busy', 'false');
        overlay.style.setProperty('--loading-opacity', getComputedStyle(overlay).opacity);
        overlay.classList.add('is-leaving');
        setTimeout(() => overlay.remove(), 300);
      });
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      loadViewer();
    }, { rootMargin: '700px 0px', threshold: 0 });
    observer.observe(stage);
  } else {
    loadViewer();
  }
})();
