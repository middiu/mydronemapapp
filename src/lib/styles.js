// Shared style constants for Leaflet layers
export const STATUS_STYLES = {
  open: {
    color: '#3fb950',
    weight: 2,
    fillColor: '#3fb950',
    fillOpacity: 0.25,
  },
  permit: {
    color: '#d29922',
    weight: 2,
    fillColor: '#d29922',
    fillOpacity: 0.25,
  },
  ban: {
    color: '#f85149',
    weight: 2,
    fillColor: '#f85149',
    fillOpacity: 0.35,
  },
  unknown: {
    color: '#6e7681',
    weight: 1,
    fillColor: '#6e7681',
    fillOpacity: 0.15,
    dashArray: '4 4',
  },
};

export const AIRPORT_STYLE = {
  color: '#f0883e',
  weight: 2,
  fillColor: '#f0883e',
  fillOpacity: 0.08,
  dashArray: '6 4',
  interactive: true,
};

// Protected areas (CAPAD) overlay — ban-grade: NPWS permit required
export const PROTECTED_STYLE = {
  color: '#f85149',
  weight: 1,
  fillColor: '#f85149',
  fillOpacity: 0.18,
  interactive: true,
};

// Smaller aerodromes (OurAirports, non-controlled) — 4km CASA buffer
export const AERODROME_STYLE = {
  color: '#d29b22',
  weight: 1.5,
  fillColor: '#d29b22',
  fillOpacity: 0.06,
  dashArray: '4 3',
  interactive: true,
};

// Helipads — 1.4km CASA Part 101 buffer
export const HELIPAD_STYLE = {
  color: '#b58a1e',
  weight: 1,
  fillColor: '#b58a1e',
  fillOpacity: 0.08,
  dashArray: '2 3',
  interactive: true,
};

// Buffer radius (km) by aerodrome type
export const BUFFER_RADIUS_KM = {
  large_airport: 5.5,
  medium_airport: 5.5,
  small_airport: 4,
  heliport: 1.4,
};

export const STATUS_LABELS = {
  open: 'Open — CASA rules only',
  permit: 'Council permit required',
  ban: 'Prohibited',
  unknown: 'Unknown — verify',
};

export const DEFAULT_MAP_CENTER = [-33.82, 151.1]; // Sydney north shore, will be overridden by fitBounds