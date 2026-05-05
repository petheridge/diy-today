import { useState } from 'react';
import {
  DndContext, closestCenter,
  PointerSensor, TouchSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './TodaySection.css';

const TIME_LABELS = ['', 'Quick', 'Half Day', 'Full Day', 'Weekend'];
const TIME_COLORS = ['', 'var(--time-1)', 'var(--time-2)', 'var(--time-3)', 'var(--time-4)'];

function formatCost(total) {
  return Number(total) === 0 ? 'Free' : `£${Number(total).toFixed(2)}`;
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

function GripIcon() {
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor">
      <circle cx="5" cy="5"  r="1.8" /><circle cx="11" cy="5"  r="1.8" />
      <circle cx="5" cy="10" r="1.8" /><circle cx="11" cy="10" r="1.8" />
      <circle cx="5" cy="15" r="1.8" /><circle cx="11" cy="15" r="1.8" />
    </svg>
  );
}

function TodayTaskItem({ task, onToggle, onEdit, onRemove, dragHandleProps, isDragging }) {
  return (
    <div className={`today-card ${task.completed ? 'today-card--done' : ''} ${isDragging ? 'today-card--dragging' : ''}`}>
      <div className="drag-handle" {...dragHandleProps} aria-label="Drag to reorder">
        <GripIcon />
      </div>

      <button
        className="today-check"
        onClick={() => onToggle(task.id, task.completed)}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed ? (
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

      <div className="today-card-body" onClick={() => onEdit(task)} role="button">
        <p className="today-card-title">{task.title}</p>
        <div className="task-badges">
          <span className="badge time-badge" style={{ '--badge-color': TIME_COLORS[task.time_rating] }}>
            <TimeIcon rating={task.time_rating} />
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

      <button className="today-remove" onClick={() => onRemove(task.id)} aria-label="Remove from today">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function SortableItem({ task, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <TodayTaskItem
        task={task}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        {...props}
      />
    </div>
  );
}

export default function TodaySection({ tasks, onToggle, onEdit, onRemove, onReorder }) {
  const active    = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t =>  t.completed);
  const [showCompleted, setShowCompleted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) onReorder(active.id, over.id);
  };

  return (
    <section className="today-section">
      <div className="section-label-row">
        <h2 className="section-label">Today's Plan</h2>
        {tasks.length > 0 && (
          <span className="section-count">{completed.length}/{tasks.length} done</span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="today-empty">
          <p className="today-empty-text">No tasks planned for today</p>
          <p className="today-empty-sub">Add tasks from your list below, or tap + for a new one</p>
        </div>
      ) : (
        <div className="today-list">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={active.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {active.map(task => (
                <SortableItem
                  key={task.id} task={task}
                  onToggle={onToggle} onEdit={onEdit} onRemove={onRemove}
                />
              ))}
            </SortableContext>
          </DndContext>

          {completed.length > 0 && (
            <>
              <button
                className="done-divider-toggle"
                onClick={() => setShowCompleted(v => !v)}
                aria-expanded={showCompleted}
              >
                <span>Completed ({completed.length})</span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showCompleted ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showCompleted && completed.map(task => (
                <TodayTaskItem
                  key={task.id} task={task}
                  onToggle={onToggle} onEdit={onEdit} onRemove={onRemove}
                  dragHandleProps={{}}
                />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
