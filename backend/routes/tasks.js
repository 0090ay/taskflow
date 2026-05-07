const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authenticate);
router.use(requireProjectAccess());

// GET /api/projects/:projectId/tasks
router.get('/', (req, res) => {
  const { status, assignee, priority } = req.query;
  let query = `
    SELECT t.*, 
      u.name as assignee_name, u.email as assignee_email,
      c.name as creator_name,
      CASE WHEN t.due_date < DATE('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN users c ON t.creator_id = c.id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];

  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (assignee) { query += ' AND t.assignee_id = ?'; params.push(assignee); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }

  query += ' ORDER BY t.created_at DESC';

  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

// POST /api/projects/:projectId/tasks
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').optional().trim(),
  body('assignee_id').optional().isInt(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional().isDate(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, assignee_id, priority = 'medium', due_date } = req.body;

  // Verify assignee is a project member
  if (assignee_id) {
    const isMember = db.prepare(
      'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.projectId, assignee_id);
    if (!isMember && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Assignee must be a project member' });
    }
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, project_id, assignee_id, creator_id, priority, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, req.params.projectId, assignee_id || null, req.user.id, priority, due_date || null);

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN users c ON t.creator_id = c.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', [
  body('title').optional().trim().notEmpty(),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional().isDate(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const task = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND project_id = ?'
  ).get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Members can only update status; admins can update everything
  const isProjectAdmin = req.projectRole === 'admin' || req.user.role === 'admin';
  const isAssignee = task.assignee_id === req.user.id;
  const isCreator = task.creator_id === req.user.id;

  if (!isProjectAdmin && !isAssignee && !isCreator) {
    return res.status(403).json({ error: 'Not authorized to update this task' });
  }

  const { title, description, assignee_id, status, priority, due_date } = req.body;
  const updates = ['updated_at = CURRENT_TIMESTAMP'];
  const values = [];

  if (isProjectAdmin) {
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (assignee_id !== undefined) { updates.push('assignee_id = ?'); values.push(assignee_id); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date); }
  }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }

  values.push(req.params.taskId);
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare(`
    SELECT t.*, u.name as assignee_name, c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN users c ON t.creator_id = c.id
    WHERE t.id = ?
  `).get(req.params.taskId);

  res.json({ task: updated });
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', (req, res) => {
  const task = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND project_id = ?'
  ).get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isProjectAdmin = req.projectRole === 'admin' || req.user.role === 'admin';
  if (!isProjectAdmin && task.creator_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
