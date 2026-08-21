export default function Legend() {
  return (
    <div className="legend">
      <div className="legend-title">Legend</div>
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