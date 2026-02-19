import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Orders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    axios.get('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setOrders(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="loading"><div className="spinner" /><p>Loading orders…</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state"><p>You haven't placed any orders yet.</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.product_name || `Product #${o.product_id}`}</td>
                  <td>{o.quantity}</td>
                  <td style={{ color: 'var(--accent2)', fontWeight: 600 }}>
                    ${parseFloat(o.total_price).toFixed(2)}
                  </td>
                  <td>
                    <span className={`role-badge ${
                      o.status === 'delivered' ? 'role-user' :
                      o.status === 'shipped' ? '' : 'role-admin'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
