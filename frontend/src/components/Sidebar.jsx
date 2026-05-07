import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  projects: "M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
  tasks: "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
};

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Task<span>Flow</span></h1>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-label">Main</div>
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon d={icons.dashboard} /> Dashboard
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon d={icons.projects} /> Projects
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon d={icons.tasks} /> My Tasks
          </NavLink>
        </div>

        {isAdmin && (
          <div className="nav-section">
            <div className="nav-section-label">Admin</div>
            <NavLink to="/users" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Icon d={icons.users} /> Manage Users
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-user">
        <div className="avatar">{initials}</div>
        <div className="user-info">
          <div className="user-name">{user?.name}</div>
          <div className="user-role">{user?.role}</div>
        </div>
        <button className="nav-link" onClick={handleLogout} style={{ padding: '6px', width: 'auto' }} title="Logout">
          <Icon d={icons.logout} size={15} />
        </button>
      </div>
    </aside>
  );
}
