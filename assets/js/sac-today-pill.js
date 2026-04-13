(() => {
  const renderTodayText = () => {
    const now = new Date();
    const weekday = new Intl.DateTimeFormat('ca-ES', { weekday: 'long' }).format(now);
    const date = new Intl.DateTimeFormat('ca-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(now);
    const normalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `Avui: ${normalizedWeekday}, ${date}`;
  };

  const mount = () => {
    if (document.querySelector('[data-today-indicator]')) return;

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-today-indicator', '');
    wrapper.className = 'fixed top-3 right-3 sm:top-4 sm:right-4 z-50 pointer-events-none';

    const badge = document.createElement('div');
    badge.className = 'py-1.5 px-3 rounded-full bg-layer border border-layer-line text-[12px] font-medium text-layer-foreground shadow-xs';
    badge.textContent = renderTodayText();

    wrapper.appendChild(badge);
    document.body.appendChild(wrapper);

    window.setInterval(() => {
      badge.textContent = renderTodayText();
    }, 60 * 1000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
