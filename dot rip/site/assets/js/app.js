let onlineData = [];
let defsData = [];
let usMapPaths = [];

async function loadDashboardData() {
  const [online, defs, mapPaths] = await Promise.all([
    fetch("assets/data/onlineData.json").then(r => r.json()),
    fetch("assets/data/defsData.json").then(r => r.json()),
    fetch("assets/data/usMapPaths.json").then(r => r.json())
  ]);
  onlineData = online;
  defsData = defs;
  usMapPaths = mapPaths;
}
    const $ = (id) => document.getElementById(id);
    function applyTheme(theme) {
      const isDark = theme === "dark";
      document.body.classList.toggle("dark", isDark);
      const btn = $("themeToggle");
      if (btn) {
        btn.classList.toggle("is-night", isDark);
        btn.classList.toggle("is-day", !isDark);
        btn.setAttribute("aria-checked", String(isDark));
      }
      localStorage.setItem("dotRipTheme", isDark ? "dark" : "day");
      applyBasemapTheme(theme);
    }
    function getBasemapUrls(theme) {
      const isDark = theme === "dark";
      return {
        base: isDark ? CARTO_DARK_MATTER_URL : CARTO_POSITRON_URL
      };
    }
    function setBasemapForMap(map, currentLayers, theme, showAttribution) {
      if (!map || !window.L) return null;
      if (currentLayers) {
        if (currentLayers.base) map.removeLayer(currentLayers.base);
      }
      const urls = getBasemapUrls(theme);
      const base = window.L.tileLayer(urls.base, {
        subdomains: "abcd",
        maxZoom: 20,
        attribution: showAttribution ? "&copy; OpenStreetMap contributors &copy; CARTO" : ""
      }).addTo(map);
      return { base };
    }
    function applyBasemapTheme(theme) {
      const activeTheme = theme || (document.body.classList.contains("dark") ? "dark" : "day");
      if (usLeafletMap) usBasemapLayers = setBasemapForMap(usLeafletMap, usBasemapLayers, activeTheme, true);
      if (akInsetMap) akBasemapLayers = setBasemapForMap(akInsetMap, akBasemapLayers, activeTheme, false);
      if (hiInsetMap) hiBasemapLayers = setBasemapForMap(hiInsetMap, hiBasemapLayers, activeTheme, false);
    }
    const STATE_NAMES = {
      AL:"Alabama", AK:"Alaska", AZ:"Arizona", AR:"Arkansas", CA:"California", CO:"Colorado", CT:"Connecticut", DE:"Delaware", FL:"Florida", GA:"Georgia",
      HI:"Hawaii", ID:"Idaho", IL:"Illinois", IN:"Indiana", IA:"Iowa", KS:"Kansas", KY:"Kentucky", LA:"Louisiana", ME:"Maine", MD:"Maryland",
      MA:"Massachusetts", MI:"Michigan", MN:"Minnesota", MS:"Mississippi", MO:"Missouri", MT:"Montana", NE:"Nebraska", NV:"Nevada", NH:"New Hampshire", NJ:"New Jersey",
      NM:"New Mexico", NY:"New York", NC:"North Carolina", ND:"North Dakota", OH:"Ohio", OK:"Oklahoma", OR:"Oregon", PA:"Pennsylvania", RI:"Rhode Island", SC:"South Carolina",
      SD:"South Dakota", TN:"Tennessee", TX:"Texas", UT:"Utah", VT:"Vermont", VA:"Virginia", WA:"Washington", WV:"West Virginia", WI:"Wisconsin", WY:"Wyoming", DC:"District of Columbia"
    };
    const HAZARD_TYPES = ["Flood", "Severe storm", "Hurricane", "Wildfire", "Drought/Heat", "Winter storm"];
    const TREND_BINS = ["1995", "2000", "2005", "2010", "2015", "2020", "2025"];
    const ASSET_TYPES = ["Road miles", "Bridges", "Rail miles", "Transit/ferry"];
    const MAP_ZOOM_MIN = 3;
    const MAP_ZOOM_MAX = 8;
    const MAP_SCALE_BASE_PX = 120;
    const MAP_DEFAULT_SCALE_MI = 400;
    const LEAFLET_STATES_GEOJSON_URL = "assets/data/usStates.geojson";
    const CARTO_POSITRON_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    const CARTO_DARK_MATTER_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    const COASTAL_STATES = new Set(["AL","CA","CT","DE","FL","GA","HI","LA","MA","MD","ME","MS","NC","NH","NJ","NY","OR","RI","SC","TX","VA","WA"]);
    const WILDFIRE_STATES = new Set(["AK","AZ","CA","CO","ID","MT","NM","NV","OR","UT","WA","WY"]);
    const WINTER_STATES = new Set(["AK","CO","CT","IA","ID","IL","IN","MA","ME","MI","MN","MT","ND","NE","NH","NY","OH","PA","SD","UT","VT","WI","WY"]);
    const NAME_TO_STATE = Object.fromEntries(Object.entries(STATE_NAMES).map(([code, name]) => [name, code]));
    const INSET_CODES = new Set(["AK", "HI"]);
    const SMALL_STATE_LABEL_OFFSETS = {
      MA: [26, -16], RI: [34, -2], CT: [30, 12], NJ: [30, 6],
      DE: [30, 18], MD: [32, 28], DC: [34, 36], VT: [26, -10], NH: [30, 2]
    };
    let usLeafletMap = null;
    let usStateLayer = null;
    let akInsetMap = null;
    let hiInsetMap = null;
    let akStateLayer = null;
    let hiStateLayer = null;
    let usLabelLayer = null;
    let akLabelLayer = null;
    let hiLabelLayer = null;
    let usBasemapLayers = null;
    let akBasemapLayers = null;
    let hiBasemapLayers = null;
    let hoveredStateCode = "";

    function updateMapZoomButtons() {
      const zoomInBtn = $("mapZoomIn");
      const zoomOutBtn = $("mapZoomOut");
      if (!zoomInBtn || !zoomOutBtn || !usLeafletMap) return;
      const z = usLeafletMap.getZoom();
      zoomInBtn.disabled = z >= MAP_ZOOM_MAX;
      zoomOutBtn.disabled = z <= MAP_ZOOM_MIN;
    }

    function mapStateStyle(code) {
      const selected = activeState();
      const hasRip = availableStates().has(code);
      const isSelected = selected === code;
      const isHovered = hoveredStateCode === code;
      return {
        color: isHovered ? "#ffffff" : "#111111",
        weight: isSelected ? 1.8 : (isHovered ? 1.4 : 0.8),
        fillColor: isSelected ? "#0b3b6f" : (isHovered ? "#0b3b6f" : (hasRip ? "#2f7d57" : "#d9dee4")),
        fillOpacity: 1
      };
    }

    function featureStateCode(feature) {
      const name = feature && feature.properties ? feature.properties.name : "";
      return NAME_TO_STATE[name] || "";
    }

    function applyLayerStyles(layerGroup) {
      if (!layerGroup) return;
      layerGroup.eachLayer(layer => {
        const code = featureStateCode(layer.feature);
        layer.setStyle(mapStateStyle(code));
      });
    }

    function setHoveredState(code) {
      hoveredStateCode = code || "";
      applyLayerStyles(usStateLayer);
      applyLayerStyles(akStateLayer);
      applyLayerStyles(hiStateLayer);
    }

    function pointInRing(lng, lat, ring) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersects = ((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi);
        if (intersects) inside = !inside;
      }
      return inside;
    }

    function pointInGeometry(latLng, geometry) {
      if (!latLng || !geometry) return false;
      const lng = latLng.lng;
      const lat = latLng.lat;
      if (geometry.type === "Polygon") {
        const [outer, ...holes] = geometry.coordinates;
        if (!pointInRing(lng, lat, outer)) return false;
        return !holes.some(hole => pointInRing(lng, lat, hole));
      }
      if (geometry.type === "MultiPolygon") {
        return geometry.coordinates.some(poly => {
          const [outer, ...holes] = poly;
          if (!pointInRing(lng, lat, outer)) return false;
          return !holes.some(hole => pointInRing(lng, lat, hole));
        });
      }
      return false;
    }

    function pointInFeature(latLng, feature) {
      return pointInGeometry(latLng, feature && feature.geometry);
    }

    function intersectsRect(a, b) {
      return !(a.x2 <= b.x1 || a.x1 >= b.x2 || a.y2 <= b.y1 || a.y1 >= b.y2);
    }

    function labelRectForPoint(point, width, height, padding) {
      return {
        x1: point.x - width / 2 - padding,
        y1: point.y - height / 2 - padding,
        x2: point.x + width / 2 + padding,
        y2: point.y + height / 2 + padding
      };
    }

    function boxInsideState(map, point, width, height, feature) {
      const halfW = width / 2;
      const halfH = height / 2;
      const corners = [
        window.L.point(point.x - halfW, point.y - halfH),
        window.L.point(point.x + halfW, point.y - halfH),
        window.L.point(point.x - halfW, point.y + halfH),
        window.L.point(point.x + halfW, point.y + halfH),
        point
      ];
      return corners.every(corner => pointInFeature(map.containerPointToLatLng(corner), feature));
    }

    function pointInAnyState(map, point, features, exceptCode) {
      const latLng = map.containerPointToLatLng(point);
      return features.some(item => item.code !== exceptCode && pointInFeature(latLng, item.feature));
    }

    function boxOutsideAllStates(map, point, width, height, features, exceptCode) {
      const halfW = width / 2;
      const halfH = height / 2;
      const checks = [
        point,
        window.L.point(point.x - halfW, point.y - halfH),
        window.L.point(point.x + halfW, point.y - halfH),
        window.L.point(point.x - halfW, point.y + halfH),
        window.L.point(point.x + halfW, point.y + halfH)
      ];
      return checks.every(candidate => !pointInAnyState(map, candidate, features, exceptCode));
    }

    function labelOffsets(step, rings) {
      const offsets = [[0, 0]];
      for (let ring = 1; ring <= rings; ring += 1) {
        const radius = ring * step;
        for (let i = 0; i < 8; i += 1) {
          const angle = (Math.PI * 2 * i) / 8;
          offsets.push([Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius)]);
        }
      }
      return offsets;
    }

    function rebuildLabels(map, stateLayer, labelLayer, useLeaderLines) {
      if (!map || !stateLayer || !labelLayer) return;
      labelLayer.clearLayers();
      const zoom = map.getZoom ? map.getZoom() : 4;
      const labelSize = Math.max(9, Math.min(18, Math.round(7 + zoom * 1.2)));
      stateLayer.eachLayer(layer => {
        const code = featureStateCode(layer.feature);
        if (!code) return;
        const bounds = layer.getBounds();
        if (!bounds.isValid()) return;
        const center = typeof layer.getCenter === "function" ? layer.getCenter() : bounds.getCenter();
        const labelLatLng = center;

        window.L.marker(labelLatLng, {
          interactive: false,
          keyboard: false,
          icon: window.L.divIcon({
            className: "state-name-label",
            html: `<span class="state-name-text" style="font-size:${labelSize}px">${code}</span>`,
            iconSize: null
          })
        }).addTo(labelLayer);
      });
    }

    function buildFeatureCollection(allGeojson, predicate) {
      return {
        type: "FeatureCollection",
        features: allGeojson.features.filter(feature => predicate(featureStateCode(feature)))
      };
    }

    function createStateLayer(map, featureCollection) {
      return window.L.geoJSON(featureCollection, {
        style: (feature) => mapStateStyle(featureStateCode(feature)),
        onEachFeature: (feature, layer) => {
          const code = featureStateCode(feature);
          if (!code) return;
          layer.on("click", () => setSelectedState(activeState() === code ? "" : code));
          layer.on("mouseover", () => setHoveredState(code));
          layer.on("mouseout", () => {
            if (hoveredStateCode === code) setHoveredState("");
          });
        }
      }).addTo(map);
    }

    async function initLeafletMap() {
      if (usLeafletMap) return;
      if (!window.L) throw new Error("Leaflet is not loaded");

      usLeafletMap = window.L.map("usMap", {
        zoomControl: false,
        minZoom: MAP_ZOOM_MIN,
        maxZoom: MAP_ZOOM_MAX,
        zoomSnap: 0.25,
        scrollWheelZoom: true
      });

      usBasemapLayers = setBasemapForMap(usLeafletMap, null, document.body.classList.contains("dark") ? "dark" : "day", true);

      const geojson = await fetch(LEAFLET_STATES_GEOJSON_URL).then(r => r.json());
      const mainlandStates = buildFeatureCollection(geojson, code => code && !INSET_CODES.has(code));
      const alaskaState = buildFeatureCollection(geojson, code => code === "AK");
      const hawaiiState = buildFeatureCollection(geojson, code => code === "HI");

      usStateLayer = createStateLayer(usLeafletMap, mainlandStates);
      usLabelLayer = window.L.layerGroup().addTo(usLeafletMap);
      usLeafletMap.fitBounds(usStateLayer.getBounds(), { padding: [0, 0], maxZoom: 5 });
      usLeafletMap.setZoom(bestZoomForMiles(usLeafletMap, MAP_DEFAULT_SCALE_MI, MAP_SCALE_BASE_PX));
      createClassicScaleBarControl(usLeafletMap);

      akInsetMap = window.L.map("usMapAk", {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false
      });
      hiInsetMap = window.L.map("usMapHi", {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false
      });

      akBasemapLayers = setBasemapForMap(akInsetMap, null, document.body.classList.contains("dark") ? "dark" : "day", false);
      hiBasemapLayers = setBasemapForMap(hiInsetMap, null, document.body.classList.contains("dark") ? "dark" : "day", false);

      akStateLayer = createStateLayer(akInsetMap, alaskaState);
      hiStateLayer = createStateLayer(hiInsetMap, hawaiiState);
      akLabelLayer = window.L.layerGroup().addTo(akInsetMap);
      hiLabelLayer = window.L.layerGroup().addTo(hiInsetMap);
      if (akStateLayer.getBounds().isValid()) akInsetMap.fitBounds(akStateLayer.getBounds(), { padding: [6, 6] });
      if (hiStateLayer.getBounds().isValid()) hiInsetMap.fitBounds(hiStateLayer.getBounds(), { padding: [6, 6] });

      rebuildLabels(usLeafletMap, usStateLayer, usLabelLayer, true);
      rebuildLabels(akInsetMap, akStateLayer, akLabelLayer, false);
      rebuildLabels(hiInsetMap, hiStateLayer, hiLabelLayer, false);

      usLeafletMap.on("zoomend moveend", () => {
        updateMapZoomButtons();
        rebuildLabels(usLeafletMap, usStateLayer, usLabelLayer, true);
      });
      updateMapZoomButtons();
    }

    function unique(data, key) {
      return [...new Set(data.map(r => r[key]).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b)));
    }
    function fillSelect(id, values) {
      const select = $(id);
      if (!select) return;
      values.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
      });
    }
    function textCell(row, text, className) {
      const td = document.createElement("td");
      if (className) td.className = className;
      td.textContent = text || "";
      row.appendChild(td);
      return td;
    }
    function pillCell(row, text, className) {
      const td = document.createElement("td");
      const span = document.createElement("span");
      span.className = "pill " + className;
      span.textContent = text || "";
      td.appendChild(span);
      row.appendChild(td);
    }
    function accessClass(value) {
      const v = String(value || "").toLowerCase();
      if (["not confirmed", "under development", "account", "not public"].some(x => v.includes(x))) return "pill-warning";
      if (String(value || "").includes("Public")) return "pill-public";
      return "pill-other";
    }
    function dotClass(value) {
      const v = String(value || "");
      if (v.startsWith("Yes")) return "pill-dot";
      if (v.includes("External") || v.includes("Related")) return "pill-ext";
      return "pill-other";
    }
    function isPublicTool(row) {
      const t = String(row.type || "").toLowerCase();
      return String(row.dot_specific || "").startsWith("Yes") && String(row.access || "").includes("Public") && ["tool","viewer","map","service"].some(x => t.includes(x));
    }
    function isRestricted(row) {
      const a = String(row.access || "").toLowerCase();
      return ["not confirmed","under development","account","not public"].some(x => a.includes(x));
    }
    function availableStates() {
      return new Set([...onlineData.map(r => r.state), ...defsData.map(r => r["State code"])].filter(Boolean));
    }
    function activeState() {
      const activePanel = document.querySelector(".panel.active");
      if (activePanel && activePanel.id === "onlinePanel") return onlineControls.state.value;
      return defsControls.state.value || onlineControls.state.value;
    }
    function setSelectedState(state) {
      defsControls.state.value = state;
      onlineControls.state.value = state;
      applyDefs();
      applyOnline();
    }
    function seededValue(code, index) {
      const chars = code.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
      return ((chars * (index + 7) * 37) % 97) / 97;
    }
    function stateHazardProfile(code) {
      const coastal = COASTAL_STATES.has(code);
      const wildfire = WILDFIRE_STATES.has(code);
      const winter = WINTER_STATES.has(code);
      const ripBoost = availableStates().has(code) ? 1.12 : 0.92;
      const base = 4 + seededValue(code, 1) * 7;
      const hazardMultipliers = {
        "Flood": 1.1 + (coastal ? .35 : 0) + seededValue(code, 2) * .45,
        "Severe storm": 1.25 + seededValue(code, 3) * .5,
        "Hurricane": (coastal ? 1.25 : .28) + seededValue(code, 4) * .38,
        "Wildfire": (wildfire ? 1.15 : .22) + seededValue(code, 5) * .42,
        "Drought/Heat": .78 + seededValue(code, 6) * .6,
        "Winter storm": (winter ? .86 : .22) + seededValue(code, 7) * .5
      };
      const hazards = HAZARD_TYPES.map((type, index) => ({
        type,
        events: Math.max(1, Math.round((base * hazardMultipliers[type]) / 1.5)),
        loss: Number((base * hazardMultipliers[type] * ripBoost * (1.4 + seededValue(code, index + 9) * 4.8)).toFixed(1))
      }));
      const trend = TREND_BINS.map((bin, index) => {
        const era = .72 + index * .16;
        const pulse = 1 + seededValue(code, index + 13) * .9;
        return { bin, loss: Number((hazards.reduce((sum, h) => sum + h.loss, 0) / 6 * era * pulse).toFixed(1)) };
      });
      const totalLoss = Number(hazards.reduce((sum, h) => sum + h.loss, 0).toFixed(1));
      const totalEvents = hazards.reduce((sum, h) => sum + h.events, 0);
      const assets = ASSET_TYPES.map((type, index) => ({
        type,
        count: Math.round((totalEvents * (8 + index * 4) + totalLoss * (1.6 + index * .35)) * (.72 + seededValue(code, index + 20)))
      }));
      return { code, hazards, trend, assets, totalLoss, totalEvents };
    }
    function selectedHazardProfiles() {
      const selected = activeState();
      const codes = selected ? [selected] : usMapPaths.map(item => item.state);
      return codes.map(stateHazardProfile);
    }
    function combinedHazardData() {
      const profiles = selectedHazardProfiles();
      const hazards = HAZARD_TYPES.map(type => ({
        type,
        events: profiles.reduce((sum, profile) => sum + profile.hazards.find(h => h.type === type).events, 0),
        loss: Number(profiles.reduce((sum, profile) => sum + profile.hazards.find(h => h.type === type).loss, 0).toFixed(1))
      }));
      const trend = TREND_BINS.map(bin => ({
        bin,
        loss: Number(profiles.reduce((sum, profile) => sum + profile.trend.find(t => t.bin === bin).loss, 0).toFixed(1))
      }));
      const assets = ASSET_TYPES.map(type => ({
        type,
        count: profiles.reduce((sum, profile) => sum + profile.assets.find(a => a.type === type).count, 0)
      }));
      return {
        hazards,
        trend,
        assets,
        totalLoss: Number(profiles.reduce((sum, profile) => sum + profile.totalLoss, 0).toFixed(1)),
        totalEvents: profiles.reduce((sum, profile) => sum + profile.totalEvents, 0)
      };
    }
    function moneyB(value) {
      return "$" + Number(value).toLocaleString(undefined, { maximumFractionDigits: value >= 100 ? 0 : 1 }) + "B";
    }
    function compactNumber(value) {
      return Number(value).toLocaleString();
    }
    function polarToCartesian(cx, cy, r, angleRad) {
      return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
    }
    function donutSlicePath(cx, cy, outerR, innerR, startAngle, endAngle) {
      const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
      const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
      const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
      const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
      return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerEnd.x} ${innerEnd.y}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
        "Z"
      ].join(" ");
    }
    function shade(hex, factor) {
      const v = hex.replace("#", "");
      const n = parseInt(v, 16);
      const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * factor)));
      const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * factor)));
      const b = Math.max(0, Math.min(255, Math.round((n & 255) * factor)));
      return `rgb(${r}, ${g}, ${b})`;
    }
    function niceScaleMiles(raw) {
      if (!Number.isFinite(raw) || raw <= 0) return 1;
      const power = Math.floor(Math.log10(raw));
      const base = raw / (10 ** power);
      const steps = [1, 1.5, 2, 3, 4, 5, 7.5, 10];
      const step = steps.find(v => v >= base) || 10;
      return step * (10 ** power);
    }

    function milesPerPixelAt(lat, zoom) {
      const metersPerPixel = 156543.03392 * Math.cos((lat * Math.PI) / 180) / (2 ** zoom);
      return metersPerPixel * 0.000621371;
    }

    function scaleMilesForZoom(map, zoom, barPx) {
      const centerLat = map.getCenter().lat;
      return milesPerPixelAt(centerLat, zoom) * barPx;
    }

    function bestZoomForMiles(map, targetMiles, barPx) {
      let bestZoom = MAP_ZOOM_MIN;
      let bestShownDiff = Infinity;
      let bestRawDiff = Infinity;
      for (let z = MAP_ZOOM_MIN; z <= MAP_ZOOM_MAX + 0.001; z += 0.25) {
        const rawMiles = scaleMilesForZoom(map, z, barPx);
        const shownMiles = niceScaleMiles(rawMiles);
        const shownDiff = Math.abs(shownMiles - targetMiles);
        const rawDiff = Math.abs(rawMiles - targetMiles);
        if (shownDiff < bestShownDiff || (shownDiff === bestShownDiff && rawDiff < bestRawDiff)) {
          bestShownDiff = shownDiff;
          bestRawDiff = rawDiff;
          bestZoom = Number(z.toFixed(2));
        }
      }
      return bestZoom;
    }

    function createClassicScaleBarControl(map) {
      if (!map || !window.L) return;
      const control = window.L.control({ position: "bottomleft" });
      control.onAdd = () => {
        const container = window.L.DomUtil.create("div", "map-scale-module");
        container.innerHTML = `
          <div class="map-scale-labels">
            <span class="map-scale-l0">0</span>
            <span class="map-scale-l1"></span>
            <span class="map-scale-l2"></span>
            <span class="map-scale-l3"></span>
          </div>
          <div class="map-scale-track-wrap">
            <div class="map-scale-track">
              <span class="seg dark"></span><span class="seg light"></span><span class="seg dark"></span><span class="seg light"></span>
            </div>
          </div>
        `;
        window.L.DomEvent.disableClickPropagation(container);
        window.L.DomEvent.disableScrollPropagation(container);

        const scaleTrack = container.querySelector(".map-scale-track");
          const l1 = container.querySelector(".map-scale-l1");
          const l2 = container.querySelector(".map-scale-l2");
          const l3 = container.querySelector(".map-scale-l3");
          const fmt = (v) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);

        const updateScaleUi = () => {
          const z = map.getZoom();
          const rawMiles = scaleMilesForZoom(map, z, MAP_SCALE_BASE_PX);
          const niceMiles = niceScaleMiles(rawMiles);
          const width = Math.max(36, Math.min(MAP_SCALE_BASE_PX, (niceMiles / rawMiles) * MAP_SCALE_BASE_PX));
          scaleTrack.style.width = `${Math.round(width)}px`;
            l1.textContent = String(fmt(niceMiles / 4));
            l2.textContent = String(fmt(niceMiles / 2));
            l3.textContent = `${fmt(niceMiles)} mi`;
        };


        map.on("zoomend moveend", updateScaleUi);
        updateScaleUi();
        return container;
      };
      control.addTo(map);
    }
    function renderMetrics(data, label) {
      const topHazard = [...data.hazards].sort((a,b) => b.loss - a.loss)[0];
      const topAsset = [...data.assets].sort((a,b) => b.count - a.count)[0];
      $("hazardMetrics").innerHTML = [
        [moneyB(data.totalLoss), "Estimated major-disaster economic loss"],
        [compactNumber(data.totalEvents), "Major hazard events represented"],
        [topHazard.type, "Largest estimated loss category"],
        [compactNumber(topAsset.count), topAsset.type + " affected"]
      ].map(([value, text], index) => `<div class="hazard-card" style="animation-delay:${index * 45}ms"><div class="hazard-value">${value}</div><div class="hazard-label">${text}</div></div>`).join("");
      $("disasterSubtitle").textContent = label + " natural hazard demo, 1996-2025. Click another state on the map to update.";
    }
    function renderBarChart(rows) {
      const sorted = [...rows].sort((a,b) => b.loss - a.loss);
      const total = sorted.reduce((sum, row) => sum + row.loss, 0) || 1;
      const palette = ["#4e79a7", "#2f9aa4", "#59a14f", "#f28e2b", "#e15759", "#b07aa1"];
      const cx = 114;
      const cy = 108;
      const outerR = 76;
      const innerR = 44;
      let angle = -Math.PI / 2;

      const slices = [];
      const legend = [];

      sorted.forEach((row, index) => {
        const ratio = row.loss / total;
        const span = ratio * Math.PI * 2;
        const start = angle;
        const end = angle + span;
        const color = palette[index % palette.length];
        const path = donutSlicePath(cx, cy, outerR, innerR, start, end);
        slices.push(`<path d="${path}" fill="${color}" stroke="${shade(color, 0.84)}" stroke-width="1.2"></path>`);
        legend.push(`<li><span class="pie-legend-dot" style="background:${color}"></span><span class="pie-legend-name">${row.type}</span><span class="pie-legend-val">${moneyB(row.loss)}</span></li>`);
        angle = end;
      });

      $("hazardBarChart").innerHTML = `
        <div class="pie-flat-wrap">
          <svg class="pie-flat-svg" viewBox="0 0 250 220" role="img" aria-label="Estimated economic loss by hazard donut chart">
            <defs>
              <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.6" flood-opacity="0.22"></feDropShadow>
              </filter>
            </defs>
            <circle cx="${cx}" cy="${cy}" r="${outerR}" fill="none" stroke="rgba(116,138,160,.16)" stroke-width="${outerR - innerR}"></circle>
            <g filter="url(#pieShadow)">${slices.join("")}</g>
            <circle cx="${cx}" cy="${cy}" r="${innerR - 2}" fill="var(--panel)"></circle>
            <text class="pie-center-title" x="${cx}" y="${cy - 4}">Total</text>
            <text class="pie-center-value" x="${cx}" y="${cy + 16}">${moneyB(total)}</text>
          </svg>
          <ul class="pie-legend">${legend.join("")}</ul>
        </div>
      `;
    }
    function renderAssetChart(rows) {
      const max = Math.max(...rows.map(row => row.count), 1);
      $("assetImpactChart").innerHTML = rows.map(row => `
        <div class="asset-row">
          <div class="asset-label" title="${row.type}">${row.type}</div>
          <div class="asset-track"><div class="asset-fill" style="--bar-width:${Math.max(5, row.count / max * 100)}%"></div></div>
          <div class="asset-value">${compactNumber(row.count)}</div>
        </div>
      `).join("");
    }
    function renderTrendChart(rows) {
      const svg = $("lossTrendChart");
      const max = Math.max(...rows.map(row => row.loss), 1);
      const min = Math.min(...rows.map(row => row.loss), 0);
      const width = 520, height = 230, left = 54, right = 16, top = 18, bottom = 52;
      const plotW = width - left - right;
      const plotH = height - top - bottom;
      const points = rows.map((row, index) => {
        const x = left + (plotW / (rows.length - 1)) * index;
        const y = top + plotH - ((row.loss - min) / (max - min || 1)) * plotH;
        return { ...row, x, y };
      });
      const line = points.map(point => `${point.x},${point.y}`).join(" ");
      const area = `${left},${top + plotH} ${line} ${left + plotW},${top + plotH}`;
      svg.innerHTML = `
        <line class="trend-axis" x1="${left}" y1="${top + plotH}" x2="${left + plotW}" y2="${top + plotH}"></line>
        <line class="trend-axis" x1="${left}" y1="${top}" x2="${left}" y2="${top + plotH}"></line>
        <polygon class="trend-area" points="${area}"></polygon>
        <polyline class="trend-line" points="${line}"></polyline>
        ${points.map(point => `<circle class="trend-dot" cx="${point.x}" cy="${point.y}" r="4"></circle>`).join("")}
        ${points.map(point => `<text class="trend-label" x="${point.x}" y="${height - 13}">${point.bin}</text>`).join("")}
        ${points.map(point => `<text class="trend-value" x="${point.x}" y="${Math.max(12, point.y - 9)}">${moneyB(point.loss)}</text>`).join("")}
        <text class="trend-axis-title" x="${left + plotW / 2}" y="${height - 2}">Time Period (5-year bins)</text>
        <text class="trend-axis-title" x="12" y="${top + plotH / 2}" transform="rotate(-90 12 ${top + plotH / 2})">Estimated Loss (USD billions)</text>
      `;
    }
    function renderDisasterDashboard() {
      const selected = activeState();
      const label = selected ? `${selected} - ${STATE_NAMES[selected] || selected}` : "United States";
      const data = combinedHazardData();
      renderMetrics(data, label);
      renderBarChart(data.hazards);
      renderTrendChart(data.trend);
      renderAssetChart(data.assets);
    }
    function rowMatches(row, keys, query) {
      if (!query) return true;
      const q = query.toLowerCase();
      return keys.some(k => String(row[k] || "").toLowerCase().includes(q));
    }
    function pathCenterFromD(d) {
      const nums = String(d || "").match(/-?\d*\.?\d+/g);
      if (!nums || nums.length < 4) return [0,0];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < nums.length - 1; i += 2) {
        const x = Number(nums[i]);
        const y = Number(nums[i + 1]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      return [(minX + maxX) / 2, (minY + maxY) / 2];
    }

    const makeVirtualControl = () => ({ value: "", addEventListener: () => {} });
    const onlineControls = {
      search: $("onlineSearch") || makeVirtualControl(),
      state: $("onlineState") || makeVirtualControl(),
      access: $("onlineAccess") || makeVirtualControl(),
      type: $("onlineType") || makeVirtualControl(),
      dot: $("onlineDot") || makeVirtualControl()
    };
    const defsControls = {
      state: { value: "" }, search: { value: "" }, level: { value: "" }, source: { value: "" }
    };
    let defsView = "overview";

    function renderOnlineTable(rows) {
      const tbody = document.querySelector("#onlineTable tbody");
      tbody.textContent = "";
      rows.forEach(r => {
        const tr = document.createElement("tr");
        textCell(tr, r.state, "state-cell");
        textCell(tr, r.dot);
        textCell(tr, r.name, "name-cell");
        textCell(tr, r.type);
        pillCell(tr, r.access, accessClass(r.access));
        pillCell(tr, r.dot_specific, dotClass(r.dot_specific));
        textCell(tr, r.level);
        textCell(tr, r.provides);
        textCell(tr, r.connection);
        const urlTd = document.createElement("td");
        urlTd.className = "url-cell";
        if (r.url) {
          const a = document.createElement("a");
          a.href = r.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Link to the Tool";
          urlTd.appendChild(a);
        }
        tr.appendChild(urlTd);
        textCell(tr, [r.source, r.notes].filter(Boolean).join("\n\n"));
        tbody.appendChild(tr);
      });
      const onlineCount = $("onlineCount");
      if (onlineCount) onlineCount.textContent = rows.length + " row" + (rows.length === 1 ? "" : "s");
      $("onlineEmpty").hidden = rows.length !== 0;
    }

    function renderDefsTable(rows) {
      const views = {
        overview: [
          ["State", "State code", "text"], ["DOT", "State DOT", "text"], ["RIP Plan File", "RIP Plan File", "link"],
          ["Resilience Definition", "Resilience definition", "bullets"], ["Source Pages", "Matrix source pages", "text"],
          ["Scoring Level / Spatial Unit", "Scoring level / spatial unit", "text"], ["Level Detail", "Scoring level detail", "bullets"]
        ],
        risk: [
          ["State", "State code", "text"], ["DOT", "State DOT", "text"],
          ["Risk Definition / Method", "Risk definition / method", "bullets"], ["Risk Scoring Matrix / Formula", "Risk scoring matrix / formula", "bullets"]
        ],
        criticality: [
          ["State", "State code", "text"], ["DOT", "State DOT", "text"],
          ["Criticality Definition / Method", "Criticality definition / method", "bullets"], ["Criticality Scoring Matrix", "Criticality scoring matrix", "bullets"]
        ],
        vulnerability: [
          ["State", "State code", "text"], ["DOT", "State DOT", "text"],
          ["Vulnerability Definition / Method", "Vulnerability definition / method", "bullets"], ["Vulnerability Scoring Matrix", "Vulnerability scoring matrix", "bullets"]
        ],
        project: [
          ["State", "State code", "text"], ["DOT", "State DOT", "text"],
          ["Project Prioritization Matrix", "Project prioritization scoring matrix", "bullets"], ["Scoring Level / Spatial Unit", "Scoring level / spatial unit", "text"]
        ]
      };
      const cols = views[defsView] || views.overview;
      const thead = document.querySelector("#defsTable thead");
      const tbody = document.querySelector("#defsTable tbody");
      thead.textContent = "";
      tbody.textContent = "";
      const headRow = document.createElement("tr");
      cols.forEach(([label]) => {
        const th = document.createElement("th");
        th.textContent = label;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      rows.forEach(r => {
        const tr = document.createElement("tr");
        cols.forEach(([, key, type]) => {
          if (type === "link") {
            const planTd = document.createElement("td");
            planTd.className = "url-cell";
            if (r["RIP Plan URL"]) {
              const a = document.createElement("a");
              a.href = r["RIP Plan URL"];
              a.target = "_blank";
              a.rel = "noopener";
              a.textContent = r["RIP Plan File"] || r["RIP Plan URL"];
              planTd.appendChild(a);
            } else {
              planTd.textContent = r["RIP Plan File"] || "";
            }
            tr.appendChild(planTd);
          } else if (type === "bullets") {
            bulletCell(tr, r[key]);
          } else {
            textCell(tr, r[key], key === "State code" ? "state-cell" : "");
          }
        });
        tbody.appendChild(tr);
      });
      const defsCount = $("defsCount");
      if (defsCount) defsCount.textContent = rows.length + " row" + (rows.length === 1 ? "" : "s");
      $("defsEmpty").hidden = rows.length !== 0;
    }

    function splitBullets(text) {
      const raw = String(text || "").trim();
      if (!raw) return [];
      let parts = raw.split(/;\s+|\.\s+(?=[A-Z0-9])/).map(s => s.trim()).filter(Boolean);
      if (parts.length <= 1) {
        parts = raw.split(/,\s+(?=(?:and |or |[A-Z0-9]))/).map(s => s.trim()).filter(Boolean);
      }
      return parts.slice(0, 9).map(part => /[.!?]$/.test(part) ? part : part + ".");
    }
    function bulletCell(row, text) {
      const td = document.createElement("td");
      const bullets = splitBullets(text);
      if (!bullets.length) {
        td.textContent = "";
      } else if (bullets.length === 1) {
        td.textContent = bullets[0];
      } else {
        const ul = document.createElement("ul");
        bullets.forEach(item => {
          const li = document.createElement("li");
          li.textContent = item;
          ul.appendChild(li);
        });
        td.appendChild(ul);
      }
      row.appendChild(td);
    }

    function renderOnlineStates() {
      const holder = $("onlineStateList");
      holder.textContent = "";
      const states = new Map();
      onlineData.forEach(r => {
        if (!states.has(r.state)) states.set(r.state, {state:r.state, dot:r.dot});
        const s = states.get(r.state);
      });
      [...states.values()].sort((a,b) => a.state.localeCompare(b.state)).forEach(s => {
        const item = document.createElement("div");
        item.className = "state-row" + (onlineControls.state.value === s.state ? " active" : "");
        item.dataset.state = s.state;
        const top = document.createElement("div");
        top.className = "state-top";
        const left = document.createElement("span"); left.textContent = STATE_NAMES[s.state] || s.state;
        top.appendChild(left);
        item.appendChild(top);
        item.addEventListener("click", () => { setSelectedState(onlineControls.state.value === s.state ? "" : s.state); });
        holder.appendChild(item);
      });
    }

    function renderDefsStates() {
      const holder = $("defsStateList");
      holder.textContent = "";
      const states = new Map();
      defsData.forEach(r => states.set(r["State code"], {state:r["State code"], dot:r["State DOT"]}));
      [...states.values()].sort((a,b) => a.state.localeCompare(b.state)).forEach(s => {
        const item = document.createElement("div");
        item.className = "state-row" + (defsControls.state.value === s.state ? " active" : "");
        item.dataset.state = s.state;
        const top = document.createElement("div");
        top.className = "state-top";
        const left = document.createElement("span"); left.textContent = STATE_NAMES[s.state] || s.state;
        top.appendChild(left);
        item.appendChild(top);
        item.addEventListener("click", () => { setSelectedState(defsControls.state.value === s.state ? "" : s.state); });
        holder.appendChild(item);
      });
    }

    function renderMap() {
      applyLayerStyles(usStateLayer);
      applyLayerStyles(akStateLayer);
      applyLayerStyles(hiStateLayer);
      rebuildLabels(usLeafletMap, usStateLayer, usLabelLayer, true);
      rebuildLabels(akInsetMap, akStateLayer, akLabelLayer, false);
      rebuildLabels(hiInsetMap, hiStateLayer, hiLabelLayer, false);
      updateMapZoomButtons();
    }

    function applyOnline() {
      const q = onlineControls.search.value.trim();
      const keys = ["state","dot","name","type","access","dot_specific","level","provides","connection","url","source","notes"];
      const rows = onlineData.filter(r => {
        if (onlineControls.state.value && r.state !== onlineControls.state.value) return false;
        if (onlineControls.access.value && r.access !== onlineControls.access.value) return false;
        if (onlineControls.type.value && r.type !== onlineControls.type.value) return false;
        if (onlineControls.dot.value && r.dot_specific !== onlineControls.dot.value) return false;
        return rowMatches(r, keys, q);
      });
      renderOnlineTable(rows);
      renderOnlineStates();
      renderMap();
      renderDisasterDashboard();
    }

    function applyDefs() {
      const q = defsControls.search.value.trim();
      const keys = Object.keys(defsData[0] || {});
      const rows = defsData.filter(r => {
        if (defsControls.state.value && r["State code"] !== defsControls.state.value) return false;
        if (defsControls.level.value && r["Scoring level / spatial unit"] !== defsControls.level.value) return false;
        if (defsControls.source.value && r["Matrix source pages"] !== defsControls.source.value) return false;
        return rowMatches(r, keys, q);
      });
      renderDefsTable(rows);
      renderDefsStates();
      renderMap();
      renderDisasterDashboard();
    }

    function resetOnline() {
      onlineControls.search.value = ""; onlineControls.state.value = ""; onlineControls.access.value = ""; onlineControls.type.value = ""; onlineControls.dot.value = "";
      applyOnline();
    }
    function resetDefs() {
      defsControls.search.value = ""; defsControls.state.value = ""; defsControls.level.value = ""; defsControls.source.value = "";
      applyDefs();
    }

    function initDraggableInsets() {
      const host = document.querySelector(".map-insets");
      if (!host) return;

      const cards = Array.from(host.querySelectorAll(".map-inset"));
      if (!cards.length) return;

      const storageKey = "dotRipInsetPositions";
      let savedPositions = {};
      try {
        savedPositions = JSON.parse(localStorage.getItem(storageKey) || "{}");
      } catch {
        savedPositions = {};
      }

      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
      const insetKey = (card, idx) => card.querySelector(".inset-map")?.id || `inset_${idx}`;

      function setCardPosition(card, x, y) {
        const maxX = Math.max(0, host.clientWidth - card.offsetWidth);
        const maxY = Math.max(0, host.clientHeight - card.offsetHeight);
        const safeX = clamp(Math.round(x), 0, maxX);
        const safeY = clamp(Math.round(y), 0, maxY);
        card.style.left = `${safeX}px`;
        card.style.top = `${safeY}px`;
      }

      function defaultPositionFor(card, idx, total) {
        const gap = host.clientWidth <= 620 ? 6 : 8;
        const margin = host.clientWidth <= 620 ? 8 : 10;
        const fromRight = margin + (total - idx - 1) * (card.offsetWidth + gap);
        return {
          x: host.clientWidth - card.offsetWidth - fromRight,
          y: host.clientHeight - card.offsetHeight - margin
        };
      }

      function persistPositions() {
        const payload = {};
        cards.forEach((card, idx) => {
          const key = insetKey(card, idx);
          payload[key] = {
            x: Number.parseFloat(card.style.left) || 0,
            y: Number.parseFloat(card.style.top) || 0
          };
        });
        localStorage.setItem(storageKey, JSON.stringify(payload));
      }

      function layoutCards() {
        cards.forEach((card, idx) => {
          const key = insetKey(card, idx);
          const pos = savedPositions[key] || defaultPositionFor(card, idx, cards.length);
          setCardPosition(card, pos.x, pos.y);
        });
      }

      layoutCards();

      cards.forEach((card, idx) => {
        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;

        card.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          dragging = true;
          const rect = card.getBoundingClientRect();
          offsetX = event.clientX - rect.left;
          offsetY = event.clientY - rect.top;
          card.classList.add("is-dragging");
          card.setPointerCapture(event.pointerId);
          event.preventDefault();
        });

        card.addEventListener("pointermove", (event) => {
          if (!dragging) return;
          const hostRect = host.getBoundingClientRect();
          setCardPosition(card, event.clientX - hostRect.left - offsetX, event.clientY - hostRect.top - offsetY);
        });

        const stopDragging = (event) => {
          if (!dragging) return;
          dragging = false;
          card.classList.remove("is-dragging");
          if (card.hasPointerCapture(event.pointerId)) {
            card.releasePointerCapture(event.pointerId);
          }
          savedPositions[insetKey(card, idx)] = {
            x: Number.parseFloat(card.style.left) || 0,
            y: Number.parseFloat(card.style.top) || 0
          };
          persistPositions();
        };

        card.addEventListener("pointerup", stopDragging);
        card.addEventListener("pointercancel", stopDragging);
      });

      window.addEventListener("resize", () => {
        layoutCards();
      });
    }

    async function init() {
      applyTheme(localStorage.getItem("dotRipTheme") || "dark");
      $("themeToggle").addEventListener("click", () => {
        applyTheme(document.body.classList.contains("dark") ? "day" : "dark");
      });
      $("mapZoomIn").addEventListener("click", () => {
        if (usLeafletMap) usLeafletMap.zoomIn();
      });
      $("mapZoomOut").addEventListener("click", () => {
        if (usLeafletMap) usLeafletMap.zoomOut();
      });
      await initLeafletMap();
      initDraggableInsets();
      fillSelect("onlineState", unique(onlineData, "state"));
      fillSelect("onlineAccess", unique(onlineData, "access"));
      fillSelect("onlineType", unique(onlineData, "type"));
      fillSelect("onlineDot", unique(onlineData, "dot_specific"));
      Object.values(onlineControls).forEach(el => el.addEventListener("input", applyOnline));
      const onlineReset = $("onlineReset");
      if (onlineReset) onlineReset.addEventListener("click", resetOnline);
      document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        $(btn.dataset.tab).classList.add("active");
        if (btn.dataset.defView) {
          defsView = btn.dataset.defView;
          applyDefs();
        }
        renderMap();
        renderDisasterDashboard();
      }));
      applyOnline();
      applyDefs();
    }
loadDashboardData()
  .then(init)
  .catch(err => {
    console.error("Failed to load dashboard data", err);
    document.body.insertAdjacentHTML("afterbegin", "<p class=\"data-error\">Could not load local dashboard data.</p>");
  });
