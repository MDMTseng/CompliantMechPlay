import { useState, useRef, useCallback, useMemo } from 'react';
import './styles.css';
import type { InteractionMode } from './engine/types';
import { usePhysicsEngine } from './hooks/usePhysicsEngine';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useWorldPersistence } from './hooks/useWorldPersistence';
import { Canvas } from './components/Canvas';
import { ControlPanel } from './components/ControlPanel';
import { StatusBar } from './components/StatusBar';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<InteractionMode>('move');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { engineRef, setTimeScale } = usePhysicsEngine(containerRef);
  const { linkStep, chainSegmentCount } = useCanvasInteraction(engineRef, mode);

  const {
    worldName,
    worldList,
    saveWorld,
    saveNewWorld,
    loadWorld,
    deleteWorld,
  } = useWorldPersistence(engineRef);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const keyboardActions = useMemo(
    () => ({
      setMode,
      saveWorld,
      toggleDetailPanel: toggleSidebar,
    }),
    [saveWorld, toggleSidebar],
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
      />
      <Canvas containerRef={containerRef} sidebarOpen={sidebarOpen} />
      <StatusBar mode={mode} linkStep={linkStep} chainCount={chainSegmentCount} worldName={worldName} />
    </>
  );
}
