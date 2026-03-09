import { useEffect, useRef } from 'react';
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

const { Body, World } = Matter;

export function useCanvasInteraction(
  engineRef: React.RefObject<PhysicsEngine | null>,
  mode: InteractionMode,
) {
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const mouseDownPos = useRef<Point>({ x: 0, y: 0 });
  const latestMousePos = useRef<Point>({ x: 0, y: 0 });
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

    const onMouseDown = (event: Matter.IMouseEvent<Matter.MouseConstraint>) => {
      const pos = event.mouse.position;
      const mousePos = { x: pos.x, y: pos.y };
      mouseDownPos.current = mousePos;
      const currentMode = modeRef.current;

      if (currentMode === 'move' || currentMode === 'no_rotation_move') {
        clearDrag();
        const hit = findBodyAtPoint(pe.world.bodies, mousePos);
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
        const hit = findBodyAtPoint(pe.world.bodies, mousePos);
        if (hit) {
          removeBodyAndConstraints(pe.world, hit.body);
        }
      } else if (currentMode === 'add_link' || currentMode === 'add_weak_link') {
        const hit = findBodyAtPoint(pe.world.bodies, mousePos);
        if (!hit) return;

        const ls = linkState.current;
        if (!ls.bodyA) {
          ls.bodyA = hit.body;
          ls.pointA = hit.relativePoint;
          ls.mouseA = mousePos;
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
          linkState.current = {
            bodyA: null, pointA: null, mouseA: null,
            bodyB: null, pointB: null, mouseB: null,
          };
        }
      } else if (currentMode === 'remove_link') {
        const hit = findBodyAtPoint(pe.world.bodies, mousePos);
        if (!hit) return;

        const ls = linkState.current;
        if (!ls.bodyA) {
          ls.bodyA = hit.body;
          ls.pointA = hit.relativePoint;
        } else if (!ls.bodyB) {
          ls.bodyB = hit.body;
          ls.pointB = hit.relativePoint;
        }

        if (ls.bodyA && ls.bodyB) {
          removeConstraintsBetween(pe.world, ls.bodyA, ls.bodyB);
          linkState.current = {
            bodyA: null, pointA: null, mouseA: null,
            bodyB: null, pointB: null, mouseB: null,
          };
        }
      } else if (currentMode === 'toggle_static') {
        const closest = findClosestBody(pe.world.bodies, mousePos, 50);
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
        const rod = createRod(mouseDownPos.current, mousePos);
        World.add(pe.world, rod);
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
          }
        }
      }

      clearDrag();
    };

    const onMouseMove = (event: Matter.IMouseEvent<Matter.MouseConstraint>) => {
      const pos = event.mouse.position;
      latestMousePos.current = { x: pos.x, y: pos.y };

      // Update body colors on hover
      for (const body of pe.world.bodies) {
        if (findBodyAtPoint([body], pos)) {
          body.render.fillStyle = 'blue';
        } else {
          body.render.fillStyle = body.isStatic ? 'red' : 'yellow';
        }
      }

      // Update drag constraint position
      if (dragState.current.constraint) {
        dragState.current.constraint.pointA = pos;
      }
    };

    Matter.Events.on(mc, 'mousedown', onMouseDown);
    Matter.Events.on(mc, 'mouseup', onMouseUp);
    Matter.Events.on(mc, 'mousemove', onMouseMove);

    return () => {
      Matter.Events.off(mc, 'mousedown', onMouseDown);
      Matter.Events.off(mc, 'mouseup', onMouseUp);
      Matter.Events.off(mc, 'mousemove', onMouseMove);
    };
  }, [engineRef]);

  // Reset partial state when mode changes
  useEffect(() => {
    if (mode.includes('link') || mode === 'remove_link') {
      linkState.current = {
        bodyA: null, pointA: null, mouseA: null,
        bodyB: null, pointB: null, mouseB: null,
      };
    }
    if (mode === 'add_chain') {
      chainState.current = { points: [], prevBlock: null, prevEndPoint: null };
    }
  }, [mode]);
}
