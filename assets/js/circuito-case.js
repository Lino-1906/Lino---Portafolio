(() => {
  'use strict';
  const mobile = new URLSearchParams(location.search).get('from') === 'mobile' || document.referrer.includes('mobile.html');
  document.querySelectorAll('[data-portfolio-back]').forEach(link => {
    link.href = `${mobile ? 'mobile' : 'index'}.html#proyectos-identidad`;
  });
  const frame = document.getElementById('circuito-reader');
  let inView = false;
  const syncReader = () => frame.contentWindow?.postMessage({
    type: inView && !document.hidden ? 'resumeEditorialReader' : 'suspendEditorialReader'
  }, location.origin);
  // Reuse the existing demand renderer, suspending autoplay outside the manual.
  const readerObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncReader();
  });
  readerObserver.observe(frame);
  frame.addEventListener('load', syncReader);
  document.addEventListener('visibilitychange', syncReader);
  window.addEventListener('pageshow', syncReader);

  const links = [...document.querySelectorAll('.chapter-links a')];
  const chapterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
  links.forEach(link => {
    const section = document.querySelector(link.hash);
    if (section) chapterObserver.observe(section);
  });
})();
