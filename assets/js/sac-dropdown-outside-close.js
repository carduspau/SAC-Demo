(() => {
  function closeDropdown(dropdown) {
    if (!dropdown) return;

    const instance = window.HSDropdown && window.HSDropdown.getInstance(dropdown, true);
    if (instance && instance.element && typeof instance.element.close === 'function') {
      instance.element.close();
      return;
    }

    const toggle = dropdown.querySelector('.hs-dropdown-toggle, [aria-haspopup="menu"]');
    const menu = dropdown.querySelector('.hs-dropdown-menu');

    if (menu) {
      menu.classList.add('hidden');
      menu.classList.remove('opacity-100');
    }

    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function resolveActiveDropdown(target) {
    if (!(target instanceof Element)) return null;

    const directDropdown = target.closest('.hs-dropdown');
    if (directDropdown) return directDropdown;

    const menu = target.closest('.hs-dropdown-menu');
    if (!menu) return null;

    const labelledBy = menu.getAttribute('aria-labelledby');
    if (!labelledBy) return null;

    const toggle = document.getElementById(labelledBy);
    return toggle ? toggle.closest('.hs-dropdown') : null;
  }

  function onDocumentPointerDown(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const activeDropdown = resolveActiveDropdown(target);
    const dropdowns = document.querySelectorAll('.hs-dropdown');

    dropdowns.forEach((dropdown) => {
      if (dropdown === activeDropdown || dropdown.contains(target)) return;
      closeDropdown(dropdown);
    });
  }

  document.addEventListener('pointerdown', onDocumentPointerDown, { passive: true });
})();
