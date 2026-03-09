import Matter from 'matter-js';
import type { Point } from './types';

const { Vertices, Bounds } = Matter;

export function polyContains(body: Matter.Body, point: Point): boolean {
  if (body.vertices) {
    return Vertices.contains(body.vertices, point);
  }
  return Bounds.contains(body.bounds, point);
}

export function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function findBodyAtPoint(
  bodies: Matter.Body[],
  point: Point,
): { body: Matter.Body; relativePoint: Point } | null {
  for (const body of bodies) {
    if (polyContains(body, point)) {
      return {
        body,
        relativePoint: {
          x: point.x - body.position.x,
          y: point.y - body.position.y,
        },
      };
    }
  }
  return null;
}

export function findClosestBody(
  bodies: Matter.Body[],
  point: Point,
  maxDistance: number,
): Matter.Body | null {
  let closest: Matter.Body | null = null;
  let closestDist = Infinity;

  for (const body of bodies) {
    const dist = distanceBetween(body.position, point);
    if (dist < closestDist) {
      closestDist = dist;
      closest = body;
    }
  }

  if (closest && closestDist <= maxDistance) {
    return closest;
  }
  return null;
}
