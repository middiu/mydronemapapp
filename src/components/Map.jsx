import { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  STATUS_STYLES,
  AIRPORT_STYLE,
  PROTECTED_STYLE,
  AERODROME_STYLE,
  HELIPAD_STYLE,
  BUFFER_RADIUS_KM,
  DEFAULT_MAP_CENTER,
} from '../lib/styles.js';
import CouncilPopup from './CouncilPopup.jsx';

const esc = (s) => String(s).replace(/[<>&"']/g, (c) =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]),
);

export default function MapView({
  enrichedFeatures,
  rules,
  filter,
  selectedCouncil,
  protectedGeoJson,
  aerodromes,
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const councilLayerRef = useRef(null);
  const airportLayerRef = useRef(null);
  const protectedLayerRef = useRef(null);
  const aerodromeLayerRef = useRef(null);

  // Initialise map once
  useEffect(() => {
    if (mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: DEFAULT_MAP_CENTER,
      zoom: 11,
      preferCanvas: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Render council polygons
  useEffect(() => {
    if (!mapInstance.current || !enrichedFeatures) return;
    if (councilLayerRef.current) {
      mapInstance.current.removeLayer(councilLayerRef.current);
    }
    const layer = L.geoJSON(
      { type: 'FeatureCollection', features: enrichedFeatures },
      {
        style: (feature) => {
          const status = feature.properties._status;
          const baseStyle = STATUS_STYLES[status] || STATUS_STYLES.unknown;
          return { ...baseStyle, className: `council-poly status-${status}` };
        },
        onEachFeature: (feature, leafletLayer) => {
          const { _council, _councilKey, _status, LGA_NAME } = feature.properties;
          leafletLayer.bindTooltip(`${LGA_NAME} — ${_status.toUpperCase()}`, {
            sticky: true,
            opacity: 0.9,
          });
          leafletLayer.on('click', () => {
            leafletLayer.openPopup();
          });
          if (_council) {
            leafletLayer.bindPopup(
              () => CouncilPopup({ council: _council, councilKey: _councilKey, lgaName: LGA_NAME, rules }),
              { maxWidth: 360 },
            );
          } else {
            const esc = (s) => String(s).replace(/[<>&"']/g, (c) =>
              ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]),
            );
            leafletLayer.bindPopup(
              `<div class="popup-title">${esc(LGA_NAME)}</div>
               <div class="status-badge unknown">UNKNOWN</div>
               <div class="popup-summary">No rule data on file. Follow CASA baseline only.</div>`,
            );
          }
        },
      },
    );
    layer.addTo(mapInstance.current);
    councilLayerRef.current = layer;
    // Fit to data extent
    try {
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
      }
    } catch (e) {
      console.warn('Could not fit bounds:', e);
    }
  }, [enrichedFeatures, rules]);

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
        leafletLayer.bindPopup(html, { maxWidth: 320 });
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
      circle.bindPopup(html, { maxWidth: 280 });
      circle.bindTooltip(
        `<strong>${esc(a.name || a.ident)}</strong> (${esc(a.type)})`,
      );
      circle.addTo(layer);
    });
    layer.addTo(mapInstance.current);
    aerodromeLayerRef.current = layer;
  }, [aerodromes, filter.showAerodromes, rules]);

  // Filter: hide councils by status
  useEffect(() => {
    if (!councilLayerRef.current) return;
    councilLayerRef.current.eachLayer((layer) => {
      const status = layer.feature?.properties?._status;
      const visible = filter.statuses.has(status);
      if (visible) {
        if (!mapInstance.current.hasLayer(layer)) {
          layer.addTo(mapInstance.current);
        }
      } else {
        if (mapInstance.current.hasLayer(layer)) {
          mapInstance.current.removeLayer(layer);
        }
      }
    });
  }, [filter.statuses]);

  // Fly to selected council from sidebar click
  useEffect(() => {
    if (!selectedCouncil || !councilLayerRef.current || !mapInstance.current) return;
    let targetLayer = null;
    councilLayerRef.current.eachLayer((layer) => {
      if (layer.feature?.properties?._councilKey === selectedCouncil) {
        targetLayer = layer;
      }
    });
    if (targetLayer) {
      try {
        mapInstance.current.fitBounds(targetLayer.getBounds(), { padding: [60, 60], maxZoom: 14 });
        targetLayer.openPopup();
      } catch (e) {
        console.warn('Cannot zoom to council:', e);
      }
    }
  }, [selectedCouncil]);

  return <div ref={mapRef} className="map" />;
}