import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

/**
 * VULN NOTES:
 * - Credentials sent over HTTP (no TLS enforced)
 * - "Remember Me" sets a forgeable Base64 cookie
 * - No CSRF token
 * - Error messages may leak DB info (SQLi feedback)
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', password: '', remember: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/login', form);

      if (data.success) {
        login(data.token, data.user);
        navigate('/');
      }
    } catch (err) {
      // VULN: Raw backend error shown to user (may contain SQL details)
      setError(err.response?.data?.error || 'Login failed');
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
          <h2>Welcome Back</h2>

          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            <div className="form-check">
              <input
                type="checkbox"
                id="remember"
                name="remember"
                checked={form.remember}
                onChange={handleChange}
              />
              <label htmlFor="remember">Remember me</label>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-2 text-muted">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
