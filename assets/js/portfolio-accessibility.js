(() => {
  function init() {
    const definitions = [
      ['openPdfModal', 'closePdfModal', 'pdf-modal-overlay', 'Documento'],
      ['openContactModal', 'closeContactModal', 'contact-modal-overlay', 'Contacto'],
      ['openEditorialProgressModal', 'closeEditorialProgressModal', 'editorial-progress-modal', 'Proyecto interactivo']
    ];
    let active = null;
    function closeFocus(dialog) {
      if (active?.dialog !== dialog) return;
      const state = active;
      active = null;
      dialog.inert = true;
      dialog.setAttribute('aria-hidden', 'true');
      state.background.forEach(([node, inert]) => { node.inert = inert; });
      if (state.trigger?.isConnected && !state.trigger.closest('[inert]')) state.trigger.focus({ preventScroll: true });
    }
    function openFocus(dialog, trigger, close, label) {
      if (!dialog) return;
      if (active?.dialog === dialog) return;
      if (active) closeFocus(active.dialog);
      dialog.inert = false;
      dialog.tabIndex = -1;
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-hidden', 'false');
      if (!dialog.hasAttribute('aria-labelledby')) dialog.setAttribute('aria-label', label);
      const background = [...document.body.children]
        .filter(node => node !== dialog && !node.contains(dialog) && !['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName))
        .map(node => [node, node.inert]);
      background.forEach(([node]) => { node.inert = true; });
      active = { dialog, trigger, close, background };
      (focusable(dialog)[0] || dialog).focus({ preventScroll: true });
    }
    function focusable(dialog) {
      return [...dialog.querySelectorAll('a[href], button, input, select, textarea, iframe, [tabindex]')]
        .filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length && !node.closest('[inert]'));
    }
    definitions.forEach(([openName, closeName, desktopId, label]) => {
      const open = window[openName], close = window[closeName];
      if (!open || !close) return;
      const getDialog = () => document.getElementById(desktopId) || document.getElementById(
        desktopId === 'editorial-progress-modal' ? 'm-editorial-progress-modal' : 'm-' + desktopId);
      const existing = getDialog();
      if (existing) { existing.inert = true; existing.setAttribute('aria-hidden', 'true'); }
      window[openName] = function (...args) {
        const trigger = document.activeElement;
        const result = open.apply(this, args);
        openFocus(getDialog(), trigger, () => window[closeName](), label);
        return result;
      };
      window[closeName] = function (...args) {
        const result = close.apply(this, args);
        closeFocus(getDialog());
        return result;
      };
    });
    document.addEventListener('keydown', event => {
      if (!active) {
        if (!drawer || drawer.inert) return;
        const hamburger = document.getElementById('hamburger');
        if (event.key === 'Escape') {
          event.preventDefault(); event.stopImmediatePropagation();
          window.toggleMenu(true); hamburger.focus(); return;
        }
        if (event.key === 'Tab') {
          const items = [hamburger, ...focusable(drawer)];
          if (event.shiftKey && document.activeElement === items[0]) {
            event.preventDefault(); items.at(-1).focus();
          } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
            event.preventDefault(); items[0].focus();
          }
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation(); active.close(); return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable(active.dialog), first = items[0], last = items.at(-1);
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !active.dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !active.dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }, true);
    const drawer = document.getElementById('nav-menu');
    if (drawer) {
      drawer.inert = !drawer.classList.contains('open');
      new MutationObserver(() => {
        drawer.inert = !drawer.classList.contains('open');
        if (!drawer.inert) drawer.querySelector('a')?.focus({ preventScroll: true });
      }).observe(drawer, { attributes: true, attributeFilter: ['class'] });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
