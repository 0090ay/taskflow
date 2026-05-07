import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
        await signup(form.name, form.email, form.password, form.role);
      }
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Task<span>Flow</span></div>
        <p className="auth-sub">{mode === 'login' ? 'Welcome back — sign in to continue' : 'Create your account to get started'}</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="input" name="name" value={form.name} onChange={handle} placeholder="John Doe" required />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="input" name="role" value={form.role} onChange={handle}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" name="email" type="email" value={form.email} onChange={handle} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" name="password" type="password" value={form.password} onChange={handle} placeholder="••••••••" required minLength={6} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }}></span>Please wait…</> : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <a onClick={() => { setMode('signup'); setError(''); }}>Sign up</a></>
          ) : (
            <>Already have an account? <a onClick={() => { setMode('login'); setError(''); }}>Sign in</a></>
          )}
        </div>
      </div>
    </div>
  );
}
