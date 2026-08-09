export default function Stats({ counts }) {
  return (
    <div className="stats">
      <div className="stat-box">
        <span className="num" style={{ color: 'var(--open)' }}>{counts.open}</span>
        Open
      </div>
      <div className="stat-box">
        <span className="num" style={{ color: 'var(--permit)' }}>{counts.permit}</span>
        Permit
      </div>
      <div className="stat-box">
        <span className="num" style={{ color: 'var(--ban)' }}>{counts.ban}</span>
        Banned
      </div>
      <div className="stat-box">
        <span className="num" style={{ color: 'var(--unknown)' }}>{counts.unknown}</span>
        Unknown
      </div>
    </div>
  );
}