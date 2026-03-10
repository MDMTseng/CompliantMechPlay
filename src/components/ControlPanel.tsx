import { useState } from 'react';
import { PhysicsEngine } from '../engine/PhysicsEngine';
import type { InteractionMode } from '../engine/types';
import { ModeToolbar } from './ModeToolbar';
import { WorldManager } from './WorldManager';
import { SimulationSliders } from './SimulationSliders';
import { MassPresets } from './MassPresets';

interface ControlPanelProps {
  engineRef: React.RefObject<PhysicsEngine | null>;
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  setTimeScale: (scale: number) => void;
  worldName: string | null;
  worldList: string[];
  onSave: () => void;
  onSaveNew: () => void;
  onLoad: (name: string) => void;
  onDelete: () => void;
  open: boolean;
  onToggle: () => void;
}

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <div className="section-header" onClick={() => setOpen((v) => !v)}>
        {title}
        <span className={`chevron${open ? ' open' : ''}`}>{'\u25B6'}</span>
      </div>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

export function ControlPanel({
  engineRef,
  mode,
  setMode,
  setTimeScale,
  worldName,
  worldList,
  onSave,
  onSaveNew,
  onLoad,
  onDelete,
  open,
  onToggle,
}: ControlPanelProps) {
  return (
    <>
      <button
        className={`sidebar-toggle${open ? ' open' : ''}`}
        onClick={onToggle}
        title={open ? 'Hide sidebar' : 'Show sidebar'}
      >
        {open ? '\u2039' : '\u203A'}
      </button>

      <div className={`sidebar${open ? '' : ' collapsed'}`}>
        <div className="sidebar-header">
          <h1>Mechanism Builder</h1>
        </div>

        <Section title="Tools">
          <ModeToolbar mode={mode} setMode={setMode} />
        </Section>

        <Section title="Worlds">
          <WorldManager
            worldName={worldName}
            worldList={worldList}
            onSave={onSave}
            onSaveNew={onSaveNew}
            onLoad={onLoad}
            onDelete={onDelete}
          />
        </Section>

        <Section title="Mass">
          <MassPresets engineRef={engineRef} />
        </Section>

        <Section title="Physics">
          <SimulationSliders engineRef={engineRef} setTimeScale={setTimeScale} />
        </Section>
      </div>
    </>
  );
}
