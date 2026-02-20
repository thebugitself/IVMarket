import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function AdminLogs() {
  const { token } = useAuth();

  const [filename, setFilename] = useState('app.log');
  const [content, setContent] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    setContent('');
    setEntries([]);

    try {
      const { data } = await axios.get(`/api/admin/logs?f=${encodeURIComponent(filename)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.content) {
        setContent(data.content);
      } else if (data.entries) {
        setEntries(data.entries);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>📜 System Logs</h1>
        <p>View application log files</p>
      </div>

      <form onSubmit={fetchLogs} className="flex gap-1 mb-3 items-center" style={{ flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Log file path"
            style={{ width: '100%' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Loading…' : '📖 Read File'}
        </button>
      </form>

      { }
      <div className="flex gap-1 mb-3" style={{ flexWrap: 'wrap' }}>
        {[
          'app.log',
          'error.log',
          'access.log',
        ].map((p) => (
          <button
            key={p}
            className="btn btn-sm btn-secondary"
            onClick={() => { setFilename(p); }}
          >
            {p}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {content && (
        <div className="terminal-output">{content}</div>
      )}

      {entries.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>ID</th><th>Action</th><th>Details</th><th>IP</th><th>Time</th></tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td>{e.action}</td>
                  <td>{e.details}</td>
                  <td>{e.ip_address}</td>
                  <td>{new Date(e.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
