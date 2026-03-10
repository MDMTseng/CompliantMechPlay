import type { InteractionMode } from '../engine/types';

interface ModeToolbarProps {
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
}

interface ModeEntry {
  mode: InteractionMode;
  label: string;
  shortcut: string;
  icon: string;
}

const MODE_GROUPS: { label: string; modes: ModeEntry[] }[] = [
  {
    label: 'Build',
    modes: [
      { mode: 'add', label: 'Add Rod', shortcut: 'a', icon: '/' },
      { mode: 'add_chain', label: 'Add Chain', shortcut: 'A', icon: '~' },
    ],
  },
  {
    label: 'Connect',
    modes: [
      { mode: 'add_link', label: 'Strong Hinge', shortcut: 'L', icon: '\u25C9' },
      { mode: 'add_weak_link', label: 'Weak Hinge', shortcut: 'l', icon: '\u25CB' },
      { mode: 'remove_link', label: 'Remove Link', shortcut: 'k', icon: '\u2702' },
    ],
  },
  {
    label: 'Edit',
    modes: [
      { mode: 'move', label: 'Move', shortcut: 'm', icon: '\u2725' },
      { mode: 'no_rotation_move', label: 'Move (Locked)', shortcut: 'M', icon: '\u2BC1' },
      { mode: 'toggle_static', label: 'Pin / Unpin', shortcut: 't', icon: '\u25C8' },
      { mode: 'remove', label: 'Delete', shortcut: 'r', icon: '\u2715' },
    ],
  },
];

export function ModeToolbar({ mode, setMode }: ModeToolbarProps) {
  return (
    <>
      {MODE_GROUPS.map((group) => (
        <div key={group.label} className="mode-group">
          <div className="mode-group-label">{group.label}</div>
          {group.modes.map(({ mode: m, label, shortcut, icon }) => (
            <button
              key={m}
              className={`mode-btn${mode === m ? ' active' : ''}`}
              onClick={() => setMode(m)}
            >
              <span className="mode-icon">{icon}</span>
              <span className="mode-label">{label}</span>
              <span className="mode-key">{shortcut}</span>
            </button>
          ))}
        </div>
      ))}
    </>
  );
}
