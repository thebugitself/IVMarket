import { useState } from 'react';
import axios from 'axios';

export default function Feedback() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResponse(null);
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/feedback', { name, message });
      if (data.success) {
        setResponse(data.response);
        setName('');
        setMessage('');
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <div className="page-header">
        <h1>💬 Feedback</h1>
        <p>We'd love to hear from you! Share your thoughts about our marketplace.</p>
      </div>

      <div className="form-container">
        <h2>Send Feedback</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Message</label>
            <textarea
              placeholder="Write your feedback here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Sending…' : 'Submit Feedback'}
          </button>
        </form>

        {response && (
          <div className="alert alert-success" style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-sm)',
            color: '#166534'
          }}>
            <strong>✅ Server Response:</strong>
            <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}
               dangerouslySetInnerHTML={{ __html: response }}
            />
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-sm)',
            color: '#991b1b'
          }}>
            <strong>❌ Error:</strong>
            <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
