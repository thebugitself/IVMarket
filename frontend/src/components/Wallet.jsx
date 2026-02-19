import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Wallet() {
  const { user, token } = useAuth();

  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchWallet = () => {
    if (!user) return;
    axios.get(`/api/wallet/${user.id}`)
      .then(({ data }) => setWallet(data))
      .catch(() => setError('Could not load wallet'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchWallet, [user]);

  const handleDeposit = async () => {
    setMsg(''); setError('');
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num === 0) {
      return setError('Please enter a valid amount');
    }
    try {
      const { data } = await axios.post('/api/wallet/deposit',
        { amount: num },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg(`Deposited! New balance: $${Number(data.balance).toFixed(2)}`);
      setAmount('');
      fetchWallet();
    } catch (err) {
      setError(err.response?.data?.error || 'Deposit failed');
    }
  };

  const handleWithdraw = async () => {
    setMsg(''); setError('');
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num === 0) {
      return setError('Please enter a valid amount');
    }
    try {
      const { data } = await axios.post('/api/wallet/withdraw',
        { amount: num },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg(`Withdrawn $${Number(data.withdrawn).toFixed(2)}! New balance: $${Number(data.new_balance).toFixed(2)}`);
      setAmount('');
      fetchWallet();
    } catch (err) {
      setError(err.response?.data?.error || 'Withdrawal failed');
    }
  };

  if (!user) return <div className="empty-state"><p>Please log in to access your wallet.</p></div>;
  if (loading) return <div className="loading"><div className="spinner" /><p>Loading wallet…</p></div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="page-header">
        <h1>My Wallet</h1>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="wallet-card">
        <p className="text-muted">Current Balance</p>
        <div className="wallet-balance">
          ${wallet ? (Number(wallet.balance) || 0).toFixed(2) : '0.00'}
        </div>

        <div className="wallet-actions">
          <div className="form-group">
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <button className="btn btn-success" onClick={handleDeposit}>Deposit</button>
          <button className="btn btn-warning" onClick={handleWithdraw}>Withdraw</button>
        </div>
      </div>
    </div>
  );
}
