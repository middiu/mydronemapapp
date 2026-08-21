export default function Filters({ filter, setFilter }) {
  return (
    <div className="filters">
      <label>Map layers</label>
      <div className="toggle-row">
        <input
          id="overlay-airport"
          type="checkbox"
          checked={filter.showAirportBuffer}
          onChange={(e) => setFilter({ ...filter, showAirportBuffer: e.target.checked })}
        />
        <label htmlFor="overlay-airport" style={{ display: 'inline', textTransform: 'none', letterSpacing: 0 }}>Controlled airport 5.5km exclusion</label>
      </div>
      <div className="toggle-row">
        <input
          id="overlay-protected"
          type="checkbox"
          checked={filter.showProtectedAreas}
          onChange={(e) => setFilter({ ...filter, showProtectedAreas: e.target.checked })}
        />
        <label htmlFor="overlay-protected" style={{ display: 'inline', textTransform: 'none', letterSpacing: 0 }}>Protected areas (CAPAD)</label>
      </div>
      <div className="toggle-row">
        <input
          id="overlay-aerodromes"
          type="checkbox"
          checked={filter.showAerodromes}
          onChange={(e) => setFilter({ ...filter, showAerodromes: e.target.checked })}
        />
        <label htmlFor="overlay-aerodromes" style={{ display: 'inline', textTransform: 'none', letterSpacing: 0 }}>Smaller airports + helipads</label>
      </div>
    </div>
  );
}