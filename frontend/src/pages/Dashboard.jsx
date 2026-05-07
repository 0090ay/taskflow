import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const priorityColors = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div>Loading dashboard…</div>;
  if (!data) return null;

  const { totalProjects, taskStats, myTasks, recentTasks, projects } = data;
  const pct = taskStats.total ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Good {greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Here's what's happening across your projects today.</p>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card accent">
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{totalProjects}</div>
            <div className="stat-label">Active Projects</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-value" style={{ color: 'var(--yellow)' }}>{taskStats.in_progress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card green">
            <div className="stat-value" style={{ color: 'var(--green)' }}>{taskStats.done}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card red">
            <div className="stat-value" style={{ color: 'var(--red)' }}>{taskStats.overdue}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* My Tasks */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>My Open Tasks</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all</button>
            </div>
            {myTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 13 }}>🎉 No open tasks assigned to you!</div>
            ) : (
              <div className="task-grid">
                {myTasks.map(t => (
                  <div key={t.id} className={`task-card${t.is_overdue ? ' overdue' : ''}`} onClick={() => navigate(`/projects/${t.project_id}`)}>
                    <div className="task-info">
                      <div className="task-title">{t.title}</div>
                      <div className="task-meta">
                        <span className={`badge badge-${t.status}`}>{statusLabel[t.status]}</span>
                        <span className={`badge ${priorityColors[t.priority]}`}>{t.priority}</span>
                        <span style={{ color: 'var(--text3)', fontSize: 11 }}>{t.project_name}</span>
                        {t.due_date && <span style={{ color: t.is_overdue ? 'var(--red)' : 'var(--text3)', fontSize: 11 }}>Due {t.due_date}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Projects overview */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Projects Overview</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>View all</button>
            </div>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 13 }}>No projects yet. Create one to get started!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {projects.map(p => {
                  const done = p.done_count || 0;
                  const total = p.task_count || 0;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{done}/{total} done</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Recent Task Activity</h2>
          {recentTasks.length === 0 ? (
            <div className="empty-state"><p>No tasks yet across your projects.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTasks.map(t => (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${t.project_id}`)}>
                      <td style={{ fontWeight: 500 }}>{t.title}{t.is_overdue ? <span className="badge badge-overdue" style={{ marginLeft: 8 }}>Overdue</span> : null}</td>
                      <td style={{ color: 'var(--text2)' }}>{t.project_name}</td>
                      <td><span className={`badge badge-${t.status}`}>{statusLabel[t.status]}</span></td>
                      <td><span className={`badge ${priorityColors[t.priority]}`}>{t.priority}</span></td>
                      <td style={{ color: 'var(--text2)' }}>{t.assignee_name || '—'}</td>
                      <td style={{ color: t.is_overdue ? 'var(--red)' : 'var(--text2)' }}>{t.due_date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
