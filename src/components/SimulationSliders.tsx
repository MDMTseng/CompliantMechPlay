import { useState } from 'react';
import { PhysicsEngine } from '../engine/PhysicsEngine';
import { adjustAllConstraints } from '../engine/actions';

interface SimulationSlidersProps {
  engineRef: React.RefObject<PhysicsEngine | null>;
  setTimeScale: (scale: number) => void;
}

export function SimulationSliders({ engineRef, setTimeScale }: SimulationSlidersProps) {
  const [damping, setDamping] = useState(10);
  const [stiffness, setStiffness] = useState(10);
  const [speed, setSpeed] = useState(100);

  const handleDamping = (val: number) => {
    setDamping(val);
    const pe = engineRef.current;
    if (pe) adjustAllConstraints(pe.engine, 'damping', val / 100);
  };

  const handleStiffness = (val: number) => {
    setStiffness(val);
    const pe = engineRef.current;
    if (pe) adjustAllConstraints(pe.engine, 'stiffness', val / 100);
  };

  const handleSpeed = (val: number) => {
    setSpeed(val);
    setTimeScale(val / 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SliderRow
        label="Damping"
        value={damping}
        min={0}
        max={100}
        displayValue={(damping / 100).toFixed(2)}
        onChange={handleDamping}
      />
      <SliderRow
        label="Stiffness"
        value={stiffness}
        min={0}
        max={100}
        displayValue={(stiffness / 100).toFixed(2)}
        onChange={handleStiffness}
      />
      <SliderRow
        label="Speed"
        value={speed}
        min={100}
        max={1000}
        displayValue={(speed / 100).toFixed(1) + 'x'}
        onChange={handleSpeed}
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  displayValue: string;
  onChange: (val: number) => void;
}) {
  return (
    <div className="slider-row">
      <span className="slider-label">{label}</span>
      <input
        className="slider-input"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider-value">{displayValue}</span>
    </div>
  );
}
