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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      <button onClick={onSave} style={btnStyle}>
        Save (s)
      </button>
      <button onClick={onSaveNew} style={btnStyle}>
        Save New
      </button>
      <button onClick={() => worldName && onLoad(worldName)} style={btnStyle}>
        Reload
      </button>
      <button
        onClick={onDelete}
        style={{ ...btnStyle, backgroundColor: '#ffcccc' }}
      >
        Delete
      </button>
      <select
        value={worldName || ''}
        onChange={(e) => onLoad(e.target.value)}
        style={{ padding: '4px 8px', fontSize: 12, borderRadius: 4 }}
      >
        <option value="">Load World...</option>
        {worldList.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {worldName && (
        <span style={{ fontSize: 12, color: '#666' }}>Current: {worldName}</span>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  border: 'none',
  borderRadius: 4,
  backgroundColor: '#e0e0e0',
  cursor: 'pointer',
};
