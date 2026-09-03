(() => {
  const mobileView = window.matchMedia('(max-width: 760px)');
  const nav = document.querySelector('.chapter-links, .case-nav-inner');
  if (!nav) return;

  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const chapters = links
    .map(link => ({ link, section: document.querySelector(link.hash) }))
    .filter(item => item.section);
  if (!chapters.length) return;

  let directNavigation = false;
  let directNavigationTimer = 0;

  const keepVisible = (link, behavior = 'smooth') => {
    if (!mobileView.matches || !link) return;
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const targetLeft = nav.scrollLeft + linkRect.left - navRect.left - (nav.clientWidth - linkRect.width) / 2;
    nav.scrollTo({ left: Math.max(0, targetLeft), behavior });
  };

  const select = (link, behavior = 'smooth') => {
    if (!mobileView.matches || !link) return;
    links.forEach(item => item.toggleAttribute('aria-current', item === link));
    keepVisible(link, behavior);
  };

  let scheduled = false;
  const updateFromScroll = () => {
    if (!mobileView.matches || directNavigation || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const marker = window.scrollY + Math.min(window.innerHeight * 0.3, 240);
      let current = chapters[0];
      for (const item of chapters) {
        if (item.section.offsetTop <= marker) current = item;
        else break;
      }
      if (current.link.getAttribute('aria-current') !== 'location') {
        select(current.link);
        current.link.setAttribute('aria-current', 'location');
      }
    });
  };

  links.forEach(link => link.addEventListener('click', event => {
    if (!mobileView.matches) return;
    event.preventDefault();
    directNavigation = true;
    nav.classList.add('is-direct-navigation');
    window.clearTimeout(directNavigationTimer);
    select(link, 'auto');
    link.setAttribute('aria-current', 'location');
    const chapter = chapters.find(item => item.link === link)?.section;
    const chapterLabel = chapter?.querySelector('.chapter-kicker, .eyebrow') || chapter?.querySelector('h2, h1') || chapter;
    if (chapterLabel) {
      const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
      const menuHeight = nav.closest('nav')?.getBoundingClientRect().height || nav.getBoundingClientRect().height;
      const destination = window.scrollY + chapterLabel.getBoundingClientRect().top - headerHeight - menuHeight - 14;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: Math.max(0, destination), behavior: reducedMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', link.hash);
    }
    directNavigationTimer = window.setTimeout(() => {
      directNavigation = false;
      nav.classList.remove('is-direct-navigation');
      updateFromScroll();
    }, 1000);
  }));
  const activeObserver = new MutationObserver(records => {
    if (directNavigation) return;
    const activeChange = records.find(record =>
      record.attributeName === 'aria-current' && record.target.getAttribute('aria-current') === 'location'
    );
    if (activeChange) keepVisible(activeChange.target);
  });
  links.forEach(link => activeObserver.observe(link, { attributes: true, attributeFilter: ['aria-current'] }));
  window.addEventListener('scroll', updateFromScroll, { passive: true });
  window.addEventListener('resize', updateFromScroll, { passive: true });
  mobileView.addEventListener('change', () => {
    directNavigation = false;
    nav.classList.remove('is-direct-navigation');
    window.clearTimeout(directNavigationTimer);
    if (mobileView.matches) updateFromScroll();
    else nav.scrollTo({ left: 0, behavior: 'auto' });
  });
  updateFromScroll();
})();
