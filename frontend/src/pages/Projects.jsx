import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.get('/projects').then(r => setProjects(r.data.projects)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await api.post('/projects', form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            New Project
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading"><div className="spinner"></div>Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="empty-state card">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            <p>No projects yet. Create your first project to get started!</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Project</button>
          </div>
        ) : (
          <div className="grid-3">
            {projects.map(p => {
              const done = p.done_count || 0;
              const total = p.task_count || 0;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <div key={p.id} className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s' }}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = ''; }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{p.name}</h3>
                    <span className={`badge badge-${p.status}`}>{p.status}</span>
                  </div>
                  {p.description && <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{p.description}</p>}
                  <div className="flex items-center justify-between" style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 8 }}>
                    <span>{p.member_count} member{p.member_count !== 1 ? 's' : ''}</span>
                    <span>{done}/{total} tasks done</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                  </div>
                  {p.owner_name && <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 8 }}>by {p.owner_name}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">New Project</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={create}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mobile App Redesign" required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this project about?" rows={3} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
