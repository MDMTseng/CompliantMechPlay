interface WorldManagerProps {
  worldName: string | null;
  worldList: string[];
  onSave: () => void;
  onSaveNew: () => void;
  onLoad: (name: string) => void;
  onDelete: () => void;
}

export function WorldManager({
  worldName,
  worldList,
  onSave,
  onSaveNew,
  onLoad,
  onDelete,
}: WorldManagerProps) {
  return (
    <div>
      <div className="world-actions">
        <button className="world-btn" onClick={onSave}>
          Save
        </button>
        <button className="world-btn" onClick={onSaveNew}>
          Save As...
        </button>
        <button
          className="world-btn"
          onClick={() => worldName && onLoad(worldName)}
        >
          Reload
        </button>
        <button className="world-btn danger" onClick={onDelete}>
          Delete
        </button>
      </div>
      <select
        className="world-select"
        value={worldName || ''}
        onChange={(e) => onLoad(e.target.value)}
      >
        <option value="">Select a world...</option>
        {worldList.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {worldName && (
        <div className="world-current">
          Active: <span>{worldName}</span>
        </div>
      )}
    </div>
  );
}
