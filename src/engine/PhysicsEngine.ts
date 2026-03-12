import Matter from 'matter-js';

const { Engine, Render, World, Mouse, MouseConstraint, Body } = Matter;

export class PhysicsEngine {
  engine: Matter.Engine;
  render: Matter.Render;
  mouse: Matter.Mouse;
  mouseConstraint: Matter.MouseConstraint;
  private animFrameId: number | null = null;
  private _timeScale = 1.0;
  readonly workspaceWidth: number;
  readonly workspaceHeight: number;

  constructor(container: HTMLElement, width = 5000, height = 5000) {
    this.engine = Engine.create();
    this.engine.world.gravity.y = 0;
    this.engine.positionIterations = 8;
    this.engine.velocityIterations = 6;
    this.engine.enableSleeping = true;

    this.render = Render.create({
      element: container,
      engine: this.engine,
      options: {
        width,
        height,
        wireframes: false,
        hasBounds: true,
      },
    });

    this.mouse = Mouse.create(this.render.canvas);
    this.mouseConstraint = MouseConstraint.create(this.engine, {
      mouse: this.mouse,
      constraint: {
        // Disable automatic body grabbing — interactions are managed manually
        stiffness: 0,
        render: { visible: false },
      },
    });
    // Prevent the MouseConstraint from picking up bodies on its own
    this.mouseConstraint.collisionFilter = { group: -1, category: 0, mask: 0 };

    World.add(this.engine.world, this.mouseConstraint);

    // Clamp bodies back into workspace after each physics update
    this.workspaceWidth = width;
    this.workspaceHeight = height;
    Matter.Events.on(this.engine, 'afterUpdate', () => {
      const margin = 50;
      for (const body of this.engine.world.bodies) {
        if (body.isStatic) continue;
        const { x, y } = body.position;
        const clampedX = Math.max(-margin, Math.min(this.workspaceWidth + margin, x));
        const clampedY = Math.max(-margin, Math.min(this.workspaceHeight + margin, y));
        if (clampedX !== x || clampedY !== y) {
          Body.setPosition(body, { x: clampedX, y: clampedY });
          Body.setVelocity(body, { x: 0, y: 0 });
        }
      }
    });
  }

  get world(): Matter.World {
    return this.engine.world;
  }

  get timeScale(): number {
    return this._timeScale;
  }

  set timeScale(value: number) {
    this._timeScale = value;
  }

  start(): void {
    const loop = () => {
      const updates = Math.ceil(this._timeScale);
      for (let i = 0; i < updates; i++) {
        Engine.update(this.engine, 1000 / 60);
      }
      Render.world(this.render);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  replaceWorld(newWorld: Matter.World): void {
    this.engine.world = newWorld;
    // Re-add mouse constraint to the new world
    World.add(this.engine.world, this.mouseConstraint);
  }

  destroy(): void {
    this.stop();
    Render.stop(this.render);
    if (this.render.canvas) {
      this.render.canvas.remove();
    }
    World.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
