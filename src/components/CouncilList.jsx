import { useMemo } from 'react';

const STATUS_COLOR = {
  open: 'var(--open)',
  permit: 'var(--permit)',
  ban: 'var(--ban)',
  unknown: 'var(--unknown)',
};

export default function CouncilList({ rules, datasetNameToCouncilKey, filter, onSelect, selectedCouncil }) {
  // Sorted list: bans first (most important), then permit, open, unknown
  const sorted = useMemo(() => {
    const priority = { ban: 0, permit: 1, open: 2, unknown: 3 };
    return Object.entries(rules.councils)
      .filter(([_, c]) => filter.statuses.has(c.status))
      .map(([key, c]) => ({ key, ...c }))
      .sort((a, b) => {
        if (priority[a.status] !== priority[b.status]) return priority[a.status] - priority[b.status];
        return a.display_name.localeCompare(b.display_name);
      });
  }, [rules, filter.statuses]);

  return (
    <div className="council-list">
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
        {sorted.length} council{sorted.length === 1 ? '' : 's'} · click to focus
      </div>
      {sorted.map((c) => (
        <div
          key={c.key}
          className="council-list-item"
          onClick={() => onSelect(c.key)}
          style={{
            borderLeft: `3px solid ${STATUS_COLOR[c.status]}`,
            background: selectedCouncil === c.key ? '#2a323c' : undefined,
          }}
        >
          <span className="name">{c.display_name}</span>
          <span className="status-badge" style={{ background: STATUS_COLOR[c.status], color: c.status === 'ban' ? '#fff' : '#000', margin: 0 }}>
            {c.status}
          </span>
        </div>
      ))}
    </div>
  );
}