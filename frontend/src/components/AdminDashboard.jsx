import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();

  if (!user || user.role !== 'admin') {
    return (
      <div className="empty-state">
        <h2>⛔ Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const tools = [
    { icon: '👥', title: 'User Management', desc: 'View, edit, and delete users', path: '/admin/users' },
    { icon: '📜', title: 'System Logs', desc: 'View application logs (and maybe more…)', path: '/admin/logs' },
    { icon: '🏓', title: 'Ping Tool', desc: 'Ping internal services for health checks', path: '/admin/ping' },
    { icon: '📊', title: 'Export Report', desc: 'Generate PDF reports from URLs', path: '/admin/export' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>System administration and power tools</p>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
        border: '1px solid #fed7aa',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h3 style={{ margin: '0 0 12px', color: '#9a3412', fontSize: '1rem' }}>
          🏷️ Active Promotions
        </h3>
        <div style={{
          background: '#fff',
          border: '1px dashed #fb923c',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#dc1d17', letterSpacing: '2px' }}>
              IDN20
            </div>
            <div style={{ fontSize: '0.85rem', color: '#777', marginTop: '4px' }}>
              20% discount on all products • Available for all users
            </div>
          </div>
          <div style={{
            background: '#dc1d17',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}>
            ACTIVE
          </div>
        </div>
      </div>

      <div className="admin-grid">
        {tools.map((t) => (
          <Link to={t.path} key={t.path} className="admin-card">
            <div className="icon">{t.icon}</div>
            <h3>{t.title}</h3>
            <p>{t.desc}</p>
          </Link>
        ))}
      </div>

      <div className="alert alert-warning mt-3">
        <strong>⚠️ Security Notice:</strong> These admin tools are intentionally vulnerable.
        This is a security training environment.
      </div>
    </div>
  );
}
