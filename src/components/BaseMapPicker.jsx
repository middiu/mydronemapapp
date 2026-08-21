import { BASE_MAPS } from '../lib/baseMaps.js';

export default function BaseMapPicker({ baseMap, setBaseMap }) {
  return (
    <div className="filters">
      <label htmlFor="basemap-select">Base map</label>
      <select
        id="basemap-select"
        value={baseMap}
        onChange={(e) => setBaseMap(e.target.value)}
      >
        {BASE_MAPS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
