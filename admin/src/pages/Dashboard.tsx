import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Building2, Calendar, Clock, DownloadCloud } from 'lucide-react';

interface Stats {
  departments: number;
  timetables: number;
  calendarDays: number;
  releases: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ departments: 0, timetables: 0, calendarDays: 0, releases: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get<Stats>('/api/admin/stats');
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Departments', value: stats.departments, icon: <Building2 size={24} />, color: 'var(--primary)' },
    { title: 'Timetables', value: stats.timetables, icon: <Clock size={24} />, color: 'var(--secondary)' },
    { title: 'Calendar Days', value: stats.calendarDays, icon: <Calendar size={24} />, color: '#10b981' },
    { title: 'Releases', value: stats.releases, icon: <DownloadCloud size={24} />, color: '#f59e0b' },
  ];

  if (loading) {
    return <div className="page-loading">Loading dashboard...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your academic calendar system.</p>
      </div>

      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card glass-card">
            <div className="stat-icon" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
              {card.icon}
            </div>
            <div className="stat-info">
              <h3>{card.title}</h3>
              <div className="stat-value">{card.value}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="dashboard-content">
         <div className="dashboard-card glass-card">
            <h3>Getting Started</h3>
            <p>Welcome to the Loyola Admin Panel. From here you can manage all aspects of the academic calendar app.</p>
            <ul className="help-list">
                <li><strong>Departments:</strong> Configure departments, years, and shifts.</li>
                <li><strong>Timetables:</strong> Manage the 6-day class schedules for each section.</li>
                <li><strong>Calendar:</strong> Set day orders, holidays, and events for specific dates.</li>
                <li><strong>Releases:</strong> Publish new Android APK versions for users to download.</li>
            </ul>
         </div>
      </div>
    </div>
  );
}
