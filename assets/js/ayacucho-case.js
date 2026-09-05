(() => {
  'use strict';
  const mobile = new URLSearchParams(location.search).get('from') === 'mobile' || document.referrer.includes('mobile.html');
  document.querySelectorAll('[data-portfolio-back]').forEach(link => {
    link.href = `${mobile ? 'mobile' : 'index'}.html#proyectos-editorial`;
  });

  const frame = document.getElementById('ayacucho-reader');
  let inView = false;
  const syncReader = () => frame.contentWindow?.postMessage({
    type: inView && !document.hidden ? 'resumeEditorialReader' : 'suspendEditorialReader'
  }, location.origin);
  const readerObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncReader();
  });
  readerObserver.observe(frame);
  frame.addEventListener('load', syncReader);
  document.addEventListener('visibilitychange', syncReader);
  window.addEventListener('pageshow', syncReader);

  // Section selection is owned exclusively by mobile-chapter-nav.js on all viewports.
})();
