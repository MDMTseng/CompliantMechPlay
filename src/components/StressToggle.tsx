import type { StressSummary } from '../engine/stress';

interface StressToggleProps {
  enabled: boolean;
  onToggle: () => void;
  summary: StressSummary | null;
}

export function StressToggle({ enabled, onToggle, summary }: StressToggleProps) {
  return (
    <div>
      <button
        className={`mode-btn${enabled ? ' active' : ''}`}
        onClick={onToggle}
        style={{ marginBottom: 8 }}
      >
        <span className="mode-icon">{enabled ? '\u25C9' : '\u25CB'}</span>
        <span className="mode-label">Stress Overlay</span>
        <span className="mode-key">v</span>
      </button>

      {enabled && summary && summary.maxForce > 0 && (
        <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <StressRow label="Peak Force" value={summary.maxForce.toFixed(2)} level={1} />
          <StressRow
            label="Max Strain"
            value={(summary.maxStrain * 100).toFixed(1) + '%'}
            level={summary.maxStrain > 0.5 ? 1 : summary.maxStrain > 0.2 ? 0.5 : 0}
          />
          <StressRow
            label="Avg Strain"
            value={(summary.avgStrain * 100).toFixed(1) + '%'}
            level={summary.avgStrain > 0.3 ? 1 : summary.avgStrain > 0.1 ? 0.5 : 0}
          />
          <div style={{ color: 'var(--sidebar-text-dim)', fontSize: 10, marginTop: 2 }}>
            {summary.constraints.length} constraints monitored
          </div>
        </div>
      )}

      {enabled && (!summary || summary.maxForce === 0) && (
        <div style={{ fontSize: 11, color: 'var(--sidebar-text-dim)', fontStyle: 'italic' }}>
          No stress detected — add some constraints
        </div>
      )}
    </div>
  );
}

function StressRow({
  label,
  value,
  level,
}: {
  label: string;
  value: string;
  level: number;
}) {
  const color =
    level >= 1
      ? 'var(--danger)'
      : level >= 0.5
        ? 'var(--warning)'
        : 'var(--success)';

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--sidebar-text-dim)' }}>{label}</span>
      <span style={{ color, fontFamily: 'monospace', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
