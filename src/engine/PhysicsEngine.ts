import Matter from 'matter-js';

const { Engine, Render, World, Mouse, MouseConstraint } = Matter;

export class PhysicsEngine {
  engine: Matter.Engine;
  render: Matter.Render;
  mouse: Matter.Mouse;
  mouseConstraint: Matter.MouseConstraint;
  private animFrameId: number | null = null;
  private _timeScale = 1.0;

  constructor(container: HTMLElement, width = 2000, height = 1000) {
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
      },
    });

    this.mouse = Mouse.create(this.render.canvas);
    this.mouseConstraint = MouseConstraint.create(this.engine, {
      mouse: this.mouse,
    });

    World.add(this.engine.world, this.mouseConstraint);
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
