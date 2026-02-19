import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

/**
 * VULN NOTES:
 * - Price Tampering: The total_price is sent from the client.
 *   An attacker can intercept the request and change total_price to 0.01 or even -100.
 * - No server-side recalculation from DB price × quantity.
 */
export default function Checkout() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`/api/products/${id}`)
      .then(({ data }) => {
        setProduct(data);
        // Pre-fill address from profile
        if (user?.id) {
          axios.get(`/api/user/${user.id}`).then(({ data: u }) => setAddress(u.address || ''));
        }
      })
      .catch(() => setError('Product not found'))
      .finally(() => setLoading(false));
  }, [id, user]);

  const totalPrice = product ? (parseFloat(product.price) * quantity).toFixed(2) : '0.00';

  const handleOrder = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    try {
      const { data } = await axios.post('/api/order', {
        product_id: product.id,
        quantity,
        total_price: totalPrice,  // VULN: Price from client side!
        shipping_address: address,
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (data.success) {
        setMsg(`Order #${data.orderId} placed! Charged: $${data.charged}`);
        setTimeout(() => navigate('/orders'), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Order failed');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /><p>Loading…</p></div>;
  if (!product) return <div className="empty-state"><p>Product not found.</p></div>;

  return (
    <div className="checkout-container">
      <div className="page-header">
        <h1>Checkout</h1>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="checkout-summary">
        <h3 className="mb-2">Order Summary</h3>

        <div className="line-item">
          <span>{product.name}</span>
          <span>${parseFloat(product.price).toFixed(2)}</span>
        </div>
        <div className="line-item">
          <span>Quantity</span>
          <span>
            <input
              type="number"
              min="1"
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, +e.target.value))}
              style={{ width: '60px', textAlign: 'center' }}
            />
          </span>
        </div>
        <div className="total">
          <span>Total</span>
          {/* VULN: This value is what gets sent to the server */}
          <span className="amount">${totalPrice}</span>
        </div>
      </div>

      <form onSubmit={handleOrder}>
        <div className="form-group">
          <label>Shipping Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your shipping address"
            rows={3}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block">
          💳 Place Order — ${totalPrice}
        </button>
      </form>

      <p className="text-muted text-center mt-2" style={{ fontSize: '0.8rem' }}>
        Hint: Open DevTools → Network tab → Edit the request body 😉
      </p>
    </div>
  );
}
