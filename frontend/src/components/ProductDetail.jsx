import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function ProductDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      axios.get(`/api/products/${id}`),
      axios.get(`/api/reviews/${id}`),
    ])
      .then(([pRes, rRes]) => {
        setProduct(pRes.data);
        setReviews(rRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const submitReview = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await axios.post('/api/reviews', {
        product_id: id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,  
      }, { headers: { Authorization: `Bearer ${token}` } });

      setMsg('Review submitted!');
      setReviewForm({ rating: 5, comment: '' });

      const { data } = await axios.get(`/api/reviews/${id}`);
      setReviews(data);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to submit review');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /><p>Loading…</p></div>;
  if (!product) return <div className="empty-state"><p>Product not found.</p></div>;

  return (
    <div>
      { }
      <div className="product-detail">
        <div className="product-image">
          {product.image && product.image !== '/uploads/default-product.png' ? (
            <img src={product.image} alt={product.name} />
          ) : '📦'}
        </div>

        <div className="product-info">
          <h1>{product.name}</h1>
          <div className="price">${parseFloat(product.price).toFixed(2)}</div>
          <span className="category">{product.category}</span>
          <p className="meta">
            Sold by <Link to={`/profile/${product.user_id}`}>{product.seller}</Link>
            &nbsp;•&nbsp; {product.stock} in stock
          </p>
          <p className="description">{product.description}</p>

          {user && (
            <Link to={`/checkout/${product.id}`} className="btn btn-primary" style={{ width: 'fit-content' }}>
              🛒 Buy Now
            </Link>
          )}
        </div>
      </div>

      { }
      <div className="reviews-section">
        <h2>Reviews ({reviews.length})</h2>

        {reviews.map((r) => (
          <div className="review-card" key={r.id}>
            <div className="review-header">
              <span className="review-user">{r.username || 'Anonymous'}</span>
              <span className="review-rating">
                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
              </span>
              <span className="review-date">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>

            { }
            <div
              className="review-body"
              dangerouslySetInnerHTML={{ __html: r.comment }}
            />
          </div>
        ))}

        { }
        {user ? (
          <div className="form-container" style={{ maxWidth: '100%', marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem' }}>Write a Review</h2>
            {msg && <div className="alert alert-success">{msg}</div>}

            <form onSubmit={submitReview}>
              <div className="form-group">
                <label>Rating</label>
                <select
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm((p) => ({ ...p, rating: +e.target.value }))}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{'★'.repeat(n)} ({n}/5)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Comment (HTML allowed 😉)</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                  placeholder="Write your review… You can use HTML tags."
                  rows={4}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">Submit Review</button>
            </form>
          </div>
        ) : (
          <p className="text-muted mt-2">
            <Link to="/login">Sign in</Link> to write a review.
          </p>
        )}
      </div>
    </div>
  );
}
