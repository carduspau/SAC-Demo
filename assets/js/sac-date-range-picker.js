(function () {
  const MONTH_NAMES = [
    'Gener',
    'Febrer',
    'Març',
    'Abril',
    'Maig',
    'Juny',
    'Juliol',
    'Agost',
    'Setembre',
    'Octubre',
    'Novembre',
    'Desembre',
  ];

  const SHARED_SELECT_CONFIG = {
    placeholder: 'Select',
    toggleTag: '<button type="button" aria-expanded="false"></button>',
    toggleClasses:
      'hs-select-disabled:pointer-events-none hs-select-disabled:opacity-50 relative flex text-nowrap w-full cursor-pointer text-start font-medium text-foreground hover:text-primary-hover focus:outline-hidden focus:text-primary-focus before:absolute before:inset-0 before:z-1',
    dropdownClasses:
      'mt-2 z-50 max-h-72 p-1 space-y-0.5 overflow-hidden overflow-y-auto bg-select border border-layer-line rounded-xl shadow-xl [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-track]:bg-scrollbar-track [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
    optionClasses:
      'p-2 w-full text-sm text-select-item-foreground cursor-pointer hover:bg-select-item-hover rounded-md focus:outline-hidden focus:bg-select-item-focus',
    optionTemplate:
      '<div class="flex justify-between items-center w-full"><span data-title></span><span class="hidden hs-selected:block"><svg class="shrink-0 size-3.5 text-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span></div>',
  };

  const MONTH_SELECT_CONFIG = {
    ...SHARED_SELECT_CONFIG,
    placeholder: 'Selecciona mes',
    dropdownClasses: `${SHARED_SELECT_CONFIG.dropdownClasses} w-32`,
  };

  const YEAR_SELECT_CONFIG = {
    ...SHARED_SELECT_CONFIG,
    placeholder: 'Selecciona any',
    dropdownClasses: `${SHARED_SELECT_CONFIG.dropdownClasses} w-20`,
  };

  const DAY_LABELS = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];
  let TODAY = startOfDay(new Date());
  let DATASET_MIN_DATE = null;
  let DATASET_MAX_DATE = null;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  function addDays(date, days) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return startOfDay(next);
  }

  function addMonths(date, months) {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
  }

  function isValidDate(date) {
    return date instanceof Date && Number.isFinite(date.getTime());
  }

  function getLimitMinDate() {
    return DATASET_MIN_DATE;
  }

  function getLimitMaxDate() {
    return DATASET_MAX_DATE;
  }

  function isWithinDatasetRange(date) {
    if (!isValidDate(date)) return false;
    const time = startOfDay(date).getTime();
    const min = getLimitMinDate();
    const max = getLimitMaxDate();

    if (isValidDate(min) && time < min.getTime()) return false;
    if (isValidDate(max) && time > max.getTime()) return false;
    return true;
  }

  function clampDateToDatasetRange(date) {
    if (!isValidDate(date)) return null;
    const safeDate = startOfDay(date);
    const min = getLimitMinDate();
    const max = getLimitMaxDate();

    if (isValidDate(min) && safeDate.getTime() < min.getTime()) return min;
    if (isValidDate(max) && safeDate.getTime() > max.getTime()) return max;
    return safeDate;
  }

  function clampRangeToDatasetRange(start, end) {
    const safeStart = clampDateToDatasetRange(start) || TODAY;
    const safeEnd = clampDateToDatasetRange(end || start) || safeStart;

    if (safeStart.getTime() <= safeEnd.getTime()) {
      return { start: safeStart, end: safeEnd };
    }

    return { start: safeEnd, end: safeStart };
  }

  function toIsoDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function fromIsoDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function parseIsoDateSafe(value) {
    if (!value) return null;
    const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!isValidDate(parsed)) return null;
    if (toIsoDate(parsed) !== `${match[1]}-${match[2]}-${match[3]}`) return null;
    return startOfDay(parsed);
  }

  function isSameDate(left, right) {
    return !!left && !!right && toIsoDate(left) === toIsoDate(right);
  }

  function isBetween(date, start, end) {
    const time = startOfDay(date).getTime();
    return time >= startOfDay(start).getTime() && time <= startOfDay(end).getTime();
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat('ca-ES', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  function formatRangeLabel(start, end) {
    if (isSameDate(start, end) && isSameDate(start, TODAY)) return 'Avui';
    if (isSameDate(start, end)) return formatShortDate(start);
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  }

  function matchesRelativeRange(start, end, relativeStart, relativeEnd) {
    return isSameDate(start, relativeStart) && isSameDate(end, relativeEnd);
  }

  function closeDropdown(dropdown, fallbackButton) {
    const instance = window.HSDropdown && window.HSDropdown.getInstance(dropdown, true);

    if (instance && instance.element) {
      instance.element.close();
      return;
    }

    if (fallbackButton) fallbackButton.click();
  }

  function emitDateRangeChanged(button, startDate, endDate) {
    if (!button || !startDate || !endDate) return;
    document.dispatchEvent(new CustomEvent('sac:date-range-changed', {
      detail: {
        start: toIsoDate(startDate),
        end: toIsoDate(endDate),
        triggerId: button.id || '',
      },
    }));
  }

  function inferStateFromLabel(label) {
    const normalized = label.replace(/\s+/g, ' ').trim();
    const lowerLabel = normalized.toLowerCase();
    const hasDurationPrefix = lowerLabel.startsWith('duration:') || lowerLabel.startsWith('període:') || lowerLabel.startsWith('periode:');
    const prefixMatch = normalized.match(/^(duration:|període:|periode:)\s*/i);
    const baseLabel = hasDurationPrefix ? normalized.slice(prefixMatch[0].length).trim() : normalized;
    const prefix = hasDurationPrefix ? 'Període: ' : '';

    if (/^(last 24 hours|últimes 24 hores|ultimes 24 hores)$/i.test(baseLabel)) {
      return {
        prefix,
        preset: 'last24hours',
        start: addDays(TODAY, -1),
        end: TODAY,
      };
    }

    if (/^(today|avui)$/i.test(baseLabel)) {
      return {
        prefix,
        preset: 'today',
        start: TODAY,
        end: TODAY,
      };
    }

    return {
      prefix,
      preset: 'last30days',
      start: addDays(TODAY, -29),
      end: TODAY,
    };
  }

  function computeViewStart(start, end) {
    if (!start) return startOfMonth(getLimitMaxDate() || TODAY);

    const startMonth = startOfMonth(start);
    const endMonth = end ? startOfMonth(end) : startMonth;

    return startMonth.getTime() === endMonth.getTime() ? addMonths(startMonth, -1) : startMonth;
  }

  function getMonthGrid(monthDate) {
    const firstDay = startOfMonth(monthDate);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    const gridStart = addDays(firstDay, -firstDayOfWeek);
    const days = [];

    for (let index = 0; index < 42; index += 1) {
      days.push(addDays(gridStart, index));
    }

    return days;
  }

  function buildMonthSelectOptions(selectedMonth) {
    return MONTH_NAMES.map((month, index) => {
      const selected = index === selectedMonth ? ' selected' : '';
      return `<option value="${index}"${selected}>${month}</option>`;
    }).join('');
  }

  function buildYearSelectOptions(selectedYear) {
    const currentYear = TODAY.getFullYear();
    const minYear = isValidDate(getLimitMinDate()) ? getLimitMinDate().getFullYear() : currentYear - 15;
    const maxYear = isValidDate(getLimitMaxDate()) ? getLimitMaxDate().getFullYear() : currentYear + 5;
    const years = [];

    for (let year = minYear; year <= maxYear; year += 1) {
      const selected = year === selectedYear ? ' selected' : '';
      years.push(`<option value="${year}"${selected}>${year}</option>`);
    }

    return years.join('');
  }

  function getDayCellMarkup(date, monthDate, state) {
    const inCurrentMonth = date.getMonth() === monthDate.getMonth();
    const inDatasetRange = isWithinDatasetRange(date);
    const selectable = inCurrentMonth && inDatasetRange;
    const draftEnd = state.draftEnd || state.draftStart;
    const isSelectedStart = state.draftStart && isSameDate(date, state.draftStart);
    const isSelectedEnd = state.draftEnd && isSameDate(date, state.draftEnd);
    const isSingleSelection = state.draftStart && !state.draftEnd && isSameDate(date, state.draftStart);
    const isInRange = state.draftStart && draftEnd && isBetween(date, state.draftStart, draftEnd);

    let wrapperClasses = '';

    if (isSelectedStart && isSelectedEnd) wrapperClasses = 'bg-surface rounded-full';
    else if (isSingleSelection) wrapperClasses = 'bg-surface rounded-full';
    else if (isSelectedStart) wrapperClasses = 'bg-surface rounded-s-full';
    else if (isSelectedEnd) wrapperClasses = 'bg-surface rounded-e-full';
    else if (isInRange) wrapperClasses = 'bg-surface first:rounded-s-full last:rounded-e-full';

    const baseButtonClasses = inCurrentMonth
      ? 'm-px size-10 flex justify-center items-center border-[1.5px] border-transparent text-sm text-foreground rounded-full hover:border-primary-hover hover:text-primary-hover disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:border-primary-focus focus:text-primary-focus'
      : 'm-px size-10 flex justify-center items-center border-[1.5px] border-transparent text-sm text-foreground rounded-full hover:border-primary-hover hover:text-primary-hover disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-surface-focus';

    const selectedClasses =
      'm-px size-10 flex justify-center items-center bg-primary border-[1.5px] border-transparent text-sm font-medium text-primary-foreground hover:border-primary-hover rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-surface-focus';

    const buttonClasses = isSelectedStart || isSelectedEnd || isSingleSelection ? selectedClasses : baseButtonClasses;
    const disabledAttr = selectable ? '' : ' disabled';
    const dataAttr = selectable ? ` data-sac-date="${toIsoDate(date)}"` : '';

    return `
      <div${wrapperClasses ? ` class="${wrapperClasses}"` : ''}>
        <button type="button" class="${buttonClasses}"${dataAttr}${disabledAttr}>
          ${date.getDate()}
        </button>
      </div>
    `;
  }

  function buildMonthMarkup(monthDate, index, state) {
    const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
    const weeks = [];
    const days = getMonthGrid(monthDate);

    for (let row = 0; row < 6; row += 1) {
      const cells = days
        .slice(row * 7, row * 7 + 7)
        .map((day) => getDayCellMarkup(day, monthDate, state))
        .join('');

      weeks.push(`
        <div class="flex">
          ${cells}
        </div>
      `);
    }

    const prevButtonMarkup =
      index === 0
        ? `
          <button type="button" data-sac-nav="prev" class="size-8 flex justify-center items-center text-foreground hover:bg-muted-hover rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-muted-focus" aria-label="Previous">
            <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        `
        : `
          <button type="button" class="opacity-0 pointer-events-none size-8 flex justify-center items-center text-foreground rounded-full" aria-hidden="true" tabindex="-1">
            <svg class="shrink-0 size-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        `;

    const nextButtonMarkup =
      index === 1
        ? `
          <button type="button" data-sac-nav="next" class="size-8 flex justify-center items-center text-foreground hover:bg-muted-hover rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-muted-focus" aria-label="Next">
            <svg class="shrink-0 size-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        `
        : `
          <button type="button" class="opacity-0 pointer-events-none size-8 flex justify-center items-center text-foreground rounded-full" aria-hidden="true" tabindex="-1">
            <svg class="shrink-0 size-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        `;

    return `
      <div class="p-3 space-y-0.5" data-sac-month-panel="${monthKey}">
        <div class="grid grid-cols-5 items-center gap-x-3 mx-1.5 pb-3">
          <div class="col-span-1">
            ${prevButtonMarkup}
          </div>

          <div class="col-span-3 flex justify-center items-center gap-x-1">
            <div class="relative">
              <select class="hidden" data-sac-month-select="${index}">${buildMonthSelectOptions(monthDate.getMonth())}</select>
            </div>

            <span class="text-foreground">/</span>

            <div class="relative">
              <select class="hidden" data-sac-year-select="${index}">${buildYearSelectOptions(monthDate.getFullYear())}</select>
            </div>
          </div>

          <div class="col-span-1 flex justify-end">
            ${nextButtonMarkup}
          </div>
        </div>

        <div class="flex pb-1.5">
          ${DAY_LABELS.map((label) => `<span class="m-px w-10 block text-center text-sm text-muted-foreground-1">${label}</span>`).join('')}
        </div>

        ${weeks.join('')}
      </div>
    `;
  }

  function formatAppliedLabel(state, start, end) {
    if (state.preset === 'today' && matchesRelativeRange(start, end, TODAY, TODAY)) {
      return `${state.prefix}Avui`.trim();
    }

    if (matchesRelativeRange(start, end, addDays(TODAY, -6), TODAY)) {
      return `${state.prefix}Últims 7 dies`.trim();
    }

    if (state.preset === 'last24hours' && matchesRelativeRange(start, end, addDays(TODAY, -1), TODAY)) {
      return `${state.prefix}Últimes 24 hores`.trim();
    }

    if (matchesRelativeRange(start, end, addDays(TODAY, -29), TODAY)) {
      return `${state.prefix}Últims 30 dies`.trim();
    }

    return `${state.prefix}${formatRangeLabel(start, end)}`.trim();
  }

  function applyRange(state) {
    const start = state.draftStart || state.appliedStart || TODAY;
    const end = state.draftEnd || state.draftStart || state.appliedEnd || start;
    const normalizedRange = clampRangeToDatasetRange(start, end);

    state.appliedStart = normalizedRange.start;
    state.appliedEnd = normalizedRange.end;
    state.draftStart = state.appliedStart;
    state.draftEnd = state.appliedEnd;
    state.viewStart = computeViewStart(state.appliedStart, state.appliedEnd);
    state.label.textContent = formatAppliedLabel(state, state.appliedStart, state.appliedEnd);
    state.button.dataset.sacDateStart = toIsoDate(state.appliedStart);
    state.button.dataset.sacDateEnd = toIsoDate(state.appliedEnd);
    emitDateRangeChanged(state.button, state.appliedStart, state.appliedEnd);

    closeDropdown(state.dropdown, state.button);
  }

  function setQuickRange(state, preset) {
    const maxDate = clampDateToDatasetRange(TODAY) || TODAY;

    if (preset === 'today') {
      state.preset = 'today';
      state.draftStart = maxDate;
      state.draftEnd = maxDate;
    } else if (preset === 'last7days') {
      state.preset = 'last7days';
      state.draftStart = addDays(maxDate, -6);
      state.draftEnd = maxDate;
    } else {
      state.preset = 'last30days';
      state.draftStart = addDays(maxDate, -29);
      state.draftEnd = maxDate;
    }

    const normalizedRange = clampRangeToDatasetRange(state.draftStart, state.draftEnd);
    state.draftStart = normalizedRange.start;
    state.draftEnd = normalizedRange.end;

    state.viewStart = computeViewStart(state.draftStart, state.draftEnd);
    render(state);
  }

  function cancelRange(state) {
    state.draftStart = state.appliedStart;
    state.draftEnd = state.appliedEnd;
    state.viewStart = computeViewStart(state.appliedStart, state.appliedEnd);
    render(state);
    closeDropdown(state.dropdown, state.button);
  }

  function syncCustomSelects(state) {
    if (!window.HSSelect) return;

    state.menu.querySelectorAll('[data-sac-month-select], [data-sac-year-select]').forEach((select) => {
      select.setAttribute(
        'data-hs-select',
        JSON.stringify(select.hasAttribute('data-sac-month-select') ? MONTH_SELECT_CONFIG : YEAR_SELECT_CONFIG),
      );
    });

    window.HSSelect.autoInit();

    state.menu.querySelectorAll('[data-sac-month-select], [data-sac-year-select]').forEach((select) => {
      const instance = window.HSSelect.getInstance(select, true);

      if (instance && instance.element) {
        instance.element.setValue(select.value);
      }
    });
  }

  function bindEvents(state) {
    state.menu.querySelector('[data-sac-nav="prev"]')?.addEventListener('click', () => {
      state.viewStart = addMonths(state.viewStart, -1);
      render(state);
    });

    state.menu.querySelector('[data-sac-nav="next"]')?.addEventListener('click', () => {
      state.viewStart = addMonths(state.viewStart, 1);
      render(state);
    });

    state.menu.querySelectorAll('[data-sac-month-select]').forEach((select) => {
      select.addEventListener('change', (event) => {
        const monthIndex = Number(event.target.getAttribute('data-sac-month-select'));
        const baseDate = monthIndex === 0 ? state.viewStart : addMonths(state.viewStart, 1);
        const updated = new Date(baseDate.getFullYear(), Number(event.target.value), 1);

        state.viewStart = monthIndex === 0 ? updated : addMonths(updated, -1);
        render(state);
      });
    });

    state.menu.querySelectorAll('[data-sac-year-select]').forEach((select) => {
      select.addEventListener('change', (event) => {
        const monthIndex = Number(event.target.getAttribute('data-sac-year-select'));
        const baseDate = monthIndex === 0 ? state.viewStart : addMonths(state.viewStart, 1);
        const updated = new Date(Number(event.target.value), baseDate.getMonth(), 1);

        state.viewStart = monthIndex === 0 ? updated : addMonths(updated, -1);
        render(state);
      });
    });

    state.menu.querySelectorAll('[data-sac-date]').forEach((button) => {
      button.addEventListener('click', () => {
        const clickedDate = fromIsoDate(button.getAttribute('data-sac-date'));

        if (!state.draftStart || state.draftEnd) {
          state.draftStart = clickedDate;
          state.draftEnd = null;
        } else if (clickedDate.getTime() < state.draftStart.getTime()) {
          state.draftEnd = state.draftStart;
          state.draftStart = clickedDate;
        } else if (isSameDate(clickedDate, state.draftStart)) {
          state.draftEnd = clickedDate;
        } else {
          state.draftEnd = clickedDate;
        }

        render(state);
      });
    });

    state.menu.querySelector('[data-sac-action="cancel"]')?.addEventListener('click', () => {
      cancelRange(state);
    });

    state.menu.querySelector('[data-sac-action="apply"]')?.addEventListener('click', () => {
      applyRange(state);
    });

    state.menu.querySelectorAll('[data-sac-quick-range]').forEach((button) => {
      button.addEventListener('click', () => {
        setQuickRange(state, button.getAttribute('data-sac-quick-range'));
      });
    });
  }

  function render(state) {
    const secondMonth = addMonths(state.viewStart, 1);

    state.menu.classList.add('sm:w-159');
    state.menu.innerHTML = `
      <div class="sm:flex">
        ${buildMonthMarkup(state.viewStart, 0, state)}
        ${buildMonthMarkup(secondMonth, 1, state)}
      </div>
      <div class="flex flex-col gap-3 py-3 px-4 border-t border-dropdown-divider sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" data-sac-quick-range="today" class="py-1.5 px-2.5 inline-flex items-center gap-x-2 text-xs font-medium rounded-lg bg-layer border border-layer-line text-foreground shadow-2xs hover:bg-layer-hover disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-layer-focus">
            Avui
          </button>
          <button type="button" data-sac-quick-range="last7days" class="py-1.5 px-2.5 inline-flex items-center gap-x-2 text-xs font-medium rounded-lg bg-layer border border-layer-line text-foreground shadow-2xs hover:bg-layer-hover disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-layer-focus">
            Últims 7 dies
          </button>
          <button type="button" data-sac-quick-range="last30days" class="py-1.5 px-2.5 inline-flex items-center gap-x-2 text-xs font-medium rounded-lg bg-layer border border-layer-line text-foreground shadow-2xs hover:bg-layer-hover disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-layer-focus">
            Últims 30 dies
          </button>
        </div>
        <div class="flex items-center justify-end gap-x-2">
          <button type="button" data-sac-action="cancel" class="py-2 px-3 inline-flex items-center gap-x-2 text-xs font-medium rounded-lg bg-layer border border-layer-line text-foreground shadow-2xs hover:bg-layer-hover disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-layer-focus">
            Cancel·la
          </button>
          <button type="button" data-sac-action="apply" class="py-2 px-3 inline-flex justify-center items-center gap-x-2 text-xs font-medium rounded-lg border-[1.5px] border-transparent bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:border-primary-focus focus:ring-1 focus:ring-primary-focus">
            Aplica
          </button>
        </div>
      </div>
    `;

    syncCustomSelects(state);
    bindEvents(state);
  }

  function extractLabelText(button) {
    return Array.from(button.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  function ensureLabelSpan(button) {
    let label = button.querySelector('[data-sac-date-label]');

    if (label) return label;

    const text = extractLabelText(button);
    const trailingIcon = button.querySelector('svg:last-of-type');

    Array.from(button.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.remove();
    });

    label = document.createElement('span');
    label.dataset.sacDateLabel = '';
    label.textContent = text;

    if (trailingIcon) button.insertBefore(label, trailingIcon);
    else button.appendChild(label);

    return label;
  }

  function initDateDropdown(button) {
    const dropdown = button.closest('.hs-dropdown');
    const menu = dropdown && dropdown.querySelector('.hs-dropdown-menu');

    if (!dropdown || !menu) return;
    if (button.dataset.sacDateReady === 'true') return;

    dropdown.classList.remove('[--auto-close:inside]');
    dropdown.classList.add('[--auto-close:outside]');

    const label = ensureLabelSpan(button);
    const config = inferStateFromLabel(label.textContent);
    const normalizedRange = clampRangeToDatasetRange(config.start, config.end);
    const state = {
      button,
      dropdown,
      menu,
      label,
      preset: config.preset,
      prefix: config.prefix,
      appliedStart: normalizedRange.start,
      appliedEnd: normalizedRange.end,
      draftStart: normalizedRange.start,
      draftEnd: normalizedRange.end,
      viewStart: computeViewStart(normalizedRange.start, normalizedRange.end),
    };

    button.dataset.sacDateReady = 'true';
    button.dataset.sacDateStart = toIsoDate(state.appliedStart);
    button.dataset.sacDateEnd = toIsoDate(state.appliedEnd);
    state.label.textContent = formatAppliedLabel(state, state.appliedStart, state.appliedEnd);
    emitDateRangeChanged(button, state.appliedStart, state.appliedEnd);

    button.addEventListener('click', () => {
      state.draftStart = state.appliedStart;
      state.draftEnd = state.appliedEnd;
      state.viewStart = computeViewStart(state.appliedStart, state.appliedEnd);

      window.requestAnimationFrame(() => {
        render(state);
      });
    });

    render(state);
  }

  function getFallbackBoundsFromButtons() {
    let minDate = null;
    let maxDate = null;

    document.querySelectorAll('button#hs-pro-dnic').forEach((button) => {
      const buttonMin = parseIsoDateSafe(button.dataset.sacDateMin);
      const buttonMax = parseIsoDateSafe(button.dataset.sacDateMax);

      if (isValidDate(buttonMin) && (!isValidDate(minDate) || buttonMin.getTime() < minDate.getTime())) {
        minDate = buttonMin;
      }

      if (isValidDate(buttonMax) && (!isValidDate(maxDate) || buttonMax.getTime() > maxDate.getTime())) {
        maxDate = buttonMax;
      }
    });

    return { minDate, maxDate };
  }

  function configureDatasetDateBounds() {
    const fallback = getFallbackBoundsFromButtons();
    DATASET_MIN_DATE = isValidDate(fallback.minDate) ? fallback.minDate : null;
    DATASET_MAX_DATE = isValidDate(fallback.maxDate) ? fallback.maxDate : null;

    if (!window.SACDataset || typeof window.SACDataset.load !== 'function') return Promise.resolve();

    return window.SACDataset.load()
      .then((dataset) => {
        const minDate = dataset && dataset.metadata ? dataset.metadata.minDate : null;
        const maxDate = dataset && dataset.metadata ? dataset.metadata.maxDate : null;

        if (isValidDate(minDate)) DATASET_MIN_DATE = startOfDay(minDate);
        if (isValidDate(maxDate)) DATASET_MAX_DATE = startOfDay(maxDate);

      })
      .catch(() => {
        // Keep fallback bounds if dataset load fails.
      });
  }

  function init() {
    document.querySelectorAll('button#hs-pro-dnic').forEach(initDateDropdown);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      configureDatasetDateBounds().finally(init);
    });
  } else {
    configureDatasetDateBounds().finally(init);
  }
})();
