# Compliant Mechanism Simulator

A 2D physics-based simulator for designing and simulating **compliant mechanisms** — structures made of rigid rods connected by springy hinges that transmit motion through elastic deformation rather than traditional joints.

Built with **React + TypeScript + Matter.js**.

## What Is a Compliant Mechanism?

A compliant mechanism gains its mobility from the deflection of flexible members rather than from movable joints. This simulator lets you build such mechanisms by placing rigid rods in a zero-gravity environment and connecting them with springy hinge joints that resist bending.

## Getting Started

```bash
npm install
npm run dev      # dev server on port 3000
npm run build    # production build
```

## How It Works

### Physics Environment

- **Zero gravity** — bodies float freely so you can focus on mechanism geometry
- Matter.js engine runs at 60 FPS with configurable time scaling (1x–10x)
- Bodies have very low mass (~0.0001) and light air friction (0.01)

### Building Blocks

**Rods** — the fundamental element. Click and drag to define two endpoints; a rigid rectangular body is created between them. Rods have low mass and moderate rotational inertia.

**Chains** — lightweight linked segments created by clicking successive points. Each segment has near-zero mass, making chains flexible and drapey.

### The Springy Hinge Joint

The core innovation is how joints are implemented. Since Matter.js only supports linear distance constraints (no native angular/torque constraints), the simulator uses a **perpendicular constraint pair trick** to create rotational stiffness:

1. A weak **indicator constraint** (red line) connects the two bodies at the click points — purely visual
2. Two **moment-arm constraints** are placed perpendicular to the line between the bodies, offset in opposite directions

```
        constraint 1
            |
  bodyA ----+---- bodyB     (indicator)
            |
        constraint 2
```

When one body tries to rotate relative to the other, the perpendicular constraints on opposite sides create opposing forces — effectively a torque pair. The offset distance (`100 * springyFactor` pixels) determines the lever arm, and the constraint stiffness controls how rigid the hinge is.

- **Strong link** (stiffness = 1.0) — near-rigid hinge
- **Weak link** (stiffness = 0.01) — very flexible, spring-like

This allows structures to bend and spring back, which is exactly how real compliant mechanisms behave.

### Static Bodies

Any body can be toggled to static (fixed in space). Use this to create anchor points, ground connections, or fixed pivots for your mechanism.

## Interaction Modes

| Mode | Key | Action |
|------|-----|--------|
| Add Rod | `a` | Click-drag to create a rod between two points |
| Add Chain | `A` | Click successive points to create chain segments |
| Strong Link | `L` | Click two bodies to connect with a stiff springy hinge |
| Weak Link | `l` | Click two bodies to connect with a flexible springy hinge |
| Remove Link | `k` | Click two bodies to remove all constraints between them |
| Move | `m` | Click-drag to move a body (rotation allowed) |
| Move No Rotation | `M` | Click-drag to move a body (rotation locked) |
| Remove | `r` | Click a body to delete it and all its constraints |
| Toggle Static | `t` | Click near a body to toggle static/dynamic |

### Other Shortcuts

| Key | Action |
|-----|--------|
| `s` | Save current world |
| `d` | Toggle detail panel (sliders, presets, world manager) |

## Control Panel

### World Manager
- **Save / Save New** — persist the current world to browser localStorage
- **Load** — dropdown to switch between saved worlds
- **Reload** — re-load the current world from storage
- **Delete** — remove a saved world

### Mass Presets
Globally scale all body masses and constraint stiffness:

| Preset | Mass Scale | Effect |
|--------|-----------|--------|
| Ultra Light | 0.1x | Very responsive, bouncy |
| Very Light | 0.5x | Light and quick |
| Normal | 1.0x | Default behavior |
| Heavy | 2.0x | Sluggish, more inertia |
| Very Heavy | 5.0x | Very slow response |

### Sliders
- **Damping** (0–1) — energy dissipation in all constraints. Higher = oscillations die faster.
- **Stiffness** (0–1) — rigidity of all constraints. Higher = stiffer joints.
- **Speed** (1x–10x) — simulation time scale. Runs multiple physics updates per frame.

## Visual Feedback

- **Yellow** — dynamic (movable) bodies
- **Red** — static (fixed) bodies
- **Blue** — body under the mouse cursor

## Architecture

```
src/
  engine/           # Pure physics logic (no React dependency)
    PhysicsEngine   # Engine lifecycle, render loop
    actions         # Create/remove rods, joints, drag operations
    queries         # Hit testing, distance calculations
    serialization   # World save/load (custom Matter.js serializer)
    types           # TypeScript interfaces and mode definitions

  hooks/            # React ↔ Engine bridge
    usePhysicsEngine        # Engine init/destroy
    useCanvasInteraction    # Mouse events → mode-specific actions
    useKeyboardShortcuts    # Key bindings
    useWorldPersistence     # localStorage CRUD

  components/       # UI
    Canvas              # Matter.js render container + overlay
    ControlPanel        # Top toolbar shell
    ModeToolbar         # Mode selection buttons
    WorldManager        # Save/load/delete controls
    SimulationSliders   # Damping, stiffness, speed
    MassPresets         # Mass scaling buttons
```

### Design Principles

- **Engine module is framework-agnostic** — all Matter.js code lives in `src/engine/` with no React imports
- **Mutable state in refs** — partial operation state (which body was clicked first for linking, drag handles, chain progress) lives in `useRef` to avoid unnecessary re-renders
- **React state for UI only** — current mode, detail panel visibility, slider display values
- **Custom serialization** — bodies stored as vertex geometry + properties, constraints reference bodies by ID. No dependency on prototype-aware serializers.
