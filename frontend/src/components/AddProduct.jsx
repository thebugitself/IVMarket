import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function AddProduct() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', description: '', price: '', category: 'Electronics', stock: 10, image: '',
  });
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const { data } = await axios.post('/api/upload', fd);
      if (data.success) setForm((prev) => ({ ...prev, image: data.path }));
    } catch {
      setError('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { data } = await axios.post('/api/products', form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) navigate(`/product/${data.productId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create product');
    }
  };

  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <h2>List an Item</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Product Name</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="What are you selling?" required />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe your item…" rows={4} />
        </div>
        <div className="form-group">
          <label>Price ($)</label>
          <input name="price" type="number" step="0.01" value={form.price} onChange={handleChange} placeholder="0.00" required />
        </div>
        <div className="form-group">
          <label>Category</label>
          <select name="category" value={form.category} onChange={handleChange}>
            <option>Electronics</option>
            <option>Collectibles</option>
            <option>Accessories</option>
            <option>Software</option>
          </select>
        </div>
        <div className="form-group">
          <label>Stock</label>
          <input name="stock" type="number" value={form.stock} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Product Image</label>
          <input type="file" onChange={handleImageUpload} />
          {uploading && <span className="text-muted">Uploading…</span>}
          {form.image && <p className="text-muted mt-1">Image: {form.image}</p>}
        </div>

        <button type="submit" className="btn btn-primary btn-block">Publish Listing</button>
      </form>
    </div>
  );
}
