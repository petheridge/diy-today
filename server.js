const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const db = new Database(path.join(__dirname, 'diy-tasks.db'));

db.pragma('foreign_keys = ON');

// Base schema (fresh install)
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    notes       TEXT    NOT NULL DEFAULT '',
    time_rating INTEGER NOT NULL DEFAULT 1,
    priority    INTEGER NOT NULL DEFAULT 2,
    planned_date TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    completed   INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS materials (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id        INTEGER NOT NULL,
    name           TEXT    NOT NULL,
    estimated_cost REAL    NOT NULL DEFAULT 0,
    url            TEXT    NOT NULL DEFAULT '',
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tools (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    name    TEXT    NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
`);

// Column additions — silent-fail if column already exists (safe to re-run on every start)
const addColumn = (sql) => { try { db.exec(sql); } catch (_) {} };
addColumn('ALTER TABLE tasks ADD COLUMN planned_date TEXT');
addColumn('ALTER TABLE tasks ADD COLUMN priority    INTEGER DEFAULT 2');
addColumn('ALTER TABLE tasks ADD COLUMN sort_order  INTEGER DEFAULT 0');
addColumn('ALTER TABLE tasks ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL');

// Versioned one-time migrations — user_version tracks which have run, so they never re-run
const schemaVersion = db.pragma('user_version', { simple: true });

if (schemaVersion < 1) {
  // Copy legacy `date` column into `planned_date` if it exists
  const hasDateCol = db.prepare("PRAGMA table_info(tasks)").all().some(c => c.name === 'date');
  if (hasDateCol) {
    db.exec("UPDATE tasks SET planned_date = date WHERE planned_date IS NULL AND date IS NOT NULL AND date != ''");
  }
  db.pragma('user_version = 1');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

const getToday = () => new Date().toISOString().split('T')[0];

const TASK_WITH_TOTALS = `
  SELECT t.*,
         c.name                             AS category_name,
         COALESCE(SUM(m.estimated_cost), 0) AS total_cost,
         COUNT(DISTINCT m.id)               AS material_count
  FROM   tasks t
  LEFT JOIN categories c ON c.id      = t.category_id
  LEFT JOIN materials  m ON m.task_id = t.id
`;

// All tasks (client splits into today / backlog)
app.get('/api/tasks', (req, res) => {
  const tasks = db.prepare(
    TASK_WITH_TOTALS + ' GROUP BY t.id ORDER BY t.sort_order ASC, t.created_at ASC'
  ).all();
  res.json(tasks);
});

// Create — lands in backlog (no planned_date)
app.post('/api/tasks', (req, res) => {
  const { title, notes = '', time_rating = 1, priority = 2, category_id = null } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO tasks (title, notes, time_rating, priority, category_id) VALUES (?, ?, ?, ?, ?)'
  ).run(title.trim(), notes.trim(), time_rating, priority, category_id ?? null);

  res.status(201).json(
    db.prepare(TASK_WITH_TOTALS + ' WHERE t.id = ? GROUP BY t.id').get(lastInsertRowid)
  );
});

// Update — handles all fields including planned_date (null = backlog)
app.put('/api/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });

  const body = req.body;
  db.prepare(`
    UPDATE tasks
    SET title=?, notes=?, time_rating=?, priority=?, planned_date=?, sort_order=?, completed=?, category_id=?
    WHERE id=?
  `).run(
    body.title       ?? task.title,
    body.notes       ?? task.notes,
    body.time_rating ?? task.time_rating,
    body.priority    ?? task.priority ?? 2,
    'planned_date' in body ? body.planned_date : task.planned_date,
    body.sort_order  ?? task.sort_order ?? 0,
    'completed' in body ? (body.completed ? 1 : 0) : task.completed,
    'category_id' in body ? (body.category_id ?? null) : task.category_id,
    req.params.id
  );

  res.json(db.prepare(TASK_WITH_TOTALS + ' WHERE t.id = ? GROUP BY t.id').get(req.params.id));
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// Materials
app.get('/api/tasks/:id/materials', (req, res) => {
  res.json(db.prepare('SELECT * FROM materials WHERE task_id = ? ORDER BY id').all(req.params.id));
});
app.post('/api/tasks/:id/materials', (req, res) => {
  const { name, estimated_cost = 0, url = '' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO materials (task_id, name, estimated_cost, url) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, name.trim(), Number(estimated_cost) || 0, url.trim());
  res.status(201).json(db.prepare('SELECT * FROM materials WHERE id = ?').get(lastInsertRowid));
});
app.put('/api/materials/:id', (req, res) => {
  const { name, estimated_cost = 0, url = '' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  db.prepare('UPDATE materials SET name=?, estimated_cost=?, url=? WHERE id=?')
    .run(name.trim(), Number(estimated_cost) || 0, url.trim(), req.params.id);
  res.json(db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id));
});
app.delete('/api/materials/:id', (req, res) => {
  const material = db.prepare('SELECT id FROM materials WHERE id = ?').get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// Tools
app.get('/api/tasks/:id/tools', (req, res) => {
  res.json(db.prepare('SELECT * FROM tools WHERE task_id = ? ORDER BY id').all(req.params.id));
});
app.post('/api/tasks/:id/tools', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO tools (task_id, name) VALUES (?, ?)'
  ).run(req.params.id, name.trim());
  res.status(201).json(db.prepare('SELECT * FROM tools WHERE id = ?').get(lastInsertRowid));
});
app.put('/api/tools/:id', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  db.prepare('UPDATE tools SET name=? WHERE id=?').run(name.trim(), req.params.id);
  res.json(db.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id));
});
app.delete('/api/tools/:id', (req, res) => {
  const tool = db.prepare('SELECT id FROM tools WHERE id = ?').get(req.params.id);
  if (!tool) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM tools WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// Categories
app.get('/api/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name ASC').all());
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const { lastInsertRowid } = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name.trim());
    res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(lastInsertRowid));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Category already exists' });
    throw e;
  }
});

app.delete('/api/categories/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`DIY Today running on http://localhost:${PORT}`));
