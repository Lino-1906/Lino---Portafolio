(() => {
  'use strict';
  const mobile = new URLSearchParams(location.search).get('from') === 'mobile' || document.referrer.includes('mobile.html');
  document.querySelectorAll('[data-portfolio-back]').forEach(link => {
    link.href = `${mobile ? 'mobile' : 'index'}.html#proyectos-identidad`;
  });

  const frame = document.getElementById('lumine-reader');
  let readerInView = false;
  const syncReader = () => frame.contentWindow?.postMessage({
    type: readerInView && !document.hidden ? 'resumeEditorialReader' : 'suspendEditorialReader'
  }, location.origin);
  // Keep the existing on-demand renderer; also pause autoplay while reading the case.
  const readerObserver = new IntersectionObserver(([entry]) => {
    readerInView = entry.isIntersecting;
    syncReader();
  });
  readerObserver.observe(frame);
  frame.addEventListener('load', syncReader);
  document.addEventListener('visibilitychange', syncReader);
  window.addEventListener('pageshow', syncReader);

  // Section selection is owned exclusively by mobile-chapter-nav.js on all viewports.
})();
