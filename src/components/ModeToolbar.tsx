import type { InteractionMode } from '../engine/types';

interface ModeToolbarProps {
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
}

const MODES: { mode: InteractionMode; label: string; shortcut: string }[] = [
  { mode: 'add', label: 'Add Rod', shortcut: 'a' },
  { mode: 'add_chain', label: 'Add Chain', shortcut: 'A' },
  { mode: 'add_link', label: 'Strong Link', shortcut: 'L' },
  { mode: 'add_weak_link', label: 'Weak Link', shortcut: 'l' },
  { mode: 'remove_link', label: 'Remove Link', shortcut: 'k' },
  { mode: 'move', label: 'Move', shortcut: 'm' },
  { mode: 'no_rotation_move', label: 'Move (No Rot)', shortcut: 'M' },
  { mode: 'remove', label: 'Remove', shortcut: 'r' },
  { mode: 'toggle_static', label: 'Toggle Static', shortcut: 't' },
];

export function ModeToolbar({ mode, setMode }: ModeToolbarProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {MODES.map(({ mode: m, label, shortcut }) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            backgroundColor: mode === m ? '#4a90d9' : '#e0e0e0',
            color: mode === m ? 'white' : 'black',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          {label} ({shortcut})
        </button>
      ))}
    </div>
  );
}
