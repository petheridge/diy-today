import { useState, useEffect, useRef } from 'react';
import { MaterialsSection, ToolsSection } from './TaskFormParts';
import './AddTaskForm.css';
import './EditTaskForm.css';
import './TaskPage.css';

const PRIORITY_OPTIONS = [
  { value: 1, label: 'High',     color: '#E74C3C' },
  { value: 2, label: 'Medium',   color: '#E67E22' },
  { value: 3, label: 'Low',      color: '#7F8C8D' },
];

const TIME_OPTIONS = [
  { value: 1, label: 'Quick',    sub: '< 1 hr'  },
  { value: 2, label: 'Half Day', sub: '~4 hrs'  },
  { value: 3, label: 'Full Day', sub: '~8 hrs'  },
  { value: 4, label: 'Weekend',  sub: '2+ days' },
];

const TIME_COLORS = ['', 'var(--time-1)', 'var(--time-2)', 'var(--time-3)', 'var(--time-4)'];

let _tempId = 0;
const tempId = () => ++_tempId;

function BackIcon() {
  return (
    <svg width="11" height="18" viewBox="0 0 11 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10 1 1 9 10 17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function TaskForm({ task, onSave, onDelete, onClose, onAddToToday, onRemoveFromToday, onMaterialsChange, isToday, categories = [], onCategoryCreate, onCategoryDelete }) {
  const isEdit = !!task;

  const [title, setTitle]           = useState(task?.title ?? '');
  const [notes, setNotes]           = useState(task?.notes ?? '');
  const [timeRating, setTimeRating] = useState(task?.time_rating ?? 1);
  const [priority, setPriority]     = useState(task?.priority ?? 2);
  const [categoryId, setCategoryId] = useState(task?.category_id ?? null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [materials, setMaterials]             = useState([]);
  const [tools, setTools]                     = useState([]);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddTool, setShowAddTool]         = useState(false);

  const dropdownRef = useRef(null);

  // Compute dirtiness from state directly — no ref needed
  const isDirty = isEdit && (
    title !== (task?.title ?? '') ||
    notes !== (task?.notes ?? '') ||
    timeRating !== (task?.time_rating ?? 1) ||
    priority !== (task?.priority ?? 2) ||
    categoryId !== (task?.category_id ?? null)
  );

  useEffect(() => {
    if (!showDropdown) return;
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); };
  }, [showDropdown]);

  useEffect(() => {
    if (!isEdit) return;
    Promise.all([
      fetch(`/api/tasks/${task.id}/materials`).then(r => r.json()),
      fetch(`/api/tasks/${task.id}/tools`).then(r => r.json()),
    ]).then(([mats, tls]) => { setMaterials(mats); setTools(tls); });
  }, [task?.id, isEdit]);

  const handleBack = async () => {
    if (isDirty && title.trim()) {
      setSubmitting(true);
      await onSave({ title, notes, time_rating: timeRating, priority, category_id: categoryId });
      setSubmitting(false);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    await onSave({ title, notes, time_rating: timeRating, priority, category_id: categoryId, materials, tools });
    setSubmitting(false);
  };

  const handleDeleteCategory = async (id) => {
    await onCategoryDelete(id);
    if (categoryId === id) setCategoryId(null);
    setConfirmDeleteCategory(null);
  };

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const cat = await onCategoryCreate(trimmed);
    if (cat) {
      setCategoryId(cat.id);
      setNewCategoryName('');
      setShowNewCategory(false);
    }
  };

  const notifyCosts = (mats) => {
    onMaterialsChange?.({
      total_cost: mats.reduce((s, m) => s + (m.estimated_cost || 0), 0),
      material_count: mats.length,
    });
  };

  const addMaterial = async (data) => {
    if (isEdit) {
      const res = await fetch(`/api/tasks/${task.id}/materials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const m = await res.json();
      setMaterials(p => { const next = [...p, m]; notifyCosts(next); return next; });
    } else {
      setMaterials(p => [...p, { ...data, id: tempId() }]);
    }
    setShowAddMaterial(false);
  };

  const editMaterial = async (id, data) => {
    if (isEdit) {
      const res = await fetch(`/api/materials/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const m = await res.json();
      setMaterials(p => { const next = p.map(x => x.id === id ? m : x); notifyCosts(next); return next; });
    } else {
      setMaterials(p => p.map(x => x.id === id ? { ...x, ...data } : x));
    }
  };

  const deleteMaterial = async (id) => {
    if (isEdit) await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    setMaterials(p => { const next = p.filter(m => m.id !== id); notifyCosts(next); return next; });
  };

  const addTool = async (data) => {
    if (isEdit) {
      const res = await fetch(`/api/tasks/${task.id}/tools`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const t = await res.json();
      setTools(p => [...p, t]);
    } else {
      setTools(p => [...p, { ...data, id: tempId() }]);
    }
    setShowAddTool(false);
  };

  const editTool = async (id, data) => {
    if (isEdit) {
      const res = await fetch(`/api/tools/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const t = await res.json();
      setTools(p => p.map(x => x.id === id ? t : x));
    } else {
      setTools(p => p.map(x => x.id === id ? { ...x, ...data } : x));
    }
  };

  const deleteTool = async (id) => {
    if (isEdit) await fetch(`/api/tools/${id}`, { method: 'DELETE' });
    setTools(p => p.filter(t => t.id !== id));
  };

  const backLabel = isEdit ? (isDirty ? 'Save' : 'Back') : 'Cancel';

  return (
    <div className="task-page">
      <header className="page-header">
        <button
          className={`btn-page-back ${isEdit && isDirty ? 'btn-page-back--save' : ''}`}
          type="button"
          onClick={isEdit ? handleBack : onClose}
          aria-label={backLabel}
          disabled={submitting}
        >
          {isEdit ? <BackIcon /> : <CloseIcon />}
          <span>{backLabel}</span>
        </button>
        <h1 className="page-header-title">{isEdit ? (title || task.title) : 'New Task'}</h1>
        {isEdit ? (
          <div style={{ minWidth: 80 }} />
        ) : (
          <button
            type="submit"
            form="task-form"
            className="btn-page-action"
            disabled={!title.trim() || submitting}
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        )}
      </header>

      <div className="page-body">
        {isEdit && (
          <div className="plan-toggle">
            {isToday ? (
              <button className="plan-btn plan-btn--remove" onClick={onRemoveFromToday}>
                ✕ Remove from today's plan
              </button>
            ) : (
              <button className="plan-btn plan-btn--add" onClick={onAddToToday}>
                + Add to today's plan
              </button>
            )}
          </div>
        )}

        <form id="task-form" onSubmit={handleSubmit} className="form">
          <div className="field">
            <label className="label" htmlFor="task-title">Task</label>
            <input
              id="task-title"
              className="input"
              type="text"
              placeholder="e.g. Fix garden fence"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoComplete="off"
              autoFocus={!isEdit}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="task-notes">
              Notes <span className="optional">(optional)</span>
            </label>
            <textarea
              id="task-notes"
              className="input textarea"
              placeholder="Measurements, location, approach…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={isEdit ? 3 : 2}
            />
          </div>
        </form>

        <div className="section">
          <label className="label">Category <span className="optional">(optional)</span></label>
          <div className="category-select" ref={dropdownRef}>
            <button
              type="button"
              className="category-select-trigger"
              onClick={() => { setShowDropdown(prev => !prev); setShowNewCategory(false); }}
            >
              <span className={!categoryId ? 'category-select-placeholder' : ''}>
                {categoryId ? (categories.find(c => c.id === categoryId)?.name ?? '') : 'No category'}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0, color: 'var(--text-muted)' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showDropdown && (
              <div className="category-dropdown">
                <button type="button" className="category-option category-option--none"
                  onClick={() => { setCategoryId(null); setShowDropdown(false); }}>
                  <span>No category</span>
                  {!categoryId && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </button>
                {categories.map(cat => (
                  confirmDeleteCategory === cat.id ? (
                    <div key={cat.id} className="category-option-confirm">
                      <span className="category-option-confirm-label">Delete '{cat.name}'?</span>
                      <button type="button" className="btn-item-cancel" onClick={() => setConfirmDeleteCategory(null)}>Keep</button>
                      <button type="button" className="btn-item-confirm" onClick={() => handleDeleteCategory(cat.id)}>Delete</button>
                    </div>
                  ) : (
                    <div key={cat.id} className="category-option-row">
                      <button type="button" className="category-option-btn"
                        onClick={() => { setCategoryId(cat.id); setShowDropdown(false); }}>
                        <span>{cat.name}</span>
                        {categoryId === cat.id && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </button>
                      <button type="button" className="category-option-delete-btn"
                        onClick={() => setConfirmDeleteCategory(cat.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  )
                ))}
                <button type="button" className="category-option category-option--add"
                  onClick={() => { setShowDropdown(false); setShowNewCategory(true); }}>
                  + Add new category
                </button>
              </div>
            )}
          </div>
          {showNewCategory && (
            <div className="inline-form" style={{ marginTop: 10 }}>
              <div className="inline-form-row">
                <input
                  className="input"
                  type="text"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); }
                    if (e.key === 'Escape') { setShowNewCategory(false); setNewCategoryName(''); }
                  }}
                  autoFocus
                  autoComplete="off"
                />
                <div className="inline-form-actions inline-form-actions--compact">
                  <button type="button" className="btn-inline-cancel"
                    onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}>
                    Cancel
                  </button>
                  <button type="button" className="btn-inline-add"
                    disabled={!newCategoryName.trim()}
                    onClick={handleCreateCategory}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <MaterialsSection
          materials={materials} showAdd={showAddMaterial}
          onAdd={addMaterial} onDelete={deleteMaterial} onEdit={editMaterial}
          onShowAdd={() => setShowAddMaterial(true)}
          onHideAdd={() => setShowAddMaterial(false)}
        />

        <ToolsSection
          tools={tools} showAdd={showAddTool}
          onAdd={addTool} onDelete={deleteTool} onEdit={editTool}
          onShowAdd={() => setShowAddTool(true)}
          onHideAdd={() => setShowAddTool(false)}
        />

        <div className="section">
          <label className="label">Priority</label>
          <div className="rating-grid rating-grid--3 priority-grid">
            {PRIORITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`priority-btn-sm ${priority === opt.value ? 'priority-btn-sm--active' : ''}`}
                style={{ '--p-color': opt.color }}
                onClick={() => setPriority(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="section">
          <label className="label">Time needed</label>
          <div className="time-grid">
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`time-btn ${timeRating === opt.value ? 'time-btn--active' : ''}`}
                style={{ '--t-color': TIME_COLORS[opt.value] }}
                onClick={() => setTimeRating(opt.value)}
              >
                <span className="time-btn-main">{opt.label}</span>
                <span className="time-btn-sub">{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {isEdit && (
          <div className="delete-section">
            {!confirmDelete ? (
              <button className="btn-delete-trigger" onClick={() => setConfirmDelete(true)}>
                Delete task
              </button>
            ) : (
              <div className="delete-confirm">
                <p className="delete-confirm-text">Delete this task?</p>
                <div className="delete-confirm-actions">
                  <button className="btn-cancel-delete" onClick={() => setConfirmDelete(false)}>Keep it</button>
                  <button className="btn-confirm-delete" onClick={onDelete}>Yes, delete</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
