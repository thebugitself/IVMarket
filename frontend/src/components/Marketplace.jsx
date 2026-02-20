import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const CATEGORIES = ['All', 'Electronics', 'Collectibles'];

const PRODUCT_EMOJI = {
  Electronics: '💻',
  Collectibles: '🏺',
  Accessories: '👜',
  Software: '💿',
};

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/products')
      .then(({ data }) => setProducts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'All'
    ? products
    : products.filter((p) => p.category === filter);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading marketplace…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Marketplace</h1>
        <p>Browse and purchase items from our community</p>
      </div>

      { }
      <div className="flex gap-1 mb-3" style={{ flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No products found in this category.</p>
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map((p) => (
            <Link to={`/product/${p.id}`} key={p.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card">
                <div className="card-img">
                  {p.image && p.image !== '/uploads/default-product.png' ? (
                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    PRODUCT_EMOJI[p.category] || '📦'
                  )}
                </div>
                <div className="card-body">
                  <h3>{p.name}</h3>
                  <div className="price">${parseFloat(p.price).toFixed(2)}</div>
                  <span className="category">{p.category}</span>
                  <div className="seller">by {p.seller || 'Unknown'}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
