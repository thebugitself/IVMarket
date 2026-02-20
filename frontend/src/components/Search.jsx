import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function Search() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';

  const [results, setResults] = useState([]);
  const [rawQuery, setRawQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) { setLoading(false); return; }

    axios.get(`/api/search?q=${encodeURIComponent(query)}`)
      .then(({ data }) => {
        setResults(data.results || []);
        setRawQuery(data.query || query); 
      })
      .catch((err) => {
        setRawQuery(err.response?.data?.query || query);
        setResults([]);
      })
      .finally(() => setLoading(false));
  }, [query]);

  if (loading) return <div className="loading"><div className="spinner" /><p>Searching…</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Search Results</h1>
      </div>

      { }
      <div className="search-info">
        <span>Showing results for: </span>
        <strong dangerouslySetInnerHTML={{ __html: rawQuery }} />
        <span className="text-muted"> — {results.length} item(s) found</span>
      </div>

      {results.length === 0 ? (
        <div className="empty-state">
          <p>No products match your search.</p>
        </div>
      ) : (
        <div className="product-grid">
          {results.map((p) => (
            <Link to={`/product/${p.id}`} key={p.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card">
                <div className="card-img">
                  {p.image && p.image !== '/uploads/default-product.png' ? (
                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : '📦'}
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
