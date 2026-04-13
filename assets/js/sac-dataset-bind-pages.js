(function () {
  if (!window.SACDataset || typeof window.SACDataset.load !== 'function') return;
  var baseDataset = null;
  var activeStatsFilters = null;
  var activeStatsVisibleRows = null;
  var CATALAN_MONTHS_SHORT = ['gen.', 'feb.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'];

  function normalizeSpaces(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function formatNumber(value) {
    return (Number(value) || 0).toLocaleString('ca-ES');
  }

  function formatCompact(value) {
    var numeric = Number(value) || 0;
    if (Math.abs(numeric) < 1000) return formatNumber(numeric);
    var compact = Math.round((numeric / 1000) * 10) / 10;
    var text = compact.toLocaleString('ca-ES', { minimumFractionDigits: compact % 1 ? 1 : 0, maximumFractionDigits: 1 });
    return text + 'k';
  }

  function formatPercent(value) {
    var numeric = Number(value) || 0;
    var rounded = Math.round(Math.abs(numeric) * 10) / 10;
    return rounded.toLocaleString('ca-ES', { minimumFractionDigits: rounded % 1 ? 1 : 0, maximumFractionDigits: 1 }) + '%';
  }

  function formatSignedPercent(value) {
    var numeric = Number(value) || 0;
    return (numeric >= 0 ? '+' : '-') + formatPercent(numeric);
  }

  function startOfDay(date) {
    if (!(date instanceof Date) || !isFinite(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function endOfDay(date) {
    if (!(date instanceof Date) || !isFinite(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  function endOfMonth(date) {
    if (!(date instanceof Date) || !isFinite(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  function addDays(date, days) {
    var base = startOfDay(date);
    if (!base) return null;
    base.setDate(base.getDate() + days);
    return base;
  }

  function countDaysInRange(start, end) {
    var safeStart = startOfDay(start);
    var safeEnd = startOfDay(end);
    if (!safeStart || !safeEnd) return 1;
    return Math.max(1, Math.round((safeEnd.getTime() - safeStart.getTime()) / 86400000) + 1);
  }

  function percentDelta(currentValue, previousValue) {
    if (!previousValue) {
      if (!currentValue) return 0;
      return 100;
    }
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  function averageSentiment(records) {
    var values = (records || [])
      .map(function (record) { return record.sentimentScore100; })
      .filter(function (value) { return isFinite(value); });

    if (!values.length) return 0;

    return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
  }

  function countAlerts(records) {
    return (records || []).filter(function (record) { return record && record.isAlert; }).length;
  }

  function setText(selector, value) {
    var el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  function toIsoDate(date) {
    if (!(date instanceof Date) || !isFinite(date.getTime())) return '';
    var day = String(date.getDate()).padStart(2, '0');
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var year = String(date.getFullYear());
    return year + '-' + month + '-' + day;
  }

  function parseIsoDate(value) {
    if (!value) return null;
    var parsed = window.SACDataset.parseIsoDate
      ? window.SACDataset.parseIsoDate(value)
      : null;
    if (parsed instanceof Date && isFinite(parsed.getTime())) return parsed;

    var match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    var fallback = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return isFinite(fallback.getTime()) ? fallback : null;
  }

  function getDateButton() {
    return document.querySelector('button#hs-pro-dnic');
  }

  function isStatsPage() {
    return !!document.getElementById('stats-open-text-body');
  }

  function getActiveDateRange() {
    var button = getDateButton();
    if (!button) return { start: null, end: null };

    return {
      start: parseIsoDate(button.dataset.sacDateStart),
      end: parseIsoDate(button.dataset.sacDateEnd)
    };
  }

  function getEffectiveDateRange(dataset) {
    var activeRange = getActiveDateRange();
    var start = activeRange.start || (dataset && dataset.metadata ? dataset.metadata.minDate : null);
    var end = activeRange.end || (dataset && dataset.metadata ? dataset.metadata.maxDate : null);

    start = startOfDay(start);
    end = startOfDay(end);

    if (start && end && start.getTime() > end.getTime()) {
      var previousStart = start;
      start = end;
      end = previousStart;
    }

    return { start: start, end: end };
  }

  function getDatasetForDateRange(dataset, startDate, endDate) {
    if (!dataset) return dataset;
    if (!startDate && !endDate) return dataset;
    if (typeof window.SACDataset.deriveDataByDateRange === 'function') {
      return window.SACDataset.deriveDataByDateRange(dataset, startDate, endDate);
    }
    return dataset;
  }

  function hasSelectedFilterValue(selectedValues, value) {
    if (!Array.isArray(selectedValues) || !selectedValues.length) return true;
    return selectedValues.indexOf(value) !== -1;
  }

  function getNormalizedStatsFilters() {
    var source = activeStatsFilters || window.statsFilterState || {};
    return {
      barri: Array.isArray(source.barri) ? source.barri : [],
      sentiment: Array.isArray(source.sentiment) ? source.sentiment : [],
      canal: Array.isArray(source.canal) ? source.canal : [],
      classificacio: Array.isArray(source.classificacio) ? source.classificacio : []
    };
  }

  function applyStatsFilters(dataset) {
    var filters = getNormalizedStatsFilters();
    var hasAnyFilter = filters.barri.length || filters.sentiment.length || filters.canal.length || filters.classificacio.length;
    if (!hasAnyFilter || !dataset || !Array.isArray(dataset.records)) return dataset;

    var filteredRecords = dataset.records
      .filter(function (record) { return hasSelectedFilterValue(filters.barri, record.neighborhood); })
      .filter(function (record) { return hasSelectedFilterValue(filters.sentiment, record.sentimentLabel); })
      .filter(function (record) { return hasSelectedFilterValue(filters.canal, record.channel); })
      .filter(function (record) { return hasSelectedFilterValue(filters.classificacio, record.typeLabel); });

    if (typeof window.SACDataset.buildData === 'function') {
      return window.SACDataset.buildData(filteredRecords);
    }
    return dataset;
  }

  function getActiveDataset() {
    if (!baseDataset) return null;

    if (isStatsPage() && typeof window.SACDataset.buildData === 'function') {
      var rows = activeStatsVisibleRows || window.__SAC_STATS_VISIBLE_ROWS;
      if (Array.isArray(rows)) {
        var range = getActiveDateRange();
        var rowsInRange = rows;
        if (typeof window.SACDataset.filterRecordsByDateRange === 'function') {
          rowsInRange = window.SACDataset.filterRecordsByDateRange(rows, range.start, range.end);
        }
        return window.SACDataset.buildData(rowsInRange);
      }
    }

    var range = getActiveDateRange();
    var datasetByDate = getDatasetForDateRange(baseDataset, range.start, range.end);
    return applyStatsFilters(datasetByDate);
  }

  function getRangeComparison(dataset) {
    var range = getEffectiveDateRange(dataset);
    var currentRecords = Array.isArray(dataset && dataset.records) ? dataset.records : [];
    var periodDays = countDaysInRange(range.start, range.end);
    var previousRecords = [];

    if (baseDataset && Array.isArray(baseDataset.records) && range.start && typeof window.SACDataset.filterRecordsByDateRange === 'function') {
      var previousEnd = addDays(range.start, -1);
      var previousStart = addDays(previousEnd, -(periodDays - 1));
      previousRecords = window.SACDataset.filterRecordsByDateRange(baseDataset.records, previousStart, previousEnd);
    }

    var currentCount = currentRecords.length;
    var previousCount = previousRecords.length;
    var currentDaily = currentCount / Math.max(1, periodDays);
    var previousDaily = previousCount / Math.max(1, periodDays);
    var baseMinDate = baseDataset && baseDataset.metadata ? baseDataset.metadata.minDate : range.start;
    var baseMaxDate = baseDataset && baseDataset.metadata ? baseDataset.metadata.maxDate : range.end;
    var baseTotal = baseDataset && baseDataset.totals ? baseDataset.totals.messagesTotal : currentCount;
    var baseDays = countDaysInRange(baseMinDate, baseMaxDate);
    var baseDaily = baseTotal / Math.max(1, baseDays);

    return {
      range: range,
      periodDays: periodDays,
      currentCount: currentCount,
      previousCount: previousCount,
      currentDaily: currentDaily,
      previousDaily: previousDaily,
      currentSentimentAverage: averageSentiment(currentRecords),
      previousSentimentAverage: averageSentiment(previousRecords),
      currentAlerts: countAlerts(currentRecords),
      previousAlerts: countAlerts(previousRecords),
      messageSharePercent: baseTotal ? (currentCount / baseTotal) * 100 : 0,
      dailySharePercent: baseDaily ? (currentDaily / baseDaily) * 100 : 0,
      messageDeltaPercent: percentDelta(currentCount, previousCount),
      dailyDeltaPercent: percentDelta(currentDaily, previousDaily),
      sentimentDeltaPercent: percentDelta(averageSentiment(currentRecords), averageSentiment(previousRecords)),
      alertsDeltaPercent: percentDelta(countAlerts(currentRecords), countAlerts(previousRecords)),
      variationPercent: percentDelta(currentCount, previousCount)
    };
  }

  function getDayAxisLabel(date) {
    return date.getDate() + ' ' + CATALAN_MONTHS_SHORT[date.getMonth()];
  }

  function getMonthAxisLabel(date, includeYear) {
    return CATALAN_MONTHS_SHORT[date.getMonth()] + (includeYear ? ' ' + date.getFullYear() : '');
  }

  function buildTimeSeries(dataset) {
    var range = getEffectiveDateRange(dataset);
    var start = range.start;
    var end = range.end;
    var records = Array.isArray(dataset && dataset.records) ? dataset.records : [];

    if (!start || !end) {
      return {
        categories: [],
        messageSeries: [],
        positiveSeries: [],
        negativeSeries: [],
        neutralSeries: []
      };
    }

    var totalDays = countDaysInRange(start, end);
    var granularity = totalDays <= 31 ? 'day' : (totalDays <= 180 ? 'week' : 'month');
    var buckets = [];

    function pushBucket(bucketStart, bucketEnd, label) {
      buckets.push({
        start: startOfDay(bucketStart),
        end: endOfDay(bucketEnd),
        label: label,
        count: 0,
        sentiment: { Positiu: 0, Negatiu: 0, Neutre: 0 }
      });
    }

    if (granularity === 'day') {
      for (var dayCursor = startOfDay(start); dayCursor.getTime() <= startOfDay(end).getTime(); dayCursor = addDays(dayCursor, 1)) {
        pushBucket(dayCursor, dayCursor, getDayAxisLabel(dayCursor));
      }
    } else if (granularity === 'week') {
      for (var weekCursor = startOfDay(start); weekCursor.getTime() <= startOfDay(end).getTime();) {
        var weekStart = weekCursor;
        var weekEndCandidate = addDays(weekStart, 6);
        var weekEnd = weekEndCandidate.getTime() > startOfDay(end).getTime() ? startOfDay(end) : weekEndCandidate;
        pushBucket(weekStart, weekEnd, getDayAxisLabel(weekStart));
        weekCursor = addDays(weekEnd, 1);
      }
    } else {
      var includeYear = start.getFullYear() !== end.getFullYear();
      for (var monthCursor = new Date(start.getFullYear(), start.getMonth(), 1); monthCursor.getTime() <= startOfDay(end).getTime();) {
        var monthStart = monthCursor.getTime() < startOfDay(start).getTime() ? startOfDay(start) : monthCursor;
        var monthEndCandidate = endOfMonth(monthCursor);
        var monthEnd = monthEndCandidate.getTime() > startOfDay(end).getTime() ? startOfDay(end) : monthEndCandidate;
        pushBucket(monthStart, monthEnd, getMonthAxisLabel(monthCursor, includeYear));
        monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
      }
    }

    records.forEach(function (record) {
      if (!record || !(record.createdAt instanceof Date) || !isFinite(record.createdAt.getTime())) return;
      var time = record.createdAt.getTime();

      for (var i = 0; i < buckets.length; i += 1) {
        var bucket = buckets[i];
        if (time < bucket.start.getTime() || time > bucket.end.getTime()) continue;
        bucket.count += 1;
        bucket.sentiment[record.sentimentLabel] = (bucket.sentiment[record.sentimentLabel] || 0) + 1;
        break;
      }
    });

    return {
      categories: buckets.map(function (bucket) { return bucket.label; }),
      messageSeries: buckets.map(function (bucket) { return bucket.count; }),
      positiveSeries: buckets.map(function (bucket) {
        return bucket.count ? Math.round((bucket.sentiment.Positiu / bucket.count) * 100) : 0;
      }),
      negativeSeries: buckets.map(function (bucket) {
        return bucket.count ? Math.round((bucket.sentiment.Negatiu / bucket.count) * 100) : 0;
      }),
      neutralSeries: buckets.map(function (bucket) {
        return bucket.count ? Math.round((bucket.sentiment.Neutre / bucket.count) * 100) : 0;
      })
    };
  }

  function findTabMetricElement(tabId) {
    var tab = document.getElementById(tabId);
    if (!tab) return null;
    var candidates = Array.from(tab.querySelectorAll('span')).filter(function (span) {
      var className = span.className || '';
      return typeof className === 'string' && className.indexOf('text-lg') !== -1;
    });
    return candidates[0] || null;
  }

  function setTabMetricValue(tabId, value) {
    var metricEl = findTabMetricElement(tabId);
    if (metricEl) metricEl.textContent = value;
  }

  function setTabTrend(tabId, numericPercent) {
    var tab = document.getElementById(tabId);
    if (!tab) return;
    var trendEl = tab.querySelector('.inline-flex.items-center.gap-x-1');
    if (!trendEl) return;

    var percent = Number(numericPercent) || 0;
    var upIcon = '<svg class="shrink-0 size-4 text-teal-500 dark:text-teal-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>';
    var downIcon = '<svg class="shrink-0 size-4 text-destructive" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>';
    trendEl.innerHTML = (percent >= 0 ? upIcon : downIcon) + formatSignedPercent(percent);
    trendEl.classList.remove('text-destructive', 'text-teal-500', 'dark:text-teal-400');
    if (percent >= 0) {
      trendEl.classList.add('text-teal-500', 'dark:text-teal-400');
    } else {
      trendEl.classList.add('text-destructive');
    }
  }

  function getCardByTitle(title) {
    var headings = Array.from(document.querySelectorAll('h2'));
    for (var i = 0; i < headings.length; i++) {
      var heading = headings[i];
      if (normalizeSpaces(heading.textContent) !== title) continue;
      var card = heading.closest('.bg-card');
      if (card) return card;
    }
    return null;
  }

  function createListBarItem(label, count, widthPercent) {
    return '' +
      '<li class="flex justify-between items-center gap-x-2">' +
      '  <div class="relative size-full truncate">' +
      '    <span class="relative z-1 block py-1 px-2 w-full text-sm truncate text-foreground">' + label + '</span>' +
      '    <div class="absolute inset-y-0 start-0 bg-primary-100 h-full rounded-sm dark:bg-primary-500/20" style="width: ' + widthPercent + '%"></div>' +
      '  </div>' +
      '  <div class="w-20 text-end">' +
      '    <span class="text-sm text-muted-foreground-1">' + formatCompact(count) + '</span>' +
      '  </div>' +
      '</li>';
  }

  function createNeighborhoodItem(label, count, widthPercent) {
    return '' +
      '<li class="flex justify-between items-center gap-x-2">' +
      '  <div class="w-full grid grid-cols-2 items-center gap-x-2">' +
      '    <span class="text-sm text-foreground">' + label + '</span>' +
      '    <div class="flex justify-end" role="progressbar" aria-valuenow="' + Math.round(widthPercent) + '" aria-valuemin="0" aria-valuemax="100">' +
      '      <div class="h-1.5 flex flex-col justify-center overflow-hidden bg-primary rounded-full text-xs text-primary-foreground text-center whitespace-nowrap" style="width: ' + widthPercent + '%"></div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="min-w-15 text-end">' +
      '    <span class="text-sm text-muted-foreground-1">' + formatNumber(count) + '</span>' +
      '  </div>' +
      '</li>';
  }

  function renderListInsideCard(card, items, itemFactory) {
    if (!card) return;
    var list = card.querySelector('ul');
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '';
      return;
    }
    var max = items[0].count || 1;
    list.innerHTML = items.map(function (item) {
      var width = Math.max(8, (item.count / max) * 100);
      return itemFactory(item.label, item.count, width);
    }).join('');
  }

  function updateTopTabsOnHome(dataset, comparison) {
    var totals = dataset.totals;

    setTabMetricValue('hs-sac-audience-tab-item-overview', totals.neighborhoodsTotal + ' barris');
    setText('#hs-sac-audience-tab-overview .text-lg', totals.neighborhoodsTotal + ' barris');

    setTabMetricValue('hs-sac-audience-tab-item-new', Math.round(totals.sentimentAverage100) + '/100');
    setTabTrend('hs-sac-audience-tab-item-new', comparison.sentimentDeltaPercent);

    setTabMetricValue('hs-sac-audience-tab-item-sentiment', String(totals.alertsTotal));
    setTabTrend('hs-sac-audience-tab-item-sentiment', comparison.alertsDeltaPercent);

    setTabMetricValue('hs-sac-audience-tab-item-neighborhoods', String(totals.themesTotal));
  }

  function updateMessageEvolutionCard(dataset, comparison) {
    var card = getCardByTitle('Evolució de missatges');
    if (!card) return;

    var totalEl = card.querySelector('h3');
    if (totalEl) totalEl.textContent = formatCompact(dataset.totals.messagesTotal);

    var rows = Array.from(card.querySelectorAll('li'));
    rows.forEach(function (row) {
      var label = normalizeSpaces((row.querySelector('.text-sm.text-foreground') || {}).textContent);
      var right = row.querySelector('.flex.justify-end.items-center');
      var spans = right ? right.querySelectorAll('span') : [];
      if (!spans.length) return;

      if (label === 'Missatges') {
        if (spans[0]) spans[0].textContent = formatNumber(comparison.currentCount);
        if (spans[1]) spans[1].textContent = formatPercent(comparison.messageSharePercent);
        if (spans[2]) {
          spans[2].textContent = formatSignedPercent(comparison.messageDeltaPercent);
          spans[2].classList.toggle('text-teal-500', comparison.messageDeltaPercent >= 0);
          spans[2].classList.toggle('dark:text-teal-400', comparison.messageDeltaPercent >= 0);
          spans[2].classList.toggle('text-destructive', comparison.messageDeltaPercent < 0);
        }
      }

      if (label === 'Mitjana diària') {
        if (spans[0]) spans[0].textContent = formatNumber(Math.round(comparison.currentDaily));
        if (spans[1]) spans[1].textContent = formatPercent(comparison.dailySharePercent);
        if (spans[2]) {
          spans[2].textContent = formatSignedPercent(comparison.dailyDeltaPercent);
          spans[2].classList.toggle('text-teal-500', comparison.dailyDeltaPercent >= 0);
          spans[2].classList.toggle('dark:text-teal-400', comparison.dailyDeltaPercent >= 0);
          spans[2].classList.toggle('text-destructive', comparison.dailyDeltaPercent < 0);
        }
      }

      if (label === 'Variació del període') {
        if (spans[0]) {
          spans[0].textContent = formatSignedPercent(comparison.variationPercent);
          spans[0].classList.toggle('text-teal-500', comparison.variationPercent >= 0);
          spans[0].classList.toggle('dark:text-teal-400', comparison.variationPercent >= 0);
          spans[0].classList.toggle('text-destructive', comparison.variationPercent < 0);
        }
      }
    });
  }

  function renderVisitorsExpandableList(listId, toggleId, iconId, items) {
    var list = document.getElementById(listId);
    var toggle = document.getElementById(toggleId);
    var icon = document.getElementById(iconId);
    if (!list || !toggle || !icon) return;

    var maxVisible = 5;
    var nextSibling = list.nextElementSibling;
    if (nextSibling && nextSibling.classList.contains('overflow-hidden')) {
      nextSibling.remove();
    }

    var cleanToggle = toggle.cloneNode(true);
    toggle.parentNode.replaceChild(cleanToggle, toggle);
    toggle = cleanToggle;
    icon = document.getElementById(iconId) || icon;

    if (!items.length) {
      list.innerHTML = '';
      toggle.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');
      icon.classList.remove('rotate-180');
      return;
    }

    var max = items[0].count || 1;
    var baseItems = items.slice(0, maxVisible);
    var extraItems = items.slice(maxVisible);

    list.innerHTML = baseItems.map(function (item) {
      var width = Math.max(8, (item.count / max) * 100);
      return createListBarItem(item.label, item.count, width);
    }).join('');

    if (!extraItems.length) {
      toggle.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');
      icon.classList.remove('rotate-180');
      return;
    }

    toggle.classList.remove('hidden');
    var wrapper = document.createElement('div');
    wrapper.className = 'overflow-hidden mt-2 transition-[max-height] duration-300 ease-in-out';
    wrapper.style.maxHeight = '0px';
    var extraList = document.createElement('ul');
    extraList.className = list.className;
    extraList.innerHTML = extraItems.map(function (item) {
      var width = Math.max(8, (item.count / max) * 100);
      return createListBarItem(item.label, item.count, width);
    }).join('');
    wrapper.appendChild(extraList);
    list.parentNode.insertBefore(wrapper, list.nextSibling);

    var expanded = false;
    function sync() {
      wrapper.style.maxHeight = expanded ? (extraList.scrollHeight + 'px') : '0px';
      icon.classList.toggle('rotate-180', expanded);
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    toggle.addEventListener('click', function () {
      expanded = !expanded;
      sync();
    });
    sync();
  }

  function updateListCards(dataset) {
    var channels = dataset.breakdowns.channels.slice(0, 10);
    var classifications = dataset.breakdowns.classifications.slice(0, 10);
    var neighborhoods = dataset.breakdowns.neighborhoods.filter(function (item) { return item.count > 0; }).slice(0, 8)
      .map(function (item) {
        return { label: item.name, count: item.count };
      });

    var visitorsHasExpandableLists = document.getElementById('channels-list') && document.getElementById('categories-list');
    if (visitorsHasExpandableLists) {
      renderVisitorsExpandableList('channels-list', 'channels-toggle', 'channels-icon', channels);
      renderVisitorsExpandableList('categories-list', 'categories-toggle', 'categories-icon', classifications);
    } else {
      renderListInsideCard(getCardByTitle("Canal d'entrada"), channels, createListBarItem);
      renderListInsideCard(getCardByTitle('Classificació general'), classifications, createListBarItem);
    }

    renderListInsideCard(getCardByTitle('Barris'), neighborhoods, createNeighborhoodItem);
  }

  function rebuildChart(selector, createOptions, createLightOptions, createDarkOptions) {
    if (!document.querySelector(selector) || typeof buildChart !== 'function') return;
    var el = document.querySelector(selector);
    el.innerHTML = '';
    buildChart(selector, createOptions, createLightOptions, createDarkOptions);
  }

  function renderCharts(dataset) {
    var sentimentCounts = dataset.totals.sentimentCounts;
    var sentimentSeries = [
      sentimentCounts.Positiu || 0,
      sentimentCounts.Negatiu || 0,
      sentimentCounts.Neutre || 0
    ];
    var timeSeries = buildTimeSeries(dataset);
    var categories = timeSeries.categories;
    var messageSeries = timeSeries.messageSeries;
    var positiveSeries = timeSeries.positiveSeries;
    var negativeSeries = timeSeries.negativeSeries;
    var neutralSeries = timeSeries.neutralSeries;

    rebuildChart(
      '#hs-market-share-donut-chart',
      function () {
        return {
          chart: { height: 230, width: 230, type: 'donut', toolbar: { show: false } },
          plotOptions: { pie: { donut: { size: '76%' } } },
          series: sentimentSeries,
          labels: ['Positiu', 'Negatiu', 'Neutre'],
          legend: { show: false },
          stroke: { width: 3 },
          dataLabels: { enabled: false },
          tooltip: { enabled: false }
        };
      },
      function () {
        return { colors: ['#22c55e', '#ef4444', '#94a3b8'], stroke: { colors: [varToColor('--chart-colors-background')] } };
      },
      function () {
        return { colors: ['#22c55e', '#ef4444', '#94a3b8'], stroke: { colors: [varToColor('--chart-colors-background-inverse')] } };
      }
    );

    rebuildChart(
      '#hs-age-lines-chart',
      function () {
        return {
          chart: { height: 262, type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
          series: [
            { name: 'Positiu', data: positiveSeries },
            { name: 'Negatiu', data: negativeSeries },
            { name: 'Neutre', data: neutralSeries }
          ],
          dataLabels: { enabled: false },
          stroke: { curve: 'straight', width: [3, 3, 3], dashArray: [0, 0, 4] },
          legend: { show: false },
          xaxis: { categories: categories, axisBorder: { show: false }, axisTicks: { show: false } },
          yaxis: { min: 0, max: 100, tickAmount: 4 }
        };
      },
      function () {
        return { colors: ['#22c55e', '#ef4444', '#94a3b8'], grid: { borderColor: varToColor('--chart-colors-grid-border') } };
      },
      function () {
        return { colors: ['#22c55e', '#ef4444', '#94a3b8'], grid: { borderColor: varToColor('--chart-colors-grid-border-inverse') } };
      }
    );

    rebuildChart(
      '#hs-total-sales',
      function () {
        return {
          chart: { height: 250, type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
          series: [{ name: 'Missatges', data: messageSeries }],
          legend: { show: false },
          dataLabels: { enabled: false },
          stroke: { curve: 'straight', width: 2 },
          fill: {
            type: 'gradient',
            gradient: { type: 'vertical', shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.8 }
          },
          xaxis: {
            type: 'category',
            tickPlacement: 'on',
            categories: categories,
            axisBorder: { show: false },
            axisTicks: { show: false },
            tooltip: { enabled: false }
          },
          yaxis: {
            labels: {
              formatter: function (value) {
                return value >= 1000 ? (Math.round((value / 1000) * 10) / 10) + 'k' : Math.round(value);
              }
            }
          }
        };
      },
      function () {
        return {
          colors: [varToColor('--chart-colors-primary-hex')],
          fill: { gradient: { shadeIntensity: 0.1, opacityFrom: 0.5, opacityTo: 0, stops: [0, 90, 100] } },
          grid: { strokeDashArray: 2, borderColor: varToColor('--chart-colors-grid-border') }
        };
      },
      function () {
        return {
          colors: [varToColor('--chart-colors-primary-hex-inverse')],
          fill: { gradient: { shadeIntensity: 0.1, opacityFrom: 0.5, opacityTo: 0, stops: [100, 90, 0] } },
          grid: { strokeDashArray: 2, borderColor: varToColor('--chart-colors-grid-border-inverse') }
        };
      }
    );

    rebuildChart(
      '#hs-acquisition-pie-chart',
      function () {
        return {
          chart: { height: 297, type: 'pie', toolbar: { show: false } },
          series: sentimentSeries,
          labels: ['Positiu', 'Negatiu', 'Neutre'],
          legend: { show: false },
          dataLabels: { enabled: false },
          stroke: { width: 0 }
        };
      },
      function () { return { colors: ['#22c55e', '#ef4444', '#94a3b8'] }; },
      function () { return { colors: ['#22c55e', '#ef4444', '#94a3b8'] }; }
    );
  }

  function updateAcquisitionList(dataset, comparison) {
    var card = getCardByTitle('Sentiment');
    if (!card || !card.querySelector('#hs-acquisition-pie-chart')) return;

    var rows = Array.from(card.querySelectorAll('ul li')).slice(1);
    if (!rows.length) return;

    var sentimentCounts = dataset.totals.sentimentCounts;
    var totals = dataset.totals.messagesTotal || 1;
    var mapping = [
      { key: 'Positiu', trend: comparison.sentimentDeltaPercent },
      { key: 'Negatiu', trend: -Math.abs(comparison.alertsDeltaPercent) },
      { key: 'Neutre', trend: 0 }
    ];

    rows.forEach(function (row, index) {
      var config = mapping[index];
      if (!config) return;
      var valueSpans = row.querySelectorAll('.flex.justify-end.items-center.gap-x-1\\.5 span');
      if (!valueSpans.length) return;

      var count = sentimentCounts[config.key] || 0;
      var score = Math.round((count / totals) * 100);
      if (valueSpans[0]) valueSpans[0].textContent = score + ' /100';
      if (valueSpans[1]) {
        valueSpans[1].textContent = formatSignedPercent(config.trend);
      }
    });
  }

  function updateIndexMiniPanels(dataset) {
    function setPanelMetric(panelId, label, value) {
      var panel = document.getElementById(panelId);
      if (!panel) return;
      var cards = Array.from(panel.querySelectorAll('.p-4.bg-card.border.border-card-line.rounded-xl'));
      cards.forEach(function (card) {
        var labelEl = card.querySelector('.text-xs.text-muted-foreground-1');
        var valueEl = card.querySelector('.mt-1');
        if (!labelEl || !valueEl) return;
        if (normalizeSpaces(labelEl.textContent) === label) {
          valueEl.textContent = value;
        }
      });
    }

    var totalMessages = dataset.totals.messagesTotal || 1;
    setPanelMetric('hs-sac-audience-tab-new', 'Positiu', formatPercent((dataset.totals.sentimentCounts.Positiu / totalMessages) * 100));
    setPanelMetric('hs-sac-audience-tab-new', 'Neutre', formatPercent((dataset.totals.sentimentCounts.Neutre / totalMessages) * 100));
    setPanelMetric('hs-sac-audience-tab-new', 'Negatiu', formatPercent((dataset.totals.sentimentCounts.Negatiu / totalMessages) * 100));
    setPanelMetric('hs-sac-audience-tab-sentiment', 'Alertes actives', String(dataset.totals.alertsTotal));
    setPanelMetric('hs-sac-audience-tab-neighborhoods', 'Temàtiques actives', String(dataset.totals.themesTotal));
    setPanelMetric('hs-sac-audience-tab-neighborhoods', 'Top tema', (dataset.breakdowns.themes[0] || {}).label || '—');
  }

  function runBindings(dataset) {
    if (!dataset) return;
    var comparison = getRangeComparison(dataset);
    updateTopTabsOnHome(dataset, comparison);
    updateIndexMiniPanels(dataset);
    updateListCards(dataset);
    updateMessageEvolutionCard(dataset, comparison);
    updateAcquisitionList(dataset, comparison);
    renderCharts(dataset);
  }

  function applyBindingsForCurrentDateRange() {
    var filteredDataset = getActiveDataset() || baseDataset;
    runBindings(filteredDataset);

    var button = getDateButton();
    if (button && filteredDataset && filteredDataset.metadata) {
      button.dataset.sacDateActiveFrom = filteredDataset.metadata.minDate ? toIsoDate(filteredDataset.metadata.minDate) : '';
      button.dataset.sacDateActiveTo = filteredDataset.metadata.maxDate ? toIsoDate(filteredDataset.metadata.maxDate) : '';
    }
  }

  window.SACDataset.load()
    .then(function (dataset) {
      baseDataset = dataset;
      applyBindingsForCurrentDateRange();
    })
    .catch(function (error) {
      console.error('No s’han pogut injectar les dades del dataset a la pàgina', error);
    });

  document.addEventListener('sac:date-range-changed', function () {
    applyBindingsForCurrentDateRange();
  });

  document.addEventListener('stats:filters-changed', function (event) {
    activeStatsFilters = event && event.detail ? event.detail : null;
    applyBindingsForCurrentDateRange();
  });

  document.addEventListener('stats:visible-messages-changed', function (event) {
    activeStatsVisibleRows = event && event.detail && Array.isArray(event.detail.rows)
      ? event.detail.rows
      : null;
    applyBindingsForCurrentDateRange();
  });
})();
