(() => {
  const readerConfig = document.documentElement.dataset;
  const total = Number.parseInt(readerConfig.pageCount || '', 10) || 28;
  const magazineTitle = readerConfig.magazineTitle || 'Arte Culinario - Revista interactiva';
  const pageWidth = Number.parseFloat(readerConfig.pageWidth || '') || 567;
  const pageHeight = Number.parseFloat(readerConfig.pageHeight || '') || 738;
  const pageRatio = pageWidth / pageHeight;
  const minimumPageHeight = pageRatio > 1.2 ? 240 : 338;
  const pagesVersion = readerConfig.pagesVersion ? `?v=${encodeURIComponent(readerConfig.pagesVersion)}` : '';
  const pageBase = readerConfig.pageBase || '';
  const contentSources = Array.from({ length:total }, (_, index) => `${pageBase}page-${String(index + 1).padStart(2, '0')}.jpg${pagesVersion}`);
  const transparentPage = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  // StPageFlip creates an Image for every entry. Placeholders prevent eager
  // downloads of the entire magazine; nearby pages are hydrated below.
  const pageSources = [transparentPage, ...contentSources.map((source, index) => index < 4 ? source : transparentPage)];
  const hydratedPages = new Set([0, 1, 2, 3, 4]);
  const stage = document.getElementById('stage');
  const bookElement = document.getElementById('book');
  const loader = document.getElementById('readerLoader');
  const loaderBar = document.getElementById('loaderBar');
  const loaderCount = document.getElementById('loaderCount');
  const status = document.getElementById('status');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const firstBtn = document.getElementById('firstBtn');
  const lastBtn = document.getElementById('lastBtn');
  const autoplayBtn = document.getElementById('autoplayBtn');
  const soundBtn = document.getElementById('soundBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const shareBtn = document.getElementById('shareBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const controls = [zoomInBtn, zoomOutBtn, autoplayBtn, soundBtn, firstBtn, prevBtn, nextBtn, lastBtn, shareBtn, fullscreenBtn];
  let pageFlip = null;
  let ready = false;
  let currentPage = 0;
  let previousPage = 0;
  let zoom = 1;
  let autoplayTimer = 0;
  let jumping = false;
  let resetWhenReady = false;
  const compactReader = matchMedia('(max-width: 700px), (pointer: coarse) and (max-width: 1100px)');
  let soundEnabled = !compactReader.matches;
  soundBtn.classList.toggle('active', soundEnabled);
  soundBtn.setAttribute('aria-pressed', String(soundEnabled));
  compactReader.addEventListener('change', () => {
    if (compactReader.matches) soundEnabled = false;
    soundBtn.classList.toggle('active', soundEnabled);
    soundBtn.setAttribute('aria-pressed', String(soundEnabled));
  });
  let audioContext = null;
  let resizeFrame = 0;
  const pagePreloadCache = new Map();

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function fitBookToStage() {
    const stageStyle = getComputedStyle(stage);
    const horizontalPadding = Number.parseFloat(stageStyle.paddingLeft) + Number.parseFloat(stageStyle.paddingRight);
    const verticalPadding = Number.parseFloat(stageStyle.paddingTop) + Number.parseFloat(stageStyle.paddingBottom);
    const availableWidth = Math.max(1, stage.clientWidth - horizontalPadding);
    const availableHeight = Math.max(1, stage.clientHeight - verticalPadding);
    const minPageWidth = Math.round(minimumPageHeight * pageRatio);
    const landscapeWidth = Math.min(availableWidth, availableHeight * pageRatio * 2);
    const useLandscape = landscapeWidth >= minPageWidth * 2;
    const fittedWidth = useLandscape
      ? landscapeWidth
      : Math.min(availableWidth, availableHeight * pageRatio);

    bookElement.style.setProperty('--book-fit-width', `${Math.floor(fittedWidth)}px`);
  }

  function scheduleBookFit() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      fitBookToStage();
      pageFlip?.update?.();
      updateEdgeView();
    });
  }

  function updateLoader(done, expected = total) {
    const percent = Math.round((done / expected) * 100);
    loaderBar.style.width = `${percent}%`;
    loaderCount.textContent = `${done} / ${expected}`;
  }

  function preloadPage(source, priority = 'low') {
    if (pagePreloadCache.has(source)) return pagePreloadCache.get(source);
    const promise = new Promise(resolve => {
      const image = new Image();
      image.decoding = 'async';
      image.loading = 'eager';
      image.fetchPriority = priority;
      image.onload = async () => {
        try { await image.decode(); } catch (_) { /* The page is already ready to paint. */ }
        resolve(true);
      };
      image.onerror = () => resolve(false);
      image.src = source;
    });
    pagePreloadCache.set(source, promise);
    return promise;
  }

  async function preloadInitialPages() {
    const initialSources = contentSources.slice(0, Math.min(4, total));
    let done = 0;
    const results = await Promise.all(initialSources.map(async source => {
      const loaded = await preloadPage(source, 'high');
      done += 1;
      updateLoader(done, initialSources.length);
      return loaded;
    }));
    if (results.some(loaded => !loaded)) throw new Error('No se pudieron cargar las páginas iniciales de la revista.');
  }

  function prefetchNearbyPages(pageIndex) {
    const contentIndex = Math.max(0, pageIndex - 1);
    const start = Math.max(0, contentIndex - 2);
    const end = Math.min(total, contentIndex + 5);
    for (let index = start; index < end; index++) {
      const pageNumber = index + 1;
      const page = pageFlip?.getPage(pageNumber);
      if (!page?.image || hydratedPages.has(pageNumber)) continue;
      hydratedPages.add(pageNumber);
      page.isLoad = false;
      page.image.onload = () => { page.isLoad = true; };
      page.image.onerror = () => {
        hydratedPages.delete(pageNumber);
        status.textContent = 'No se pudo cargar una página. Vuelve a intentarlo.';
      };
      page.image.decoding = 'async';
      page.image.src = contentSources[index];
    }
  }

  function softenEdgePages() {
    if (!pageFlip) return;
    [0, total].forEach(index => {
      const page = pageFlip.getPage(index);
      page?.setDensity?.('soft');
      page?.setDrawingDensity?.('soft');
    });
  }

  function updateStatus(pageIndex = pageFlip?.getCurrentPageIndex?.() ?? currentPage) {
    currentPage = pageIndex;
    const portrait = pageFlip?.getOrientation?.() === 'portrait';
    if (pageIndex <= 1) {
      status.textContent = `Página 1 de ${total}`;
    } else if (pageIndex >= total) {
      status.textContent = `Página ${total} de ${total}`;
    } else if (portrait) {
      status.textContent = `Página ${pageIndex} de ${total}`;
    } else {
      status.textContent = `Páginas ${pageIndex}-${Math.min(pageIndex + 1, total)} de ${total}`;
    }
    const firstPageIndex = portrait ? 1 : 0;
    prevBtn.disabled = firstBtn.disabled = pageIndex <= firstPageIndex;
    nextBtn.disabled = lastBtn.disabled = pageIndex >= total;
    status.setAttribute('aria-label', status.textContent + (compactReader.matches ? (zoom > 1 ? '. Restablecer tamaño' : '. Ampliar página') : ''));
  }

  function updateEdgeView(allowSingleView = true) {
    const landscape = pageFlip?.getOrientation?.() === 'landscape';
    const coverVisible = landscape && currentPage === 0;
    const endVisible = landscape && currentPage >= total;
    bookElement.classList.toggle('cover-view', coverVisible);
    bookElement.classList.toggle('end-view', endVisible);
    bookElement.classList.toggle('cover-clipped', allowSingleView && coverVisible);
    bookElement.classList.toggle('end-clipped', allowSingleView && endVisible);
  }

  function enableControls() {
    controls.forEach(control => { control.disabled = false; });
    updateStatus(currentPage);
  }

  function playPaperSound() {
    if (!soundEnabled || !ready) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const duration = .18;
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) {
        const time = index / data.length;
        const envelope = Math.pow(1 - time, 2.65) * (.22 + Math.sin(time * Math.PI) * .62);
        data[index] = (Math.random() * 2 - 1) * envelope;
      }
      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      filter.type = 'bandpass';
      filter.frequency.value = 1750;
      filter.Q.value = .38;
      gain.gain.value = .075;
      source.buffer = buffer;
      source.connect(filter).connect(gain).connect(audioContext.destination);
      source.start();
    } catch (_) {}
  }

  function animateOrientationShift() {
    if (currentPage <= 1 || currentPage >= total) return;
    bookElement.classList.remove('orientation-shift');
    void bookElement.offsetWidth;
    bookElement.classList.add('orientation-shift');
    setTimeout(() => bookElement.classList.remove('orientation-shift'), 390);
  }

  function stopAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = 0;
    autoplayBtn.classList.remove('active');
    autoplayBtn.setAttribute('aria-pressed', 'false');
  }

  function flipNext() {
    if (!ready || jumping || currentPage >= total) return;
    prefetchNearbyPages(currentPage + 2);
    if (pageFlip.getOrientation() === 'landscape') {
      if (currentPage === 0) {
        jumpToPage(2, 1);
        return;
      }
      if (currentPage === total - 2) {
        jumpToPage(total, 1);
        return;
      }
    }
    pageFlip.flipNext('bottom');
  }

  function flipPrev() {
    const firstPageIndex = pageFlip?.getOrientation?.() === 'portrait' ? 1 : 0;
    if (!ready || jumping || currentPage <= firstPageIndex) return;
    prefetchNearbyPages(Math.max(0, currentPage - 2));
    if (pageFlip.getOrientation() === 'landscape' && currentPage === 2) {
      jumpToPage(0, -1);
      return;
    }
    if (pageFlip.getOrientation() === 'landscape' && currentPage === total) {
      jumpToPage(total - 2, -1);
      return;
    }
    pageFlip.flipPrev('bottom');
  }

  function getBoundaryGesture(event) {
    if (!ready || jumping || pageFlip.getState() !== 'read' || pageFlip.getOrientation() !== 'landscape') return null;
    const canvas = bookElement.querySelector('canvas');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const insideCanvas = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!insideCanvas) return null;
    const onLeftPage = event.clientX < rect.left + rect.width / 2;
    if (currentPage === 0 && !onLeftPage) return { target:2, direction:1, dragDirection:-1 };
    if (currentPage === 2 && onLeftPage) return { target:0, direction:-1, dragDirection:1 };
    if (currentPage === total - 2 && !onLeftPage) return { target:total, direction:1, dragDirection:-1 };
    if (currentPage === total && onLeftPage) return { target:total - 2, direction:-1, dragDirection:1 };
    return null;
  }

  function connectBoundaryGestures() {
    let gesture = null;
    let internalMouseDrag = false;
    let suppressMouseUntil = 0;

    const completeGesture = clientX => {
      if (!gesture) return;
      const activeGesture = gesture;
      gesture = null;
      const distance = clientX - activeGesture.startX;
      const isClick = Math.abs(distance) < 8;
      const completedDrag = distance * activeGesture.dragDirection > 24;
      if (isClick || completedDrag) jumpToPage(activeGesture.target, activeGesture.direction);
    };

    bookElement.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      const intent = getBoundaryGesture(event);
      if (!intent) return;
      gesture = { ...intent, pointerId:event.pointerId, startX:event.clientX };
      bookElement.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    bookElement.addEventListener('pointermove', event => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    bookElement.addEventListener('pointerup', event => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      bookElement.releasePointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopImmediatePropagation();
      completeGesture(event.clientX);
      suppressMouseUntil = performance.now() + 120;
    }, true);
    bookElement.addEventListener('pointercancel', event => {
      if (gesture?.pointerId === event.pointerId) gesture = null;
    }, true);

    bookElement.addEventListener('mousedown', event => {
      if (event.button !== 0) return;
      const intent = getBoundaryGesture(event);
      if (!gesture && !intent) {
        internalMouseDrag = true;
        return;
      }
      if (!gesture) gesture = { ...intent, pointerId:'mouse', startX:event.clientX };
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    window.addEventListener('mousemove', event => {
      if (internalMouseDrag) return;
      const hoveringBoundary = getBoundaryGesture(event);
      if (!gesture && !hoveringBoundary) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    window.addEventListener('mouseup', event => {
      if (internalMouseDrag) {
        internalMouseDrag = false;
        return;
      }
      if (!gesture && performance.now() >= suppressMouseUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (gesture?.pointerId === 'mouse') completeGesture(event.clientX);
    }, true);
  }

  function toggleAutoplay() {
    if (autoplayTimer) {
      stopAutoplay();
      return;
    }
    autoplayBtn.classList.add('active');
    autoplayBtn.setAttribute('aria-pressed', 'true');
    autoplayTimer = setInterval(() => {
      if (currentPage >= total) stopAutoplay();
      else if (pageFlip.getState() === 'read') flipNext();
    }, 3200);
  }

  async function jumpToPage(target, direction) {
    if (!ready || jumping || target === currentPage || pageFlip.getState() !== 'read') return;
    prefetchNearbyPages(target);
    jumping = true;
    stage.classList.add('jumping');
    stopAutoplay();
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const duration = reduce ? 1 : 180;
    const landscape = pageFlip.getOrientation() === 'landscape';
    const restingOffset = page => landscape && page === 0 ? -25 : landscape && page >= total ? 25 : 0;
    const sourceOffset = restingOffset(currentPage);
    const targetOffset = restingOffset(target);
    const out = bookElement.animate([
      { opacity:1, transform:`translate3d(${sourceOffset}%,0,0) scale(1)` },
      { opacity:.08, transform:`translate3d(${sourceOffset + (direction > 0 ? -5 : 5)}%,0,0) scale(.985)` }
    ], { duration, easing:'cubic-bezier(.4,0,1,1)', fill:'forwards' });
    try { await out.finished; } catch (_) {}
    pageFlip.turnToPage(target);
    currentPage = target;
    updateStatus(target);
    updateEdgeView();
    const incoming = bookElement.animate([
      { opacity:.08, transform:`translate3d(${targetOffset + (direction > 0 ? 5 : -5)}%,0,0) scale(.985)` },
      { opacity:1, transform:`translate3d(${targetOffset}%,0,0) scale(1)` }
    ], { duration:reduce ? 1 : 260, easing:'cubic-bezier(0,0,.2,1)', fill:'both' });
    out.cancel();
    try { await incoming.finished; } catch (_) {}
    incoming.cancel();
    stage.classList.remove('jumping');
    jumping = false;
    if (resetWhenReady) resetToCover();
  }

  function resetToCover() {
    if (!ready || !pageFlip) return;
    if (jumping || pageFlip.getState() !== 'read') {
      resetWhenReady = true;
      return;
    }
    resetWhenReady = false;
    stopAutoplay();
    const target = pageFlip.getOrientation() === 'portrait' ? 1 : 0;
    previousPage = target;
    pageFlip.turnToPage(target);
    currentPage = target;
    updateStatus(target);
    updateEdgeView();
  }

  function setZoom(value) {
    if (!ready) return;
    zoom = clamp(Math.round(value * 10) / 10, .8, 1.8);
    bookElement.style.zoom = String(zoom);
    stage.classList.toggle('zoomed', zoom > 1.01);
    status.textContent = `${Math.round(zoom * 100)}%`;
    clearTimeout(setZoom.timer);
    setZoom.timer = setTimeout(() => {
      pageFlip.update();
      updateStatus();
    }, 420);
    requestAnimationFrame(() => {
      stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
      stage.scrollTop = Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2);
    });
  }

  async function shareMagazine() {
    let shareUrl = location.href;
    try { shareUrl = window.top.location.href; } catch (_) {}
    const shareData = { title:magazineTitle, url:shareUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareUrl);
        const previous = status.textContent;
        status.textContent = 'Enlace copiado';
        setTimeout(() => { status.textContent = previous; }, 1400);
      }
    } catch (_) {}
  }

  function connectControls() {
    const syncZoomControl = () => {
      status.tabIndex = compactReader.matches ? 0 : -1;
      if (compactReader.matches) {
        status.setAttribute('role', 'button');
        status.title = 'Toca para ampliar o restablecer la página';
      } else {
        status.removeAttribute('role');
        status.removeAttribute('title');
      }
    };
    const toggleCompactZoom = () => {
      if (compactReader.matches) { stopAutoplay(); setZoom(zoom > 1 ? 1 : 1.6); }
    };
    status.addEventListener('click', toggleCompactZoom);
    status.addEventListener('keydown', event => {
      if (compactReader.matches && ['Enter', ' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); toggleCompactZoom(); }
    });
    compactReader.addEventListener('change', syncZoomControl);
    syncZoomControl();
    prevBtn.addEventListener('click', () => { stopAutoplay(); flipPrev(); });
    nextBtn.addEventListener('click', () => { stopAutoplay(); flipNext(); });
    firstBtn.addEventListener('click', () => jumpToPage(pageFlip.getOrientation() === 'portrait' ? 1 : 0, -1));
    lastBtn.addEventListener('click', () => jumpToPage(total, 1));
    zoomInBtn.addEventListener('click', () => setZoom(zoom + .2));
    zoomOutBtn.addEventListener('click', () => setZoom(zoom - .2));
    autoplayBtn.addEventListener('click', toggleAutoplay);
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundBtn.classList.toggle('active', soundEnabled);
      soundBtn.setAttribute('aria-pressed', String(soundEnabled));
      if (soundEnabled) playPaperSound();
    });
    shareBtn.addEventListener('click', shareMagazine);
    fullscreenBtn.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (document.fullscreenEnabled && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        else window.open(location.href, '_blank', 'noopener');
      } catch (_) {
        // A normal reader tab is also usable on browsers without iframe fullscreen.
        window.open(location.href, '_blank', 'noopener');
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') { stopAutoplay(); flipNext(); }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') { stopAutoplay(); flipPrev(); }
      if (event.key === 'Home') jumpToPage(pageFlip.getOrientation() === 'portrait' ? 1 : 0, -1);
      if (event.key === 'End') jumpToPage(total, 1);
      if (event.key === '+' || event.key === '=') setZoom(zoom + .2);
      if (event.key === '-') setZoom(zoom - .2);
      if (event.key === 'Escape') window.parent.postMessage({ type:'closeEditorialReader' }, '*');
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAutoplay(); });
  }

  function createPageFlip() {
    pageFlip = new St.PageFlip(bookElement, {
      width:pageWidth,
      height:pageHeight,
      size:'stretch',
      minWidth:Math.round(minimumPageHeight * pageRatio),
      maxWidth:Math.round(990 * pageRatio),
      minHeight:minimumPageHeight,
      maxHeight:990,
      drawShadow:true,
      flippingTime:780,
      usePortrait:true,
      startPage:0,
      startZIndex:2,
      autoSize:true,
      maxShadowOpacity:.42,
      showCover:false,
      mobileScrollSupport:false,
      swipeDistance:18,
      clickEventForward:true,
      useMouseEvents:true,
      showPageCorners:true,
      disableFlipByClick:false
    });

    pageFlip.on('init', event => {
      currentPage = event.data.page;
      if (event.data.mode === 'portrait' && currentPage === 0) {
        pageFlip.turnToPage(1);
        currentPage = 1;
      }
      previousPage = currentPage;
      softenEdgePages();
      ready = true;
      bookElement.classList.add('ready');
      loader.classList.add('hidden');
      enableControls();
      updateEdgeView();
      prefetchNearbyPages(currentPage);
    });
    pageFlip.on('flip', event => {
      currentPage = event.data;
      updateStatus(currentPage);
      updateEdgeView(false);
      if (ready && currentPage !== previousPage) playPaperSound();
      previousPage = currentPage;
      prefetchNearbyPages(currentPage);
    });
    pageFlip.on('changeOrientation', () => {
      softenEdgePages();
      if (pageFlip.getOrientation() === 'portrait' && currentPage === 0) {
        pageFlip.turnToPage(1);
        currentPage = 1;
      } else if (pageFlip.getOrientation() === 'landscape' && currentPage === 1) {
        pageFlip.turnToPage(0);
        currentPage = 0;
      }
      updateStatus();
      animateOrientationShift();
      updateEdgeView();
    });
    pageFlip.on('changeState', event => {
      stage.classList.toggle('flipping', event.data === 'flipping' || event.data === 'user_fold');
      updateEdgeView(event.data === 'read');
      if (event.data === 'read' && resetWhenReady) requestAnimationFrame(resetToCover);
    });
    pageFlip.loadFromImages(pageSources);
    softenEdgePages();
  }

  async function init() {
    try {
      if (!window.St?.PageFlip) throw new Error('StPageFlip no está disponible.');
      connectControls();
      connectBoundaryGestures();
      await preloadInitialPages();
      fitBookToStage();
      createPageFlip();
      new ResizeObserver(scheduleBookFit).observe(stage);
    } catch (error) {
      loader.querySelector('.loader-title').textContent = 'No se pudo abrir la revista';
      loaderCount.textContent = 'Recarga la página';
      status.textContent = 'Error de carga';
      console.error(error);
    }
  }

  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== location.origin) return;
    if (event.data?.type === 'suspendEditorialReader') stopAutoplay();
    if (event.data?.type === 'resetEditorialReader') resetToCover();
  });
  window.addEventListener('fullscreenchange', scheduleBookFit);
  window.addEventListener('beforeunload', () => pageFlip?.destroy?.());
  init();
})();
