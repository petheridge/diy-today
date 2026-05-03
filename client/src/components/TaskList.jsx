import TaskItem from './TaskItem';
import './TaskList.css';

export default function TaskList({ tasks, onToggle, onEdit }) {
  if (tasks.length === 0) {
    return (
      <div className="task-list-empty">
        <p className="empty-icon">🔨</p>
        <p className="empty-text">No tasks yet today</p>
        <p className="empty-sub">Tap + to add your first DIY task</p>
      </div>
    );
  }

  const active = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  return (
    <div className="task-list">
      {active.map(task => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} />
      ))}
      {done.length > 0 && active.length > 0 && (
        <p className="section-label">Completed</p>
      )}
      {done.map(task => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} />
      ))}
    </div>
  );
}
