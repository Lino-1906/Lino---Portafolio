(() => {
  'use strict';

  const imageCache = new Map();
  const hasIntersectionObserver = 'IntersectionObserver' in window;
  const observedTargets = new Set();
  const targetCallbacks = new WeakMap();

  window.portfolioPreloadImage = function portfolioPreloadImage(src) {
    if (!src) return Promise.resolve(src);
    if (imageCache.has(src)) return imageCache.get(src);

    const promise = new Promise(resolve => {
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.onload = async () => {
        try { await image.decode(); } catch (_) { /* The decoded resource is already usable. */ }
        resolve(src);
      };
      image.onerror = () => resolve(src);
      image.src = src;
    });

    imageCache.set(src, promise);
    return promise;
  };

  const animationObserver = hasIntersectionObserver
    ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target._portfolioInViewport = entry.isIntersecting;
        targetCallbacks.get(entry.target)?.(entry.isIntersecting && !document.hidden);
      });
    }, { rootMargin: '180px 0px', threshold: 0 })
    : null;

  window.portfolioObserveAnimationTarget = function portfolioObserveAnimationTarget(target, callback) {
    if (!target) return target;
    if (callback) targetCallbacks.set(target, callback);
    if (!observedTargets.has(target)) {
      observedTargets.add(target);
      target._portfolioInViewport = !hasIntersectionObserver;
      animationObserver?.observe(target);
    }
    return target;
  };

  window.portfolioCanAnimate = target => {
    if (document.hidden) return false;
    if (!target || !hasIntersectionObserver) return true;
    return Boolean(target._portfolioInViewport);
  };

  window.mobileCreateAutoplay = function mobileCreateAutoplay(callback, delay, target) {
    let timer = 0;
    let active = !hasIntersectionObserver || Boolean(target?._portfolioInViewport);
    let cancelled = false;

    const clear = () => {
      if (timer) window.clearTimeout(timer);
      timer = 0;
    };

    const arm = () => {
      clear();
      if (cancelled || document.hidden || !active) return;
      timer = window.setTimeout(async () => {
        timer = 0;
        if (!cancelled && !document.hidden && active) await callback();
        arm();
      }, delay);
    };

    window.portfolioObserveAnimationTarget(target, isActive => {
      active = isActive;
      arm();
    });

    arm();
    return () => { cancelled = true; clear(); };
  };

  document.querySelectorAll('.project-card').forEach(card => {
    window.portfolioObserveAnimationTarget(card);
  });

  const tapeTracks = [...document.querySelectorAll('.project-category-track')];

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
    const viewportWidth = track.parentElement?.clientWidth || window.innerWidth;
    const repetitions = Math.max(3, Math.ceil(viewportWidth / unitWidth) + 3);

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
    track.style.setProperty('--tape-duration', `${firstSequence.scrollWidth / 68}s`);
  }

  tapeTracks.forEach(track => {
    buildInfiniteTape(track);
    window.portfolioObserveAnimationTarget(track, active => {
      track.style.animationPlayState = active ? 'running' : 'paused';
      track.style.willChange = active ? 'transform' : 'auto';
    });
  });

  document.fonts?.ready.then(() => tapeTracks.forEach(buildInfiniteTape));

  document.querySelectorAll('.marquee-track').forEach(track => {
    window.portfolioObserveAnimationTarget(track, active => {
      track.style.animationPlayState = active ? 'running' : 'paused';
      track.style.willChange = active ? 'transform' : 'auto';
    });
  });

  const hero = document.getElementById('hero');
  const heroAnimations = hero ? [...hero.querySelectorAll('.m-glow')] : [];
  if (heroAnimations.length) {
    window.portfolioObserveAnimationTarget(hero, active => {
      heroAnimations.forEach(element => {
        element.style.animationPlayState = active ? 'running' : 'paused';
        element.style.willChange = active ? 'transform' : 'auto';
      });
    });
  }

  document.addEventListener('visibilitychange', () => {
    observedTargets.forEach(target => {
      targetCallbacks.get(target)?.(Boolean(target._portfolioInViewport) && !document.hidden);
    });
  });

  let tapeResizeFrame = 0;
  window.addEventListener('resize', () => {
    if (tapeResizeFrame) cancelAnimationFrame(tapeResizeFrame);
    tapeResizeFrame = requestAnimationFrame(() => {
      tapeResizeFrame = 0;
      tapeTracks.forEach(buildInfiniteTape);
    });
  }, { passive: true });

  if (hasIntersectionObserver) {
    const projectImageObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll('img[loading="lazy"]').forEach(image => {
          image.fetchPriority = 'low';
          image.loading = 'eager';
          image.decode?.().catch(() => {});
        });
        projectImageObserver.unobserve(entry.target);
      });
    }, { rootMargin: '420px 0px', threshold: 0 });

    document.querySelectorAll('.project-category-group').forEach(group => {
      projectImageObserver.observe(group);
    });
  }
})();
