import './HistorySection.css';

const TIME_LABELS = ['', 'Quick', 'Half Day', 'Full Day', 'Weekend'];
const TIME_COLORS = ['', 'var(--time-1)', 'var(--time-2)', 'var(--time-3)', 'var(--time-4)'];

function costColor(total) {
  if (total < 20)  return '#16a34a';
  if (total < 100) return '#d97706';
  return '#dc2626';
}

function formatCost(total) {
  return Number(total) === 0 ? 'Free' : `£${Number(total).toFixed(2)}`;
}

const getToday = () => new Date().toISOString().split('T')[0];

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function formatGroupDate(dateStr) {
  if (!dateStr) return 'Unscheduled';
  const today = getToday();
  const yesterday = getYesterday();
  if (dateStr === today)     return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function HistoryTaskItem({ task, onToggle }) {
  return (
    <div className="history-card">
      <button
        className="history-check"
        onClick={() => onToggle(task.id, task.completed)}
        aria-label="Mark incomplete"
        title="Restore to backlog"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="10" fill="var(--primary)" />
          <polyline points="6,11 9.5,14.5 16,8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>

      <div className="history-card-body">
        <p className="history-card-title">{task.title}</p>
        <div className="task-badges">
          <span className="badge time-badge" style={{ '--badge-color': TIME_COLORS[task.time_rating] }}>
            {TIME_LABELS[task.time_rating]}
          </span>
          {task.material_count > 0 && (
            <span className="badge cost-badge" style={{ '--badge-color': costColor(task.total_cost) }}>
              {formatCost(task.total_cost)}
            </span>
          )}
          {task.category_name && (
            <span className="badge category-badge">{task.category_name}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistorySection({ tasks, onToggle }) {
  if (tasks.length === 0) {
    return (
      <section className="history-section">
        <div className="history-empty">
          <p className="history-empty-text">No completed tasks yet</p>
          <p className="history-empty-sub">Completed tasks will appear here</p>
        </div>
      </section>
    );
  }

  // Group by planned_date, sorted descending; null dates last
  const byDate = new Map();
  for (const task of tasks) {
    const key = task.planned_date ?? null;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(task);
  }

  const sortedKeys = [...byDate.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return b.localeCompare(a);
  });

  return (
    <section className="history-section">
      {sortedKeys.map(dateKey => (
        <div key={dateKey ?? '__none__'} className="history-group">
          <p className="history-group-header">{formatGroupDate(dateKey)}</p>
          <div className="history-list">
            {byDate.get(dateKey).map(task => (
              <HistoryTaskItem key={task.id} task={task} onToggle={onToggle} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
