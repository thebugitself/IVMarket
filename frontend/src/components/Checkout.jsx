import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

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

  // Wallet
  const [walletBalance, setWalletBalance] = useState(0);

  // Discount
  const [discountCode, setDiscountCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountMsg, setDiscountMsg] = useState('');
  const [discountError, setDiscountError] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`/api/products/${id}`),
      user?.id ? axios.get(`/api/wallet/${user.id}`) : Promise.resolve(null),
      user?.id ? axios.get(`/api/user/${user.id}`) : Promise.resolve(null),
      token ? axios.get(`/api/discount/check/${id}`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
    ])
      .then(([prodRes, walletRes, userRes, discountRes]) => {
        setProduct(prodRes.data);
        if (walletRes) setWalletBalance(parseFloat(walletRes.data.balance) || 0);
        if (userRes) setAddress(userRes.data.address || '');
        // Restore discount state from DB
        if (discountRes?.data?.applied) {
          const d = discountRes.data;
          setDiscountCode(d.code);
          setDiscountPercent(d.discount_percent);
          setDiscountApplied(true);
          setDiscountMsg(`✅ Discount ${d.code} active (${d.discount_percent}% off, applied ${d.times_applied}x)`);
        }
      })
      .catch(() => setError('Product not found'))
      .finally(() => setLoading(false));
  }, [id, user, token]);

  const subtotal = product ? parseFloat(product.price) * quantity : 0;
  const discountAmount = subtotal * (discountPercent / 100);
  const totalPrice = Math.max(subtotal - discountAmount, 0).toFixed(2);
  const insufficientBalance = walletBalance < parseFloat(totalPrice);

  const handleApplyDiscount = async () => {
    setDiscountMsg('');
    setDiscountError('');
    setApplyingDiscount(true);

    if (!discountCode.trim()) {
      setDiscountError('Please enter a discount code');
      setApplyingDiscount(false);
      return;
    }

    try {
      const { data } = await axios.post('/api/discount/apply', {
        code: discountCode.trim().toUpperCase(),
        product_id: product.id,
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (data.success) {
        // Fetch actual total from DB to reflect stacked discounts accurately
        const { data: check } = await axios.get(`/api/discount/check/${product.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const newPercent = check.applied ? check.discount_percent : data.discount_percent;
        setDiscountPercent(newPercent);
        setDiscountApplied(true);
        setDiscountMsg(`✅ ${data.message} (Total discount: ${newPercent}%, applied ${check.times_applied || 1}x)`);
      }
    } catch (err) {
      setDiscountError(err.response?.data?.error || 'Failed to apply discount');
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleResetDiscount = async () => {
    try {
      await axios.delete('/api/discount/reset', {
        data: { product_id: product.id },
        headers: { Authorization: `Bearer ${token}` },
      });
      setDiscountPercent(0);
      setDiscountApplied(false);
      setDiscountMsg('');
      setDiscountError('');
      setDiscountCode('');
    } catch (err) {
      setDiscountError('Failed to reset discount');
    }
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    if (insufficientBalance) {
      return setError(`Insufficient wallet balance. You have $${walletBalance.toFixed(2)} but need $${totalPrice}`);
    }

    try {
      const { data } = await axios.post('/api/order', {
        product_id: product.id,
        quantity,
        total_price: totalPrice,
        shipping_address: address,
        discount_code: discountApplied ? discountCode : null,
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (data.success) {
        setMsg(`Order #${data.orderId} placed! Charged: $${data.charged}`);
        setWalletBalance(prev => Math.max(prev - parseFloat(data.charged), 0));
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

      {/* Wallet Balance */}
      <div style={{
        background: insufficientBalance ? '#fff3f3' : '#f0fdf4',
        border: `1px solid ${insufficientBalance ? '#fca5a5' : '#bbf7d0'}`,
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.9rem', color: '#555' }}>
          💰 Wallet Balance
        </span>
        <span style={{
          fontWeight: 700,
          fontSize: '1.1rem',
          color: insufficientBalance ? '#dc1d17' : '#2e7d32',
        }}>
          ${walletBalance.toFixed(2)}
        </span>
      </div>

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

        <div className="line-item">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        {/* Discount Code Section */}
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '14px',
          margin: '12px 0',
        }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '8px' }}>
            🏷️ Discount Code
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Enter code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            />
            <button
              type="button"
              onClick={handleApplyDiscount}
              disabled={applyingDiscount}
              style={{
                padding: '8px 16px',
                background: applyingDiscount ? '#ccc' : '#dc1d17',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: applyingDiscount ? 'wait' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              {applyingDiscount ? '...' : 'Apply'}
            </button>
            {discountApplied && (
              <button
                type="button"
                onClick={handleResetDiscount}
                style={{
                  padding: '8px 12px',
                  background: '#777',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Reset
              </button>
            )}
          </div>
          {discountMsg && <p style={{ color: '#2e7d32', fontSize: '0.8rem', marginTop: '6px' }}>{discountMsg}</p>}
          {discountError && <p style={{ color: '#dc1d17', fontSize: '0.8rem', marginTop: '6px' }}>{discountError}</p>}
        </div>

        {discountPercent > 0 && (
          <div className="line-item" style={{ color: '#2e7d32' }}>
            <span>Discount ({discountPercent}%)</span>
            <span>-${discountAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="total">
          <span>Total</span>
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

        <button
          type="submit"
          className={`btn btn-block ${insufficientBalance ? 'btn-warning' : 'btn-primary'}`}
          disabled={insufficientBalance}
          style={insufficientBalance ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
        >
          {insufficientBalance
            ? `❌ Insufficient Balance — Need $${totalPrice}`
            : `💳 Place Order — $${totalPrice}`
          }
        </button>
      </form>

      <p className="text-muted text-center mt-2" style={{ fontSize: '0.8rem' }}>
        Hint: Try applying the discount code multiple times simultaneously 😉
      </p>
    </div>
  );
}
