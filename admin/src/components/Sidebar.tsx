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
      <div className="sidebar-header">
        <div className="logo">Loyola Admin</div>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="avatar">{username?.charAt(0).toUpperCase()}</div>
          <span className="username">{username}</span>
        </div>
        <button onClick={logout} className="logout-button">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
