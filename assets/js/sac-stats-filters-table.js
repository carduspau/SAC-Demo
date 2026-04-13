(function () {
  var filterGroups = Array.from(document.querySelectorAll('[data-filter-dropdown]'));
  if (!filterGroups.length || !window.SACDataset || typeof window.SACDataset.load !== 'function') return;

  var tableBody = document.getElementById('stats-open-text-body');
  var resultsCount = document.getElementById('stats-open-text-results');
  var responsesCount = document.getElementById('stats-open-text-responses');
  var pageIndicator = document.getElementById('stats-open-text-page');
  var totalPagesIndicator = document.getElementById('stats-open-text-total-pages');
  var prevButton = document.getElementById('stats-open-text-prev');
  var nextButton = document.getElementById('stats-open-text-next');
  var applyButton = document.querySelector('[data-filter-apply]');

  if (!tableBody || !resultsCount || !pageIndicator || !totalPagesIndicator || !prevButton || !nextButton || !applyButton) return;

  var PAGE_SIZE = 4;
  var PREVIEW_MAX_CHARS = 25;
  var currentPage = 1;
  var currentRows = [];
  var latestDate = null;
  var filterState = {
    barri: [],
    sentiment: [],
    canal: [],
    classificacio: []
  };
  var filterConfigByKey = {};
  var allMessages = [];

  function normalizeSpaces(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function parseIsoDate(value) {
    if (!value) return null;
    if (window.SACDataset && typeof window.SACDataset.parseIsoDate === 'function') {
      var parsedByStore = window.SACDataset.parseIsoDate(value);
      if (parsedByStore instanceof Date && isFinite(parsedByStore.getTime())) return parsedByStore;
    }

    var match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    var parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return isFinite(parsed.getTime()) ? parsed : null;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function endOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  function getActiveDateRange() {
    var button = document.querySelector('button#hs-pro-dnic');
    if (!button) return { start: null, end: null };
    var start = parseIsoDate(button.dataset.sacDateStart);
    var end = parseIsoDate(button.dataset.sacDateEnd);

    start = start ? startOfDay(start) : null;
    end = end ? endOfDay(end) : null;

    if (start && end && start.getTime() > end.getTime()) {
      var prev = start;
      start = startOfDay(end);
      end = endOfDay(prev);
    }

    return { start: start, end: end };
  }

  function isInDateRange(message, range) {
    if (!range || (!range.start && !range.end)) return true;
    if (!(message.createdAt instanceof Date) || !isFinite(message.createdAt.getTime())) return false;
    var time = message.createdAt.getTime();
    if (range.start && time < range.start.getTime()) return false;
    if (range.end && time > range.end.getTime()) return false;
    return true;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function truncatePreview(text) {
    var normalized = normalizeSpaces(text);
    if (normalized.length <= PREVIEW_MAX_CHARS) return normalized;
    return normalized.slice(0, PREVIEW_MAX_CHARS).trimEnd() + '...';
  }

  function getRelativeTime(date) {
    if (!(date instanceof Date) || !isFinite(date.getTime())) return '';

    var reference = latestDate instanceof Date && isFinite(latestDate.getTime()) ? latestDate : new Date();
    var diffMs = Math.max(0, reference.getTime() - date.getTime());
    var minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return 'fa uns segons';
    if (minutes < 60) return 'fa ' + minutes + ' min';

    var hours = Math.floor(minutes / 60);
    if (hours < 24) return 'fa ' + hours + ' h';

    var days = Math.floor(hours / 24);
    return 'fa ' + days + ' dies';
  }

  function iconSvg(type) {
    if (type === 'barri') {
      return '<svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>';
    }
    if (type === 'sentiment') {
      return '<svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/></svg>';
    }
    if (type === 'canal') {
      return '<svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75"/></svg>';
    }
    return '<svg class="shrink-0 size-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z"/></svg>';
  }

  function tagItem(type, text) {
    return '' +
      '<span class="inline-flex items-center gap-x-1.5 min-w-0 text-xs text-muted-foreground-1">' +
      iconSvg(type) +
      '<span class="truncate">' + escapeHtml(text) + '</span>' +
      '</span>';
  }

  function createOptionButton(label) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'w-full text-start py-2 px-2.5 text-sm text-select-item-foreground hover:bg-select-item-hover rounded-lg';
    button.setAttribute('data-filter-option', '');
    button.textContent = label;
    return button;
  }

  function setupFilters(optionsByKey) {
    filterGroups.forEach(function (group, index) {
      var key = group.dataset.filterKey || ('filter_' + index);
      var valueTarget = group.querySelector('[data-filter-value]');
      var menu = group.querySelector('.hs-dropdown-menu');
      if (!valueTarget || !menu) return;

      var defaultLabel = (key === 'classificacio') ? 'Totes' : 'Tots';
      var labels = [defaultLabel].concat(optionsByKey[key] || []);
      var selected = new Set([defaultLabel]);

      menu.innerHTML = '';
      labels.forEach(function (label) {
        menu.appendChild(createOptionButton(label));
      });

      var options = Array.from(menu.querySelectorAll('[data-filter-option]'));

      function getAppliedValues() {
        return labels.filter(function (label, optionIndex) {
          return optionIndex > 0 && selected.has(label);
        });
      }

      function syncPreview() {
        var selectedNonDefault = getAppliedValues();
        var fullPreview = selectedNonDefault.length ? selectedNonDefault.join(', ') : defaultLabel;
        valueTarget.textContent = truncatePreview(fullPreview);
        valueTarget.title = fullPreview;
      }

      function syncOptionStyles() {
        options.forEach(function (option) {
          var label = normalizeSpaces(option.textContent);
          var isActive = selected.has(label);
          option.classList.toggle('bg-select-item-active', isActive);
          option.classList.toggle('font-medium', isActive);
          option.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      }

      options.forEach(function (option) {
        option.addEventListener('click', function () {
          var optionLabel = normalizeSpaces(option.textContent);

          if (optionLabel === defaultLabel) {
            selected.clear();
            selected.add(defaultLabel);
          } else {
            if (selected.has(optionLabel)) selected.delete(optionLabel);
            else selected.add(optionLabel);

            selected.delete(defaultLabel);
            if (!selected.size) selected.add(defaultLabel);
          }

          filterState[key] = getAppliedValues();
          syncOptionStyles();
          syncPreview();
        });
      });

      filterState[key] = [];
      syncOptionStyles();
      syncPreview();
      filterConfigByKey[key] = {
        labels: labels,
        defaultLabel: defaultLabel
      };
    });
  }

  function renderTableRows(rows) {
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="3" class="px-4 py-6 text-sm text-muted-foreground-1">No hi ha missatges per als filtres seleccionats.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map(function (message) {
      return '' +
        '<tr style="height:78px">' +
        '  <td class="size-px align-top pe-4 py-2">' +
        '    <span class="text-xs leading-4 text-muted-foreground-2 block" style="display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:5;overflow:hidden;">' + escapeHtml(message.message) + '</span>' +
        '  </td>' +
        '  <td class="size-px align-top px-4 py-2">' +
        '    <div class="grid grid-cols-1 gap-y-1.5 min-w-0">' +
        tagItem('canal', message.channel) +
        tagItem('classificacio', message.typeLabel) +
        tagItem('sentiment', message.sentimentLabel) +
        tagItem('barri', message.neighborhood) +
        '    </div>' +
        '  </td>' +
        '  <td class="size-px whitespace-nowrap align-top px-4 py-2">' +
        '    <span class="text-xs text-muted-foreground-1">' + escapeHtml(getRelativeTime(message.createdAt)) + '</span>' +
        '  </td>' +
        '</tr>';
    }).join('');
  }

  function updatePagination() {
    var totalPages = Math.max(1, Math.ceil(currentRows.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);
    var start = (currentPage - 1) * PAGE_SIZE;
    var end = start + PAGE_SIZE;

    renderTableRows(currentRows.slice(start, end));

    resultsCount.textContent = String(currentRows.length);
    if (responsesCount) responsesCount.textContent = String(currentRows.length);
    pageIndicator.textContent = String(currentPage);
    totalPagesIndicator.textContent = String(totalPages);

    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
  }

  function hasSelectedValue(selectedValues, value) {
    if (!Array.isArray(selectedValues) || !selectedValues.length) return true;
    return selectedValues.indexOf(value) !== -1;
  }

  function applyFilters() {
    var activeRange = getActiveDateRange();
    currentRows = allMessages
      .filter(function (message) { return isInDateRange(message, activeRange); })
      .filter(function (message) { return hasSelectedValue(filterState.barri, message.neighborhood); })
      .filter(function (message) { return hasSelectedValue(filterState.sentiment, message.sentimentLabel); })
      .filter(function (message) { return hasSelectedValue(filterState.canal, message.channel); })
      .filter(function (message) { return hasSelectedValue(filterState.classificacio, message.typeLabel); })
      .sort(function (a, b) {
        var aTime = a.createdAt ? a.createdAt.getTime() : 0;
        var bTime = b.createdAt ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });

    if (currentRows.length) {
      latestDate = currentRows[0].createdAt;
    } else if (activeRange.end) {
      latestDate = activeRange.end;
    }

    currentPage = 1;
    updatePagination();

    window.__SAC_STATS_VISIBLE_ROWS = currentRows.slice();

    document.dispatchEvent(new CustomEvent('stats:visible-messages-changed', {
      detail: {
        rows: currentRows.slice()
      }
    }));

    document.dispatchEvent(new CustomEvent('stats:filters-changed', {
      detail: {
        barri: filterState.barri || [],
        sentiment: filterState.sentiment || [],
        canal: filterState.canal || [],
        classificacio: filterState.classificacio || []
      }
    }));
  }

  function buildSortedOptions(list, mapper) {
    var counter = {};
    list.forEach(function (item) {
      var value = mapper(item);
      if (!value) return;
      counter[value] = (counter[value] || 0) + 1;
    });

    return Object.keys(counter).sort(function (a, b) {
      return counter[b] - counter[a];
    });
  }

  function attachPaginationEvents() {
    prevButton.addEventListener('click', function () {
      if (currentPage <= 1) return;
      currentPage -= 1;
      updatePagination();
    });

    nextButton.addEventListener('click', function () {
      var totalPages = Math.max(1, Math.ceil(currentRows.length / PAGE_SIZE));
      if (currentPage >= totalPages) return;
      currentPage += 1;
      updatePagination();
    });
  }

  function attachApplyEvent() {
    applyButton.addEventListener('click', applyFilters);
  }

  window.SACDataset.load()
    .then(function (dataset) {
      allMessages = (dataset.records || []).filter(function (record) {
        return record && record.message;
      });

      latestDate = dataset.metadata && dataset.metadata.maxDate ? dataset.metadata.maxDate : null;

      setupFilters({
        barri: buildSortedOptions(allMessages, function (row) { return row.neighborhood; }),
        sentiment: ['Positiu', 'Neutre', 'Negatiu'],
        canal: buildSortedOptions(allMessages, function (row) { return row.channel; }),
        classificacio: ['Incidència', 'Queixa', 'Suggeriment', 'Consulta']
      });

      attachPaginationEvents();
      attachApplyEvent();
      window.statsFilterState = filterState;
      applyFilters();
    })
    .catch(function (error) {
      console.error('No s’ha pogut inicialitzar la taula de missatges amb el dataset', error);
    });

  document.addEventListener('sac:date-range-changed', function () {
    applyFilters();
  });
})();
