(function () {
  if (window.SACDataset) return;

  var FIELD_NAMES = {
    savedId: 'Savedid',
    sentiment: 'Sentiment',
    situation: 'Situation',
    message: 'Anonymizedmessage',
    channel: 'Bus Comunicats - Savedid → Canal Ent',
    class1: 'Bus Comunicats - Savedid → Clas1',
    class2: 'Bus Comunicats - Savedid → Clas2',
    class3: 'Bus Comunicats - Savedid → Clas3',
    lng: 'Bus Comunicats - Savedid → Lng',
    lat: 'Bus Comunicats - Savedid → Lat',
    neighborhood: 'Bus Comunicats - Savedid → Barri',
    createdAt: 'Bus Comunicats - Savedid → Data Inici'
  };

  var MAP_NEIGHBORHOODS = [
    { id: 'CERDANYOLA', name: 'Cerdanyola' },
    { id: 'EIXAMPLE', name: 'Eixample' },
    { id: 'CENTRE', name: 'Centre' },
    { id: 'ROCAFONDA', name: 'Rocafonda' },
    { id: 'PLA_D_EN_BOET', name: "Pla d'en Boet" },
    { id: 'EL_PALAU_ESCORXADOR', name: 'El Palau-Escorxador' },
    { id: 'PERAMAS', name: 'Peramàs' },
    { id: 'CIRERA', name: 'Cirera' },
    { id: 'LA_LLANTIA', name: 'La Llàntia' },
    { id: 'ELS_MOLINS', name: 'Els Molins' },
    { id: 'VISTA_ALEGRE', name: 'Vista Alegre' }
  ];

  var MAP_NEIGHBORHOOD_BY_ID = MAP_NEIGHBORHOODS.reduce(function (acc, item) {
    acc[item.id] = item;
    return acc;
  }, {});

  var BARRI_ALIASES = {
    'pla d´en boet': 'PLA_D_EN_BOET',
    "pla d'en boet": 'PLA_D_EN_BOET',
    'pla den boet': 'PLA_D_EN_BOET',
    'el palau-escorxador': 'EL_PALAU_ESCORXADOR',
    'el palau escorxador': 'EL_PALAU_ESCORXADOR',
    'peramas': 'PERAMAS',
    'peramàs': 'PERAMAS',
    'peramas-esmandies': 'PERAMAS',
    'peramàs-esmandies': 'PERAMAS',
    'la llantia': 'LA_LLANTIA',
    'la llàntia': 'LA_LLANTIA',
    'els molins': 'ELS_MOLINS',
    'vista alegre': 'VISTA_ALEGRE',
    'rocafonda': 'ROCAFONDA',
    'centre': 'CENTRE',
    'cirera': 'CIRERA',
    'eixample': 'EIXAMPLE',
    'cerdanyola': 'CERDANYOLA'
  };

  var CATALAN_MONTHS_SHORT = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ag', 'set', 'oct', 'nov', 'des'];

  var cachedPromise = null;
  var cachedData = null;
  var inlineScriptPromise = null;

  function normalizeSpaces(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeKey(value) {
    return normalizeSpaces(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['’`´]/g, '')
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseLocaleNumber(value) {
    var normalized = normalizeSpaces(value).replace(/[^\d,.-]/g, '');
    if (!normalized) return null;

    var hasComma = normalized.indexOf(',') !== -1;
    var hasDot = normalized.indexOf('.') !== -1;
    var prepared = normalized;

    if (hasComma && hasDot) {
      var lastComma = normalized.lastIndexOf(',');
      var lastDot = normalized.lastIndexOf('.');
      if (lastComma > lastDot) {
        prepared = normalized.replace(/\./g, '').replace(',', '.');
      } else {
        prepared = normalized.replace(/,/g, '');
      }
    } else if (hasComma) {
      prepared = normalized.replace(',', '.');
    }

    var parsed = Number(prepared);
    return isFinite(parsed) ? parsed : null;
  }

  function parseCoordinate(value) {
    var raw = normalizeSpaces(value);
    if (!raw) return null;

    var numeric = parseLocaleNumber(raw);
    if (numeric === null) return null;

    if (/[WS]\b/i.test(raw)) return -Math.abs(numeric);
    return numeric;
  }

  function parseDatasetDate(value) {
    var raw = normalizeSpaces(value).replace(/^"|"$/g, '');
    if (!raw) return null;

    var parts = raw.split(',');
    var datePart = normalizeSpaces(parts[0] || '');
    var timePart = normalizeSpaces(parts[1] || '00:00');

    var dateChunks = datePart.split('/');
    var timeChunks = timePart.split(':');
    if (dateChunks.length !== 3 || timeChunks.length < 2) return null;

    var day = Number(dateChunks[0]);
    var month = Number(dateChunks[1]);
    var year = Number(dateChunks[2]);
    var hour = Number(timeChunks[0]);
    var minute = Number(timeChunks[1]);
    if (!isFinite(day) || !isFinite(month) || !isFinite(year) || !isFinite(hour) || !isFinite(minute)) return null;

    var date = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (!isFinite(date.getTime())) return null;
    return date;
  }

  function mapNeighborhoodId(name) {
    var key = normalizeKey(name);
    return BARRI_ALIASES[key] || null;
  }

  function mapNeighborhoodName(rawName, id) {
    if (id && MAP_NEIGHBORHOOD_BY_ID[id]) return MAP_NEIGHBORHOOD_BY_ID[id].name;
    return normalizeSpaces(rawName) || 'Sense barri';
  }

  function mapChannel(rawChannel) {
    var value = normalizeSpaces(rawChannel);
    if (!value) return 'Sense canal';

    var key = normalizeKey(value);
    if (key === 'xarxes socials') return 'Xarxes socials';
    if (key === 'correu electronic') return 'Correu electrònic';
    if (key === 'telefon 010') return 'Telèfon 010';
    if (key === 'telefon del civisme') return 'Telèfon del civisme';
    if (key === 'web municipal') return 'Web municipal';
    if (key === 'fotodenuncia') return 'Fotodenúncia';
    if (key === 'policia local') return 'Policia Local';
    return value;
  }

  function sentimentLabelFromScore(score) {
    if (!isFinite(score)) return 'Neutre';
    if (score >= 6) return 'Positiu';
    if (score >= 4) return 'Neutre';
    return 'Negatiu';
  }

  function toSentiment100(score) {
    if (!isFinite(score)) return null;
    return Math.max(0, Math.min(100, score * 10));
  }

  function pickClassification(row) {
    var class2 = normalizeSpaces(row[FIELD_NAMES.class2]);
    var class1 = normalizeSpaces(row[FIELD_NAMES.class1]);
    var class3 = normalizeSpaces(row[FIELD_NAMES.class3]);
    return class2 || class1 || class3 || 'Sense classificació';
  }

  function classifyMessageType(record) {
    var text = (record.classification + ' ' + record.classificationRoot + ' ' + record.message).toLowerCase();
    if (/sugger|agra[iï]ment|propos|millora/.test(text)) return 'Suggeriment';
    if (/consulta|informaci[oó]|dubte|pregunt/.test(text)) return 'Consulta';
    if (/queixa|mol[eè]sti|soroll|retard/.test(text)) return 'Queixa';
    return 'Incidència';
  }

  function isAlertRecord(record) {
    var text = (record.classification + ' ' + record.classificationRoot).toLowerCase();
    if (record.sentimentLabel === 'Negatiu') return true;
    return /incid[eè]ncia|seguretat|plagues|policia|protecci[oó]/.test(text);
  }

  function formatDateShort(date) {
    if (!(date instanceof Date) || !isFinite(date.getTime())) return '';
    var day = String(date.getDate()).padStart(2, '0');
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var year = String(date.getFullYear());
    return day + '/' + month + '/' + year;
  }

  function parseCSV(csvText) {
    var rows = [];
    var row = [];
    var value = '';
    var i = 0;
    var inQuotes = false;

    while (i < csvText.length) {
      var char = csvText[i];
      var next = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          value += '"';
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
        i += 1;
        continue;
      }

      if (!inQuotes && char === ',') {
        row.push(value);
        value = '';
        i += 1;
        continue;
      }

      if (!inQuotes && (char === '\n' || char === '\r')) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(value);
        value = '';
        if (row.length > 1 || (row[0] && normalizeSpaces(row[0]))) {
          rows.push(row);
        }
        row = [];
        i += 1;
        continue;
      }

      value += char;
      i += 1;
    }

    if (value.length || row.length) {
      row.push(value);
      if (row.length > 1 || (row[0] && normalizeSpaces(row[0]))) rows.push(row);
    }

    if (!rows.length) return { headers: [], records: [] };

    var headers = rows[0].map(function (header) {
      return normalizeSpaces(header);
    });

    var records = rows.slice(1).map(function (cells) {
      var obj = {};
      headers.forEach(function (header, index) {
        obj[header] = cells[index] != null ? cells[index] : '';
      });
      return obj;
    });

    return { headers: headers, records: records };
  }

  function getMonthKey(date) {
    return String(date.getFullYear()) + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }

  function getMonthLabel(date) {
    return CATALAN_MONTHS_SHORT[date.getMonth()];
  }

  function mapRecord(row) {
    var sentimentValue = parseLocaleNumber(row[FIELD_NAMES.sentiment]);
    var createdAt = parseDatasetDate(row[FIELD_NAMES.createdAt]);
    var neighborhoodRaw = normalizeSpaces(row[FIELD_NAMES.neighborhood]);
    var neighborhoodId = mapNeighborhoodId(neighborhoodRaw);
    var neighborhood = mapNeighborhoodName(neighborhoodRaw, neighborhoodId);
    var channel = mapChannel(row[FIELD_NAMES.channel]);
    var classification = pickClassification(row);
    var classificationRoot = normalizeSpaces(row[FIELD_NAMES.class1]) || classification;
    var lat = parseCoordinate(row[FIELD_NAMES.lat]);
    var lng = parseCoordinate(row[FIELD_NAMES.lng]);
    var sentimentScore100 = toSentiment100(sentimentValue == null ? NaN : sentimentValue);

    var record = {
      id: normalizeSpaces(row[FIELD_NAMES.savedId]),
      sentimentValue: sentimentValue,
      sentimentScore100: sentimentScore100,
      sentimentLabel: sentimentLabelFromScore(sentimentValue == null ? NaN : sentimentValue),
      situationValue: parseLocaleNumber(row[FIELD_NAMES.situation]),
      message: normalizeSpaces(row[FIELD_NAMES.message]),
      channel: channel,
      channelRaw: normalizeSpaces(row[FIELD_NAMES.channel]),
      classification: classification,
      classificationRoot: classificationRoot,
      classificationAlt: normalizeSpaces(row[FIELD_NAMES.class3]),
      neighborhood: neighborhood,
      neighborhoodRaw: neighborhoodRaw,
      neighborhoodId: neighborhoodId,
      lat: lat,
      lng: lng,
      createdAt: createdAt,
      createdAtISO: createdAt ? createdAt.toISOString() : '',
      createdAtLabel: createdAt ? formatDateShort(createdAt) : ''
    };

    record.typeLabel = classifyMessageType(record);
    record.isAlert = isAlertRecord(record);

    return record;
  }

  function toSortedEntries(counterObj) {
    return Object.keys(counterObj)
      .map(function (label) {
        return { label: label, count: counterObj[label] };
      })
      .sort(function (a, b) { return b.count - a.count; });
  }

  function aggregateCounts(records, getter) {
    var counter = {};
    records.forEach(function (record) {
      var key = getter(record);
      if (!key) return;
      counter[key] = (counter[key] || 0) + 1;
    });
    return toSortedEntries(counter);
  }

  function buildMonthlySeries(records) {
    var byKey = {};

    records.forEach(function (record) {
      if (!record.createdAt) return;
      var key = getMonthKey(record.createdAt);
      if (!byKey[key]) {
        byKey[key] = {
          key: key,
          date: new Date(record.createdAt.getFullYear(), record.createdAt.getMonth(), 1),
          count: 0,
          sentimentSum: 0,
          sentimentCount: 0,
          sentiment: { Positiu: 0, Neutre: 0, Negatiu: 0 },
          alerts: 0
        };
      }

      var row = byKey[key];
      row.count += 1;
      row.sentiment[record.sentimentLabel] = (row.sentiment[record.sentimentLabel] || 0) + 1;
      if (record.isAlert) row.alerts += 1;
      if (isFinite(record.sentimentScore100)) {
        row.sentimentSum += record.sentimentScore100;
        row.sentimentCount += 1;
      }
    });

    return Object.keys(byKey)
      .map(function (key) {
        var row = byKey[key];
        var avg = row.sentimentCount ? row.sentimentSum / row.sentimentCount : null;
        var total = row.count || 1;
        return {
          key: key,
          date: row.date,
          label: getMonthLabel(row.date),
          count: row.count,
          alerts: row.alerts,
          sentimentAverage100: avg,
          positivePercent: (row.sentiment.Positiu / total) * 100,
          neutralPercent: (row.sentiment.Neutre / total) * 100,
          negativePercent: (row.sentiment.Negatiu / total) * 100
        };
      })
      .sort(function (a, b) { return a.date - b.date; });
  }

  function buildSnapshots(records) {
    var dated = records
      .filter(function (record) { return record.createdAt instanceof Date && isFinite(record.createdAt.getTime()); })
      .sort(function (a, b) { return a.createdAt - b.createdAt; });

    if (!dated.length) {
      return {
        current: [],
        previous: [],
        periodDays: 30,
        messageDeltaPercent: 0,
        dailyDeltaPercent: 0,
        sentimentDeltaPercent: 0,
        alertsDeltaPercent: 0,
        variationPercent: 0
      };
    }

    var end = dated[dated.length - 1].createdAt;
    var periodDays = 30;
    var periodMs = periodDays * 24 * 60 * 60 * 1000;
    var currentStart = new Date(end.getTime() - periodMs);
    var previousStart = new Date(end.getTime() - periodMs * 2);

    var current = dated.filter(function (record) {
      return record.createdAt >= currentStart && record.createdAt <= end;
    });

    var previous = dated.filter(function (record) {
      return record.createdAt >= previousStart && record.createdAt < currentStart;
    });

    function percentDelta(currentValue, previousValue) {
      if (!previousValue) {
        if (!currentValue) return 0;
        return 100;
      }
      return ((currentValue - previousValue) / previousValue) * 100;
    }

    function averageSentiment(list) {
      var values = list
        .map(function (record) { return record.sentimentScore100; })
        .filter(function (value) { return isFinite(value); });
      if (!values.length) return 0;
      return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
    }

    var currentCount = current.length;
    var previousCount = previous.length;
    var currentDaily = currentCount / periodDays;
    var previousDaily = previousCount / periodDays;
    var currentSentiment = averageSentiment(current);
    var previousSentiment = averageSentiment(previous);
    var currentAlerts = current.filter(function (record) { return record.isAlert; }).length;
    var previousAlerts = previous.filter(function (record) { return record.isAlert; }).length;

    return {
      current: current,
      previous: previous,
      periodDays: periodDays,
      messageDeltaPercent: percentDelta(currentCount, previousCount),
      dailyDeltaPercent: percentDelta(currentDaily, previousDaily),
      sentimentDeltaPercent: percentDelta(currentSentiment, previousSentiment),
      alertsDeltaPercent: percentDelta(currentAlerts, previousAlerts),
      variationPercent: percentDelta(currentCount, previousCount)
    };
  }

  function buildData(records) {
    var validRecords = records.filter(function (record) {
      return record && record.id;
    });
    var datedRecords = validRecords
      .filter(function (record) {
        return record.createdAt instanceof Date && isFinite(record.createdAt.getTime());
      })
      .sort(function (a, b) {
        return a.createdAt - b.createdAt;
      });

    var withNeighborhoodId = validRecords.filter(function (record) {
      return !!record.neighborhoodId;
    });

    var sentimentCountsRaw = { Positiu: 0, Neutre: 0, Negatiu: 0 };
    var sentimentScoreValues = [];
    var totalAlerts = 0;
    validRecords.forEach(function (record) {
      sentimentCountsRaw[record.sentimentLabel] = (sentimentCountsRaw[record.sentimentLabel] || 0) + 1;
      if (record.isAlert) totalAlerts += 1;
      if (isFinite(record.sentimentScore100)) sentimentScoreValues.push(record.sentimentScore100);
    });

    var sentimentAverage100 = sentimentScoreValues.length
      ? sentimentScoreValues.reduce(function (sum, value) { return sum + value; }, 0) / sentimentScoreValues.length
      : 0;

    var neighborhoodsById = MAP_NEIGHBORHOODS.map(function (item) {
      var list = withNeighborhoodId.filter(function (record) { return record.neighborhoodId === item.id; });
      var sentimentValues = list
        .map(function (record) { return record.sentimentScore100; })
        .filter(function (value) { return isFinite(value); });

      return {
        id: item.id,
        name: item.name,
        count: list.length,
        share: withNeighborhoodId.length ? (list.length / withNeighborhoodId.length) * 100 : 0,
        sentimentAverage100: sentimentValues.length
          ? sentimentValues.reduce(function (sum, value) { return sum + value; }, 0) / sentimentValues.length
          : 0
      };
    }).sort(function (a, b) { return b.count - a.count; });

    var monthly = buildMonthlySeries(validRecords);
    var snapshots = buildSnapshots(validRecords);

    return {
      records: validRecords.sort(function (a, b) {
        var aTime = a.createdAt ? a.createdAt.getTime() : 0;
        var bTime = b.createdAt ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      }),
      recordsWithCoordinates: validRecords.filter(function (record) {
        return isFinite(record.lat) && isFinite(record.lng);
      }),
      totals: {
        messagesTotal: validRecords.length,
        neighborhoodsTotal: neighborhoodsById.filter(function (item) { return item.count > 0; }).length,
        channelsTotal: aggregateCounts(validRecords, function (record) { return record.channel; }).length,
        themesTotal: aggregateCounts(validRecords, function (record) { return record.classificationRoot; }).length,
        alertsTotal: totalAlerts,
        sentimentAverage100: sentimentAverage100,
        sentimentCounts: {
          Positiu: sentimentCountsRaw.Positiu || 0,
          Neutre: sentimentCountsRaw.Neutre || 0,
          Negatiu: sentimentCountsRaw.Negatiu || 0
        }
      },
      breakdowns: {
        channels: aggregateCounts(validRecords, function (record) { return record.channel; }),
        classifications: aggregateCounts(validRecords, function (record) { return record.classification; }),
        themes: aggregateCounts(validRecords, function (record) { return record.classificationRoot; }),
        neighborhoods: neighborhoodsById
      },
      monthly: monthly,
      snapshots: snapshots,
      metadata: {
        minDate: datedRecords.length ? datedRecords[0].createdAt : null,
        maxDate: datedRecords.length ? datedRecords[datedRecords.length - 1].createdAt : null
      }
    };
  }

  function resolveDatasetUrl() {
    var pathname = window.location.pathname || '';
    if (pathname.indexOf('/SAC/') !== -1 || pathname.endsWith('/SAC') || pathname.endsWith('/SAC/')) {
      return 'dataset/dataset.csv';
    }
    return 'SAC/dataset/dataset.csv';
  }

  function resolveInlineDatasetUrl() {
    var pathname = window.location.pathname || '';
    if (pathname.indexOf('/SAC/') !== -1 || pathname.endsWith('/SAC') || pathname.endsWith('/SAC/')) {
      return 'dataset/dataset-inline.js';
    }
    return 'SAC/dataset/dataset-inline.js';
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function endOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  function parseIsoDate(value) {
    if (!value) return null;
    var match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    if (!isFinite(year) || !isFinite(month) || !isFinite(day)) return null;
    var parsed = new Date(year, month - 1, day);
    if (!isFinite(parsed.getTime())) return null;
    return parsed;
  }

  function normalizeDateRange(startValue, endValue) {
    var start = startValue instanceof Date ? startValue : parseIsoDate(startValue);
    var end = endValue instanceof Date ? endValue : parseIsoDate(endValue);

    start = start && isFinite(start.getTime()) ? startOfDay(start) : null;
    end = end && isFinite(end.getTime()) ? endOfDay(end) : null;

    if (start && end && start.getTime() > end.getTime()) {
      var prevStart = start;
      start = startOfDay(new Date(end.getTime()));
      end = endOfDay(new Date(prevStart.getTime()));
    }

    return { start: start, end: end };
  }

  function filterRecordsByDateRange(records, startValue, endValue) {
    var range = normalizeDateRange(startValue, endValue);
    var start = range.start;
    var end = range.end;

    return (records || []).filter(function (record) {
      if (!record) return false;
      if (!start && !end) return true;
      if (!(record.createdAt instanceof Date) || !isFinite(record.createdAt.getTime())) return false;
      var time = record.createdAt.getTime();
      if (start && time < start.getTime()) return false;
      if (end && time > end.getTime()) return false;
      return true;
    });
  }

  function deriveDataByDateRange(dataOrRecords, startValue, endValue) {
    var sourceRecords = Array.isArray(dataOrRecords)
      ? dataOrRecords
      : ((dataOrRecords && dataOrRecords.records) || []);

    var filtered = filterRecordsByDateRange(sourceRecords, startValue, endValue);
    return buildData(filtered);
  }

  function buildDataFromCsvText(csvText) {
    var parsed = parseCSV(csvText || '');
    var records = parsed.records.map(mapRecord);
    cachedData = buildData(records);
    return cachedData;
  }

  function loadInlineDatasetScript() {
    if (typeof window.SAC_DATASET_CSV === 'string') {
      return Promise.resolve(window.SAC_DATASET_CSV);
    }

    if (inlineScriptPromise) return inlineScriptPromise;

    inlineScriptPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = resolveInlineDatasetUrl() + '?v=20260408-2';
      script.async = true;

      script.onload = function () {
        if (typeof window.SAC_DATASET_CSV === 'string') {
          resolve(window.SAC_DATASET_CSV);
          return;
        }

        reject(new Error('No s’ha trobat el dataset inline després de carregar el script.'));
      };

      script.onerror = function () {
        reject(new Error('No s’ha pogut carregar el dataset inline.'));
      };

      document.head.appendChild(script);
    });

    return inlineScriptPromise;
  }

  function load(customUrl) {
    if (cachedPromise) return cachedPromise;

    var url = customUrl || resolveDatasetUrl();

    if (typeof window.SAC_DATASET_CSV === 'string') {
      cachedPromise = Promise.resolve(buildDataFromCsvText(window.SAC_DATASET_CSV));
      return cachedPromise;
    }

    if (window.location.protocol === 'file:') {
      cachedPromise = loadInlineDatasetScript()
        .then(buildDataFromCsvText);
      return cachedPromise;
    }

    cachedPromise = fetch(url)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('No s’ha pogut carregar el dataset: ' + response.status);
        }
        return response.text();
      })
      .catch(function () {
        return loadInlineDatasetScript();
      })
      .then(buildDataFromCsvText);

    return cachedPromise;
  }

  function getData() {
    return cachedData;
  }

  window.SACDataset = {
    load: load,
    getData: getData,
    buildData: buildData,
    normalizeDateRange: normalizeDateRange,
    filterRecordsByDateRange: filterRecordsByDateRange,
    deriveDataByDateRange: deriveDataByDateRange,
    resolveDatasetUrl: resolveDatasetUrl,
    parseIsoDate: parseIsoDate,
    parseLocaleNumber: parseLocaleNumber,
    sentimentLabelFromScore: sentimentLabelFromScore,
    mapNeighborhoodId: mapNeighborhoodId,
    mapNeighborhoodName: mapNeighborhoodName,
    mapNeighborhoods: MAP_NEIGHBORHOODS
  };
})();
