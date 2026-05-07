import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const statusOptions = ['todo', 'in_progress', 'done'];
const priorityOptions = ['low', 'medium', 'high'];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [taskModal, setTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [memberModal, setMemberModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignee_id: '', priority: 'medium', due_date: '', status: 'todo' });
  const [memberSearch, setMemberSearch] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const isProjectAdmin = isAdmin || members.find(m => m.id === user?.id)?.project_role === 'admin';

  const load = async () => {
    try {
      const [pRes, tRes, uRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`),
        api.get('/users'),
      ]);
      setProject(pRes.data.project);
      setMembers(pRes.data.members);
      setTasks(tRes.data.tasks);
      setAllUsers(uRes.data.users);
    } catch {
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const openNewTask = () => {
    setEditTask(null);
    setTaskForm({ title: '', description: '', assignee_id: '', priority: 'medium', due_date: '', status: 'todo' });
    setError('');
    setTaskModal(true);
  };

  const openEditTask = (t) => {
    setEditTask(t);
    setTaskForm({
      title: t.title, description: t.description || '', assignee_id: t.assignee_id || '',
      priority: t.priority, due_date: t.due_date || '', status: t.status
    });
    setError('');
    setTaskModal(true);
  };

  const submitTask = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const body = { ...taskForm, assignee_id: taskForm.assignee_id || undefined, due_date: taskForm.due_date || undefined };
      if (editTask) {
        await api.put(`/projects/${id}/tasks/${editTask.id}`, body);
      } else {
        await api.post(`/projects/${id}/tasks`, body);
      }
      setTaskModal(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTask = async (taskId) => {
    await api.delete(`/projects/${id}/tasks/${taskId}`);
    setDeleteConfirm(null);
    await load();
  };

  const updateStatus = async (task, status) => {
    await api.put(`/projects/${id}/tasks/${task.id}`, { status });
    await load();
  };

  const filteredUsers = allUsers.filter(u =>
    !members.find(m => m.id === u.id) &&
    (u.name.toLowerCase().includes(memberSearch.toLowerCase()) || u.email.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const addMember = async (userId) => {
    await api.post(`/projects/${id}/members`, { userId });
    await load();
  };

  const removeMember = async (userId) => {
    await api.delete(`/projects/${id}/members/${userId}`);
    await load();
  };

  const archiveProject = async () => {
    await api.put(`/projects/${id}`, { status: project.status === 'active' ? 'archived' : 'active' });
    await load();
  };

  const grouped = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading project…</div>;
  if (!project) return null;

  const TaskCard = ({ task }) => (
    <div className={`task-card${task.is_overdue ? ' overdue' : ''}`} onClick={() => openEditTask(task)}>
      <div className="task-info">
        <div className="task-title">{task.title}</div>
        {task.description && <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>}
        <div className="task-meta">
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          {task.assignee_name && <span style={{ color: 'var(--text2)', fontSize: 11 }}>→ {task.assignee_name}</span>}
          {task.due_date && <span style={{ color: task.is_overdue ? 'var(--red)' : 'var(--text3)', fontSize: 11 }}>📅 {task.due_date}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {statusOptions.filter(s => s !== task.status).map(s => (
            <button key={s} className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '3px 8px' }}
              onClick={e => { e.stopPropagation(); updateStatus(task, s); }}>
              → {statusLabel[s]}
            </button>
          ))}
          {isProjectAdmin && (
            <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '3px 8px', marginLeft: 'auto' }}
              onClick={e => { e.stopPropagation(); setDeleteConfirm(task); }}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3 mb-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>← Back</button>
          <span className={`badge badge-${project.status}`}>{project.status}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.description && <p className="page-subtitle">{project.description}</p>}
          </div>
          <div className="flex gap-2">
            {isProjectAdmin && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setMemberModal(true)}>Manage Members</button>
                <button className="btn btn-ghost btn-sm" onClick={archiveProject}>{project.status === 'active' ? 'Archive' : 'Restore'}</button>
              </>
            )}
            <button className="btn btn-primary" onClick={openNewTask}>+ Add Task</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 16, borderBottom: '1px solid var(--border)' }}>
          {['board', 'list', 'members'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px',
              fontSize: 13, fontWeight: 500, color: tab === t ? 'var(--accent)' : 'var(--text2)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, textTransform: 'capitalize', transition: 'all 0.15s'
            }}>{t === 'board' ? 'Board View' : t === 'list' ? 'List View' : `Members (${members.length})`}</button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {tab === 'board' && (
          tasks.length === 0 ? (
            <div className="empty-state card">
              <p>No tasks yet. Add your first task to get started!</p>
              <button className="btn btn-primary" onClick={openNewTask}>Add Task</button>
            </div>
          ) : (
            <div className="kanban">
              {statusOptions.map(s => (
                <div key={s} className="kanban-col">
                  <div className="kanban-header">
                    <span>{statusLabel[s]}</span>
                    <span className="kanban-count">{grouped[s].length}</span>
                  </div>
                  <div className="task-grid">
                    {grouped[s].length === 0
                      ? <div style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>Empty</div>
                      : grouped[s].map(t => <TaskCard key={t.id} task={t} />)
                    }
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'list' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {tasks.length === 0 ? (
              <div className="empty-state"><p>No tasks yet.</p><button className="btn btn-primary" onClick={openNewTask}>Add Task</button></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due Date</th><th></th></tr></thead>
                  <tbody>
                    {tasks.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 500 }}>{t.title}{t.is_overdue ? <span className="badge badge-overdue" style={{ marginLeft: 8 }}>Overdue</span> : null}</td>
                        <td>
                          <select className="input" value={t.status} style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                            onChange={e => updateStatus(t, e.target.value)}>
                            {statusOptions.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                          </select>
                        </td>
                        <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                        <td style={{ color: 'var(--text2)' }}>{t.assignee_name || '—'}</td>
                        <td style={{ color: t.is_overdue ? 'var(--red)' : 'var(--text2)', fontSize: 12 }}>{t.due_date || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEditTask(t)}>Edit</button>
                            {isProjectAdmin && <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(t)}>Delete</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Team Members</h2>
              {isProjectAdmin && <button className="btn btn-primary btn-sm" onClick={() => setMemberModal(true)}>+ Add Member</button>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="avatar">{m.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</div>
                    <div style={{ color: 'var(--text3)', fontSize: 12 }}>{m.email}</div>
                  </div>
                  <span className={`badge badge-${m.project_role}`}>{m.project_role}</span>
                  {isProjectAdmin && m.id !== user?.id && (
                    <button className="btn btn-danger btn-sm" onClick={() => removeMember(m.id)}>Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {taskModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setTaskModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editTask ? 'Edit Task' : 'New Task'}</div>
              <button className="modal-close" onClick={() => setTaskModal(false)}>×</button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={submitTask}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="input" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="input" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional description" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="input" value={taskForm.status} onChange={e => setTaskForm(f => ({ ...f, status: e.target.value }))}>
                    {statusOptions.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="input" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                    {priorityOptions.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <select className="input" value={taskForm.assignee_id} onChange={e => setTaskForm(f => ({ ...f, assignee_id: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="input" type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editTask ? 'Update Task' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {memberModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMemberModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Add Members</div>
              <button className="modal-close" onClick={() => setMemberModal(false)}>×</button>
            </div>
            <input className="input" placeholder="Search users by name or email…" value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)} style={{ marginBottom: 12 }} />
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredUsers.length === 0
                ? <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '20px 0' }}>No users found</div>
                : filteredUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-3" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="avatar sm">{u.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                      <div style={{ color: 'var(--text3)', fontSize: 11 }}>{u.email}</div>
                    </div>
                    <span className={`badge badge-${u.role}`}>{u.role}</span>
                    <button className="btn btn-primary btn-sm" onClick={() => addMember(u.id)}>Add</button>
                  </div>
                ))
              }
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setMemberModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header"><div className="modal-title">Delete Task</div></div>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>
              Are you sure you want to delete <strong>"{deleteConfirm.title}"</strong>? This action cannot be undone.
            </p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteTask(deleteConfirm.id)}>Delete Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
