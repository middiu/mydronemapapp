// Base map tile providers. Hobby-use, no-API-key raster sources.
// Selection persists in localStorage under 'mydronemap:basemap:v1'.

export const BASE_MAPS = [
  {
    id: 'osm',
    label: 'Streets (OpenStreetMap)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    subdomains: 'abc',
  },
  {
    id: 'topo',
    label: 'Topographic (OpenTopoMap)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
    subdomains: 'abc',
  },
  {
    id: 'satellite',
    label: 'Satellite (Esri World Imagery)',
    // Esri uses {z}/{y}/{x} (lat-row first), not the OSM {z}/{x}/{y}.
    url:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
    subdomains: '',
  },
  {
    id: 'esri-topo',
    label: 'Topographic (Esri)',
    url:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles © Esri — Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    maxZoom: 19,
    subdomains: '',
  },
  {
    id: 'carto',
    label: 'Voyager (CARTO)',
    // CARTO Voyager served from legacy Fastly CDN (the newer basemaps.cartocdn.com
    // path 404s for Voyager). Subdomains map a-d to same set.
    url:
      'https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 19,
    subdomains: 'abcd',
  },
];

export const DEFAULT_BASE_MAP = 'osm';

export function getBaseMapById(id) {
  return BASE_MAPS.find((m) => m.id === id) || BASE_MAPS[0];
}
