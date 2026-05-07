import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const statusOptions = ['todo', 'in_progress', 'done'];

export function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Get all projects then their tasks filtered to user
    const loadTasks = async () => {
      try {
        const pRes = await api.get('/projects');
        const all = [];
        await Promise.all(pRes.data.projects.map(async p => {
          const tRes = await api.get(`/projects/${p.id}/tasks?assignee=${user.id}`);
          tRes.data.tasks.forEach(t => all.push({ ...t, project_name: p.name }));
        }));
        all.sort((a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1);
        setTasks(all);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, [user.id]);

  const filtered = filter === 'all' ? tasks : tasks.filter(t => filter === 'overdue' ? t.is_overdue : t.status === filter);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Tasks</h1>
        <p className="page-subtitle">Tasks assigned to you across all projects</p>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['all', ...statusOptions, 'overdue'].map(f => (
            <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'overdue' ? '🔴 Overdue' : statusLabel[f]}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="loading"><div className="spinner"></div>Loading tasks…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state card"><p>{filter === 'all' ? 'No tasks assigned to you yet.' : 'No tasks match this filter.'}</p></div>
        ) : (
          <div className="task-grid">
            {filtered.map(t => (
              <div key={`${t.id}-${t.project_id}`} className={`task-card${t.is_overdue ? ' overdue' : ''}`} onClick={() => navigate(`/projects/${t.project_id}`)}>
                <div className="task-info">
                  <div className="task-title">{t.title}</div>
                  {t.description && <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 5 }}>{t.description}</div>}
                  <div className="task-meta">
                    <span className={`badge badge-${t.status}`}>{statusLabel[t.status]}</span>
                    <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                    <span style={{ color: 'var(--text2)', fontSize: 11 }}>📁 {t.project_name}</span>
                    {t.due_date && <span style={{ color: t.is_overdue ? 'var(--red)' : 'var(--text3)', fontSize: 11 }}>📅 {t.due_date}</span>}
                    {t.is_overdue && <span className="badge badge-overdue">Overdue</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: me, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    api.get('/users').then(r => setUsers(r.data.users)).finally(() => setLoading(false));
  }, []);

  const toggleRole = async (u) => {
    const newRole = u.role === 'admin' ? 'member' : 'admin';
    await api.patch(`/users/${u.id}/role`, { role: newRole });
    setUsers(us => us.map(x => x.id === u.id ? { ...x, role: newRole } : x));
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading users…</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Manage Users</h1>
        <p className="page-subtitle">{users.length} registered users</p>
      </div>
      <div className="page-body">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="avatar sm">{u.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                        {u.id === me?.id && <span className="badge badge-member" style={{ fontSize: 10 }}>You</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text2)' }}>{u.email}</td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{u.created_at?.split('T')[0] || '—'}</td>
                    <td>
                      {u.id !== me?.id && (
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleRole(u)}>
                          Make {u.role === 'admin' ? 'Member' : 'Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
