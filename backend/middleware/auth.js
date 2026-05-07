const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-key-change-in-production';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireProjectAccess = (role = 'member') => (req, res, next) => {
  const projectId = req.params.projectId || req.params.id;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Global admin always has access
  if (req.user.role === 'admin') {
    req.project = project;
    return next();
  }

  const membership = db.prepare(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, req.user.id);

  if (!membership) return res.status(403).json({ error: 'Not a project member' });
  if (role === 'admin' && membership.role !== 'admin') {
    return res.status(403).json({ error: 'Project admin access required' });
  }

  req.project = project;
  req.projectRole = membership.role;
  next();
};

module.exports = { authenticate, requireAdmin, requireProjectAccess, JWT_SECRET };
