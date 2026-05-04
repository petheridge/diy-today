import './TaskItem.css';

const TIME_LABELS = ['', 'Quick', 'Half Day', 'Full Day', 'Weekend'];
const TIME_SUBLABELS = ['', '< 1 hr', '~4 hrs', '~8 hrs', '2+ days'];
const TIME_COLORS = ['', 'var(--time-1)', 'var(--time-2)', 'var(--time-3)', 'var(--time-4)'];

function formatCost(total) {
  if (total === 0) return 'Free';
  return `£${total.toFixed(2)}`;
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

export default function TaskItem({ task, onToggle, onEdit }) {
  const { id, title, notes, time_rating, completed, total_cost, material_count } = task;

  return (
    <div
      className={`task-card ${completed ? 'task-card--done' : ''}`}
      onClick={() => onEdit(task)}
      role="button"
      aria-label={`Edit: ${title}`}
    >
      <button
        className="task-check"
        onClick={e => { e.stopPropagation(); onToggle(id, completed); }}
        aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {completed ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" fill="var(--primary)" />
            <polyline points="6,11 9.5,14.5 16,8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" stroke="#D0CECA" strokeWidth="1.5" />
          </svg>
        )}
      </button>

      <div className="task-body">
        <p className="task-title">{title}</p>
        {notes && <p className="task-notes">{notes}</p>}
        <div className="task-badges">
          <span
            className="badge time-badge"
            style={{ '--badge-color': TIME_COLORS[time_rating] }}
            title={TIME_SUBLABELS[time_rating]}
          >
            <TimeIcon rating={time_rating} />
            {TIME_LABELS[time_rating]}
          </span>
          {material_count > 0 && (
            <span
              className="badge cost-badge"
              style={{ '--badge-color': costColor(total_cost) }}
              title={`${material_count} material${material_count !== 1 ? 's' : ''}`}
            >
              {formatCost(total_cost)}
            </span>
          )}
        </div>
      </div>

      <div className="task-chevron" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}
