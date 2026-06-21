import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Building2, Calendar, Clock, DownloadCloud, Settings, LogOut, UserCheck } from 'lucide-react';

export default function Sidebar() {
  const { logout, username } = useAuth();

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/departments', icon: <Building2 size={20} />, label: 'Departments' },
    { to: '/timetables', icon: <Clock size={20} />, label: 'Timetables' },
    { to: '/calendar', icon: <Calendar size={20} />, label: 'Calendar' },
    { to: '/releases', icon: <DownloadCloud size={20} />, label: 'Releases' },
    { to: '/contributions', icon: <UserCheck size={20} />, label: 'Contributions' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>Loyola Admin</h1>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{username?.charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{username}</div>
            <div className="sidebar-user-role">Administrator</div>
          </div>
          <button onClick={logout} className="sidebar-logout" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
}
