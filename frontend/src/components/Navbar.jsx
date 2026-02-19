import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <img src="/logos/LOGO-ID-Networkers-IDN.ID-Merah-1024x320.png" alt="IDN Networkers" />
      </Link>

      <form className="navbar-search" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn btn-sm btn-primary">Search</button>
      </form>

      <ul className="navbar-links">
        <li><Link to="/">Marketplace</Link></li>

        {user ? (
          <>
            <li><Link to="/add-product">Sell Item</Link></li>
            <li><Link to="/wallet">Wallet</Link></li>
            <li><Link to="/orders">Orders</Link></li>
            <li><Link to={`/profile/${user.id}`}>Profile</Link></li>

            {/* VULN: Admin check is client-side only */}
            {user.role === 'admin' && (
              <li><Link to="/admin" className="nav-admin">⚡ Admin</Link></li>
            )}

            <li>
              <div className="navbar-user">
                <div className="navbar-avatar">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                <button onClick={() => { logout(); navigate('/login'); }}>
                  Logout
                </button>
              </div>
            </li>
          </>
        ) : (
          <>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
}
