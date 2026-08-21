import { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  AIRPORT_STYLE,
  PROTECTED_STYLE,
  AERODROME_STYLE,
  HELIPAD_STYLE,
  BUFFER_RADIUS_KM,
  DEFAULT_MAP_CENTER,
} from '../lib/styles.js';
import { save as saveLastPosition } from '../lib/lastPosition.js';
import { getBaseMapById } from '../lib/baseMaps.js';

const esc = (s) => String(s).replace(/[<>&"']/g, (c) =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]),
);

// Responsive popup width: cap so popups stay readable / within viewport on mobile.
const popupMax = (max) =>
  typeof window !== 'undefined' ? Math.min(max, window.innerWidth - 40) : max;

export default function MapView({
  rules,
  filter,
  protectedGeoJson,
  aerodromes,
  lastPosition,
  baseMap,
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const baseLayerRef = useRef(null);
  const airportLayerRef = useRef(null);
  const protectedLayerRef = useRef(null);
  const aerodromeLayerRef = useRef(null);
  const locateMarkerRef = useRef(null);
  const lastSeenMarkerRef = useRef(null);

  // Initialise map once
  useEffect(() => {
    if (mapInstance.current) return;

    // Pick initial view from saved last position (if we have one) so the
    // app rehydrates a useful offline state on launch.
    const hasSaved =
      lastPosition &&
      Number.isFinite(lastPosition.lat) &&
      Number.isFinite(lastPosition.lon);
    const initialCenter = hasSaved
      ? [lastPosition.lat, lastPosition.lon]
      : DEFAULT_MAP_CENTER;
    const initialZoom = hasSaved && Number.isFinite(lastPosition.zoom)
      ? lastPosition.zoom
      : 10;

    const map = L.map(mapRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      preferCanvas: true,
      zoomControl: false,
    });

    // First base layer — created here so the initial render has tiles below
    // any overlays. The swap effect below handles subsequent provider changes.
    const initialDef = getBaseMapById(baseMap);
    baseLayerRef.current = L.tileLayer(initialDef.url, {
      attribution: initialDef.attribution,
      maxZoom: initialDef.maxZoom,
      subdomains: initialDef.subdomains || 'abc',
    }).addTo(map);
    // Zoom moved off top-left so it doesn't overlap the mobile menu FAB.
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    mapInstance.current = map;

    // Keep Leaflet sized correctly when the container resizes
    // (sidebar drawer toggle, orientation change, mobile browser chrome).
    const ro = new ResizeObserver(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize();
    });
    ro.observe(mapRef.current);

    // Drop a faded "last seen here" marker if we have a saved fix but no
    // live geolocation yet. Replaced by the live marker the moment the
    // user grants location.
    if (hasSaved) {
      const saved = lastPosition;
      const lastSeen = L.marker([saved.lat, saved.lon], {
        icon: L.divIcon({
          className: 'locate-div-icon',
          html: '<div class="locate-marker last-seen"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9aa5b1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L19 21 L12 17 L5 21 Z" /></svg></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
        opacity: 0.65,
        interactive: false,
      });
      lastSeen.bindTooltip('Last seen here');
      lastSeen.addTo(map);
      lastSeenMarkerRef.current = lastSeen;
    }

    // Persist view on every moveend so the next launch rehydrates it.
    // Throttling lives inside lastPosition.save() — Map.jsx can fire freely.
    map.on('moveend zoomend', () => {
      const c = map.getCenter();
      saveLastPosition({
        lat: c.lat,
        lon: c.lng,
        center: [c.lat, c.lng],
        zoom: map.getZoom(),
      });
    });

    // Geolocation: fly to the device position with an accuracy circle.
    const locate = () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const latlng = L.latLng(latitude, longitude);
          // Once we have a live fix, hide the faded "last seen here" marker.
          if (lastSeenMarkerRef.current) {
            map.removeLayer(lastSeenMarkerRef.current);
            lastSeenMarkerRef.current = null;
          }
          if (locateMarkerRef.current) {
            map.removeLayer(locateMarkerRef.current);
          }
          const accCircle = L.circle(latlng, {
            radius: Math.max(accuracy, 5),
            color: '#4ea1ff',
            weight: 1,
            fillColor: '#4ea1ff',
            fillOpacity: 0.12,
          });
          const marker = L.marker(latlng, {
            icon: L.divIcon({
              className: 'locate-div-icon',
              html: '<div class="locate-marker"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#4ea1ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L19 21 L12 17 L5 21 Z" /></svg></div>',
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            }),
          });
          const group = L.layerGroup([accCircle, marker]).addTo(map);
          locateMarkerRef.current = group;
          marker.bindPopup(
            `<div class="popup-title">You are here</div>` +
            `<div class="popup-summary">Accuracy: ±${Math.round(accuracy)} m</div>`,
            { maxWidth: popupMax(260) },
          ).openPopup();
          const bounds = accCircle.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
          } else {
            map.setView(latlng, 16);
          }
          // Persist the live fix so the next offline launch can rehydrate it.
          saveLastPosition({
            lat: latitude,
            lon: longitude,
            accuracy,
            center: [latitude, longitude],
            zoom: map.getZoom(),
          });
        },
        (err) => {
          const msgs = {
            1: 'Location permission denied.',
            2: 'Position unavailable.',
            3: 'Location request timed out.',
          };
          alert(msgs[err.code] || 'Could not get your location.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    };

    const LocateControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-locate-control');
        const btn = L.DomUtil.create('a', 'locate-btn', container);
        btn.href = '#';
        btn.title = 'Show my location';
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-label', 'Show my location');
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L19 21 L12 17 L5 21 Z" /></svg>';
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.preventDefault(e);
          locate();
        });
        return container;
      },
    });
    map.addControl(new LocateControl());

    return () => {
      ro.disconnect();
      locateMarkerRef.current = null;
      lastSeenMarkerRef.current = null;
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Swap base tile provider when baseMap prop changes.
// Recreation is the safe path: setUrl() on a TileLayer changes URL but the
// attribution control keeps stale prefixes that break Leaflet's internal
// attribution store. Removing the layer + re-adding avoids that. Overlays
// above (airports/protected/aerodromes) are unaffected.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
    }
    const def = getBaseMapById(baseMap);
    const next = L.tileLayer(def.url, {
      attribution: def.attribution,
      maxZoom: def.maxZoom,
      subdomains: def.subdomains || 'abc',
    }).addTo(map);
    baseLayerRef.current = next;
  }, [baseMap]);

  // Render controlled airport exclusion zones
  useEffect(() => {
    if (!mapInstance.current || !rules) return;
    if (airportLayerRef.current) {
      mapInstance.current.removeLayer(airportLayerRef.current);
    }
    if (!filter.showAirportBuffer) return;
    const layer = L.layerGroup();
    rules.controlled_airports.forEach((airport) => {
      const circle = L.circle([airport.lat, airport.lon], {
        radius: airport.exclusion_km * 1000,
        ...AIRPORT_STYLE,
      });
      circle.bindTooltip(
        `<strong>${esc(airport.name)} (${esc(airport.icao || '')})</strong><br/>${airport.exclusion_km}km CASA exclusion zone`,
      );
      circle.addTo(layer);
    });
    layer.addTo(mapInstance.current);
    airportLayerRef.current = layer;
  }, [rules, filter.showAirportBuffer]);

  // Render protected areas (CAPAD terrestrial NSW)
  useEffect(() => {
    if (!mapInstance.current) return;
    if (protectedLayerRef.current) {
      mapInstance.current.removeLayer(protectedLayerRef.current);
      protectedLayerRef.current = null;
    }
    if (!protectedGeoJson || !filter.showProtectedAreas) return;

    const layer = L.geoJSON(protectedGeoJson, {
      style: () => PROTECTED_STYLE,
      onEachFeature: (feature, leafletLayer) => {
        const p = feature.properties || {};
        const name = p.NAME || 'Unnamed protected area';
        const type = p.TYPE || p.TYPE_ABBR || '';
        const iucn = p.IUCN || '';
        const authority = p.AUTHORITY || '';
        const gazArea = p.GAZ_AREA;
        const html = `
          <div class="popup-title">${esc(name)}</div>
          <div class="status-badge ban">NPWS / Authority permit</div>
          ${type ? `<div class="popup-summary"><strong>Type:</strong> ${esc(type)}</div>` : ''}
          ${iucn ? `<div class="popup-summary"><strong>IUCN category:</strong> ${esc(iucn)}</div>` : ''}
          ${authority ? `<div class="popup-summary"><strong>Managing authority:</strong> ${esc(authority)}</div>` : ''}
          ${gazArea ? `<div class="popup-summary"><strong>Gazetted area:</strong> ${Number(gazArea).toLocaleString()} ha</div>` : ''}
          <div class="popup-warning">Drone use prohibited without NPWS or managing authority permission.</div>
        `;
        leafletLayer.bindPopup(html, { maxWidth: popupMax(320) });
      },
    });
    layer.addTo(mapInstance.current);
    protectedLayerRef.current = layer;
  }, [protectedGeoJson, filter.showProtectedAreas]);

  // Render smaller airports + helipads (deduped against controlled_airports)
  useEffect(() => {
    if (!mapInstance.current) return;
    if (aerodromeLayerRef.current) {
      mapInstance.current.removeLayer(aerodromeLayerRef.current);
      aerodromeLayerRef.current = null;
    }
    if (!aerodromes || !filter.showAerodromes) return;

    const controlledIcaos = new Set(
      (rules?.controlled_airports || []).map((a) => (a.icao || '').toUpperCase()).filter(Boolean),
    );

    const layer = L.layerGroup();
    aerodromes.forEach((a) => {
      const radiusKm = BUFFER_RADIUS_KM[a.type];
      if (!radiusKm) return;
      // Dedup: skip if ICAO matches a controlled airport
      if (a.icao && controlledIcaos.has(a.icao.toUpperCase())) return;

      const isHelipad = a.type === 'heliport';
      const style = isHelipad ? HELIPAD_STYLE : AERODROME_STYLE;
      const circle = L.circle([a.lat, a.lon], {
        radius: radiusKm * 1000,
        ...style,
      });
      const code = a.icao || a.gps || a.ident || '';
      const html = `
        <div class="popup-title">${esc(a.name || a.ident)}</div>
        <div class="popup-summary">
          <strong>Type:</strong> ${esc(a.type)}<br/>
          ${code ? `<strong>Code:</strong> ${esc(code)}<br/>` : ''}
          ${a.municipality ? `<strong>Location:</strong> ${esc(a.municipality)}` : ''}
        </div>
        <div class="popup-warning">${radiusKm}km CASA Part 101 exclusion zone</div>
      `;
      circle.bindPopup(html, { maxWidth: popupMax(280) });
      circle.bindTooltip(
        `<strong>${esc(a.name || a.ident)}</strong> (${esc(a.type)})`,
      );
      circle.addTo(layer);
    });
    layer.addTo(mapInstance.current);
    aerodromeLayerRef.current = layer;
  }, [aerodromes, filter.showAerodromes, rules]);

  return <div ref={mapRef} className="map" />;
}