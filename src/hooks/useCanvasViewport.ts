import { useEffect, useRef, useCallback } from 'react';
import Matter from 'matter-js';
import { PhysicsEngine } from '../engine/PhysicsEngine';
import type { CameraState } from '../engine/types';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_SENSITIVITY = 0.003; // Tuned for Mac trackpad (small, frequent deltas)
const CAMERA_MARGIN = 500; // How far past the workspace edge the camera can drift
const SNAPBACK_DAMPING = 0.08; // Lerp factor per frame — lower = smoother

/**
 * Adds scroll-to-zoom (centered on cursor), middle-click-drag to pan,
 * and touch gestures (two-finger pan + pinch-to-zoom).
 * Camera smoothly snaps back when panned too far outside the workspace.
 */
export function useCanvasViewport(
  engineRef: React.RefObject<PhysicsEngine | null>,
) {
  const panState = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });
  const touchState = useRef<{
    active: boolean;
    lastMidX: number;
    lastMidY: number;
    lastDist: number;
  }>({ active: false, lastMidX: 0, lastMidY: 0, lastDist: 0 });
  const zoomLevel = useRef(1);
  const wheelAccum = useRef(0);
  const lastWheelScreenPos = useRef<{ sx: number; sy: number }>({ sx: 0.5, sy: 0.5 });

  const getCamera = useCallback((): CameraState | null => {
    const pe = engineRef.current;
    if (!pe) return null;
    const bounds = pe.render.bounds;
    return {
      boundsMin: { x: bounds.min.x, y: bounds.min.y },
      boundsMax: { x: bounds.max.x, y: bounds.max.y },
      zoom: zoomLevel.current,
    };
  }, [engineRef]);

  const setCamera = useCallback((camera: CameraState) => {
    const pe = engineRef.current;
    if (!pe) return;
    const bounds = pe.render.bounds;
    const renderWidth = pe.render.options.width!;
    const renderHeight = pe.render.options.height!;

    bounds.min.x = camera.boundsMin.x;
    bounds.min.y = camera.boundsMin.y;
    bounds.max.x = camera.boundsMax.x;
    bounds.max.y = camera.boundsMax.y;
    zoomLevel.current = camera.zoom;
    wheelAccum.current = 0;

    // Sync mouse offset/scale
    const mouse = pe.mouse;
    mouse.scale.x = (bounds.max.x - bounds.min.x) / renderWidth;
    mouse.scale.y = (bounds.max.y - bounds.min.y) / renderHeight;
    mouse.offset.x = bounds.min.x;
    mouse.offset.y = bounds.min.y;
  }, [engineRef]);

  useEffect(() => {
    const pe = engineRef.current;
    if (!pe) return;

    const canvas = pe.render.canvas;
    if (!canvas) return;

    const renderWidth = pe.render.options.width!;
    const renderHeight = pe.render.options.height!;

    function syncMouse() {
      const bounds = pe!.render.bounds;
      const mouse = pe!.mouse;
      mouse.scale.x = (bounds.max.x - bounds.min.x) / renderWidth;
      mouse.scale.y = (bounds.max.y - bounds.min.y) / renderHeight;
      mouse.offset.x = bounds.min.x;
      mouse.offset.y = bounds.min.y;
    }

    // Wheel handler — accumulates delta, applied in afterRender
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      wheelAccum.current += e.deltaY;

      const rect = canvas.getBoundingClientRect();
      lastWheelScreenPos.current = {
        sx: (e.clientX - rect.left) / rect.width,
        sy: (e.clientY - rect.top) / rect.height,
      };
    };

    // Apply accumulated zoom + camera snapback each frame
    const onAfterRender = () => {
      const bounds = pe!.render.bounds;
      let needSync = false;

      // --- Apply zoom ---
      const accum = wheelAccum.current;
      if (accum !== 0) {
        wheelAccum.current = 0;

        const viewWidth = bounds.max.x - bounds.min.x;
        const viewHeight = bounds.max.y - bounds.min.y;

        const { sx, sy } = lastWheelScreenPos.current;
        const worldX = bounds.min.x + sx * viewWidth;
        const worldY = bounds.min.y + sy * viewHeight;

        const factor = Math.exp(accum * ZOOM_SENSITIVITY);
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel.current * factor));
        if (newZoom !== zoomLevel.current) {
          zoomLevel.current = newZoom;

          const newViewWidth = renderWidth * newZoom;
          const newViewHeight = renderHeight * newZoom;

          bounds.min.x = worldX - sx * newViewWidth;
          bounds.min.y = worldY - sy * newViewHeight;
          bounds.max.x = bounds.min.x + newViewWidth;
          bounds.max.y = bounds.min.y + newViewHeight;

          needSync = true;
        }
      }

      // --- Camera snapback ---
      // Only snap back when user is NOT actively panning
      if (!panState.current.active) {
        const wsW = pe!.workspaceWidth;
        const wsH = pe!.workspaceHeight;
        const vw = bounds.max.x - bounds.min.x;
        const vh = bounds.max.y - bounds.min.y;

        // Allowed camera range: workspace ± margin, but also allow
        // the viewport to sit fully inside the workspace
        const minX = Math.min(0, wsW - vw) - CAMERA_MARGIN;
        const maxX = Math.max(0, wsW - vw) + CAMERA_MARGIN;
        const minY = Math.min(0, wsH - vh) - CAMERA_MARGIN;
        const maxY = Math.max(0, wsH - vh) + CAMERA_MARGIN;

        let targetX = bounds.min.x;
        let targetY = bounds.min.y;

        if (bounds.min.x < minX) targetX = minX;
        else if (bounds.min.x > maxX) targetX = maxX;

        if (bounds.min.y < minY) targetY = minY;
        else if (bounds.min.y > maxY) targetY = maxY;

        const dx = targetX - bounds.min.x;
        const dy = targetY - bounds.min.y;

        // Only apply if there's meaningful offset (avoid sub-pixel jitter)
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          const moveX = dx * SNAPBACK_DAMPING;
          const moveY = dy * SNAPBACK_DAMPING;

          bounds.min.x += moveX;
          bounds.min.y += moveY;
          bounds.max.x += moveX;
          bounds.max.y += moveY;

          needSync = true;
        }
      }

      if (needSync) syncMouse();
    };

    // --- Pan with middle-click drag ---
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        panState.current = { active: true, lastX: e.clientX, lastY: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!panState.current.active) return;

      const bounds = pe!.render.bounds;
      const rect = canvas.getBoundingClientRect();
      const viewWidth = bounds.max.x - bounds.min.x;
      const viewHeight = bounds.max.y - bounds.min.y;

      const dx = ((e.clientX - panState.current.lastX) / rect.width) * viewWidth;
      const dy = ((e.clientY - panState.current.lastY) / rect.height) * viewHeight;

      bounds.min.x -= dx;
      bounds.min.y -= dy;
      bounds.max.x -= dx;
      bounds.max.y -= dy;

      panState.current.lastX = e.clientX;
      panState.current.lastY = e.clientY;

      syncMouse();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 1 && panState.current.active) {
        panState.current.active = false;
        canvas.releasePointerCapture(e.pointerId);
      }
    };

    // --- Touch gestures: two-finger pan + pinch-to-zoom ---
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        touchState.current = { active: true, lastMidX: midX, lastMidY: midY, lastDist: dist };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchState.current.active) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);

        const bounds = pe!.render.bounds;
        const rect = canvas.getBoundingClientRect();
        const viewWidth = bounds.max.x - bounds.min.x;
        const viewHeight = bounds.max.y - bounds.min.y;

        // Pan
        const dx = ((midX - touchState.current.lastMidX) / rect.width) * viewWidth;
        const dy = ((midY - touchState.current.lastMidY) / rect.height) * viewHeight;
        bounds.min.x -= dx;
        bounds.min.y -= dy;
        bounds.max.x -= dx;
        bounds.max.y -= dy;

        // Pinch zoom
        if (touchState.current.lastDist > 0 && dist > 0) {
          const scale = touchState.current.lastDist / dist;
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel.current * scale));

          if (newZoom !== zoomLevel.current) {
            // Zoom centered on midpoint of two fingers
            const sx = (midX - rect.left) / rect.width;
            const sy = (midY - rect.top) / rect.height;
            const worldX = bounds.min.x + sx * viewWidth;
            const worldY = bounds.min.y + sy * viewHeight;

            zoomLevel.current = newZoom;
            const newViewWidth = renderWidth * newZoom;
            const newViewHeight = renderHeight * newZoom;
            bounds.min.x = worldX - sx * newViewWidth;
            bounds.min.y = worldY - sy * newViewHeight;
            bounds.max.x = bounds.min.x + newViewWidth;
            bounds.max.y = bounds.min.y + newViewHeight;
          }
        }

        touchState.current.lastMidX = midX;
        touchState.current.lastMidY = midY;
        touchState.current.lastDist = dist;
        syncMouse();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchState.current.active = false;
      }
    };

    // Use capture phase to intercept before Matter.js Mouse handler
    canvas.addEventListener('wheel', onWheel, { passive: false, capture: true });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    Matter.Events.on(pe.render, 'afterRender', onAfterRender);

    return () => {
      canvas.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      Matter.Events.off(pe.render, 'afterRender', onAfterRender);
    };
  }, [engineRef]);

  return { getCamera, setCamera };
}
