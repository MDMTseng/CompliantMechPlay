import Matter from 'matter-js';
import type { SerializedWorld, SerializedBody, SerializedConstraint } from './types';

const { Bodies, Body, Constraint, World } = Matter;

export function serializeWorld(world: Matter.World): SerializedWorld {
  const bodies: SerializedBody[] = world.bodies.map((body) => ({
    id: body.id,
    position: { x: body.position.x, y: body.position.y },
    angle: body.angle,
    isStatic: body.isStatic,
    mass: body.mass,
    inertia: body.inertia,
    frictionAir: body.frictionAir,
    vertices: [body.vertices.map((v) => ({ x: v.x, y: v.y }))],
    render: {
      fillStyle: body.render.fillStyle,
    },
  }));

  const constraints: SerializedConstraint[] = world.constraints
    .filter((c) => c.bodyA && c.bodyB)
    .map((c) => ({
      bodyAId: c.bodyA!.id,
      bodyBId: c.bodyB!.id,
      pointA: c.pointA ? { x: c.pointA.x, y: c.pointA.y } : { x: 0, y: 0 },
      pointB: c.pointB ? { x: c.pointB.x, y: c.pointB.y } : { x: 0, y: 0 },
      length: c.length,
      stiffness: c.stiffness,
      damping: c.damping,
      render: {
        strokeStyle: c.render.strokeStyle,
        lineWidth: c.render.lineWidth,
        visible: c.render.visible,
      },
    }));

  return {
    bodies,
    constraints,
    gravity: { x: world.gravity.x, y: world.gravity.y },
  };
}

export function deserializeWorld(data: SerializedWorld): Matter.World {
  const world = Matter.World.create({
    gravity: { x: data.gravity.x, y: data.gravity.y, scale: 0.001 },
  });

  const idMap = new Map<number, Matter.Body>();

  for (const bd of data.bodies) {
    // Translate vertices to body-local coordinates (relative to position)
    const localVertices = bd.vertices[0].map((v) => ({
      x: v.x - bd.position.x,
      y: v.y - bd.position.y,
    }));

    const body = Bodies.fromVertices(bd.position.x, bd.position.y, [localVertices], {
      isStatic: bd.isStatic,
      frictionAir: bd.frictionAir,
      angle: bd.angle,
      render: {
        fillStyle: bd.render.fillStyle,
      },
    });

    if (body) {
      Body.setMass(body, bd.mass);
      Body.setInertia(body, bd.inertia);
      Body.setPosition(body, bd.position);
      Body.setAngle(body, bd.angle);
      idMap.set(bd.id, body);
      World.add(world, body);
    }
  }

  for (const cd of data.constraints) {
    const bodyA = idMap.get(cd.bodyAId);
    const bodyB = idMap.get(cd.bodyBId);
    if (!bodyA || !bodyB) continue;

    const constraint = Constraint.create({
      bodyA,
      bodyB,
      pointA: cd.pointA,
      pointB: cd.pointB,
      length: cd.length,
      stiffness: cd.stiffness,
      damping: cd.damping,
      render: {
        strokeStyle: cd.render.strokeStyle,
        lineWidth: cd.render.lineWidth,
        visible: cd.render.visible,
      },
    });

    World.add(world, constraint);
  }

  return world;
}

export function saveWorldToStorage(name: string, world: Matter.World): void {
  const worlds = JSON.parse(localStorage.getItem('sim_worlds') || '{}');
  worlds[name] = serializeWorld(world);
  localStorage.setItem('sim_worlds', JSON.stringify(worlds));
}

export function loadWorldFromStorage(name: string): SerializedWorld | null {
  const worlds = JSON.parse(localStorage.getItem('sim_worlds') || '{}');
  return worlds[name] || null;
}

export function deleteWorldFromStorage(name: string): void {
  const worlds = JSON.parse(localStorage.getItem('sim_worlds') || '{}');
  delete worlds[name];
  localStorage.setItem('sim_worlds', JSON.stringify(worlds));
}

export function getWorldNames(): string[] {
  const worlds = JSON.parse(localStorage.getItem('sim_worlds') || '{}');
  return Object.keys(worlds);
}
