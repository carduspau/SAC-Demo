(function () {
  var mapContainer = document.querySelector('#hs-users-datamap');
  var tableBody = document.querySelector('#hs-users-neighborhoods-table');
  var tablePanel = document.querySelector('.hs-users-table-panel');
  var mapModeButtons = document.querySelectorAll('[data-map-mode]');

  if (!mapContainer || !tableBody || typeof L === 'undefined') return;

  var tabpanel = mapContainer.closest('[role="tabpanel"]');
  var tabTheme = null;
  var geoJson = null;
  var map = null;
  var popup = null;
  var lightLayer = null;
  var darkLayer = null;
  var activeBaseLayer = null;
  var geoJsonLayer = null;
  var pointsLayer = null;
  var mapBounds = null;
  var navigationBounds = null;
  var resizeFrame = null;
  var zoomFrame = null;
  var smoothWheelFrame = null;
  var smoothWheelStopTimer = null;
  var smoothWheelTargetZoom = null;
  var smoothWheelAnchorLatLng = null;
  var smoothWheelLastInputAt = 0;
  var isSmoothWheelZooming = false;
  var popupHideTimeout = null;
  var hasInitializedView = false;
  var currentMapMode = 'areas';
  var incidentRecords = [];
  var baseDataset = null;
  var polygonByNeighborhoodId = {};
  var centroidByNeighborhoodId = {};
  var DEFAULT_MATARO_CENTER = [41.54211, 2.4445];

  var neighborhoods = [
    {
      id: 'CERDANYOLA',
      name: 'Cerdanyola',
      visits: '12,640',
      purchases: '$6,481',
      change: '6.2%',
      isGrown: true,
      active: { value: '6,248', percent: '8.4%', isGrown: true },
      newUsers: { value: '1,506', percent: '2.8%', isGrown: true },
      fillKey: 'MAJOR'
    },
    {
      id: 'EIXAMPLE',
      name: 'Eixample',
      visits: '11,920',
      purchases: '$6,093',
      change: '4.7%',
      isGrown: true,
      active: { value: '5,972', percent: '6.1%', isGrown: true },
      newUsers: { value: '1,322', percent: '1.9%', isGrown: true },
      fillKey: 'MAJOR'
    },
    {
      id: 'CENTRE',
      name: 'Centre',
      visits: '10,485',
      purchases: '$5,812',
      change: '3.4%',
      isGrown: true,
      active: { value: '5,104', percent: '3.8%', isGrown: true },
      newUsers: { value: '1,148', percent: '1.4%', isGrown: true },
      fillKey: 'MAJOR'
    },
    {
      id: 'ROCAFONDA',
      name: 'Rocafonda',
      visits: '9,870',
      purchases: '$4,965',
      change: '2.1%',
      isGrown: false,
      active: { value: '4,721', percent: '1.6%', isGrown: false },
      newUsers: { value: '1,086', percent: '0.8%', isGrown: true },
      fillKey: 'MAJOR'
    },
    {
      id: 'PLA_D_EN_BOET',
      name: "Pla d'en Boet",
      visits: '8,910',
      purchases: '$4,307',
      change: '5.9%',
      isGrown: true,
      active: { value: '4,084', percent: '5.1%', isGrown: true },
      newUsers: { value: '932', percent: '1.7%', isGrown: true },
      fillKey: 'MAJOR'
    },
    {
      id: 'EL_PALAU_ESCORXADOR',
      name: 'El Palau-Escorxador',
      visits: '7,465',
      purchases: '$3,872',
      change: '1.8%',
      isGrown: true,
      active: { value: '3,618', percent: '2.3%', isGrown: true },
      newUsers: { value: '744', percent: '0.9%', isGrown: false },
      fillKey: 'MAJOR'
    },
    {
      id: 'PERAMAS',
      name: 'Peramàs',
      visits: '6,980',
      purchases: '$3,265',
      change: '0.6%',
      isGrown: false,
      active: { value: '3,281', percent: '0.7%', isGrown: false },
      newUsers: { value: '668', percent: '0.4%', isGrown: false }
    },
    {
      id: 'CIRERA',
      name: 'Cirera',
      visits: '6,210',
      purchases: '$3,004',
      change: '2.6%',
      isGrown: true,
      active: { value: '2,941', percent: '2.1%', isGrown: true },
      newUsers: { value: '590', percent: '0.6%', isGrown: true }
    },
    {
      id: 'LA_LLANTIA',
      name: 'La Llàntia',
      visits: '5,540',
      purchases: '$2,706',
      change: '1.1%',
      isGrown: true,
      active: { value: '2,484', percent: '1.0%', isGrown: true },
      newUsers: { value: '522', percent: '0.3%', isGrown: false }
    },
    {
      id: 'ELS_MOLINS',
      name: 'Els Molins',
      visits: '4,760',
      purchases: '$2,318',
      change: '0.9%',
      isGrown: false,
      active: { value: '2,118', percent: '0.8%', isGrown: false },
      newUsers: { value: '448', percent: '0.2%', isGrown: false }
    },
    {
      id: 'VISTA_ALEGRE',
      name: 'Vista Alegre',
      visits: '3,980',
      purchases: '$1,904',
      change: '2.3%',
      isGrown: true,
      active: { value: '1,756', percent: '1.5%', isGrown: true },
      newUsers: { value: '386', percent: '0.5%', isGrown: true }
    }
  ];

  var visibleNeighborhoodIds = [
    'CENTRE',
    'CERDANYOLA',
    'CIRERA',
    'EIXAMPLE',
    'EL_PALAU_ESCORXADOR',
    'ELS_MOLINS',
    'LA_LLANTIA',
    'PERAMAS',
    'PLA_D_EN_BOET',
    'ROCAFONDA',
    'VISTA_ALEGRE'
  ];

  var sentimentById = {
    CERDANYOLA: { score: 78, trend: '4.6%', isGrown: true },
    EIXAMPLE: { score: 74, trend: '3.9%', isGrown: true },
    CENTRE: { score: 81, trend: '2.8%', isGrown: true },
    ROCAFONDA: { score: 62, trend: '1.7%', isGrown: false },
    PLA_D_EN_BOET: { score: 69, trend: '3.1%', isGrown: true },
    EL_PALAU_ESCORXADOR: { score: 71, trend: '1.9%', isGrown: true },
    PERAMAS: { score: 67, trend: '0.4%', isGrown: false },
    CIRERA: { score: 72, trend: '2.1%', isGrown: true },
    LA_LLANTIA: { score: 65, trend: '0.8%', isGrown: true },
    ELS_MOLINS: { score: 63, trend: '0.3%', isGrown: false },
    VISTA_ALEGRE: { score: 70, trend: '1.4%', isGrown: true }
  };

  var neighborhoodById = neighborhoods.reduce(function (acc, item) {
    acc[item.id] = item;
    return acc;
  }, {});

  var visibleNeighborhoodSet = visibleNeighborhoodIds.reduce(function (acc, id) {
    acc[id] = true;
    return acc;
  }, {});

  var visibleNeighborhoods = visibleNeighborhoodIds.map(function (id) {
    return neighborhoodById[id];
  }).filter(Boolean);

  var messageRange = { min: Infinity, max: -Infinity };

  function updateNeighborhoodCollections() {
    neighborhoodById = neighborhoods.reduce(function (acc, item) {
      acc[item.id] = item;
      return acc;
    }, {});

    visibleNeighborhoodSet = visibleNeighborhoodIds.reduce(function (acc, id) {
      acc[id] = true;
      return acc;
    }, {});

    visibleNeighborhoods = visibleNeighborhoodIds.map(function (id) {
      return neighborhoodById[id];
    }).filter(Boolean);

    messageRange = visibleNeighborhoods.reduce(function (acc, item) {
      var value = parseMetric(item.visits);
      return {
        min: Math.min(acc.min, value),
        max: Math.max(acc.max, value)
      };
    }, { min: Infinity, max: -Infinity });
  }

  updateNeighborhoodCollections();

  function refreshNeighborhoodGeometryCache() {
    polygonByNeighborhoodId = {};
    centroidByNeighborhoodId = {};

    if (!geoJson || !Array.isArray(geoJson.features)) return;

    geoJson.features.forEach(function (feature) {
      if (!feature || !feature.properties) return;
      var neighborhoodId = feature.properties.id;
      if (!neighborhoodId) return;

      var polygon = getLargestPolygon(feature.geometry);
      if (!polygon) return;

      polygonByNeighborhoodId[neighborhoodId] = polygon;
      centroidByNeighborhoodId[neighborhoodId] = getPolygonCentroid(polygon);
    });
  }

  function formatMetric(value) {
    return (Math.round(value) || 0).toLocaleString('ca-ES');
  }

  function truncateText(text, maxChars) {
    var safeText = String(text || '');
    if (safeText.length <= maxChars) return safeText;
    return safeText.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
  }

  function formatDateShort(date) {
    var day = String(date.getDate()).padStart(2, '0');
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var year = String(date.getFullYear());
    return day + '/' + month + '/' + year;
  }

  function getPolygonRings(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'Polygon') return [geometry.coordinates];
    if (geometry.type === 'MultiPolygon') return geometry.coordinates;
    return [];
  }

  function getRingArea(ring) {
    var area = 0;
    for (var i = 0; i < ring.length - 1; i++) {
      area += (ring[i][0] * ring[i + 1][1]) - (ring[i + 1][0] * ring[i][1]);
    }
    return Math.abs(area / 2);
  }

  function getLargestPolygon(geometry) {
    var polygons = getPolygonRings(geometry);
    if (!polygons.length) return null;
    return polygons.reduce(function (largest, polygon) {
      var area = getRingArea(polygon[0] || []);
      if (!largest || area > largest.area) {
        return { area: area, polygon: polygon };
      }
      return largest;
    }, null).polygon;
  }

  function getPolygonBBox(polygon) {
    var outer = polygon && polygon[0] ? polygon[0] : [];
    var bounds = {
      minLng: Infinity,
      maxLng: -Infinity,
      minLat: Infinity,
      maxLat: -Infinity
    };

    outer.forEach(function (coord) {
      bounds.minLng = Math.min(bounds.minLng, coord[0]);
      bounds.maxLng = Math.max(bounds.maxLng, coord[0]);
      bounds.minLat = Math.min(bounds.minLat, coord[1]);
      bounds.maxLat = Math.max(bounds.maxLat, coord[1]);
    });

    return bounds;
  }

  function isPointInRing(point, ring) {
    var inside = false;
    var x = point[0];
    var y = point[1];
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0];
      var yi = ring[i][1];
      var xj = ring[j][0];
      var yj = ring[j][1];
      var intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function isPointInPolygon(point, polygon) {
    if (!polygon || !polygon.length) return false;
    if (!isPointInRing(point, polygon[0])) return false;
    for (var i = 1; i < polygon.length; i++) {
      if (isPointInRing(point, polygon[i])) return false;
    }
    return true;
  }

  function getPolygonCentroid(polygon) {
    var outer = polygon && polygon[0] ? polygon[0] : [];
    if (!outer.length) return DEFAULT_MATARO_CENTER;

    var latSum = 0;
    var lngSum = 0;
    for (var i = 0; i < outer.length; i++) {
      lngSum += outer[i][0];
      latSum += outer[i][1];
    }

    return [latSum / outer.length, lngSum / outer.length];
  }

  function randomPointInPolygon(polygon, fallbackLatLng) {
    var bbox = getPolygonBBox(polygon);
    for (var i = 0; i < 90; i++) {
      var lng = bbox.minLng + Math.random() * (bbox.maxLng - bbox.minLng);
      var lat = bbox.minLat + Math.random() * (bbox.maxLat - bbox.minLat);
      if (isPointInPolygon([lng, lat], polygon)) {
        return [lat, lng];
      }
    }
    return fallbackLatLng;
  }

  function hashString(value) {
    var input = String(value || '');
    var hash = 2166136261;

    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function seededRandom(seedState) {
    seedState.value = (Math.imul(seedState.value, 1664525) + 1013904223) >>> 0;
    return seedState.value / 4294967296;
  }

  function deterministicPointInPolygon(polygon, fallbackLatLng, seedValue) {
    if (!polygon || !polygon.length) return fallbackLatLng;

    var bbox = getPolygonBBox(polygon);
    var seedState = { value: hashString(seedValue) || 1 };

    for (var i = 0; i < 120; i++) {
      var lng = bbox.minLng + seededRandom(seedState) * (bbox.maxLng - bbox.minLng);
      var lat = bbox.minLat + seededRandom(seedState) * (bbox.maxLat - bbox.minLat);

      if (isPointInPolygon([lng, lat], polygon)) {
        return [lat, lng];
      }
    }

    return fallbackLatLng;
  }

  function getFallbackRecordLatLng(record) {
    var neighborhoodId = record && record.neighborhoodId;
    var centroid = (neighborhoodId && centroidByNeighborhoodId[neighborhoodId]) || DEFAULT_MATARO_CENTER;
    var seedKey = [
      record && (record.id || ''),
      record && (record.createdAtISO || ''),
      neighborhoodId || '',
      record && (record.message || '')
    ].join('|');
    var polygon = neighborhoodId ? polygonByNeighborhoodId[neighborhoodId] : null;

    if (polygon) {
      return deterministicPointInPolygon(polygon, centroid, seedKey);
    }

    var seedState = { value: hashString(seedKey) || 1 };
    var angle = seededRandom(seedState) * Math.PI * 2;
    var radius = 0.00015 + seededRandom(seedState) * 0.00075;

    return [
      centroid[0] + Math.sin(angle) * radius,
      centroid[1] + Math.cos(angle) * radius
    ];
  }

  function getClusterVisualProps(count) {
    if (count <= 1) {
      return {
        size: 12,
        fontSize: 0,
        ringSize: 3
      };
    }

    var minSize = 24;
    var maxSize = 50;
    var normalized = Math.min(1, Math.log(count) / Math.log(60));
    var size = Math.round(minSize + (maxSize - minSize) * normalized);

    return {
      size: size,
      fontSize: Math.max(11, Math.round(size * 0.33)),
      ringSize: Math.max(2, Math.round(size * 0.12))
    };
  }

  function getIncidentIcon(count) {
    var isSingle = count === 1;
    var markerClass = isSingle ? 'hs-users-incident-marker hs-users-incident-marker-single' : 'hs-users-incident-marker';
    var visual = getClusterVisualProps(count);
    var inlineStyle = 'width:' + visual.size + 'px;height:' + visual.size + 'px;' +
      (isSingle ? '' : 'font-size:' + visual.fontSize + 'px;') +
      'box-shadow:0 0 0 ' + visual.ringSize + 'px rgba(37, 99, 235, .18);';

    return L.divIcon({
      className: '',
      html: '<span class="' + markerClass + '" style="' + inlineStyle + '">' + (isSingle ? '' : formatMetric(count)) + '</span>',
      iconSize: [visual.size, visual.size],
      iconAnchor: [visual.size / 2, visual.size / 2]
    });
  }

  function setModeButtons(mode) {
    mapModeButtons.forEach(function (button) {
      var isActive = button.getAttribute('data-map-mode') === mode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function buildIncidentPointsByZoom() {
    if (incidentRecords.length) return;
    if (!geoJson || !geoJson.features) return;

    var channels = ['Web', 'App', 'Xarxes', 'Telèfon 010', 'WhatsApp'];
    var categories = ['Incidència', 'Queixa', 'Consulta', 'Suggeriment'];
    var sentiments = ['Positiu', 'Neutre', 'Negatiu'];
    var messageTemplates = [
      'A {barri} hi ha una incidència recurrent amb enllumenat al vespre i caldria revisar-ne el manteniment.',
      'Aquesta zona de {barri} acumula brutícia i seria convenient reforçar la neteja durant els caps de setmana.',
      'Detecto soroll continuat de matinada a {barri}, sobretot en el tram proper a la plaça principal.',
      'El servei d’atenció ha millorat a {barri}, però encara hi ha retards en la resolució d’algunes consultes.',
      'Falten papereres a diversos carrers de {barri} i això està generant més residus fora dels punts habilitats.',
      'A {barri} hi ha passos de vianants amb pintura molt desgastada i seria bo prioritzar-ne la reposició.'
    ];
    var records = [];
    var incidentNumber = 1;

    geoJson.features.forEach(function (feature) {
      if (!feature || !feature.properties) return;
      var id = feature.properties.id;
      var data = neighborhoodById[id];
      if (!data) return;

      var polygon = getLargestPolygon(feature.geometry);
      if (!polygon) return;

      var totalIncidents = parseMetric(data.visits);
      var centroid = getPolygonCentroid(polygon);
      var incidentCount = Math.max(6, Math.min(28, Math.round(totalIncidents / 500)));

      for (var i = 0; i < incidentCount; i++) {
        var selectedCategory = categories[Math.floor(Math.random() * categories.length)];
        var selectedSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
        var selectedMessage = messageTemplates[Math.floor(Math.random() * messageTemplates.length)]
          .replace('{barri}', data.name);
        var createdAt = new Date(Date.now() - Math.round(Math.random() * 1000 * 60 * 60 * 24 * 30));

        records.push({
          id: id,
          neighborhood: data.name,
          latlng: randomPointInPolygon(polygon, centroid),
          title: 'INC-' + String(incidentNumber++).padStart(4, '0'),
          channel: channels[Math.floor(Math.random() * channels.length)],
          type: selectedCategory,
          sentiment: selectedSentiment,
          date: formatDateShort(createdAt),
          message: selectedMessage
        });
      }
    });

    incidentRecords = records;
  }

  function parseMetric(value) {
    return Number(String(value || '').replace(/[^\d.-]/g, '')) || 0;
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
    if (!(date instanceof Date) || !isFinite(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

  function averageSentiment(records) {
    var values = (records || [])
      .map(function (record) { return record.sentimentScore100; })
      .filter(function (value) { return isFinite(value); });

    if (!values.length) return 0;

    return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
  }

  function getActiveDateRange() {
    var button = document.querySelector('button#hs-pro-dnic');
    if (!button) return { start: null, end: null };
    return {
      start: parseIsoDate(button.dataset.sacDateStart),
      end: parseIsoDate(button.dataset.sacDateEnd)
    };
  }

  function getDatasetForCurrentDateRange(dataset) {
    if (!dataset) return dataset;
    var range = getActiveDateRange();
    if ((!range.start && !range.end) || !window.SACDataset || typeof window.SACDataset.deriveDataByDateRange !== 'function') {
      return dataset;
    }

    return window.SACDataset.deriveDataByDateRange(dataset, range.start, range.end);
  }

  function formatPercent(value) {
    var safeValue = Number(value) || 0;
    var rounded = Math.round(Math.abs(safeValue) * 10) / 10;
    return rounded.toLocaleString('ca-ES', { minimumFractionDigits: rounded % 1 ? 1 : 0, maximumFractionDigits: 1 }) + '%';
  }

  function formatSignedPercent(value) {
    var safeValue = Number(value) || 0;
    return (safeValue >= 0 ? '+' : '-') + formatPercent(safeValue);
  }

  function hydrateFromDataset(dataset) {
    if (!dataset) return;

    var records = Array.isArray(dataset.records) ? dataset.records : [];
    var mapNeighborhoods = window.SACDataset && Array.isArray(window.SACDataset.mapNeighborhoods) && window.SACDataset.mapNeighborhoods.length
      ? window.SACDataset.mapNeighborhoods
      : neighborhoods.map(function (item) {
        return { id: item.id, name: item.name };
      });
    var recordsByNeighborhood = {};
    var previousRecordsByNeighborhood = {};

    records.forEach(function (record) {
      if (!record || !record.neighborhoodId) return;
      if (!recordsByNeighborhood[record.neighborhoodId]) recordsByNeighborhood[record.neighborhoodId] = [];
      recordsByNeighborhood[record.neighborhoodId].push(record);
    });

    var activeRange = getActiveDateRange();
    var currentRangeStart = startOfDay(activeRange.start || (dataset.metadata && dataset.metadata.minDate) || null);
    var currentRangeEnd = startOfDay(activeRange.end || (dataset.metadata && dataset.metadata.maxDate) || null);
    var periodDays = countDaysInRange(currentRangeStart, currentRangeEnd);

    if (baseDataset && Array.isArray(baseDataset.records) && currentRangeStart && typeof window.SACDataset.filterRecordsByDateRange === 'function') {
      var previousRangeEnd = addDays(currentRangeStart, -1);
      var previousRangeStart = addDays(previousRangeEnd, -(periodDays - 1));
      var previousRecords = window.SACDataset.filterRecordsByDateRange(baseDataset.records, previousRangeStart, previousRangeEnd);

      previousRecords.forEach(function (record) {
        if (!record || !record.neighborhoodId) return;
        if (!previousRecordsByNeighborhood[record.neighborhoodId]) previousRecordsByNeighborhood[record.neighborhoodId] = [];
        previousRecordsByNeighborhood[record.neighborhoodId].push(record);
      });
    }

    var validRecords = records.filter(function (record) {
      return record && record.createdAt instanceof Date && isFinite(record.createdAt.getTime());
    }).sort(function (a, b) {
      return a.createdAt - b.createdAt;
    });

    neighborhoods = mapNeighborhoods.map(function (item) {
      var rows = recordsByNeighborhood[item.id] || [];
      var currentRows = rows;
      var previousRows = previousRecordsByNeighborhood[item.id] || [];
      var sentimentValues = rows.map(function (row) { return row.sentimentScore100; })
        .filter(function (value) { return isFinite(value); });
      var sentimentAvg = sentimentValues.length
        ? sentimentValues.reduce(function (sum, value) { return sum + value; }, 0) / sentimentValues.length
        : 0;

      var previousCount = previousRows.length;
      var currentCount = currentRows.length;
      var growth = previousCount ? ((currentCount - previousCount) / previousCount) * 100 : 0;

      return {
        id: item.id,
        name: item.name,
        visits: formatMetric(rows.length),
        purchases: '$0',
        change: formatPercent(growth),
        isGrown: growth >= 0,
        active: { value: formatMetric(currentCount), percent: formatPercent(growth), isGrown: growth >= 0 },
        newUsers: { value: formatMetric(previousCount), percent: formatPercent(growth), isGrown: growth >= 0 }
      };
    });

    sentimentById = neighborhoods.reduce(function (acc, item) {
      var rows = recordsByNeighborhood[item.id] || [];
      var currentRows = rows;
      var previousRows = previousRecordsByNeighborhood[item.id] || [];
      var currentAvg = averageSentiment(currentRows);
      var previousAvg = averageSentiment(previousRows);
      var trend = previousAvg ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;

      acc[item.id] = {
        score: Math.round(currentAvg || averageSentiment(rows)),
        trend: formatSignedPercent(trend),
        isGrown: trend >= 0
      };
      return acc;
    }, {});

    visibleNeighborhoodIds = mapNeighborhoods.map(function (item) { return item.id; });
    updateNeighborhoodCollections();

    incidentRecords = records.filter(function (record) {
      return record && record.neighborhoodId && visibleNeighborhoodSet[record.neighborhoodId];
    }).map(function (record) {
      var hasCoordinates = isFinite(record.lat) && isFinite(record.lng);
      var latlng = hasCoordinates ? [record.lat, record.lng] : getFallbackRecordLatLng(record);
      if (!latlng || !isFinite(latlng[0]) || !isFinite(latlng[1])) return null;

      return {
        id: record.neighborhoodId,
        neighborhood: record.neighborhood,
        latlng: latlng,
        title: record.id || '',
        channel: record.channel || 'Sense canal',
        type: record.typeLabel || record.classification || 'Incidència',
        sentiment: record.sentimentLabel || 'Neutre',
        date: record.createdAtLabel || '',
        message: record.message || ''
      };
    }).filter(Boolean);
  }

  function normalizeMessages(feature) {
    var data = neighborhoodById[feature.properties.id];

    if (!data || !isFinite(messageRange.min) || !isFinite(messageRange.max) || messageRange.max === messageRange.min) {
      return 0.14;
    }

    return (parseMetric(data.visits) - messageRange.min) / (messageRange.max - messageRange.min);
  }

  function mixColorChannel(start, end, amount) {
    return Math.round(start + (end - start) * amount);
  }

  function getScaledFillRgb(feature, mode) {
    var amount = normalizeMessages(feature);
    var easedAmount = Math.pow(amount, 0.9);
    var isDark = mode === 'dark';
    var start = isDark ? [37, 99, 235] : [219, 234, 254];
    var end = isDark ? [147, 197, 253] : [37, 99, 235];

    return [
      mixColorChannel(start[0], end[0], easedAmount),
      mixColorChannel(start[1], end[1], easedAmount),
      mixColorChannel(start[2], end[2], easedAmount)
    ];
  }

  function rgbToCss(rgb) {
    return 'rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')';
  }

  function currentMode(fallback) {
    return fallback || tabTheme || localStorage.getItem('hs_theme') || 'light';
  }

  function getPalette(mode) {
    var isDark = mode === 'dark';

    return {
      unknownFill: isDark ? 'rgba(59,130,246,0.24)' : 'rgba(191,219,254,0.28)',
      border: isDark ? 'rgba(96,165,250,0.94)' : 'rgba(59,130,246,0.86)',
      highlightBorder: isDark ? '#bfdbfe' : '#1d4ed8'
    };
  }

  function getTrendIcon(isGrown) {
    return isGrown
      ? '<svg class="shrink-0 size-4 text-teal-500 dark:text-teal-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>'
      : '<svg class="shrink-0 size-4 text-destructive" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>';
  }

  function getSentimentData(item) {
    return item ? sentimentById[item.id] || null : null;
  }

  function renderTable() {
    tableBody.innerHTML = visibleNeighborhoods.map(function (item) {
      var sentiment = getSentimentData(item);
      var messageTrendClass = item.isGrown
        ? 'text-teal-500 dark:text-teal-400'
        : 'text-red-500 dark:text-red-400';

      return '' +
        '<tr>' +
        '  <td class="size-px whitespace-nowrap py-3">' +
        '    <div class="flex items-center">' +
        '      <span class="text-sm font-medium text-foreground">' + item.name + '</span>' +
        '    </div>' +
        '  </td>' +
        '  <td class="size-px whitespace-nowrap py-3">' +
        '    <span class="inline-flex items-center gap-x-1.5 text-sm">' +
        '      <span class="font-medium text-foreground">' + item.visits + '</span>' +
        '      <span class="' + messageTrendClass + '">' + item.change + '</span>' +
        '      ' + getTrendIcon(item.isGrown) +
        '    </span>' +
        '  </td>' +
        '  <td class="size-px whitespace-nowrap py-3">' +
        '    <span class="inline-flex items-baseline gap-x-1 text-sm text-muted-foreground-2">' +
        '      <span class="font-medium text-foreground">' + (sentiment ? sentiment.score : '--') + '</span>' +
        '      <span class="text-xs text-muted-foreground-1">/100</span>' +
        '    </span>' +
        '  </td>' +
        '</tr>';
    }).join('');
  }

  function buildPopupHtml(feature) {
    var data = neighborhoodById[feature.properties.id];
    var sentiment = getSentimentData(data);

    if (!data) return '';

    return '' +
      '<div class="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-52 p-3 border border-line-2">' +
      '  <div class="mb-1.5"><span class="text-sm font-medium text-foreground">' + data.name + '</span></div>' +
      '  <div class="flex items-center">' +
      '    <span class="text-sm text-muted-foreground-1">Missatges:</span>' +
      '    &nbsp;<span class="text-sm font-medium text-foreground">' + data.visits + '</span>' +
      '  </div>' +
      '  <div class="flex items-center flex-wrap">' +
      '    <span class="text-sm text-muted-foreground-1">Sentiment:</span>' +
      '    &nbsp;<span class="text-sm font-medium text-foreground">' + (sentiment ? sentiment.score : '--') + '/100</span>' +
      '    &nbsp;<span class="text-sm ' + (sentiment && sentiment.isGrown ? 'text-teal-500 dark:text-teal-400' : 'text-red-500 dark:text-red-400') + '">' + (sentiment ? sentiment.trend : '--') + '</span>' +
      '    &nbsp;' + getTrendIcon(sentiment ? sentiment.isGrown : false) +
      '  </div>' +
      '</div>';
  }

  function getLayerStyle(feature, mode) {
    var colors = getPalette(mode);
    var data = neighborhoodById[feature.properties.id];
    var isDark = mode === 'dark';
    var intensity = normalizeMessages(feature);

    return {
      color: colors.border,
      weight: data ? 1.7 : 1.45,
      opacity: 1,
      fillColor: data ? rgbToCss(getScaledFillRgb(feature, mode)) : colors.unknownFill,
      fillOpacity: data ? (isDark ? 0.62 + intensity * 0.18 : 0.42 + intensity * 0.28) : (isDark ? 0.24 : 0.18)
    };
  }

  function getHoverStyle(feature, mode) {
    var colors = getPalette(mode);
    var isDark = mode === 'dark';
    var hoverFill = getScaledFillRgb(feature, mode);
    var target = isDark ? [191, 219, 254] : [29, 78, 216];
    var mixed = [
      mixColorChannel(hoverFill[0], target[0], 0.35),
      mixColorChannel(hoverFill[1], target[1], 0.35),
      mixColorChannel(hoverFill[2], target[2], 0.35)
    ];

    return {
      color: colors.highlightBorder,
      weight: 2.1,
      opacity: 1,
      fillColor: rgbToCss(mixed),
      fillOpacity: isDark ? 0.82 : 0.66
    };
  }

  function showPopup(feature, latlng, mode) {
    if (!map || !popup) return;

    popup
      .setLatLng(latlng)
      .setContent(buildPopupHtml(feature));

    if (!map.hasLayer(popup)) {
      popup.openOn(map);
    } else {
      popup.update();
    }
  }

  function hidePopup() {
    if (popupHideTimeout) {
      window.clearTimeout(popupHideTimeout);
      popupHideTimeout = null;
    }
    if (!map || !popup) return;
    map.closePopup(popup);
  }

  function cancelPopupHide() {
    if (popupHideTimeout) {
      window.clearTimeout(popupHideTimeout);
      popupHideTimeout = null;
    }
  }

  function schedulePopupHide() {
    cancelPopupHide();
    popupHideTimeout = window.setTimeout(function () {
      hidePopup();
    }, 120);
  }

  function attachPopupHoverHandlers() {
    if (!popup) return;
    var popupElement = popup.getElement();
    if (!popupElement) return;
    if (popupElement.dataset.hsPopupHoverBound === 'true') return;

    popupElement.addEventListener('mouseenter', cancelPopupHide);
    popupElement.addEventListener('mouseleave', schedulePopupHide);
    popupElement.dataset.hsPopupHoverBound = 'true';
  }

  function clearSmoothWheelTimers() {
    if (smoothWheelStopTimer) {
      window.clearTimeout(smoothWheelStopTimer);
      smoothWheelStopTimer = null;
    }
  }

  function stopSmoothWheelZoom() {
    if (smoothWheelFrame) {
      window.cancelAnimationFrame(smoothWheelFrame);
      smoothWheelFrame = null;
    }

    if (!map || smoothWheelTargetZoom === null) return;

    var minZoom = map.getMinZoom();
    var maxZoom = map.getMaxZoom();
    var targetZoom = Math.max(minZoom, Math.min(maxZoom, smoothWheelTargetZoom));
    var anchor = smoothWheelAnchorLatLng || map.getCenter();

    map.setZoomAround(anchor, targetZoom, { animate: false });
    isSmoothWheelZooming = false;
    smoothWheelTargetZoom = null;
    smoothWheelAnchorLatLng = null;

    if (currentMapMode === 'points') {
      scheduleIncidentPointsDraw();
    }
  }

  function stepSmoothWheelZoom() {
    smoothWheelFrame = null;
    if (!map || smoothWheelTargetZoom === null) return;

    var currentZoom = map.getZoom();
    var minZoom = map.getMinZoom();
    var maxZoom = map.getMaxZoom();
    var targetZoom = Math.max(minZoom, Math.min(maxZoom, smoothWheelTargetZoom));
    var delta = targetZoom - currentZoom;

    if (Math.abs(delta) < 0.004) {
      stopSmoothWheelZoom();
      return;
    }

    var easing = Math.max(0.24, Math.min(0.38, Math.abs(delta) * 0.42));
    var nextZoom = currentZoom + delta * easing;
    var anchor = smoothWheelAnchorLatLng || map.getCenter();

    map.setZoomAround(anchor, nextZoom, { animate: false });
    smoothWheelFrame = window.requestAnimationFrame(stepSmoothWheelZoom);
  }

  function scheduleSmoothWheelStop() {
    clearSmoothWheelTimers();
    smoothWheelStopTimer = window.setTimeout(function () {
      if (Date.now() - smoothWheelLastInputAt >= 80) {
        stopSmoothWheelZoom();
      }
    }, 95);
  }

  function handleSmoothWheelZoom(event) {
    if (!map) return;
    event.preventDefault();

    var deltaY = Number(event.deltaY || 0);
    if (!isFinite(deltaY) || deltaY === 0) return;

    if (event.deltaMode === 1) deltaY *= 16;
    if (event.deltaMode === 2) deltaY *= 100;

    var zoomSpeed = 0.01;
    var zoomChange = -deltaY * zoomSpeed;
    zoomChange = Math.max(-1.8, Math.min(1.8, zoomChange));

    if (zoomChange === 0) return;

    var minZoom = map.getMinZoom();
    var maxZoom = map.getMaxZoom();
    var originZoom = smoothWheelTargetZoom === null ? map.getZoom() : smoothWheelTargetZoom;

    smoothWheelTargetZoom = Math.max(minZoom, Math.min(maxZoom, originZoom + zoomChange));
    smoothWheelAnchorLatLng = map.mouseEventToLatLng(event);
    smoothWheelLastInputAt = Date.now();
    isSmoothWheelZooming = true;

    if (!smoothWheelFrame) {
      smoothWheelFrame = window.requestAnimationFrame(stepSmoothWheelZoom);
    }

    scheduleSmoothWheelStop();
  }

  function bindSmoothWheelZoom() {
    if (!map || !mapContainer || mapContainer.dataset.hsSmoothWheelBound === 'true') return;
    mapContainer.addEventListener('wheel', handleSmoothWheelZoom, { passive: false });
    mapContainer.dataset.hsSmoothWheelBound = 'true';
  }

  function ensureMap() {
    if (map) return;

    map = L.map(mapContainer, {
      zoomControl: true,
      scrollWheelZoom: false,
      doubleClickZoom: true,
      boxZoom: false,
      keyboard: true,
      tap: false,
      dragging: true,
      touchZoom: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      zoomSnap: 0,
      zoomDelta: 0.1,
      wheelPxPerZoomLevel: 20,
      wheelDebounceTime: 0,
      maxBoundsViscosity: 0.9
    });

    popup = L.popup({
      closeButton: false,
      closeOnClick: false,
      autoClose: false,
      autoPan: false,
      className: 'hs-mataro-popup'
    });

    lightLayer = L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        minZoom: 10,
        maxNativeZoom: 16,
        keepBuffer: 10,
        updateWhenZooming: false,
        updateInterval: 120,
        attribution: 'Tiles &copy; Esri'
      }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        minZoom: 10,
        maxNativeZoom: 16,
        keepBuffer: 10,
        updateWhenZooming: false,
        updateInterval: 120,
        attribution: 'Tiles &copy; Esri'
      })
    ]);

    darkLayer = lightLayer;

    map.attributionControl.setPrefix('');
    mapContainer.setAttribute('aria-label', 'Mapa dels barris de Mataró');
    bindSmoothWheelZoom();

    map.on('zoomend', scheduleIncidentPointsDraw);
    map.on('moveend', scheduleIncidentPointsDraw);
  }

  function ensureBounds() {
    if (mapBounds || !geoJson) return;

    mapBounds = L.geoJSON(geoJson).getBounds().pad(0.035);
    navigationBounds = mapBounds.pad(0.85);
  }

  function fitMap(force) {
    if (!map || !mapBounds) return;

    if (hasInitializedView && !force) return;

    var isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    var topPadding = isDesktop ? 10 : 8;
    var leftPadding = 0;
    var rightPadding = 0;
    var bottomPadding = 0;

    if (isDesktop && tablePanel && tablePanel.offsetParent !== null) {
      rightPadding = Math.round(tablePanel.getBoundingClientRect().width + 16);
    }

    map.fitBounds(mapBounds, {
      paddingTopLeft: [leftPadding, topPadding],
      paddingBottomRight: [rightPadding, bottomPadding],
      animate: false
    });

    if (navigationBounds) {
      map.setMaxBounds(navigationBounds);
    }

    map.setMinZoom(11);
    map.setMaxZoom(18);
    hasInitializedView = true;
  }

  function setBaseLayer(mode) {
    if (!map) return;

    var nextLayer = mode === 'dark' ? darkLayer : lightLayer;

    if (activeBaseLayer === nextLayer) return;

    if (activeBaseLayer) {
      map.removeLayer(activeBaseLayer);
    }

    activeBaseLayer = nextLayer;
    activeBaseLayer.addTo(map);
  }

  function clearPolygonLayer() {
    hidePopup();
    if (geoJsonLayer) {
      geoJsonLayer.remove();
      geoJsonLayer = null;
    }
  }

  function clearPointsLayer() {
    if (pointsLayer) {
      pointsLayer.remove();
      pointsLayer = null;
    }
  }

  function drawGeoJson(mode) {
    if (!map || !geoJson) return;

    clearPointsLayer();
    clearPolygonLayer();

    geoJsonLayer = L.geoJSON(geoJson, {
      style: function (feature) {
        return getLayerStyle(feature, mode);
      },
      onEachFeature: function (feature, layer) {
        var featureData = neighborhoodById[feature.properties.id];
        if (featureData && featureData.name) {
          layer.bindTooltip(featureData.name, {
            permanent: true,
            direction: 'center',
            className: 'hs-neighborhood-label',
            interactive: false,
            opacity: 1
          });
        }

        layer.on({
          mouseover: function (evt) {
            evt.target.setStyle(getHoverStyle(feature, mode));

            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
              evt.target.bringToFront();
            }

            showPopup(feature, evt.latlng, mode);
          },
          mousemove: function (evt) {
            showPopup(feature, evt.latlng, mode);
          },
          mouseout: function (evt) {
            geoJsonLayer.resetStyle(evt.target);
            hidePopup();
          }
        });
      }
    }).addTo(map);
  }

  function buildIncidentPopupHtml(incident) {
    return '' +
      '<div class="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-56 p-3 border border-line-2">' +
      '  <div class="text-sm text-foreground leading-snug">' + truncateText(incident.message, 120) + '</div>' +
      '  <div class="mt-1.5 space-y-0.5 text-sm text-muted-foreground-1">' +
      '    <div><span class="text-foreground">Data:</span> ' + incident.date + '</div>' +
      '    <div><span class="text-foreground">Sentiment:</span> ' + incident.sentiment + '</div>' +
      '    <div><span class="text-foreground">Tipus:</span> ' + incident.type + '</div>' +
      '  </div>' +
      '  <button type="button" class="mt-1.5 w-full py-1.5 px-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover">Veure més detall</button>' +
      '</div>';
  }

  function getClusterRadiusPx(zoom) {
    if (zoom >= 16.7) return 0;
    var normalized = Math.max(11, Math.min(16.7, zoom));
    return Math.max(14, Math.round(64 - ((normalized - 11) / 5.7) * 50));
  }

  function clusterIncidentRecords(zoom) {
    if (!map || !incidentRecords.length) return [];

    var radius = getClusterRadiusPx(zoom);
    if (radius <= 0) {
      return incidentRecords.map(function (incident) {
        return {
          count: 1,
          latlng: incident.latlng,
          incidents: [incident]
        };
      });
    }

    var radiusSquared = radius * radius;
    var clusters = [];

    incidentRecords.forEach(function (incident) {
      var projectedPoint = map.project(incident.latlng, zoom);
      var targetCluster = null;
      var bestDistance = radiusSquared;

      for (var i = 0; i < clusters.length; i++) {
        var cluster = clusters[i];
        var dx = projectedPoint.x - cluster.x;
        var dy = projectedPoint.y - cluster.y;
        var distanceSquared = dx * dx + dy * dy;
        if (distanceSquared <= bestDistance) {
          bestDistance = distanceSquared;
          targetCluster = cluster;
        }
      }

      if (!targetCluster) {
        clusters.push({
          x: projectedPoint.x,
          y: projectedPoint.y,
          incidents: [incident],
          count: 1
        });
        return;
      }

      targetCluster.incidents.push(incident);
      targetCluster.count += 1;
      targetCluster.x = ((targetCluster.x * (targetCluster.count - 1)) + projectedPoint.x) / targetCluster.count;
      targetCluster.y = ((targetCluster.y * (targetCluster.count - 1)) + projectedPoint.y) / targetCluster.count;
    });

    return clusters.map(function (cluster) {
      return {
        count: cluster.count,
        latlng: map.unproject(L.point(cluster.x, cluster.y), zoom),
        incidents: cluster.incidents
      };
    });
  }

  function drawIncidentPoints(zoomLevel) {
    clearPolygonLayer();
    clearPointsLayer();
    if (!map || !incidentRecords.length) return;

    var zoom = typeof zoomLevel === 'number' ? zoomLevel : map.getZoom();
    var clusters = clusterIncidentRecords(zoom);

    pointsLayer = L.layerGroup();

    clusters.forEach(function (cluster) {
      var representative = cluster.incidents[0];
      var count = cluster.count;

      var marker = L.marker(cluster.latlng, {
        icon: getIncidentIcon(count),
        keyboard: false,
        interactive: true
      });

      if (count === 1) {
        marker.on('mouseover', function () {
          cancelPopupHide();
          popup
            .setLatLng(cluster.latlng)
            .setContent(buildIncidentPopupHtml(representative));
          if (!map.hasLayer(popup)) {
            popup.openOn(map);
          } else {
            popup.update();
          }
          window.requestAnimationFrame(attachPopupHoverHandlers);
        });
        marker.on('mouseout', function () {
          schedulePopupHide();
        });
      } else {
        marker.on('click', function () {
          var bounds = L.latLngBounds(cluster.incidents.map(function (incident) {
            return incident.latlng;
          }));
          map.fitBounds(bounds.pad(0.45), {
            animate: true,
            maxZoom: Math.min(18, map.getZoom() + 2)
          });
        });
      }

      marker.addTo(pointsLayer);
    });

    pointsLayer.addTo(map);
  }

  function scheduleIncidentPointsDraw() {
    if (!map || currentMapMode !== 'points' || isSmoothWheelZooming) return;

    window.cancelAnimationFrame(zoomFrame);
    zoomFrame = window.requestAnimationFrame(function () {
      drawIncidentPoints(map.getZoom());
    });
  }

  function setMapMode(mode, shouldRender) {
    if (mode !== 'areas' && mode !== 'points') return;
    currentMapMode = mode;
    setModeButtons(mode);

    if (shouldRender) {
      renderMap(currentMode());
    }
  }

  function renderMap(mode) {
    if (!geoJson) return;

    ensureMap();
    ensureBounds();
    setBaseLayer(mode);
    if (currentMapMode === 'points') {
      drawIncidentPoints(map.getZoom());
    } else {
      drawGeoJson(mode);
    }
    map.invalidateSize(false);
    fitMap(false);
  }

  function renderAll(mode) {
    var activeMode = currentMode(mode);
    renderTable();
    renderMap(activeMode);
  }

  function handleGeoJson(json) {
    if (!json || !json.features) {
      console.error('Could not load Mataro neighborhoods GeoJSON');
      return;
    }

    geoJson = {
      type: json.type,
      features: json.features.filter(function (feature) {
        return feature && feature.properties && visibleNeighborhoodSet[feature.properties.id];
      })
    };

    refreshNeighborhoodGeometryCache();
    if (baseDataset) {
      try {
        hydrateFromDataset(getDatasetForCurrentDateRange(baseDataset));
      } catch (error) {
        console.error('No s’han pogut hidratar les dades del mapa des del dataset', error);
      }
    } else {
      buildIncidentPointsByZoom();
    }
    renderAll(currentMode());
  }

  function refreshMapFromDateRange() {
    if (!baseDataset || !geoJson) return;

    try {
      hydrateFromDataset(getDatasetForCurrentDateRange(baseDataset));
      renderAll(currentMode());
    } catch (error) {
      console.error('No s’ha pogut actualitzar el mapa amb el rang de dates seleccionat', error);
    }
  }

  mapModeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var mode = button.getAttribute('data-map-mode');
      setMapMode(mode, true);
    });
  });

  function bootstrapWithGeoJsonData(geoJsonData) {
    if (window.SACDataset && typeof window.SACDataset.load === 'function') {
      window.SACDataset.load()
        .then(function (dataset) {
          baseDataset = dataset;
          handleGeoJson(geoJsonData);
        })
        .catch(function (error) {
          console.error('No s’ha pogut carregar el dataset del mapa', error);
          handleGeoJson(geoJsonData);
        });
      return;
    }

    handleGeoJson(geoJsonData);
  }

  if (window.SAC_MATARO_BARRIS && window.SAC_MATARO_BARRIS.features) {
    bootstrapWithGeoJsonData(window.SAC_MATARO_BARRIS);
  } else {
    fetch('../assets/data/mataro-barris.geojson')
      .then(function (response) { return response.json(); })
      .then(bootstrapWithGeoJsonData)
      .catch(function (error) {
        console.error('Could not load Mataro neighborhoods GeoJSON', error);
      });
  }

  window.addEventListener('on-hs-appearance-change', function (evt) {
    tabTheme = evt.detail;
    renderAll(tabTheme);
  });

  window.addEventListener('on-hs-color-theme-change', function (evt) {
    renderAll(currentMode(evt.detail));
  });

  if (tabpanel) {
    tabpanel.addEventListener('on-hs-appearance-change', function (evt) {
      tabTheme = evt.detail;
      renderAll(tabTheme);
    });
  }

  document.addEventListener('sac:date-range-changed', function () {
    refreshMapFromDateRange();
  });

  window.addEventListener('resize', function () {
    if (!map || !geoJson) return;

    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(function () {
      map.invalidateSize(false);
      fitMap(true);
      if (currentMapMode === 'points') {
        scheduleIncidentPointsDraw();
      }
    });
  });

  window.addEventListener('load', function () {
    if (!map || !geoJson) return;

    window.requestAnimationFrame(function () {
      map.invalidateSize(false);
      fitMap(true);
      if (currentMapMode === 'points') {
        scheduleIncidentPointsDraw();
      }
    });
  });

  setModeButtons(currentMapMode);
})();
