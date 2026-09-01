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

  const links = Array.from(document.querySelectorAll('.chapter-links a'));
  const sectionObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
  links.forEach(link => {
    const section = document.querySelector(link.hash);
    if (section) sectionObserver.observe(section);
  });
})();
