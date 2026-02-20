import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Profile() {
  const { id } = useParams();
  const { user, token, setUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const isOwn = user && String(user.id) === String(id);

  useEffect(() => {
    axios.get(`/api/user/${id}`)
      .then(({ data }) => {
        setProfile(data);
        setForm(data);
      })
      .catch(() => setError('User not found'));
  }, [id]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    try {
      const { data } = await axios.put('/api/user/update', {
        id,           
        ...form,
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (data.success) {
        setProfile(data.user);
        setMsg('Profile updated!');
        setEditing(false);

        if (isOwn && data.user) {
          setUser((prev) => ({ ...prev, ...data.user }));
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file); 

    try {
      const { data } = await axios.post('/api/upload', fd);
      if (data.success) {
        setForm((prev) => ({ ...prev, avatar: data.path }));
        setMsg(`File uploaded: ${data.originalName}`);
      }
    } catch (err) {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (error && !profile) return <div className="empty-state"><p>{error}</p></div>;
  if (!profile) return <div className="loading"><div className="spinner" /><p>Loading profile…</p></div>;

  return (
    <div className="profile-container">
      { }
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.avatar && profile.avatar !== '/uploads/default-avatar.png' ? (
            <img
              src={profile.avatar}
              alt="avatar"
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            profile.username?.charAt(0).toUpperCase()
          )}
        </div>

        <div className="profile-info">
          <h2>{profile.full_name || profile.username}</h2>
          <p className="text-muted">@{profile.username}</p>
          <span className={`role-badge ${profile.role === 'admin' ? 'role-admin' : 'role-user'}`}>
            {profile.role}
          </span>
        </div>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      { }
      <div className="form-container" style={{ maxWidth: '100%' }}>
        {!editing ? (
          <div>
            <h2 style={{ fontSize: '1.2rem' }}>Profile Details</h2>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr><td className="text-muted">Email</td><td>{profile.email}</td></tr>
                <tr><td className="text-muted">Phone</td><td>{profile.phone || '—'}</td></tr>
                <tr><td className="text-muted">Address</td><td>{profile.address || '—'}</td></tr>
                <tr><td className="text-muted">Bio</td><td>{profile.bio || '—'}</td></tr>
                <tr><td className="text-muted">Role</td><td>{profile.role}</td></tr>
                <tr><td className="text-muted">Joined</td><td>{new Date(profile.created_at).toLocaleDateString()}</td></tr>
              </tbody>
            </table>
            {isOwn && (
              <button className="btn btn-primary mt-2" onClick={() => setEditing(true)}>
                Edit Profile
              </button>
            )}

            { }
            {isOwn && token && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>🔑 Session Token</h3>
                <div className="terminal-output" style={{ wordBreak: 'break-all', fontSize: '0.75rem', position: 'relative' }}>
                  <div style={{ marginBottom: '0.5rem', color: '#888' }}>Authorization: Bearer</div>
                  <code>{token}</code>
                </div>
                <button
                  className="btn btn-sm btn-secondary mt-1"
                  onClick={() => { navigator.clipboard.writeText(token); setMsg('Token copied!'); }}
                >
                  📋 Copy Token
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleUpdate}>
            <h2 style={{ fontSize: '1.2rem' }}>Edit Profile</h2>

            <div className="form-group">
              <label>Full Name</label>
              <input name="full_name" value={form.full_name || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input name="email" value={form.email || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input name="phone" value={form.phone || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea name="address" value={form.address || ''} onChange={handleChange} rows={2} />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea name="bio" value={form.bio || ''} onChange={handleChange} rows={3} />
            </div>

            { }
            <div className="form-group">
              <label>Role</label>
              <input name="role" value={form.role || ''} onChange={handleChange} />
            </div>

            { }
            <div className="form-group">
              <label>Avatar (upload any file…)</label>
              <input type="file" onChange={handleAvatarUpload} />
              {uploading && <span className="text-muted">Uploading…</span>}
            </div>

            <div className="flex gap-1">
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
