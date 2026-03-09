import { useState, useRef, useCallback, useMemo } from 'react';
import type { InteractionMode } from './engine/types';
import { usePhysicsEngine } from './hooks/usePhysicsEngine';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useWorldPersistence } from './hooks/useWorldPersistence';
import { Canvas } from './components/Canvas';
import { ControlPanel } from './components/ControlPanel';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<InteractionMode>('move');
  const [detailVisible, setDetailVisible] = useState(true);

  const { engineRef, setTimeScale } = usePhysicsEngine(containerRef);

  useCanvasInteraction(engineRef, mode);

  const {
    worldName,
    worldList,
    saveWorld,
    saveNewWorld,
    loadWorld,
    deleteWorld,
  } = useWorldPersistence(engineRef);

  const toggleDetailPanel = useCallback(() => {
    setDetailVisible((v) => !v);
  }, []);

  const keyboardActions = useMemo(
    () => ({
      setMode,
      saveWorld,
      toggleDetailPanel,
    }),
    [saveWorld, toggleDetailPanel],
  );

  useKeyboardShortcuts(keyboardActions);

  return (
    <div style={{ margin: 0, padding: 0, position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <ControlPanel
        engineRef={engineRef}
        mode={mode}
        setMode={setMode}
        setTimeScale={setTimeScale}
        worldName={worldName}
        worldList={worldList}
        onSave={saveWorld}
        onSaveNew={saveNewWorld}
        onLoad={loadWorld}
        onDelete={deleteWorld}
        detailVisible={detailVisible}
      />
      <Canvas
        engineRef={engineRef}
        containerRef={containerRef}
        mode={mode}
      />
    </div>
  );
}
