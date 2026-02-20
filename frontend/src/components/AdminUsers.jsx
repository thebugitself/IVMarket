import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const fetchUsers = () => {
    axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchUsers, [token]);

  const deleteUser = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    try {
      await axios.delete(`/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMsg(`User "${username}" deleted.`);
      fetchUsers();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /><p>Loading users…</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>👥 User Management</h1>
        <p>Manage all registered users</p>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Name</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td><strong>{u.username}</strong></td>
                <td>{u.email}</td>
                <td>
                  <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                    {u.role}
                  </span>
                </td>
                <td>{u.full_name || '—'}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteUser(u.id, u.username)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
