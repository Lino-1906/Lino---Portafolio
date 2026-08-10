(() => {
  'use strict';

  const imageCache = new Map();

  window.portfolioPreloadImage = function portfolioPreloadImage(src) {
    if (imageCache.has(src)) return imageCache.get(src);

    const promise = new Promise(resolve => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = async () => {
        try { await image.decode(); } catch (_) { /* Already usable. */ }
        resolve(src);
      };
      image.onerror = () => resolve(src);
      image.src = src;
    });

    imageCache.set(src, promise);
    return promise;
  };

  const autoplayCards = new WeakSet();
  const autoplayObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) autoplayCards.add(entry.target);
      else autoplayCards.delete(entry.target);
    });
  }, { rootMargin: '350px 0px', threshold: 0 });

  document.querySelectorAll('.project-card').forEach(card => autoplayObserver.observe(card));
  window.portfolioCanAnimate = card => !document.hidden && autoplayCards.has(card);

  const desktopImages = [
    'Mockup Lumine.webp', 'Mockup Circuito Magico Agua.webp',
    'Mockup Cierum.webp', 'Mockup Giantucchi.webp', 'Mockup PCI Express.webp',
    'Mockup Revista Gastronomica.webp', 'Mockup guia Turistica.webp',
    'Mockup Caja y botella Deco Art.webp', 'Mockup Herbi.webp'
  ];

  const warmProjectImages = () => {
    const mobile = window.innerWidth <= 768;
    desktopImages.forEach(name => {
      const filename = mobile ? name.replace('.webp', '-768.webp') : name;
      window.portfolioPreloadImage(`assets/projects/${filename}`);
    });
  };

  if ('requestIdleCallback' in window) requestIdleCallback(warmProjectImages, { timeout: 1200 });
  else setTimeout(warmProjectImages, 250);
})();
