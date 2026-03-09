import { useState, useCallback, useEffect } from 'react';
import { PhysicsEngine } from '../engine/PhysicsEngine';
import {
  saveWorldToStorage,
  loadWorldFromStorage,
  deleteWorldFromStorage,
  getWorldNames,
  deserializeWorld,
} from '../engine/serialization';

export function useWorldPersistence(
  engineRef: React.RefObject<PhysicsEngine | null>,
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

    saveWorldToStorage(worldName, pe.world);
    refreshList();
  }, [engineRef, worldName, refreshList]);

  const saveNewWorld = useCallback(() => {
    const pe = engineRef.current;
    if (!pe) return;

    const name = prompt('Enter a name for this world:');
    if (!name) return;

    saveWorldToStorage(name, pe.world);
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
      setWorldName(name);
    },
    [engineRef],
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
