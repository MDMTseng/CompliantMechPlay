import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { PhysicsEngine } from '../engine/PhysicsEngine';
import type { InteractionMode, Point, DragState, LinkOperationState, ChainState } from '../engine/types';
import { findBodyAtPoint, findClosestBody } from '../engine/queries';
import {
  createRod,
  createChainSegment,
  addSpringyJoint,
  removeConstraintsBetween,
  removeBodyAndConstraints,
  createDragConstraint,
  removeDragConstraint,
} from '../engine/actions';
import { computeStress, stressColor, type StressSummary } from '../engine/stress';

const { Body, World } = Matter;

/** 0 = no step in progress, 1 = first body selected */
export type LinkStep = 0 | 1;

const ROD_THICKNESS = 20;

export function useCanvasInteraction(
  engineRef: React.RefObject<PhysicsEngine | null>,
  mode: InteractionMode,
  showStress: boolean,
) {
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const showStressRef = useRef(showStress);
  showStressRef.current = showStress;

  const [linkStep, setLinkStep] = useState<LinkStep>(0);
  const [chainSegmentCount, setChainSegmentCount] = useState(0);
  const [stressSummary, setStressSummary] = useState<StressSummary | null>(null);
  const stressFrameCounter = useRef(0);

  const mouseDownPos = useRef<Point>({ x: 0, y: 0 });
  const latestMousePos = useRef<Point>({ x: 0, y: 0 });
  const isAddDragging = useRef(false);
  const dragState = useRef<DragState>({ constraint: null, originalInertia: null, body: null });
  const linkState = useRef<LinkOperationState>({
    bodyA: null, pointA: null, mouseA: null,
    bodyB: null, pointB: null, mouseB: null,
  });
  const chainState = useRef<ChainState>({ points: [], prevBlock: null, prevEndPoint: null });

  useEffect(() => {
    const pe = engineRef.current;
    if (!pe) return;

    const mc = pe.mouseConstraint;

    const clearDrag = () => {
      if (dragState.current.constraint) {
        removeDragConstraint(
          pe.world,
          dragState.current.constraint,
          dragState.current.originalInertia!,
        );
        dragState.current = { constraint: null, originalInertia: null, body: null };
      }
    };

    const resetLinkState = () => {
      linkState.current = {
        bodyA: null, pointA: null, mouseA: null,
        bodyB: null, pointB: null, mouseB: null,
      };
      setLinkStep(0);
    };

    // Detect if the device supports touch (used for larger hit targets)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const touchMargin = isTouchDevice ? 30 : 0;

    const onMouseDown = (event: Matter.IMouseEvent<Matter.MouseConstraint>) => {
      const pos = event.mouse.position;
      const mousePos = { x: pos.x, y: pos.y };
      mouseDownPos.current = mousePos;
      const currentMode = modeRef.current;

      if (currentMode === 'add') {
        isAddDragging.current = true;
      }

      if (currentMode === 'move' || currentMode === 'no_rotation_move') {
        clearDrag();
        const hit = findBodyAtPoint(pe.world.bodies, mousePos, touchMargin);
        if (!hit) return;
        const result = createDragConstraint(
          pe.world,
          mousePos,
          hit.body,
          hit.relativePoint,
          currentMode === 'no_rotation_move',
        );
        dragState.current = {
          constraint: result.constraint,
          originalInertia: result.originalInertia,
          body: hit.body,
        };
      } else if (currentMode === 'remove') {
        const hit = findBodyAtPoint(pe.world.bodies, mousePos, touchMargin);
        if (hit) {
          removeBodyAndConstraints(pe.world, hit.body);
        }
      } else if (currentMode === 'add_link' || currentMode === 'add_weak_link') {
        const hit = findBodyAtPoint(pe.world.bodies, mousePos, touchMargin);
        if (!hit) return;

        const ls = linkState.current;
        if (!ls.bodyA) {
          ls.bodyA = hit.body;
          ls.pointA = hit.relativePoint;
          ls.mouseA = mousePos;
          setLinkStep(1);
        } else if (!ls.bodyB) {
          ls.bodyB = hit.body;
          ls.pointB = hit.relativePoint;
          ls.mouseB = mousePos;
        }

        if (ls.bodyA && ls.bodyB) {
          const stiffness = currentMode === 'add_link' ? 1 : 0.01;
          addSpringyJoint(
            pe.world,
            ls.bodyA,
            ls.mouseA!,
            ls.bodyB,
            ls.mouseB!,
            ls.pointA!,
            ls.pointB!,
            stiffness,
            0.2,
          );
          resetLinkState();
        }
      } else if (currentMode === 'remove_link') {
        const hit = findBodyAtPoint(pe.world.bodies, mousePos, touchMargin);
        if (!hit) return;

        const ls = linkState.current;
        if (!ls.bodyA) {
          ls.bodyA = hit.body;
          ls.pointA = hit.relativePoint;
          setLinkStep(1);
        } else if (!ls.bodyB) {
          ls.bodyB = hit.body;
          ls.pointB = hit.relativePoint;
        }

        if (ls.bodyA && ls.bodyB) {
          removeConstraintsBetween(pe.world, ls.bodyA, ls.bodyB);
          resetLinkState();
        }
      } else if (currentMode === 'toggle_static') {
        const radius = isTouchDevice ? 80 : 50;
        const closest = findClosestBody(pe.world.bodies, mousePos, radius);
        if (closest) {
          Body.setStatic(closest, !closest.isStatic);
        }
      }
    };

    const onMouseUp = (event: Matter.IMouseEvent<Matter.MouseConstraint>) => {
      const pos = event.mouse.position;
      const mousePos = { x: pos.x, y: pos.y };
      const currentMode = modeRef.current;

      if (currentMode === 'add') {
        isAddDragging.current = false;
        const dx = mousePos.x - mouseDownPos.current.x;
        const dy = mousePos.y - mouseDownPos.current.y;
        if (Math.hypot(dx, dy) > 10) {
          const rod = createRod(mouseDownPos.current, mousePos);
          World.add(pe.world, rod);
        }
      } else if (currentMode === 'add_chain') {
        const cs = chainState.current;
        const lastPoint = cs.points.length > 0 ? cs.points[cs.points.length - 1] : null;

        if (lastPoint && Math.hypot(mousePos.x - lastPoint.x, mousePos.y - lastPoint.y) < 25) {
          // Too close, skip
        } else {
          cs.points.push(mousePos);
          if (cs.points.length > 1 && lastPoint) {
            const segment = createChainSegment(lastPoint, mousePos);
            World.add(pe.world, segment);
            cs.prevBlock = segment;
            cs.points = [mousePos];
            setChainSegmentCount((c) => c + 1);
          }
        }
      }

      clearDrag();
    };

    const onMouseMove = (event: Matter.IMouseEvent<Matter.MouseConstraint>) => {
      const pos = event.mouse.position;
      latestMousePos.current = { x: pos.x, y: pos.y };

      for (const body of pe.world.bodies) {
        if (findBodyAtPoint([body], pos)) {
          body.render.fillStyle = '#89b4fa';
        } else {
          body.render.fillStyle = body.isStatic ? '#f38ba8' : '#f9e2af';
        }
      }

      if (dragState.current.constraint) {
        dragState.current.constraint.pointA = pos;
      }
    };

    // --- Helper: draw a ghost rod shape between two points ---
    function drawGhostRod(
      ctx: CanvasRenderingContext2D,
      a: Point,
      b: Point,
      color: string,
      fillAlpha: number,
      strokeAlpha: number,
    ) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 2) return;

      const angle = Math.atan2(dy, dx);
      const half = ROD_THICKNESS / 2;
      const px = -Math.sin(angle) * half;
      const py = Math.cos(angle) * half;

      // Filled rod outline
      ctx.beginPath();
      ctx.moveTo(a.x + px, a.y + py);
      ctx.lineTo(b.x + px, b.y + py);
      ctx.lineTo(b.x - px, b.y - py);
      ctx.lineTo(a.x - px, a.y - py);
      ctx.closePath();
      ctx.fillStyle = color.replace('1)', `${fillAlpha})`);
      ctx.fill();
      ctx.strokeStyle = color.replace('1)', `${strokeAlpha})`);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center line
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = color.replace('1)', `${strokeAlpha * 0.6})`);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Length label offset perpendicular
      const labelOffset = 18;
      const lx = (a.x + b.x) / 2 + (-Math.sin(angle)) * labelOffset;
      const ly = (a.y + b.y) / 2 + Math.cos(angle) * labelOffset;
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = color.replace('1)', '0.9)');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(len) + 'px', lx, ly);
    }

    function drawDot(ctx: CanvasRenderingContext2D, p: Point, radius: number, color: string) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Main overlay drawing ---
    const drawOverlay = () => {
      const ctx = pe.render.context as CanvasRenderingContext2D;
      const currentMode = modeRef.current;
      ctx.save();

      // Apply viewport transform so overlays align with zoomed/panned world
      const bounds = pe.render.bounds;
      const bw = bounds.max.x - bounds.min.x;
      const bh = bounds.max.y - bounds.min.y;
      const scaleX = pe.render.options.width! / bw;
      const scaleY = pe.render.options.height! / bh;
      ctx.scale(scaleX, scaleY);
      ctx.translate(-bounds.min.x, -bounds.min.y);

      // Workspace boundary — fill outside area with dark red
      const wsW = pe.workspaceWidth;
      const wsH = pe.workspaceHeight;
      const pad = 10000; // large enough to cover any viewport
      ctx.fillStyle = '#3B1D1D';
      // top
      ctx.fillRect(-pad, -pad, wsW + pad * 2, pad);
      // bottom
      ctx.fillRect(-pad, wsH, wsW + pad * 2, pad);
      // left
      ctx.fillRect(-pad, 0, pad, wsH);
      // right
      ctx.fillRect(wsW, 0, pad, wsH);

      // Border line
      ctx.strokeStyle = 'rgba(108, 112, 134, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, wsW, wsH);

      // Add Rod preview
      if (currentMode === 'add' && isAddDragging.current) {
        const a = mouseDownPos.current;
        const b = latestMousePos.current;
        drawGhostRod(ctx, a, b, 'rgba(137, 180, 250, 1)', 0.2, 0.6);
        drawDot(ctx, a, 4, '#89b4fa');
        drawDot(ctx, b, 4, '#89b4fa');
      }

      // Hinge link preview (add_link, add_weak_link, remove_link)
      if (
        currentMode === 'add_link' ||
        currentMode === 'add_weak_link' ||
        currentMode === 'remove_link'
      ) {
        const ls = linkState.current;
        const mouse = latestMousePos.current;
        const isRemove = currentMode === 'remove_link';
        const isWeak = currentMode === 'add_weak_link';
        const color = isRemove
          ? 'rgba(243, 139, 168, 1)'
          : isWeak
            ? 'rgba(249, 226, 175, 1)'
            : 'rgba(137, 180, 250, 1)';
        const solidColor = isRemove ? '#f38ba8' : isWeak ? '#f9e2af' : '#89b4fa';

        if (ls.bodyA && ls.pointA) {
          // Compute absolute position of first click (body may have moved)
          const ax = ls.bodyA.position.x + ls.pointA.x;
          const ay = ls.bodyA.position.y + ls.pointA.y;

          // Pulsing ring on first click point
          const pulse = 6 + Math.sin(Date.now() / 200) * 2;
          ctx.beginPath();
          ctx.arc(ax, ay, pulse, 0, Math.PI * 2);
          ctx.strokeStyle = color.replace('1)', '0.6)');
          ctx.lineWidth = 2;
          ctx.stroke();
          drawDot(ctx, { x: ax, y: ay }, 4, solidColor);

          // Dashed line from first point to mouse
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = color.replace('1)', '0.35)');
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Check if mouse is over a body — show snap indicator
          const hovered = findBodyAtPoint(pe.world.bodies, mouse);
          if (hovered) {
            drawDot(ctx, mouse, 4, solidColor);

            // For remove: count constraints between the two bodies
            if (isRemove) {
              let count = 0;
              for (const c of pe.world.constraints) {
                if (
                  (c.bodyA === ls.bodyA && c.bodyB === hovered.body) ||
                  (c.bodyA === hovered.body && c.bodyB === ls.bodyA)
                ) {
                  count++;
                }
              }
              if (count > 0) {
                ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.fillStyle = '#f38ba8';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                  `${count} constraint${count > 1 ? 's' : ''} to remove`,
                  mouse.x + 12,
                  mouse.y - 8,
                );
              }
            }
          } else {
            // Hollow circle at mouse when not over a body
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 5, 0, Math.PI * 2);
            ctx.strokeStyle = color.replace('1)', '0.3)');
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Label at midpoint
          const label = isRemove ? 'Remove' : isWeak ? 'Weak Hinge' : 'Strong Hinge';
          const mx = (ax + mouse.x) / 2;
          const my = (ay + mouse.y) / 2 - 12;
          ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = color.replace('1)', '0.6)');
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, mx, my);
        } else {
          // No body selected yet — show hint near cursor if hovering a body
          const hovered = findBodyAtPoint(pe.world.bodies, mouse);
          if (hovered) {
            drawDot(ctx, mouse, 4, solidColor);
            ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = color.replace('1)', '0.7)');
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('Click to select', mouse.x + 12, mouse.y);
          }
        }

        // For remove_link: highlight all constraints connected to the first selected body
        if (isRemove && ls.bodyA) {
          for (const c of pe.world.constraints) {
            if (c.bodyA === ls.bodyA || c.bodyB === ls.bodyA) {
              const otherBody = c.bodyA === ls.bodyA ? c.bodyB : c.bodyA;
              if (!otherBody) continue;
              const pa = c.pointA
                ? { x: (c.bodyA?.position.x ?? 0) + c.pointA.x, y: (c.bodyA?.position.y ?? 0) + c.pointA.y }
                : c.bodyA?.position ?? { x: 0, y: 0 };
              const pb = c.pointB
                ? { x: (c.bodyB?.position.x ?? 0) + c.pointB.x, y: (c.bodyB?.position.y ?? 0) + c.pointB.y }
                : c.bodyB?.position ?? { x: 0, y: 0 };
              ctx.beginPath();
              ctx.moveTo(pa.x, pa.y);
              ctx.lineTo(pb.x, pb.y);
              ctx.strokeStyle = 'rgba(243, 139, 168, 0.2)';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
        }
      }

      // Add Chain preview
      if (currentMode === 'add_chain') {
        const cs = chainState.current;
        const mouse = latestMousePos.current;

        if (cs.points.length > 0) {
          const lastPt = cs.points[cs.points.length - 1];
          const dist = Math.hypot(mouse.x - lastPt.x, mouse.y - lastPt.y);
          const tooClose = dist < 25;

          // Ghost segment from last point to mouse
          if (!tooClose) {
            drawGhostRod(ctx, lastPt, mouse, 'rgba(166, 227, 161, 1)', 0.15, 0.5);
          }

          // Draw line from last point to mouse
          ctx.beginPath();
          ctx.moveTo(lastPt.x, lastPt.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = tooClose
            ? 'rgba(243, 139, 168, 0.5)'
            : 'rgba(166, 227, 161, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Last placed point — ring
          ctx.beginPath();
          ctx.arc(lastPt.x, lastPt.y, 6, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(166, 227, 161, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
          drawDot(ctx, lastPt, 3, '#a6e3a1');

          // Mouse cursor dot
          if (tooClose) {
            // Red "too close" indicator
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 12, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(243, 139, 168, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // X mark
            ctx.beginPath();
            ctx.moveTo(mouse.x - 4, mouse.y - 4);
            ctx.lineTo(mouse.x + 4, mouse.y + 4);
            ctx.moveTo(mouse.x + 4, mouse.y - 4);
            ctx.lineTo(mouse.x - 4, mouse.y + 4);
            ctx.strokeStyle = 'rgba(243, 139, 168, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else {
            drawDot(ctx, mouse, 4, '#a6e3a1');
          }
        } else {
          // No points yet — show a "start here" crosshair at mouse
          const sz = 8;
          ctx.beginPath();
          ctx.moveTo(mouse.x - sz, mouse.y);
          ctx.lineTo(mouse.x + sz, mouse.y);
          ctx.moveTo(mouse.x, mouse.y - sz);
          ctx.lineTo(mouse.x, mouse.y + sz);
          ctx.strokeStyle = 'rgba(166, 227, 161, 0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();
          drawDot(ctx, mouse, 3, '#a6e3a1');

          ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = 'rgba(166, 227, 161, 0.7)';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('Click to start chain', mouse.x + 14, mouse.y);
        }
      }

      // Stress visualization overlay
      if (showStressRef.current) {
        const summary = computeStress(pe.world);

        // Update React state every 6 frames (~10Hz) to avoid excessive re-renders
        stressFrameCounter.current++;
        if (stressFrameCounter.current >= 6) {
          stressFrameCounter.current = 0;
          setStressSummary(summary);
        }

        if (summary.maxForce > 0) {
          for (const cs of summary.constraints) {
            const t = summary.maxForce > 0 ? cs.force / summary.maxForce : 0;
            const lineWidth = 1.5 + t * 4;

            // Draw stress-colored line over each constraint
            ctx.beginPath();
            ctx.moveTo(cs.anchorA.x, cs.anchorA.y);
            ctx.lineTo(cs.anchorB.x, cs.anchorB.y);
            ctx.strokeStyle = stressColor(t, 0.7);
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            // For high-stress constraints, draw a glow
            if (t > 0.7) {
              ctx.beginPath();
              ctx.moveTo(cs.anchorA.x, cs.anchorA.y);
              ctx.lineTo(cs.anchorB.x, cs.anchorB.y);
              ctx.strokeStyle = stressColor(t, 0.15);
              ctx.lineWidth = lineWidth + 6;
              ctx.stroke();
            }

            // Show force value on high-stress constraints
            if (t > 0.5) {
              const mx = (cs.anchorA.x + cs.anchorB.x) / 2;
              const my = (cs.anchorA.y + cs.anchorB.y) / 2;
              ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
              ctx.fillStyle = stressColor(t, 0.9);
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillText(cs.force.toFixed(1), mx, my - 4);
            }
          }

          // Legend in top-right corner
          const lx = ctx.canvas.width - 160;
          const ly = 20;
          ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = 'rgba(205, 214, 244, 0.8)';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('Stress', lx, ly);

          // Gradient bar
          const barW = 100;
          const barH = 6;
          const barY = ly + 16;
          for (let i = 0; i < barW; i++) {
            ctx.fillStyle = stressColor(i / barW, 0.8);
            ctx.fillRect(lx + i, barY, 1, barH);
          }
          ctx.fillStyle = 'rgba(205, 214, 244, 0.6)';
          ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';
          ctx.fillText('Low', lx, barY + barH + 2);
          ctx.textAlign = 'right';
          ctx.fillText('High', lx + barW, barY + barH + 2);

          // Peak values
          ctx.fillStyle = 'rgba(205, 214, 244, 0.7)';
          ctx.textAlign = 'left';
          ctx.fillText(
            `Peak: ${summary.maxForce.toFixed(1)}  Avg strain: ${(summary.avgStrain * 100).toFixed(1)}%`,
            lx,
            barY + barH + 14,
          );
        }
      } else {
        // Clear stress summary when disabled
        if (stressSummary) {
          setStressSummary(null);
        }
      }

      ctx.restore();
    };

    Matter.Events.on(pe.render, 'afterRender', drawOverlay);
    Matter.Events.on(mc, 'mousedown', onMouseDown);
    Matter.Events.on(mc, 'mouseup', onMouseUp);
    Matter.Events.on(mc, 'mousemove', onMouseMove);

    return () => {
      Matter.Events.off(pe.render, 'afterRender', drawOverlay);
      Matter.Events.off(mc, 'mousedown', onMouseDown);
      Matter.Events.off(mc, 'mouseup', onMouseUp);
      Matter.Events.off(mc, 'mousemove', onMouseMove);
    };
  }, [engineRef]);

  // Reset partial state when mode changes
  useEffect(() => {
    isAddDragging.current = false;
    if (mode.includes('link') || mode === 'remove_link') {
      linkState.current = {
        bodyA: null, pointA: null, mouseA: null,
        bodyB: null, pointB: null, mouseB: null,
      };
    }
    if (mode === 'add_chain') {
      chainState.current = { points: [], prevBlock: null, prevEndPoint: null };
    }
    setLinkStep(0);
    setChainSegmentCount(0);
  }, [mode]);

  return { linkStep, chainSegmentCount, stressSummary };
}
