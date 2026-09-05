(function () {
  function initializeStickyCategoryMenu() {
    var menu = document.querySelector('.project-category-menu');
    if (!menu) return;
    var primaryNavigation = document.querySelector('#sidebar-nav, #mobile-nav');

    var frame = 0;
    var stickyTop = 0;
    var menuHeight = 0;
    var categories = [...menu.querySelectorAll('a[href^="#proyectos-"]')].map(function (link) {
      return { link: link, target: document.getElementById(link.hash.slice(1)), top: 0 };
    }).filter(function (item) { return item.target; });
    var selectedCategory = null;
    var directTarget = null;
    function selectCategory(item) {
      if (item === selectedCategory) return;
      selectedCategory = item;
      categories.forEach(function (category) {
        if (category === item) category.link.setAttribute('aria-current', 'location');
        else category.link.removeAttribute('aria-current');
      });
      if (!item || menu.scrollWidth <= menu.clientWidth) return;
      var rect = menu.getBoundingClientRect(), linkRect = item.link.getBoundingClientRect();
      if (linkRect.left < rect.left + 12 || linkRect.right > rect.right - 12) {
        menu.scrollTo({ left: menu.scrollLeft + linkRect.left - rect.left - (menu.clientWidth - linkRect.width) / 2,
          behavior: directTarget || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }
    }
    function measure() {
      stickyTop = parseFloat(window.getComputedStyle(menu).top) || 0;
      var nextHeight = menu.offsetHeight;
      if (primaryNavigation && nextHeight !== menuHeight) {
        primaryNavigation.style.setProperty('--attached-menu-height', nextHeight + 'px');
      }
      menuHeight = nextHeight;
      categories.forEach(function (item) { item.top = scrollY + item.target.getBoundingClientRect().top; });
      scheduleUpdate();
    }

    function updateStickyState() {
      frame = 0;
      var menuTop = menu.getBoundingClientRect().top;
      var isStuck = Math.abs(menuTop - stickyTop) < 1;
      menu.classList.toggle('is-stuck', isStuck);
      if (primaryNavigation) {
        primaryNavigation.classList.toggle('category-menu-attached', isStuck);
      }
      var marker = scrollY + getAnchorOffset() + 2;
      if (directTarget && Math.abs(directTarget.top - marker) < 4) directTarget = null;
      var active = null;
      categories.forEach(function (item) { if (item.top <= marker) active = item; });
      selectCategory(directTarget || active);
    }

    function scheduleUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(updateStickyState);
    }

    function getAnchorOffset() {
      var titleGap = window.innerWidth <= 768 ? 12 : 24;
      return stickyTop + menuHeight + titleGap;
    }

    function alignCategoryTarget(target, behavior) {
      measure();
      directTarget = categories.find(function (item) { return item.target === target; });
      selectCategory(directTarget);
      var targetTop = window.scrollY + target.getBoundingClientRect().top;
      window.scrollTo({
        top: Math.max(0, targetTop - getAnchorOffset()),
        behavior: behavior
      });
    }

    menu.querySelectorAll('a[href^="#proyectos-"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        window.history.pushState(null, '', link.getAttribute('href'));
        var behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
        alignCategoryTarget(target, behavior);
      });
    });

    function alignCurrentCategory() {
      if (!window.location.hash.startsWith('#proyectos-')) return;
      var target = document.querySelector(window.location.hash);
      if (target) alignCategoryTarget(target, 'instant');
    }

    function scheduleCurrentCategoryAlignment() {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(alignCurrentCategory);
      });
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('hashchange', function () {
      window.requestAnimationFrame(alignCurrentCategory);
    });
    measure();
    var sizeObserver = new ResizeObserver(measure);
    sizeObserver.observe(menu);
    sizeObserver.observe(document.body);
    if (primaryNavigation) sizeObserver.observe(primaryNavigation);
    updateStickyState();
    scheduleCurrentCategoryAlignment();

    var interacted = false;
    ['wheel', 'touchstart'].forEach(function (type) {
      window.addEventListener(type, function () { directTarget = null; }, { passive: true });
    });
    ['pointerdown', 'wheel', 'keydown'].forEach(function (type) {
      window.addEventListener(type, function () { interacted = true; }, { once: true, passive: true });
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        measure();
        if (!interacted) scheduleCurrentCategoryAlignment();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStickyCategoryMenu, { once: true });
  } else {
    initializeStickyCategoryMenu();
  }
})();
