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
  detailVisible: boolean;
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
  detailVisible,
}: ControlPanelProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 10,
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderBottom: '1px solid #ccc',
      }}
    >
      <ModeToolbar mode={mode} setMode={setMode} />

      {detailVisible && (
        <>
          <WorldManager
            worldName={worldName}
            worldList={worldList}
            onSave={onSave}
            onSaveNew={onSaveNew}
            onLoad={onLoad}
            onDelete={onDelete}
          />
          <MassPresets engineRef={engineRef} />
          <SimulationSliders engineRef={engineRef} setTimeScale={setTimeScale} />
        </>
      )}
    </div>
  );
}
