(() => {
  const mobile = new URLSearchParams(location.search).get('from') === 'mobile' || innerWidth <= 768;
  document.querySelectorAll('[data-portfolio-back]').forEach(link => { link.href = (mobile ? 'mobile' : 'index') + '.html#proyectos-uxui'; });
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    reveal.unobserve(entry.target);
  }), { threshold:.08 });
  document.querySelectorAll('[data-reveal]').forEach(node => reveal.observe(node));
})();
