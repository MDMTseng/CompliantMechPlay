import { useRef, useEffect } from 'react';
import Matter from 'matter-js';
import { PhysicsEngine } from '../engine/PhysicsEngine';
import type { InteractionMode } from '../engine/types';

interface CanvasProps {
  engineRef: React.RefObject<PhysicsEngine | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  mode: InteractionMode;
}

export function Canvas({ engineRef, containerRef, mode }: CanvasProps) {
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Draw overlay (mode indicator)
  useEffect(() => {
    const pe = engineRef.current;
    if (!pe) return;

    const drawOverlay = () => {
      const ctx = pe.render.context as CanvasRenderingContext2D;
      ctx.font = '30px Arial';
      ctx.fillStyle = 'red';
      ctx.fillText(modeRef.current, 30, 50);
    };

    Matter.Events.on(pe.render, 'afterRender', drawOverlay);
    return () => {
      Matter.Events.off(pe.render, 'afterRender', drawOverlay);
    };
  }, [engineRef]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}
