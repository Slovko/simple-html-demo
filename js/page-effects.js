(() => {
  const root = document.documentElement;
  const progress = document.createElement('div');
  progress.id = 'reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const amount = scrollable > 0 ? window.scrollY / scrollable : 0;
    root.style.setProperty('--reading-progress', String(Math.min(1, Math.max(0, amount))));
  };

  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });

  const revealTargets = document.querySelectorAll('main > section, main .panel, main .content-card, footer');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealTargets.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  root.classList.add('motion-ready');
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });

  revealTargets.forEach((element) => {
    element.dataset.reveal = '';
    observer.observe(element);
  });
})();
