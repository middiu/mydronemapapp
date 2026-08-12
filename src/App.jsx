import { useEffect, useState, useMemo, useCallback } from 'react';
import MapView from './components/Map.jsx';
import Legend from './components/Legend.jsx';
import Filters from './components/Filters.jsx';
import CasaCard from './components/CasaCard.jsx';
import CouncilList from './components/CouncilList.jsx';
import Stats from './components/Stats.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import { load as loadLastPosition } from './lib/lastPosition.js';

// Parse OurAirports CSV (no quoted fields, simple comma split).
// Returns: { ident, type, name, lat, lon, municipality, region, icao, gps }
function parseAerodromesCsv(text) {
  const lines = text.split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(',');
  const idx = (k) => header.indexOf(k);
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    return {
      ident: cols[idx('ident')],
      type: cols[idx('type')],
      name: cols[idx('name')],
      lat: parseFloat(cols[idx('latitude_deg')]),
      lon: parseFloat(cols[idx('longitude_deg')]),
      municipality: cols[idx('municipality')],
      region: cols[idx('iso_region')],
      icao: cols[idx('icao_code')],
      gps: cols[idx('gps_code')],
    };
  }).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon));
}

export default function App() {
  const [rules, setRules] = useState(null);
  const [lgaGeoJson, setLgaGeoJson] = useState(null);
  const [protectedGeoJson, setProtectedGeoJson] = useState(null);
  const [aerodromes, setAerodromes] = useState(null);
  const [filter, setFilter] = useState({
    statuses: new Set(['open', 'permit', 'ban', 'unknown']),
    showAirportBuffer: true,
    showProtectedAreas: true,
    showAerodromes: true,
    search: '',
  });
  const [selectedCouncil, setSelectedCouncil] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [warningExpanded, setWarningExpanded] = useState(false);
  // Hydrated once at mount — drives initial map view + "last seen here" marker.
  const [lastPosition] = useState(() => loadLastPosition());

  // Load rules + polygons from /db
  useEffect(() => {
    Promise.all([
      fetch('/db/rules.json').then((r) => r.json()),
      fetch('/db/nsw_lga.geojson').then((r) => r.json()),
      fetch('/db/protected_areas.geojson').then((r) => r.json()),
      fetch('/db/aerodromes.csv').then((r) => r.text()),
    ])
      .then(([rulesData, geoData, protectedData, csvText]) => {
        setRules(rulesData);
        setLgaGeoJson(geoData);
        setProtectedGeoJson(protectedData);
        setAerodromes(parseAerodromesCsv(csvText));
      })
      .catch((err) => {
        console.error('Failed to load data:', err);
      });
  }, []);

  // Build a lookup: dataset LGA_NAME -> council key in rules
  const datasetNameToCouncilKey = useMemo(() => {
    if (!rules) return new Map();
    const map = new Map();
    Object.entries(rules.councils).forEach(([key, council]) => {
      const names = Array.isArray(council.matches_dataset_name)
        ? council.matches_dataset_name
        : [council.matches_dataset_name];
      names.forEach((n) => {
        if (n) map.set(n, key);
      });
    });
    return map;
  }, [rules]);

  // Attach council data + status to each GeoJSON feature
  const enrichedFeatures = useMemo(() => {
    if (!lgaGeoJson || !rules || !datasetNameToCouncilKey.size) return null;
    return lgaGeoJson.features.map((f) => {
      const datasetName = f.properties?.LGA_NAME;
      const councilKey = datasetNameToCouncilKey.get(datasetName);
      const council = councilKey ? rules.councils[councilKey] : null;
      return {
        ...f,
        properties: {
          ...f.properties,
          _councilKey: councilKey,
          _council: council,
          _status: council?.status || 'unknown',
        },
      };
    });
  }, [lgaGeoJson, rules, datasetNameToCouncilKey]);

  // Counts per status
  const statusCounts = useMemo(() => {
    const counts = { open: 0, permit: 0, ban: 0, unknown: 0 };
    if (!rules) return counts;
    Object.values(rules.councils).forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [rules]);

  const handleCouncilClick = useCallback((councilKey) => {
    setSelectedCouncil(councilKey);
    // Close the drawer so the map popup is visible on mobile.
    setSidebarOpen(false);
  }, []);

  if (!rules || !lgaGeoJson) {
    return (
      <div className="app">
        <OfflineBanner />
        <header className={`warning-bar ${warningExpanded ? 'is-expanded' : 'is-collapsed'}`} role="alert">
          <div className="warning-bar-icon" aria-hidden="true">⚠️</div>
          <div className="warning-bar-content">
            <strong>Unofficial reference only.</strong>{' '}
            This site is a hobby project built for fun and convenience. It is{' '}
            <strong>not an authoritative source</strong>. Always verify current
            rules directly with CASA, NPWS, your local council, and the relevant
            land manager before flying. Data may be outdated, incomplete, or
            wrong. By using this site you accept that{' '}
            <strong>the authors take no responsibility for any decisions made
            based on its content</strong>.
          </div>
          <button
            type="button"
            className="warning-toggle"
            aria-expanded={warningExpanded}
            onClick={() => setWarningExpanded((v) => !v)}
          >
            {warningExpanded ? 'Show less' : 'Show more'}
          </button>
        </header>
        <div className="app-body">
          <div className="sidebar">
            <div className="sidebar-header">
              <h1>MyDroneMap</h1>
              <div className="subtitle">Loading data…</div>
            </div>
          </div>
          <div className="map-area" />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <OfflineBanner />
      <header className={`warning-bar ${warningExpanded ? 'is-expanded' : 'is-collapsed'}`} role="alert">
        <div className="warning-bar-icon" aria-hidden="true">⚠️</div>
        <div className="warning-bar-content">
          <strong>Unofficial reference only.</strong>{' '}
          This site is a hobby project built for fun and convenience. It is{' '}
          <strong>not an authoritative source</strong>. Always verify current
          rules directly with CASA, NPWS, your local council, and the relevant
          land manager before flying. Data may be outdated, incomplete, or
          wrong. By using this site you accept that{' '}
          <strong>the authors take no responsibility for any decisions made
          based on its content</strong>.
        </div>
        <button
          type="button"
          className="warning-toggle"
          aria-expanded={warningExpanded}
          onClick={() => setWarningExpanded((v) => !v)}
        >
          {warningExpanded ? 'Show less' : 'Show more'}
        </button>
      </header>
      <div className="app-body">
      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button
            type="button"
            className="sidebar-close"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          >✕</button>
          <h1>🛩 MyDroneMap</h1>
          <div className="subtitle">
            Where can I fly around Sydney? · data v{rules.metadata.version} (updated {rules.metadata.last_updated})
          </div>
          <div className="scope-banner">
            <strong>Recreational use only.</strong>{' '}
            Flying for fun, hobby, sport or as a private individual — including
            camera-equipped drones (DJI Avata 2, Mini 4 Pro, etc.) flown for
            personal enjoyment. <em>Not</em> for commercial filming, freelance
            work, contracted inspections, research, or any output that is sold,
            licensed or broadcast.
          </div>
        </div>
        <div className="sidebar-body">
          <Stats counts={statusCounts} />
          <Filters filter={filter} setFilter={setFilter} />
          <CasaCard rules={rules} />
          <Legend />
          <CouncilList
            rules={rules}
            datasetNameToCouncilKey={datasetNameToCouncilKey}
            filter={filter}
            onSelect={handleCouncilClick}
            selectedCouncil={selectedCouncil}
          />
        </div>
      </aside>
      <main className="map-area">
        {!sidebarOpen && (
          <button
            type="button"
            className="fab fab-menu"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >☰</button>
        )}
        <MapView
          enrichedFeatures={enrichedFeatures}
          rules={rules}
          filter={filter}
          selectedCouncil={selectedCouncil}
          protectedGeoJson={protectedGeoJson}
          aerodromes={aerodromes}
          lastPosition={lastPosition}
        />
      </main>
      </div>
    </div>
  );
}