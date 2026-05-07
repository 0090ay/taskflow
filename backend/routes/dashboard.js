const express = require('express');
const db = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard — aggregated stats
router.get('/', (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  let projectIds;
  if (isAdmin) {
    projectIds = db.prepare('SELECT id FROM projects').all().map(p => p.id);
  } else {
    projectIds = db.prepare(
      'SELECT project_id as id FROM project_members WHERE user_id = ?'
    ).all(userId).map(p => p.id);
  }

  const ids = projectIds.length ? projectIds : [-1];
  const placeholders = ids.map(() => '?').join(',');

  const totalProjects = projectIds.length;

  const taskStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN due_date < DATE('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue
    FROM tasks WHERE project_id IN (${placeholders})
  `).get(...ids);

  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name,
      CASE WHEN t.due_date < DATE('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.assignee_id = ? AND t.status != 'done'
    ORDER BY t.due_date ASC NULLS LAST
    LIMIT 5
  `).all(userId);

  const recentTasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name,
      CASE WHEN t.due_date < DATE('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.project_id IN (${placeholders})
    ORDER BY t.updated_at DESC
    LIMIT 8
  `).all(...ids);

  const projects = db.prepare(`
    SELECT p.*, 
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
    FROM projects p
    WHERE p.id IN (${placeholders})
    ORDER BY p.created_at DESC LIMIT 5
  `).all(...ids);

  res.json({ totalProjects, taskStats, myTasks, recentTasks, projects });
});

// GET /api/users — list all users (for member assignment)
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY name').all();
  res.json({ users });
});

// GET /api/users/search?q=...
router.get('/users/search', (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const users = db.prepare(
    'SELECT id, name, email, role FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 10'
  ).all(q, q);
  res.json({ users });
});

// PATCH /api/users/:id/role — admin only
router.patch('/users/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'Role updated' });
});

module.exports = router;
