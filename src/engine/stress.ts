import type Matter from 'matter-js';
import type { Point } from './types';

export interface ConstraintStress {
  constraint: Matter.Constraint;
  /** Anchor point A in world coordinates */
  anchorA: Point;
  /** Anchor point B in world coordinates */
  anchorB: Point;
  /** Rest length */
  restLength: number;
  /** Current distance between anchors */
  currentLength: number;
  /** Absolute deviation from rest length */
  deviation: number;
  /** Normalized strain: |currentLength - restLength| / restLength (0 = relaxed) */
  strain: number;
  /** Estimated force magnitude: stiffness * deviation */
  force: number;
}

export interface StressSummary {
  constraints: ConstraintStress[];
  maxStrain: number;
  maxForce: number;
  avgStrain: number;
}

function getAnchor(
  body: Matter.Body | undefined,
  point: Matter.Vector | undefined,
): Point {
  const bx = body?.position.x ?? 0;
  const by = body?.position.y ?? 0;
  const px = point?.x ?? 0;
  const py = point?.y ?? 0;
  return { x: bx + px, y: by + py };
}

export function computeStress(world: Matter.World): StressSummary {
  const results: ConstraintStress[] = [];
  let maxStrain = 0;
  let maxForce = 0;
  let totalStrain = 0;

  for (const c of world.constraints) {
    // Skip mouse constraints and constraints without two bodies
    if (!c.bodyA || !c.bodyB) continue;

    const anchorA = getAnchor(c.bodyA, c.pointA);
    const anchorB = getAnchor(c.bodyB, c.pointB);
    const dx = anchorB.x - anchorA.x;
    const dy = anchorB.y - anchorA.y;
    const currentLength = Math.hypot(dx, dy);
    const restLength = c.length;

    // Avoid division by zero for zero-length constraints
    const deviation = Math.abs(currentLength - restLength);
    const strain = restLength > 0.01 ? deviation / restLength : 0;
    const force = c.stiffness * deviation;

    const entry: ConstraintStress = {
      constraint: c,
      anchorA,
      anchorB,
      restLength,
      currentLength,
      deviation,
      strain,
      force,
    };

    results.push(entry);

    if (strain > maxStrain) maxStrain = strain;
    if (force > maxForce) maxForce = force;
    totalStrain += strain;
  }

  return {
    constraints: results,
    maxStrain,
    maxForce,
    avgStrain: results.length > 0 ? totalStrain / results.length : 0,
  };
}

/**
 * Map a normalized value (0-1) to a color gradient:
 * Green (low stress) → Yellow (medium) → Red (high)
 */
export function stressColor(t: number, alpha = 1): string {
  const clamped = Math.min(1, Math.max(0, t));
  let r: number, g: number, b: number;

  if (clamped < 0.5) {
    // Green to Yellow
    const f = clamped * 2;
    r = Math.round(100 + 155 * f);
    g = Math.round(220 - 20 * f);
    b = Math.round(100 * (1 - f));
  } else {
    // Yellow to Red
    const f = (clamped - 0.5) * 2;
    r = Math.round(255);
    g = Math.round(200 * (1 - f));
    b = Math.round(50 * (1 - f));
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
