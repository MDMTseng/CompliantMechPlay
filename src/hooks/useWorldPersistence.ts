import { useState, useCallback, useEffect } from 'react';
import { PhysicsEngine } from '../engine/PhysicsEngine';
import type { CameraState } from '../engine/types';
import {
  saveWorldToStorage,
  loadWorldFromStorage,
  deleteWorldFromStorage,
  getWorldNames,
  deserializeWorld,
} from '../engine/serialization';

export function useWorldPersistence(
  engineRef: React.RefObject<PhysicsEngine | null>,
  getCamera?: () => CameraState | null,
  setCamera?: (camera: CameraState) => void,
) {
  const [worldName, setWorldName] = useState<string | null>(null);
  const [worldList, setWorldList] = useState<string[]>([]);

  const refreshList = useCallback(() => {
    setWorldList(getWorldNames());
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const saveWorld = useCallback(() => {
    const pe = engineRef.current;
    if (!pe) return;

    if (!worldName) {
      saveNewWorld();
      return;
    }

    saveWorldToStorage(worldName, pe.world, getCamera?.() ?? undefined);
    refreshList();
  }, [engineRef, worldName, refreshList, getCamera]);

  const saveNewWorld = useCallback(() => {
    const pe = engineRef.current;
    if (!pe) return;

    const name = prompt('Enter a name for this world:');
    if (!name) return;

    saveWorldToStorage(name, pe.world, getCamera?.() ?? undefined);
    setWorldName(name);
    refreshList();
  }, [engineRef, refreshList]);

  const loadWorld = useCallback(
    (name: string) => {
      const pe = engineRef.current;
      if (!pe || !name) return;

      const data = loadWorldFromStorage(name);
      if (!data) return;

      const newWorld = deserializeWorld(data);
      pe.replaceWorld(newWorld);
      if (data.camera && setCamera) {
        setCamera(data.camera);
      }
      setWorldName(name);
    },
    [engineRef, setCamera],
  );

  const deleteWorld = useCallback(
    (name?: string) => {
      const target = name || worldName;
      if (!target) return;

      if (!confirm(`Delete world "${target}"?`)) return;

      deleteWorldFromStorage(target);
      if (target === worldName) {
        setWorldName(null);
      }
      refreshList();
    },
    [engineRef, worldName, refreshList],
  );

  return {
    worldName,
    worldList,
    saveWorld,
    saveNewWorld,
    loadWorld,
    deleteWorld,
  };
}
