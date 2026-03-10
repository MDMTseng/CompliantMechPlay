import { useState } from 'react';
import { PhysicsEngine } from '../engine/PhysicsEngine';
import { modifyAllRodProperties } from '../engine/actions';

interface MassPresetsProps {
  engineRef: React.RefObject<PhysicsEngine | null>;
}

const PRESETS = [
  { label: 'Ultra Light', factor: 0.1 },
  { label: 'Light', factor: 0.5 },
  { label: 'Normal', factor: 1 },
  { label: 'Heavy', factor: 2 },
  { label: 'V. Heavy', factor: 5 },
];

export function MassPresets({ engineRef }: MassPresetsProps) {
  const [active, setActive] = useState(1);

  const handleClick = (factor: number) => {
    setActive(factor);
    const pe = engineRef.current;
    if (pe) modifyAllRodProperties(pe.engine, factor);
  };

  return (
    <div className="preset-row">
      {PRESETS.map(({ label, factor }) => (
        <button
          key={factor}
          className={`preset-chip${active === factor ? ' active' : ''}`}
          onClick={() => handleClick(factor)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
