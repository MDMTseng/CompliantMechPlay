import type { InteractionMode } from '../engine/types';
import type { LinkStep } from '../hooks/useCanvasInteraction';

interface StatusBarProps {
  mode: InteractionMode;
  linkStep: LinkStep;
  chainCount: number;
  worldName: string | null;
}

const MODE_LABELS: Record<InteractionMode, string> = {
  add: 'Add Rod',
  add_chain: 'Add Chain',
  add_link: 'Strong Hinge',
  add_weak_link: 'Weak Hinge',
  remove_link: 'Remove Link',
  move: 'Move',
  no_rotation_move: 'Move (Locked)',
  remove: 'Delete',
  toggle_static: 'Pin / Unpin',
};

const MODE_HINTS: Record<InteractionMode, string> = {
  add: 'Click and drag to create a rod',
  add_chain: '',
  add_link: 'Click two bodies to connect with a stiff hinge',
  add_weak_link: 'Click two bodies to connect with a flexible hinge',
  remove_link: 'Click two bodies to remove constraints between them',
  move: 'Click and drag a body to move it',
  no_rotation_move: 'Click and drag a body — rotation is locked',
  remove: 'Click a body to delete it',
  toggle_static: 'Click a body to pin/unpin it',
};

function isLinkMode(mode: InteractionMode): boolean {
  return mode === 'add_link' || mode === 'add_weak_link' || mode === 'remove_link';
}

export function StatusBar({ mode, linkStep, chainCount, worldName }: StatusBarProps) {
  const showSteps = isLinkMode(mode);
  const isChain = mode === 'add_chain';

  return (
    <div className="status-bar">
      <div className="status-mode">
        <span className="dot" />
        {MODE_LABELS[mode]}
      </div>

      {showSteps ? (
        <div className="status-step">
          <span className={`step-dot${linkStep >= 1 ? ' done' : ' current'}`} />
          <span style={{ fontSize: 11 }}>
            {linkStep === 0 ? 'Click first body' : 'Click second body'}
          </span>
          <span className={`step-dot${linkStep >= 1 ? ' current' : ''}`} />
        </div>
      ) : isChain ? (
        <div className="status-hint">
          {chainCount === 0
            ? 'Click to place the first point — then click to add segments'
            : `${chainCount} segment${chainCount === 1 ? '' : 's'} placed — click to continue, switch mode to finish`}
        </div>
      ) : (
        <div className="status-hint">{MODE_HINTS[mode]}</div>
      )}

      <div className="status-world">
        {worldName ? (
          <>World: <span>{worldName}</span></>
        ) : (
          'Unsaved'
        )}
      </div>
    </div>
  );
}
