const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/projects — list projects for current user
router.get('/', (req, res) => {
  let projects;
  if (req.user.role === 'admin') {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `).all();
  } else {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name, pm.role as my_role,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `).all(req.user.id);
  }
  res.json({ projects });
});

// POST /api/projects
router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name required'),
  body('description').optional().trim(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  const result = db.prepare(
    'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)'
  ).run(name, description || null, req.user.id);

  // Auto-add creator as admin member
  db.prepare(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(result.lastInsertRowid, req.user.id, 'admin');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ project });
});

// GET /api/projects/:id
router.get('/:id', requireProjectAccess(), (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.role as global_role, pm.role as project_role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
  `).all(req.params.id);

  res.json({ project: req.project, members });
});

// PUT /api/projects/:id
router.put('/:id', requireProjectAccess('admin'), [
  body('name').optional().trim().notEmpty(),
  body('status').optional().isIn(['active', 'archived']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, status } = req.body;
  const updates = [];
  const values = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.params.id);
  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json({ project });
});

// DELETE /api/projects/:id
router.delete('/:id', requireProjectAccess('admin'), (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:id/members — add member
router.post('/:id/members', requireProjectAccess('admin'), [
  body('userId').isInt().withMessage('userId required'),
  body('role').optional().isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { userId, role = 'member' } = req.body;
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existing = db.prepare(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(req.params.id, userId);
  if (existing) return res.status(409).json({ error: 'User already in project' });

  db.prepare(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(req.params.id, userId, role);

  res.status(201).json({ message: 'Member added', user });
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', requireProjectAccess('admin'), (req, res) => {
  db.prepare(
    'DELETE FROM project_members WHERE project_id = ? AND user_id = ?'
  ).run(req.params.id, req.params.userId);
  res.json({ message: 'Member removed' });
});

module.exports = router;
