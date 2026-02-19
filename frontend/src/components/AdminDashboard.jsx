import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * VULN NOTES:
 * - Admin guard is CLIENT-SIDE ONLY.  The backend /api/admin/* endpoints
 *   do NOT check req.user.role === 'admin'.  Any authenticated user can
 *   call them directly with curl / Burp.
 */
export default function AdminDashboard() {
  const { user } = useAuth();

  // VULN: Client-side role check only
  if (!user || user.role !== 'admin') {
    return (
      <div className="empty-state">
        <h2>⛔ Access Denied</h2>
        <p>You do not have permission to view this page.</p>
        <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>
          Hint: What if you could change your role via the profile update endpoint? 😉
        </p>
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
        <h1>⚡ Admin Dashboard</h1>
        <p>System administration and power tools</p>
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
