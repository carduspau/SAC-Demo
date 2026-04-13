(function () {
  function ensureStyles() {
    if (document.getElementById('sac-refresh-button-styles')) return;

    const style = document.createElement('style');
    style.id = 'sac-refresh-button-styles';
    style.textContent = `
      @keyframes sac-refresh-spin-once {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      [data-refresh-icon].is-spinning-once {
        animation: sac-refresh-spin-once 0.55s ease-in-out;
        transform-origin: center;
      }
    `;

    document.head.appendChild(style);
  }

  function init() {
    ensureStyles();

    document.querySelectorAll('[data-refresh-button]').forEach((button) => {
      if (button.dataset.sacRefreshReady === 'true') return;

      const icon = button.querySelector('[data-refresh-icon]');
      if (!icon) return;

      button.dataset.sacRefreshReady = 'true';

      button.addEventListener('click', () => {
        icon.classList.remove('is-spinning-once');
        void icon.offsetWidth;
        icon.classList.add('is-spinning-once');
      });

      icon.addEventListener('animationend', () => {
        icon.classList.remove('is-spinning-once');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
