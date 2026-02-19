import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function AdminExport() {
  const { token } = useAuth();

  const [url, setUrl] = useState('http://backend:3001/api/health');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const { data } = await axios.post('/api/export-pdf',
        { url },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>📊 Export Report</h1>
        <p>Fetch content from a URL and generate a report</p>
      </div>

      <form onSubmit={handleExport} className="flex gap-1 mb-3 items-center" style={{ flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to fetch"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Fetching…' : '📥 Fetch & Export'}
        </button>
      </form>

      { }
      <div className="flex gap-1 mb-3" style={{ flexWrap: 'wrap' }}>
        {[
          'http://backend:3001/api/health',
          'http://backend:3001/api/products',
          'http://backend:3001/api/config',
          'http://backend:3001/api/users/export',
        ].map((p) => (
          <button
            key={p}
            className="btn btn-sm btn-secondary"
            onClick={() => setUrl(p)}
          >
            {p.length > 40 ? p.slice(0, 37) + '…' : p}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div>
          <div className="alert alert-success">
            Fetched: {result.source_url} (HTTP {result.status})
          </div>
          <div className="terminal-output">
            {typeof result.data === 'object'
              ? JSON.stringify(result.data, null, 2)
              : String(result.data)}
          </div>
        </div>
      )}
    </div>
  );
}
