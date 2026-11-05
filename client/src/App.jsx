import { useState, useEffect, useCallback, useRef } from 'react';
import TodaySection from './components/TodaySection';
import BacklogSection from './components/BacklogSection';
import HistorySection from './components/HistorySection';
import TaskForm from './components/TaskForm';
import { withViewTransition, usePresence, useLatest, exitMs, DUR } from './motion';
import './App.css';

const getToday = () => new Date().toISOString().split('T')[0];

const formatDate = (dateStr) =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

const SORT_FNS = {
  priority: (a, b) => (a.priority - b.priority) || (a.created_at > b.created_at ? 1 : -1),
  time:     (a, b) => a.time_rating - b.time_rating,
  cost:     (a, b) => a.total_cost  - b.total_cost,
  category: (a, b) => {
    const ca = a.category_name ?? '￿';
    const cb = b.category_name ?? '￿';
    return ca.localeCompare(cb) || (a.created_at > b.created_at ? 1 : -1);
  },
};

export default function App() {
  const [allTasks, setAllTasks]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [backlogSort, setBacklogSort] = useState('priority');
  const [view, setView]             = useState('main');
  const [undoToast, setUndoToast]   = useState(null); // { id, title }
  const undoTimerRef = useRef(null);
  const [stagger, setStagger]       = useState(false);
  const [pillMoved, setPillMoved]   = useState(0);
  const today = getToday();

  // Undo toast stays mounted briefly so it can animate out
  const [toastMounted, toastExiting] = usePresence(!!undoToast, exitMs(DUR.base));
  const shownToast = useLatest(undoToast);

  // Rows stagger in on first load and whenever the view changes
  const staggerTimer = useRef(null);
  const playStagger = () => {
    setStagger(true);
    clearTimeout(staggerTimer.current);
    staggerTimer.current = setTimeout(() => setStagger(false), 700);
  };
  useEffect(() => { if (!loading) playStagger(); }, [loading]);

  const switchView = (next) => {
    if (next === view) return;
    setPillMoved(n => n + 1);
    withViewTransition(() => { setView(next); playStagger(); });
  };

  const changeSort = (next) => withViewTransition(() => setBacklogSort(next));

  // The tapped card (or the + button) morphs into the task page and back
  const openEdit  = (task) => withViewTransition(() => setEditingTask(task), 'open');
  const closeEdit = ()     => withViewTransition(() => setEditingTask(null), 'close');
  const openNew   = ()     => withViewTransition(() => setShowForm(true), 'open');
  const closeNew  = ()     => withViewTransition(() => setShowForm(false), 'close');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error();
      setAllTasks(await res.json());
    } catch (_) {
      setError('Could not load tasks — check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error();
      setCategories(await res.json());
    } catch (_) {}
  }, []);

  useEffect(() => { fetchTasks(); fetchCategories(); }, [fetchTasks, fetchCategories]);

  // Auto-dismiss errors after 5 s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // Derived views
  const todayTasks = allTasks
    .filter(t => t.planned_date === today)
    .sort((a, b) => (a.sort_order - b.sort_order) || (a.created_at > b.created_at ? 1 : -1));

  const backlogTasks = allTasks
    .filter(t => t.planned_date !== today && !t.completed)
    .sort(SORT_FNS[backlogSort]);

  const historyTasks = allTasks
    .filter(t => t.completed)
    .sort((a, b) => (b.completed_at ?? b.created_at).localeCompare(a.completed_at ?? a.created_at));

  const deleteCategory = async (id) => {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    setCategories(prev => prev.filter(c => c.id !== id));
    setAllTasks(prev => prev.map(t => t.category_id === id ? { ...t, category_id: null, category_name: null } : t));
  };

  const createCategory = async (name) => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const cat = await res.json();
    setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
    return cat;
  };

  // ── Mutators ────────────────────────────────────────────────
  const put = (id, body) =>
    fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); });

  const addTask = async ({ materials = [], tools = [], ...fields }) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error();
      const task = await res.json();
      if (materials.length || tools.length) {
        await Promise.all([
          ...materials.map(m => fetch(`/api/tasks/${task.id}/materials`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(m),
          })),
          ...tools.map(t => fetch(`/api/tasks/${task.id}/tools`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(t),
          })),
        ]);
        await fetchTasks();
        withViewTransition(() => setShowForm(false), 'close');
      } else {
        withViewTransition(() => { setAllTasks(prev => [...prev, task]); setShowForm(false); }, 'close');
      }
    } catch (_) {
      setError('Could not save task — please try again.');
    }
  };

  const updateTask = async (id, data) => {
    try {
      const updated = await put(id, data);
      withViewTransition(() => {
        setAllTasks(prev => prev.map(t => t.id === id ? updated : t));
        setEditingTask(null);
      }, 'close');
    } catch (_) {
      setError('Could not save changes — please try again.');
    }
  };

  const updateTaskCosts = (id, { total_cost, material_count }) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, total_cost, material_count } : t));
  };

  const toggleComplete = async (id, completed) => {
    try {
      const updated = await put(id, { completed: !completed });
      withViewTransition(() => setAllTasks(prev => prev.map(t => t.id === id ? updated : t)));
      if (!completed) {
        const task = allTasks.find(t => t.id === id);
        clearTimeout(undoTimerRef.current);
        setUndoToast({ id, title: task?.title ?? '' });
        undoTimerRef.current = setTimeout(() => setUndoToast(null), 3500);
      } else {
        clearTimeout(undoTimerRef.current);
        setUndoToast(null);
      }
    } catch (_) {
      setError('Could not update task — please try again.');
    }
  };

  const handleUndo = async () => {
    clearTimeout(undoTimerRef.current);
    const toast = undoToast;
    setUndoToast(null);
    if (!toast) return;
    try {
      const updated = await put(toast.id, { completed: false });
      withViewTransition(() => setAllTasks(prev => prev.map(t => t.id === toast.id ? updated : t)));
    } catch (_) {
      setError('Could not undo — please try again.');
    }
  };

  // `close` shuts the task page in the same transition as the list move
  const addToToday = async (id, { close = false } = {}) => {
    try {
      const maxOrder = todayTasks.reduce((m, t) => Math.max(m, t.sort_order || 0), 0);
      const updated = await put(id, { planned_date: today, sort_order: maxOrder + 1, completed: false });
      withViewTransition(() => {
        setAllTasks(prev => prev.map(t => t.id === id ? updated : t));
        if (close) setEditingTask(null);
      }, close ? 'close' : 'default');
    } catch (_) {
      setError('Could not add task to today — please try again.');
    }
  };

  const removeFromToday = async (id, { close = false } = {}) => {
    try {
      const updated = await put(id, { planned_date: null, completed: false });
      withViewTransition(() => {
        setAllTasks(prev => prev.map(t => t.id === id ? updated : t));
        if (close) setEditingTask(null);
      }, close ? 'close' : 'default');
    } catch (_) {
      setError('Could not remove task — please try again.');
    }
  };

  const reorderToday = async (activeId, overId) => {
    const active = todayTasks.filter(t => !t.completed);
    const oldIdx = active.findIndex(t => t.id === activeId);
    const newIdx = active.findIndex(t => t.id === overId);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = [...active];
    const [item] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, item);

    const withOrder = reordered.map((t, i) => ({ ...t, sort_order: (i + 1) * 1000 }));
    const snapshot = allTasks;

    setAllTasks(prev => {
      const ids = new Set(withOrder.map(t => t.id));
      return [...prev.filter(t => !ids.has(t.id)), ...withOrder];
    });

    try {
      await Promise.all(withOrder.map(t => put(t.id, { sort_order: t.sort_order })));
    } catch (_) {
      setAllTasks(snapshot);
      setError('Could not save order — please try again.');
    }
  };

  const deleteTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      withViewTransition(() => {
        setAllTasks(prev => prev.filter(t => t.id !== id));
        setEditingTask(null);
      }, 'close');
    } catch (_) {
      setError('Could not delete task — please try again.');
    }
  };

  const todayDone  = todayTasks.filter(t => t.completed).length;
  const todayTotal = todayTasks.length;
  const progress   = todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0;
  const historyBadge = historyTasks.length > 99 ? '99+' : historyTasks.length;
  // Pulse the done counter when a task is ticked off (not on first load)
  const [lastDone, setLastDone] = useState(null);
  const [badgePulse, setBadgePulse] = useState(0);
  if (!loading && todayDone !== lastDone) {
    if (lastDone !== null && todayDone > lastDone) setBadgePulse(n => n + 1);
    setLastDone(todayDone);
  }
  // Only one element may own a given view-transition-name at a time
  const editingId = editingTask?.id ?? null;

  return (
    <div className="app">
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button className="error-dismiss" onClick={() => setError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
      <header className="header" style={{ viewTransitionName: 'app-header' }}>
        <div className="header-top">
          <div>
            <h1 className="header-title">DIY Today</h1>
            <p className="header-date">{formatDate(today)}</p>
          </div>
          {todayTotal > 0 && view === 'main' && (
            <span key={badgePulse} className={`header-badge ${badgePulse ? 'header-badge--pulse' : ''}`}>{todayDone}/{todayTotal}</span>
          )}
        </div>
        {todayTotal > 0 && view === 'main' && (
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="view-tabs" style={{ '--tab-index': view === 'history' ? 1 : 0 }}>
          <span className={`view-tab-pill ${pillMoved ? 'view-tab-pill--moving' : ''}`} aria-hidden="true">
            <span key={pillMoved} className="view-tab-pill-inner" />
          </span>
          <button className={`view-tab ${view === 'main' ? 'view-tab--active' : ''}`} onClick={() => switchView('main')}>Plan</button>
          <button className={`view-tab ${view === 'history' ? 'view-tab--active' : ''}`} onClick={() => switchView('history')}>
            History {historyTasks.length > 0 && <span className="view-tab-count">{historyBadge}</span>}
          </button>
        </div>
      </header>

      <main className={`main ${stagger ? 'stagger' : ''}`}>
        {loading ? (
          <p className="loading-state">Loading…</p>
        ) : view === 'history' ? (
          <HistorySection tasks={historyTasks} onToggle={toggleComplete} onEdit={openEdit} editingId={editingId} />
        ) : (
          <>
            <TodaySection
              tasks={todayTasks}
              onToggle={toggleComplete}
              onEdit={openEdit}
              editingId={editingId}
              onRemove={removeFromToday}
              onReorder={reorderToday}
            />
            <BacklogSection
              tasks={backlogTasks}
              sort={backlogSort}
              onSortChange={changeSort}
              onEdit={openEdit}
              editingId={editingId}
              onAddToToday={addToToday}
            />
          </>
        )}
      </main>

      {toastMounted && shownToast && (
        <div className={`undo-toast ${toastExiting ? 'undo-toast--exit' : ''}`} role="status">
          <span className="undo-toast-text">"{shownToast.title}" done</span>
          <button className="undo-toast-btn" onClick={handleUndo}>Undo</button>
        </div>
      )}

      <button
        className="fab"
        onClick={openNew}
        aria-label="New task"
        style={{ viewTransitionName: showForm ? 'none' : 'task-new' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {showForm && (
        <TaskForm
          onSave={addTask}
          onClose={closeNew}
          viewTransitionName="task-new"
          categories={categories}
          onCategoryCreate={createCategory}
          onCategoryDelete={deleteCategory}
        />
      )}
      {editingTask && (
        <TaskForm
          task={editingTask}
          onSave={data => updateTask(editingTask.id, data)}
          onDelete={() => deleteTask(editingTask.id)}
          onAddToToday={() => addToToday(editingTask.id, { close: true })}
          onRemoveFromToday={() => removeFromToday(editingTask.id, { close: true })}
          onClose={closeEdit}
          viewTransitionName={`task-${editingTask.id}`}
          onMaterialsChange={costs => updateTaskCosts(editingTask.id, costs)}
          isToday={editingTask.planned_date === today}
          categories={categories}
          onCategoryCreate={createCategory}
          onCategoryDelete={deleteCategory}
        />
      )}
    </div>
  );
}
