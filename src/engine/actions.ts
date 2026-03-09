import Matter from 'matter-js';
import type { Point } from './types';
import { distanceBetween } from './queries';

const { Bodies, Body, Constraint, World } = Matter;

export function createRod(
  pointA: Point,
  pointB: Point,
  thickness = 20,
): Matter.Body {
  const length = Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
  const angle = Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x);
  const midX = (pointA.x + pointB.x) / 2;
  const midY = (pointA.y + pointB.y) / 2;

  const block = Bodies.rectangle(midX, midY, length, thickness, {
    frictionAir: 0.01,
    angle,
  });
  Body.setMass(block, 0.0001);
  Body.setInertia(block, 4);
  return block;
}

export function createChainSegment(
  pointA: Point,
  pointB: Point,
  thickness = 20,
): Matter.Body {
  const vec = { x: pointB.x - pointA.x, y: pointB.y - pointA.y };
  const vecAbs = Math.hypot(vec.x, vec.y);
  const vecNorm = { x: vec.x / vecAbs, y: vec.y / vecAbs };
  const backDist = 20;
  const endPoint = {
    x: pointB.x - vecNorm.x * backDist,
    y: pointB.y - vecNorm.y * backDist,
  };

  const block = createRodRaw(pointA, endPoint, thickness);
  Body.setMass(block, 0.000000001);
  return block;
}

function createRodRaw(
  pointA: Point,
  pointB: Point,
  thickness = 20,
): Matter.Body {
  const length = Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
  const angle = Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x);
  const midX = (pointA.x + pointB.x) / 2;
  const midY = (pointA.y + pointB.y) / 2;

  return Bodies.rectangle(midX, midY, length, thickness, {
    frictionAir: 0.01,
    angle,
  });
}

function addConstraint(
  world: Matter.World,
  bodyA: Matter.Body,
  bodyB: Matter.Body,
  pointA: Point,
  pointB: Point,
  stiffness: number,
  renderProps?: Partial<Matter.IConstraintRenderDefinition>,
): Matter.Constraint {
  const length = distanceBetween(
    {
      x: pointA.x + bodyA.position.x,
      y: pointA.y + bodyA.position.y,
    },
    {
      x: pointB.x + bodyB.position.x,
      y: pointB.y + bodyB.position.y,
    },
  );

  const constraint = Constraint.create({
    bodyA,
    bodyB,
    pointA,
    pointB,
    length,
    stiffness,
    render: { ...renderProps },
  });

  World.add(world, constraint);
  return constraint;
}

export function addSpringyJoint(
  world: Matter.World,
  bodyA: Matter.Body,
  mouseA: Point,
  bodyB: Matter.Body,
  mouseB: Point,
  relA: Point,
  relB: Point,
  stiffness: number,
  springyFactor = 0.2,
): void {
  const pointVector = { x: mouseA.x - mouseB.x, y: mouseA.y - mouseB.y };
  const vmag = Math.hypot(pointVector.x, pointVector.y);
  const normalNorm = {
    x: pointVector.y / vmag,
    y: -pointVector.x / vmag,
  };

  // Indicator constraint (very low stiffness, just visual)
  addConstraint(world, bodyA, bodyB, relA, relB, 0.00001, {
    strokeStyle: 'red',
    lineWidth: 3,
  });

  const halfStiffness = stiffness / 2;
  const vMult = 100 * springyFactor;
  const nd = 1.001;

  const body1Offset = {
    x: mouseB.x - bodyA.position.x,
    y: mouseB.y - bodyA.position.y,
  };

  // Rotational stiffness constraints
  const pA1 = {
    x: body1Offset.x - normalNorm.x * vMult,
    y: body1Offset.y - normalNorm.y * vMult,
  };
  const pB1 = {
    x: relB.x - normalNorm.x * vMult * nd,
    y: relB.y - normalNorm.y * vMult * nd,
  };
  addConstraint(world, bodyA, bodyB, pA1, pB1, halfStiffness, {
    visible: true,
  });

  const pA2 = {
    x: body1Offset.x + normalNorm.x * vMult,
    y: body1Offset.y + normalNorm.y * vMult,
  };
  const pB2 = {
    x: relB.x + normalNorm.x * vMult * nd,
    y: relB.y + normalNorm.y * vMult * nd,
  };
  addConstraint(world, bodyA, bodyB, pA2, pB2, halfStiffness, {
    visible: true,
  });
}

export function removeConstraintsBetween(
  world: Matter.World,
  bodyA: Matter.Body,
  bodyB: Matter.Body,
): void {
  const constraints = world.constraints.slice();
  for (const c of constraints) {
    if (
      (c.bodyA === bodyA && c.bodyB === bodyB) ||
      (c.bodyA === bodyB && c.bodyB === bodyA)
    ) {
      World.remove(world, c);
    }
  }
}

export function removeBodyAndConstraints(
  world: Matter.World,
  body: Matter.Body,
): void {
  const constraints = world.constraints.slice();
  for (const c of constraints) {
    if (c.bodyA === body || c.bodyB === body) {
      World.remove(world, c);
    }
  }
  World.remove(world, body);
}

export function toggleStatic(body: Matter.Body): void {
  Body.setStatic(body, !body.isStatic);
}

export function modifyAllRodProperties(
  engine: Matter.Engine,
  scaleFactor: number,
): void {
  const baseMass = 0.0001;
  const baseStiffness = 0.1;

  for (const body of engine.world.bodies) {
    if (!body.isStatic) {
      const newMass = baseMass * scaleFactor;
      Body.setMass(body, newMass);
      Body.setInertia(body, newMass * body.area);
    }
  }

  for (const constraint of engine.world.constraints) {
    constraint.stiffness = baseStiffness * scaleFactor;
    constraint.damping = 0.1 * Math.sqrt(scaleFactor);
  }
}

export function adjustAllConstraints(
  engine: Matter.Engine,
  property: 'damping' | 'stiffness',
  value: number,
): void {
  for (const constraint of engine.world.constraints) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (constraint as any)[property] = value;
  }
}

export function createDragConstraint(
  world: Matter.World,
  mousePos: Point,
  body: Matter.Body,
  relativePoint: Point,
  noRotation: boolean,
): { constraint: Matter.Constraint; originalInertia: number } {
  const originalInertia = body.inertia;
  Body.setAngularVelocity(body, 0);

  if (noRotation) {
    Body.setInertia(body, Infinity);
  }

  const constraint = Constraint.create({
    pointA: mousePos,
    bodyB: body,
    pointB: relativePoint,
    stiffness: 0.02,
    length: 0,
  });

  World.add(world, constraint);
  return { constraint, originalInertia };
}

export function removeDragConstraint(
  world: Matter.World,
  constraint: Matter.Constraint,
  originalInertia: number,
): void {
  const body = constraint.bodyB!;
  World.remove(world, constraint);

  setTimeout(() => {
    Body.setInertia(body, originalInertia);
    Body.setAngularVelocity(body, 0);
    Body.setVelocity(body, { x: 0, y: 0 });
  }, 50);
}
