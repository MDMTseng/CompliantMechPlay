export type InteractionMode =
  | 'add'
  | 'add_chain'
  | 'add_link'
  | 'add_weak_link'
  | 'remove_link'
  | 'move'
  | 'no_rotation_move'
  | 'remove'
  | 'toggle_static';

export interface Point {
  x: number;
  y: number;
}

export interface LinkOperationState {
  bodyA: Matter.Body | null;
  pointA: Point | null;
  mouseA: Point | null;
  bodyB: Matter.Body | null;
  pointB: Point | null;
  mouseB: Point | null;
}

export interface ChainState {
  points: Point[];
  prevBlock: Matter.Body | null;
  prevEndPoint: Point | null;
}

export interface DragState {
  constraint: Matter.Constraint | null;
  originalInertia: number | null;
  body: Matter.Body | null;
}

export interface SerializedBody {
  id: number;
  position: Point;
  angle: number;
  isStatic: boolean;
  mass: number;
  inertia: number;
  frictionAir: number;
  width: number;
  height: number;
  render: {
    fillStyle?: string;
  };
}

export interface SerializedConstraint {
  bodyAId: number;
  bodyBId: number;
  pointA: Point;
  pointB: Point;
  length: number;
  stiffness: number;
  damping: number;
  render: {
    strokeStyle?: string;
    lineWidth?: number;
    visible?: boolean;
  };
}

export interface CameraState {
  boundsMin: Point;
  boundsMax: Point;
  zoom: number;
}

export interface SerializedWorld {
  bodies: SerializedBody[];
  constraints: SerializedConstraint[];
  gravity: Point;
  camera?: CameraState;
}
