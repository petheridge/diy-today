import './BacklogSection.css';

const TIME_LABELS = ['', 'Quick', 'Half Day', 'Full Day', 'Weekend'];
const TIME_COLORS = ['', 'var(--time-1)', 'var(--time-2)', 'var(--time-3)', 'var(--time-4)'];

// Match priority colours used in the task form (High=red, Medium=orange, Low=grey)
const PRIORITY_COLOR = ['', '#E74C3C', '#E67E22', '#7F8C8D'];

function formatCost(total) {
  if (total === 0) return 'Free';
  return `£${Number(total).toFixed(2)}`;
}

function costColor(total) {
  if (total < 20)  return '#16a34a';
  if (total < 100) return '#d97706';
  return '#dc2626';
}

function TimeIcon({ rating }) {
  const r = 8, cx = 10, cy = 10;
  const circ = 2 * Math.PI * r;

  if (rating === 3) {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  if (rating === 4) {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeWidth="2" />
        <line x1="10" y1="6.5" x2="10" y2="13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="6.5" y1="10" x2="13.5" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  const fractions = [0, 0.18, 0.5];
  const dash = circ * fractions[rating];

  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <circle
        cx={cx} cy={cy} r={r}
        stroke="currentColor" strokeWidth="2"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 10 10)"
      />
    </svg>
  );
}

function BacklogTaskItem({ task, onEdit, onAddToToday, showCategoryBadge }) {
  const priority = task.priority || 2;

  return (
    <div
      className="backlog-card"
      style={{ '--priority-color': PRIORITY_COLOR[priority] }}
    >
      <div className="backlog-card-inner" onClick={() => onEdit(task)} role="button">
        <div className="backlog-card-top">
          <p className="backlog-card-title">{task.title}</p>
          {task.material_count > 0 && (
            <span className="backlog-card-cost" style={{ color: costColor(task.total_cost) }}>{formatCost(task.total_cost)}</span>
          )}
        </div>
        <div className="task-badges">
          <span className="badge time-badge" style={{ '--badge-color': TIME_COLORS[task.time_rating] }}>
            <TimeIcon rating={task.time_rating} />
            {TIME_LABELS[task.time_rating]}
          </span>
          {showCategoryBadge && task.category_name && (
            <span className="badge category-badge">{task.category_name}</span>
          )}
        </div>
      </div>

      <button
        className="btn-add-today"
        onClick={() => onAddToToday(task.id)}
        aria-label="Add to today's plan"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>Today</span>
      </button>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'time',     label: 'Time'     },
  { value: 'cost',     label: 'Cost'     },
  { value: 'category', label: 'Category' },
];

export default function BacklogSection({ tasks, sort, onSortChange, onEdit, onAddToToday }) {
  const isCategorySort = sort === 'category';

  const groups = isCategorySort ? (() => {
    const map = new Map();
    for (const task of tasks) {
      const key = task.category_name ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    }
    const named = [...map.entries()]
      .filter(([k]) => k !== null)
      .sort(([a], [b]) => a.localeCompare(b));
    const uncategorised = map.has(null) ? [[null, map.get(null)]] : [];
    return [...named, ...uncategorised];
  })() : null;

  return (
    <section className="backlog-section">
      <div className="backlog-header">
        <h2 className="section-label">Task List</h2>
        <div className="sort-tabs">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`sort-tab ${sort === opt.value ? 'sort-tab--active' : ''}`}
              onClick={() => onSortChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="backlog-empty">
          <p className="backlog-empty-text">No tasks in your list</p>
          <p className="backlog-empty-sub">Tap + to add a new DIY task</p>
        </div>
      ) : isCategorySort ? (
        <div className="backlog-list">
          {groups.map(([groupName, groupTasks]) => (
            <div key={groupName ?? '__none__'} className="category-group">
              <p className="category-group-header">{groupName ?? 'Uncategorised'}</p>
              {groupTasks.map(task => (
                <BacklogTaskItem
                  key={task.id}
                  task={task}
                  onEdit={onEdit}
                  onAddToToday={onAddToToday}
                  showCategoryBadge={false}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="backlog-list">
          {tasks.map(task => (
            <BacklogTaskItem
              key={task.id}
              task={task}
              onEdit={onEdit}
              onAddToToday={onAddToToday}
              showCategoryBadge
            />
          ))}
        </div>
      )}
    </section>
  );
}
