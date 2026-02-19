import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

/**
 * VULN NOTES:
 * - No client-side or server-side input validation
 * - SQL Injection possible via username/email fields
 * - Password stored as unsalted MD5
 */
export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirm) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/register', {
        username: form.username,
        email: form.email,
        password: form.password,
      });

      if (data.success) {
        setSuccess('Account created! Redirecting to login…');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="logo-section">
        <img
          src="/logos/Logo-ID-Networkers-Merah-Bawah-750x1024.png"
          alt="IDN Networkers"
          className="login-logo"
        />
      </div>

      <div className="form-section">
        <div className="login-card">
          <h2>Create Account</h2>

          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input name="username" value={form.username} onChange={handleChange} placeholder="Choose a username" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Create a password" />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="Repeat your password" />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Register'}
            </button>
          </form>

          <p className="text-center mt-2 text-muted">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
