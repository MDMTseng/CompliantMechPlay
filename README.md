# Compliant Mechanism Simulator

A 2D physics-based playground for designing and simulating **compliant mechanisms** — structures made of rigid rods connected by springy hinges that transmit motion through elastic deformation rather than traditional joints.

Built with **React + TypeScript + Matter.js** | [Live Demo](#) <!-- replace with deployed URL if available -->

---

## What Is a Compliant Mechanism?

A [compliant mechanism](https://en.wikipedia.org/wiki/Compliant_mechanism) gains its mobility from the deflection of flexible members rather than from movable joints. Think of a pair of plastic tweezers or a binder clip — they work because parts of the structure bend, not because parts slide or rotate on pins.

This simulator lets you explore that concept interactively: place rigid rods in a zero-gravity workspace, connect them with springy hinge joints, pin some points in place, and watch the structure flex and spring back.

---

## Quick Start

```bash
git clone https://github.com/MDMTseng/ComplientMechPlay.git
cd ComplientMechPlay
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build
```

---

## Features

### Build
- **Rods** — click-drag to create rigid rectangular bodies with ghost preview showing length
- **Chains** — click successive points to create lightweight linked segments with visual feedback and segment counter

### Connect
- **Strong Hinge** — near-rigid springy joint (stiffness = 1.0)
- **Weak Hinge** — flexible, spring-like joint (stiffness = 0.01)
- **Remove Link** — click two bodies to remove all constraints between them, with constraint count preview

### Interact
- **Move** / **Move (No Rotation)** — drag bodies with rotation allowed or locked
- **Remove** — click to delete a body and all its constraints
- **Toggle Static** — pin/unpin bodies as anchor points

### Canvas Viewport
- **Scroll to zoom** — smooth, cursor-centered zoom tuned for Mac trackpad
- **Middle-click drag** — pan the viewport
- **Camera snapback** — smooth damping when panning too far from the workspace
- **5000 × 5000 workspace** — clearly bounded with visual out-of-bounds fill

### Stress Visualization
- Real-time per-constraint stress coloring (green → yellow → red)
- Glow effect on high-stress constraints
- Force values displayed on critical constraints
- Gradient legend with peak force and average strain readout
- Toggle with `v` key

### Persistence
- Save/load named worlds to browser localStorage
- Camera position and zoom level saved with each world
- Keyboard shortcut `s` for quick save

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `a` | Add Rod (click-drag) |
| `A` | Add Chain (click points) |
| `L` | Strong Hinge |
| `l` | Weak Hinge |
| `k` | Remove Link |
| `m` | Move |
| `M` | Move (no rotation) |
| `r` | Remove body |
| `t` | Toggle Static |
| `s` | Save world |
| `d` | Toggle sidebar |
| `v` | Toggle stress overlay |

---

## How the Springy Hinge Works

Since Matter.js only has linear distance constraints (no angular/torque constraints), the simulator uses a **perpendicular constraint pair trick** to create rotational stiffness:

```
       constraint 1
           ╱
  bodyA ──●── bodyB     ← indicator (visual only)
           ╲
       constraint 2
```

Two moment-arm constraints are placed perpendicular to the line between bodies, offset in opposite directions. When one body rotates relative to the other, the opposing constraints create a torque pair — effectively a torsional spring. The offset distance controls the lever arm, and stiffness controls rigidity.

This produces the exact bend-and-spring-back behavior of real compliant mechanisms.

---

## Control Panel

| Section | Controls |
|---------|----------|
| **Mode Toolbar** | Grouped into Build / Connect / Edit categories |
| **World Manager** | Save, Save New, Load (dropdown), Delete |
| **Mass Presets** | Ultra Light (0.1×) → Very Heavy (5×) global scaling |
| **Damping** | 0–1 slider, controls oscillation decay |
| **Stiffness** | 0–1 slider, controls joint rigidity |
| **Speed** | 1×–10× time scale |
| **Stress Toggle** | Enable/disable real-time stress visualization |

---

## Architecture

```
src/
├── engine/                  # Pure physics logic (no React dependency)
│   ├── PhysicsEngine.ts     # Engine lifecycle, render loop, workspace bounds
│   ├── actions.ts           # Create/remove rods, joints, drag operations
│   ├── queries.ts           # Hit testing, distance calculations
│   ├── serialization.ts     # World save/load with camera state
│   ├── stress.ts            # Per-constraint stress/strain computation
│   └── types.ts             # TypeScript interfaces
│
├── hooks/                   # React ↔ Engine bridge
│   ├── usePhysicsEngine.ts        # Engine init/destroy
│   ├── useCanvasInteraction.ts    # Mouse events → mode actions + overlays
│   ├── useCanvasViewport.ts       # Zoom, pan, camera snapback
│   ├── useKeyboardShortcuts.ts    # Key bindings
│   └── useWorldPersistence.ts     # localStorage CRUD + camera
│
└── components/              # UI
    ├── Canvas.tsx            # Matter.js render container
    ├── ControlPanel.tsx      # Sidebar with collapsible sections
    ├── ModeToolbar.tsx       # Grouped mode selection buttons
    ├── WorldManager.tsx      # Save/load/delete controls
    ├── SimulationSliders.tsx # Damping, stiffness, speed
    ├── MassPresets.tsx       # Mass scaling buttons
    ├── StatusBar.tsx         # Bottom bar with mode + context hints
    └── StressToggle.tsx      # Stress visualization toggle
```

### Design Principles

- **Engine is framework-agnostic** — all Matter.js code in `src/engine/`, zero React imports
- **Mutable state in refs** — interaction state (drag handles, link progress, chain points) lives in `useRef` to avoid re-renders during physics operations
- **React state for UI only** — mode, sidebar visibility, stress toggle
- **Custom serialization** — bodies stored as rectangle dimensions + properties, constraints reference bodies by ID, camera state included

---

## Tech Stack

| | |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Physics** | Matter.js |
| **Build** | Vite |
| **Styling** | CSS with Catppuccin-inspired dark theme |

---

## License

MIT
