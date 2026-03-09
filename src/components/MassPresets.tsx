import { PhysicsEngine } from '../engine/PhysicsEngine';
import { modifyAllRodProperties } from '../engine/actions';

interface MassPresetsProps {
  engineRef: React.RefObject<PhysicsEngine | null>;
}

const PRESETS = [
  { label: 'Ultra Light', factor: 0.1 },
  { label: 'Very Light', factor: 0.5 },
  { label: 'Normal', factor: 1 },
  { label: 'Heavy', factor: 2 },
  { label: 'Very Heavy', factor: 5 },
];

export function MassPresets({ engineRef }: MassPresetsProps) {
  const handleClick = (factor: number) => {
    const pe = engineRef.current;
    if (pe) modifyAllRodProperties(pe.engine, factor);
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {PRESETS.map(({ label, factor }) => (
        <button
          key={factor}
          onClick={() => handleClick(factor)}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            border: 'none',
            borderRadius: 4,
            backgroundColor: '#e0e0e0',
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
