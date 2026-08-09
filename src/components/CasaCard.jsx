export default function CasaCard({ rules }) {
  const baseline = rules.casa_baseline;
  if (!baseline) return null;
  return (
    <div className="casa-card">
      <h2>CASA baseline (recreational)</h2>
      <ul className="casa-rules">
        {baseline.rules.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
      <div className="airport-alert">
        <strong>Controlled airport rule:</strong> {baseline.airport_rule}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
        Always check a CASA-verified drone safety app (e.g. OpenSky) before flying.
      </div>
    </div>
  );
}