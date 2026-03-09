import { useRef, useEffect, useCallback } from 'react';
import { PhysicsEngine } from '../engine/PhysicsEngine';

export function usePhysicsEngine(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const engineRef = useRef<PhysicsEngine | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || engineRef.current) return;

    const pe = new PhysicsEngine(container);
    engineRef.current = pe;
    pe.start();

    return () => {
      pe.destroy();
      engineRef.current = null;
    };
  }, [containerRef]);

  const setTimeScale = useCallback((scale: number) => {
    if (engineRef.current) {
      engineRef.current.timeScale = scale;
    }
  }, []);

  return { engineRef, setTimeScale };
}
