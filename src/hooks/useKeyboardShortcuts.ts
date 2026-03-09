import { useEffect } from 'react';
import type { InteractionMode } from '../engine/types';

interface KeyboardActions {
  setMode: (mode: InteractionMode) => void;
  saveWorld: () => void;
  toggleDetailPanel: () => void;
}

const KEY_TO_MODE: Record<string, InteractionMode> = {
  a: 'add',
  A: 'add_chain',
  L: 'add_link',
  l: 'add_weak_link',
  k: 'remove_link',
  m: 'move',
  M: 'no_rotation_move',
  r: 'remove',
  t: 'toggle_static',
};

export function useKeyboardShortcuts(actions: KeyboardActions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const mode = KEY_TO_MODE[e.key];
      if (mode) {
        actions.setMode(mode);
        return;
      }

      if (e.key === 's') {
        e.preventDefault();
        actions.saveWorld();
      } else if (e.key === 'd') {
        actions.toggleDetailPanel();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions]);
}
