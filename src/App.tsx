import { useState, useRef, useCallback, useMemo } from 'react';
import './styles.css';
import type { InteractionMode } from './engine/types';
import { usePhysicsEngine } from './hooks/usePhysicsEngine';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useWorldPersistence } from './hooks/useWorldPersistence';
import { useCanvasViewport } from './hooks/useCanvasViewport';
import { Canvas } from './components/Canvas';
import { ControlPanel } from './components/ControlPanel';
import { StatusBar } from './components/StatusBar';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<InteractionMode>('move');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showStress, setShowStress] = useState(false);

  const { engineRef, setTimeScale } = usePhysicsEngine(containerRef);
  const { linkStep, chainSegmentCount, stressSummary } = useCanvasInteraction(
    engineRef,
    mode,
    showStress,
  );

  const { getCamera, setCamera } = useCanvasViewport(engineRef);

  const {
    worldName,
    worldList,
    saveWorld,
    saveNewWorld,
    loadWorld,
    deleteWorld,
  } = useWorldPersistence(engineRef, getCamera, setCamera);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const toggleStress = useCallback(() => {
    setShowStress((v) => !v);
  }, []);

  const keyboardActions = useMemo(
    () => ({
      setMode,
      saveWorld,
      toggleDetailPanel: toggleSidebar,
      toggleStress,
    }),
    [saveWorld, toggleSidebar, toggleStress],
  );

  useKeyboardShortcuts(keyboardActions);

  return (
    <>
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
        open={sidebarOpen}
        onToggle={toggleSidebar}
        showStress={showStress}
        onToggleStress={toggleStress}
        stressSummary={stressSummary}
      />
      <Canvas containerRef={containerRef} sidebarOpen={sidebarOpen} />
      <StatusBar mode={mode} linkStep={linkStep} chainCount={chainSegmentCount} worldName={worldName} />
    </>
  );
}
