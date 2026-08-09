import { STATUS_LABELS } from '../lib/styles.js';

export default function Legend() {
  const entries = Object.entries(STATUS_LABELS);
  return (
    <div className="legend">
      <div className="legend-title">Legend</div>
      {entries.map(([status, label]) => (
        <div className="legend-item" key={status}>
          <span
            className="legend-swatch"
            style={{
              background:
                status === 'open' ? '#3fb950'
                : status === 'permit' ? '#d29922'
                : status === 'ban' ? '#f85149'
                : '#6e7681',
            }}
          />
          <span>{label}</span>
        </div>
      ))}
      <div className="legend-item">
        <span className="legend-swatch" style={{ background: 'transparent', borderColor: '#f0883e' }} />
        <span>5.5km controlled airport (CASA)</span>
      </div>
      <div className="legend-item">
        <span
          className="legend-swatch"
          style={{ background: 'rgba(248, 81, 73, 0.18)', borderColor: '#f85149' }}
        />
        <span>Protected area (NPWS permit)</span>
      </div>
      <div className="legend-item">
        <span className="legend-swatch" style={{ background: 'transparent', borderColor: '#d29b22' }} />
        <span>Other aerodrome (4km exclusion)</span>
      </div>
      <div className="legend-item">
        <span className="legend-swatch" style={{ background: 'transparent', borderColor: '#b58a1e' }} />
        <span>Heliport (1.4km exclusion)</span>
      </div>
    </div>
  );
}