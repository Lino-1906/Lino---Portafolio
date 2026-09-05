// One owner for section selection on desktop and mobile.
(() => {
  const nav = document.querySelector('.chapter-links, .case-nav-inner');
  if (!nav) return;
  const mobile = matchMedia('(max-width: 760px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.site-header');
  const bar = nav.closest('nav') || nav;
  const chapters = [...nav.querySelectorAll('a[href^="#"]')].map(link => {
    const section = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    return { link, section, label: section?.querySelector('.chapter-kicker, .eyebrow, h2, h1') || section };
  }).filter(item => item.section);
  if (!chapters.length) return;
  let current, destination = null, frame = 0, settleFrame = 0;
  let offset = 0, positions = [];
  const behavior = () => reduced.matches ? 'instant' : 'smooth';
  function measure() {
    const barTop = parseFloat(getComputedStyle(bar).top) || 0;
    offset = Math.max(header?.getBoundingClientRect().height || 0, barTop + bar.getBoundingClientRect().height) + 14;
    positions = chapters.map(item => item.label.getBoundingClientRect().top + scrollY);
  }
  function reveal(link, motion) {
    if (!mobile.matches) return;
    const rect = nav.getBoundingClientRect(), item = link.getBoundingClientRect();
    if (item.left >= rect.left + 16 && item.right <= rect.right - 16) return;
    nav.scrollTo({ left: Math.max(0, nav.scrollLeft + item.left - rect.left - (nav.clientWidth - item.width) / 2), behavior: motion });
  }
  function select(item, motion = behavior()) {
    if (current !== item) {
      chapters.forEach(({ link }) => {
        if (link === item.link) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      current = item;
    }
    reveal(item.link, motion);
  }
  function update() {
    frame = 0;
    if (destination) return;
    const marker = scrollY + offset + 2;
    let index = 0;
    positions.forEach((top, i) => { if (top <= marker) index = i; });
    if (scrollY > 0 && Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2) index = chapters.length - 1;
    select(chapters[index]);
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  function release() {
    cancelAnimationFrame(settleFrame);
    destination = null;
    nav.classList.remove('is-direct-navigation');
    measure();
    schedule();
  }
  function go(item, motion = behavior()) {
    cancelAnimationFrame(settleFrame);
    measure();
    destination = item;
    nav.classList.add('is-direct-navigation');
    select(item, 'instant');
    let target = Math.max(0, Math.min(positions[chapters.indexOf(item)] - offset, document.documentElement.scrollHeight - innerHeight));
    window.scrollTo({ top: target, behavior: motion });
    // Settle on actual scroll completion, not on a fixed one-second lock.
    let last = scrollY, stable = 0, start = performance.now();
    function settle(now) {
      stable = Math.abs(scrollY - last) < .5 ? stable + 1 : 0;
      last = scrollY;
      if (stable >= 4 && now - start < 3500) {
        measure();
        const actual = Math.max(0, Math.min(positions[chapters.indexOf(item)] - offset, document.documentElement.scrollHeight - innerHeight));
        if (Math.abs(actual - scrollY) > 2) {
          target = actual; stable = 0;
          window.scrollTo({ top: target, behavior: motion });
        }
      }
      if ((stable >= 4 && (Math.abs(scrollY - target) < 2 || now - start > 400)) || now - start > 4000) {
        release();
        return;
      }
      settleFrame = requestAnimationFrame(settle);
    }
    settleFrame = requestAnimationFrame(settle);
  }
  chapters.forEach(item => item.link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.pushState(null, '', item.link.hash);
    go(item);
  }));
  window.addEventListener('scroll', schedule, { passive: true });
  ['wheel', 'touchstart'].forEach(type => window.addEventListener(type, () => {
    if (destination) release();
  }, { passive: true }));
  window.addEventListener('keydown', event => {
    if (destination && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) release();
  });
  const refresh = () => { measure(); schedule(); };
  const resize = new ResizeObserver(refresh);
  resize.observe(document.body);
  if (header) resize.observe(header);
  resize.observe(bar);
  function fromHash() {
    const item = chapters.find(item => item.link.hash === location.hash);
    if (item) go(item, 'instant');
  }
  window.addEventListener('hashchange', fromHash);
  // Wait for fonts once; never reposition after a visitor starts interacting.
  let interacted = false;
  ['pointerdown', 'wheel', 'keydown'].forEach(type => window.addEventListener(type, () => { interacted = true; }, { once: true, passive: true }));
  document.fonts?.ready.then(() => { refresh(); if (!interacted) fromHash(); });
  mobile.addEventListener('change', refresh);
  measure(); update(); fromHash();
})();
