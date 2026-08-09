export default function Filters({ filter, setFilter }) {
  const toggleStatus = (status) => {
    const next = new Set(filter.statuses);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    setFilter({ ...filter, statuses: next });
  };

  return (
    <div className="filters">
      <label>Status filter</label>
      <div className="toggle-row">
        <input
          id="status-open"
          type="checkbox"
          checked={filter.statuses.has('open')}
          onChange={() => toggleStatus('open')}
        />
        <label htmlFor="status-open" style={{ display: 'inline', textTransform: 'none', letterSpacing: 0 }}>Open</label>
      </div>
      <div className="toggle-row">
        <input
          id="status-permit"
          type="checkbox"
          checked={filter.statuses.has('permit')}
          onChange={() => toggleStatus('permit')}
        />
        <label htmlFor="status-permit" style={{ display: 'inline', textTransform: 'none', letterSpacing: 0 }}>Permit required</label>
      </div>
      <div className="toggle-row">
        <input
          id="status-ban"
          type="checkbox"
          checked={filter.statuses.has('ban')}
          onChange={() => toggleStatus('ban')}
        />
        <label htmlFor="status-ban" style={{ display: 'inline', textTransform: 'none', letterSpacing: 0 }}>Prohibited</label>
      </div>
      <div className="toggle-row">
        <input
          id="status-unknown"
          type="checkbox"
          checked={filter.statuses.has('unknown')}
          onChange={() => toggleStatus('unknown')}
        />
        <label htmlFor="status-unknown" style={{ display: 'inline', textTransform: 'none', letterSpacing: 0 }}>Unknown</label>
      </div>

      <label style={{ marginTop: 12 }}>Overlays</label>
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