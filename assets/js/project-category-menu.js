(function () {
  function initializeStickyCategoryMenu() {
    var menu = document.querySelector('.project-category-menu');
    if (!menu) return;
    var primaryNavigation = document.querySelector('#sidebar-nav, #mobile-nav');

    var frame = 0;

    function updateStickyState() {
      frame = 0;
      var stickyTop = parseFloat(window.getComputedStyle(menu).top) || 0;
      var menuTop = menu.getBoundingClientRect().top;
      var isStuck = Math.abs(menuTop - stickyTop) < 1;
      if (primaryNavigation) {
        primaryNavigation.style.setProperty('--attached-menu-height', menu.offsetHeight + 'px');
      }
      menu.classList.toggle('is-stuck', isStuck);
      if (primaryNavigation) {
        primaryNavigation.classList.toggle('category-menu-attached', isStuck);
      }
    }

    function scheduleUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(updateStickyState);
    }

    function getAnchorOffset() {
      var stickyTop = parseFloat(window.getComputedStyle(menu).top) || 0;
      var titleGap = window.innerWidth <= 768 ? 12 : 24;
      return stickyTop + menu.offsetHeight + titleGap;
    }

    function alignCategoryTarget(target, behavior) {
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
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('hashchange', function () {
      window.requestAnimationFrame(alignCurrentCategory);
    });
    updateStickyState();
    scheduleCurrentCategoryAlignment();

    if (document.readyState === 'complete') {
      scheduleCurrentCategoryAlignment();
    } else {
      window.addEventListener('load', scheduleCurrentCategoryAlignment, { once: true });
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleCurrentCategoryAlignment);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStickyCategoryMenu, { once: true });
  } else {
    initializeStickyCategoryMenu();
  }
})();
