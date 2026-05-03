import { useState, useRef, useEffect } from 'react';
import './EditTaskForm.css';

export function ExternalLinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function EditMaterialForm({ material, onSave, onCancel }) {
  const [name, setName] = useState(material.name);
  const [cost, setCost] = useState(Number(material.estimated_cost) > 0 ? String(material.estimated_cost) : '');
  const [url, setUrl]   = useState(material.url || '');
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), estimated_cost: parseFloat(cost) || 0, url: url.trim() });
  };

  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="inline-form">
      <input
        ref={nameRef}
        className="input"
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={onKey}
        autoComplete="off"
      />
      <div className="inline-form-row">
        <div className="cost-input-wrap">
          <span className="cost-prefix">£</span>
          <input
            className="input cost-input"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={cost}
            onChange={e => setCost(e.target.value)}
            onKeyDown={onKey}
          />
        </div>
        <input
          className="input url-input"
          type="url"
          placeholder="Buy URL (optional)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={onKey}
        />
      </div>
      <div className="inline-form-actions">
        <button type="button" className="btn-inline-cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-inline-add" disabled={!name.trim()} onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}

function EditToolForm({ tool, onSave, onCancel }) {
  const [name, setName] = useState(tool.name);
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim() });
  };

  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="inline-form">
      <div className="inline-form-row">
        <input
          ref={nameRef}
          className="input"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={onKey}
          autoComplete="off"
        />
        <div className="inline-form-actions inline-form-actions--compact">
          <button type="button" className="btn-inline-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-inline-add" disabled={!name.trim()} onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function MaterialRow({ material, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasUrl = material.url && material.url.trim();

  if (editing) {
    return (
      <EditMaterialForm
        material={material}
        onSave={async (data) => { await onEdit(material.id, data); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  if (confirmDelete) {
    return (
      <div className="item-row item-row--confirm">
        <span className="item-delete-label">Remove {material.name}?</span>
        <button className="btn-item-cancel" type="button" onClick={() => setConfirmDelete(false)}>Keep</button>
        <button className="btn-item-confirm" type="button" onClick={() => onDelete(material.id)}>Remove</button>
      </div>
    );
  }

  return (
    <div className="item-row">
      <button
        className="item-edit"
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Edit material"
      >
        <PencilIcon />
      </button>
      <div className="item-row-info">
        <span className="item-name">{material.name}</span>
        <div className="item-row-meta">
          <span className="item-cost">
            {Number(material.estimated_cost) > 0
              ? `£${Number(material.estimated_cost).toFixed(2)}`
              : 'Free'}
          </span>
          {hasUrl && (
            <a
              href={material.url}
              target="_blank"
              rel="noopener noreferrer"
              className="item-link"
              onClick={e => e.stopPropagation()}
              aria-label="Buy link"
            >
              <ExternalLinkIcon />
            </a>
          )}
        </div>
      </div>
      <button
        className="item-delete"
        type="button"
        onClick={() => setConfirmDelete(true)}
        aria-label="Remove material"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export function ToolRow({ tool, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return (
      <EditToolForm
        tool={tool}
        onSave={async (data) => { await onEdit(tool.id, data); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  if (confirmDelete) {
    return (
      <div className="item-row item-row--confirm">
        <span className="item-delete-label">Remove {tool.name}?</span>
        <button className="btn-item-cancel" type="button" onClick={() => setConfirmDelete(false)}>Keep</button>
        <button className="btn-item-confirm" type="button" onClick={() => onDelete(tool.id)}>Remove</button>
      </div>
    );
  }

  return (
    <div className="item-row">
      <button
        className="item-edit"
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Edit tool"
      >
        <PencilIcon />
      </button>
      <span className="item-name">{tool.name}</span>
      <button
        className="item-delete"
        type="button"
        onClick={() => setConfirmDelete(true)}
        aria-label="Remove tool"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export function AddMaterialForm({ onAdd, onCancel }) {
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [url, setUrl] = useState('');
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), estimated_cost: parseFloat(cost) || 0, url: url.trim() });
  };

  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="inline-form">
      <input
        ref={nameRef}
        className="input"
        type="text"
        placeholder="Material name"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={onKey}
        autoComplete="off"
      />
      <div className="inline-form-row">
        <div className="cost-input-wrap">
          <span className="cost-prefix">£</span>
          <input
            className="input cost-input"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={cost}
            onChange={e => setCost(e.target.value)}
            onKeyDown={onKey}
          />
        </div>
        <input
          className="input url-input"
          type="url"
          placeholder="Buy URL (optional)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={onKey}
        />
      </div>
      <div className="inline-form-actions">
        <button type="button" className="btn-inline-cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-inline-add" disabled={!name.trim()} onClick={handleAdd}>Add</button>
      </div>
    </div>
  );
}

export function AddToolForm({ onAdd, onCancel }) {
  const [name, setName] = useState('');
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim() });
  };

  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="inline-form">
      <div className="inline-form-row">
        <input
          ref={nameRef}
          className="input"
          type="text"
          placeholder="Tool name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={onKey}
          autoComplete="off"
        />
        <div className="inline-form-actions inline-form-actions--compact">
          <button type="button" className="btn-inline-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-inline-add" disabled={!name.trim()} onClick={handleAdd}>Add</button>
        </div>
      </div>
    </div>
  );
}

export function MaterialsSection({ materials, showAdd, onAdd, onDelete, onEdit, onShowAdd, onHideAdd }) {
  const total = materials.reduce((sum, m) => sum + Number(m.estimated_cost), 0);
  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Materials</span>
        {materials.length > 0 && (
          <span className="section-total">
            Total: <strong>£{total.toFixed(2)}</strong>
          </span>
        )}
      </div>
      {materials.length > 0 && (
        <div className="item-list">
          {materials.map(m => (
            <MaterialRow key={m.id} material={m} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
      {showAdd ? (
        <AddMaterialForm onAdd={onAdd} onCancel={onHideAdd} />
      ) : (
        <button type="button" className="btn-add-item" onClick={onShowAdd}>
          + Add material
        </button>
      )}
    </div>
  );
}

export function ToolsSection({ tools, showAdd, onAdd, onDelete, onEdit, onShowAdd, onHideAdd }) {
  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Tools needed</span>
      </div>
      {tools.length > 0 && (
        <div className="item-list">
          {tools.map(t => (
            <ToolRow key={t.id} tool={t} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
      {showAdd ? (
        <AddToolForm onAdd={onAdd} onCancel={onHideAdd} />
      ) : (
        <button type="button" className="btn-add-item" onClick={onShowAdd}>
          + Add tool
        </button>
      )}
    </div>
  );
}
