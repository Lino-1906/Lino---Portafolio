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

  const projectTapeTracks = [...document.querySelectorAll('.project-category-track')];

  function buildInfiniteTape(track) {
    if (!track._portfolioTapeTemplate) {
      track._portfolioTapeTemplate = [...track.children].map(node => node.cloneNode(true));
    }

    const template = track._portfolioTapeTemplate;
    const nameTemplate = template.find(node => node.classList?.contains('project-category-name'));
    const markTemplate = template.find(node => node.classList?.contains('project-category-mark'));
    if (!nameTemplate || !markTemplate) return;

    const makeUnit = () => {
      const unit = document.createElement('span');
      unit.className = 'project-category-unit';
      unit.append(nameTemplate.cloneNode(true), markTemplate.cloneNode(true));
      return unit;
    };

    const measuringUnit = makeUnit();
    track.replaceChildren(measuringUnit);
    const unitWidth = Math.max(measuringUnit.getBoundingClientRect().width, 1);
    const repetitions = Math.max(2, Math.ceil(window.innerWidth / unitWidth) + 2);

    const makeSequence = () => {
      const sequence = document.createElement('span');
      sequence.className = 'project-category-sequence';
      for (let index = 0; index < repetitions; index += 1) sequence.append(makeUnit());
      return sequence;
    };

    const firstSequence = makeSequence();
    const secondSequence = makeSequence();
    secondSequence.setAttribute('aria-hidden', 'true');
    track.replaceChildren(firstSequence, secondSequence);
    track.setAttribute('aria-hidden', 'true');

    const pixelsPerSecond = 68;
    const duration = firstSequence.scrollWidth / pixelsPerSecond;
    track.style.setProperty('--tape-duration', `${duration}s`);
    track.style.animationDelay = '0s';
  }

  projectTapeTracks.forEach(buildInfiniteTape);

  document.querySelectorAll('.project-category-menu-link').forEach(link => {
    link.addEventListener('click', event => {
      const selector = link.getAttribute('href');
      if (!selector?.startsWith('#')) return;
      const target = document.querySelector(selector);
      if (!target) return;

      event.preventDefault();
      const offset = window.innerWidth <= 768 ? 88 : 120;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - offset;
      history.pushState(null, '', selector);
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  });

  let tapeResizeFrame = 0;
  window.addEventListener('resize', () => {
    if (tapeResizeFrame) cancelAnimationFrame(tapeResizeFrame);
    tapeResizeFrame = requestAnimationFrame(() => {
      tapeResizeFrame = 0;
      projectTapeTracks.forEach(buildInfiniteTape);
    });
  }, { passive: true });

  const desktopImages = [
    'Mockup Lumine.webp', 'Mockup Circuito Magico Agua.webp',
    'Mockup Cierum.webp', 'Mockup Giantucchi.webp', 'Mockup PCI Express.webp',
    'Mockup Arte Culinario Sillon.webp', 'Mockup Guia Ayacucho Mesa.webp',
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
