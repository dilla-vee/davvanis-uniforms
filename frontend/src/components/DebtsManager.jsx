import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const KSH = 'Ksh ';

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor:'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" style={{ borderRadius:'0.75rem' }}>
        <div className="flex items-center justify-between p-5 shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
          <h3 className="text-base font-semibold text-theme-primary">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none text-theme-secondary hover-theme rounded p-1">✕</button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default function DebtsManager({ user }) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'manual'
  const [loading, setLoading] = useState(true);
  const [orderDebts, setOrderDebts] = useState([]);
  const [manualDebts, setManualDebts] = useState([]);
  const [error, setError] = useState(null);

  // Manual debt modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ client_name:'', contact:'', amount:'', description:'' });
  const [saving, setSaving] = useState(false);

  // Pay order debt modal
  const [payOrder, setPayOrder] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [oRes, mRes] = await Promise.all([
        apiFetch('/api/debts/orders'),
        apiFetch('/api/debts/manual')
      ]);
      setOrderDebts(await oRes.json());
      setManualDebts(await mRes.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddManualDebt = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await apiFetch('/api/debts/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      if (!r.ok) throw new Error('Failed to add debt');
      await fetchData();
      setShowAddModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePayManualDebt = async (id) => {
    if (!confirm('Mark this debt as paid?')) return;
    try {
      const r = await apiFetch(`/api/debts/manual/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' })
      });
      if (!r.ok) throw new Error('Failed to update');
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePayOrderDebt = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await apiFetch(`/api/debts/orders/${payOrder.order_id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_amount: payAmount })
      });
      if (!r.ok) throw new Error('Payment failed');
      await fetchData();
      setPayOrder(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center text-red-600">Access Denied. Only administrators can view this page.</div>;
  }

  const totalOrderDebts = orderDebts.reduce((sum, o) => sum + (o.balance_amount || 0), 0);
  const totalManualDebts = manualDebts.filter(d => d.status !== 'paid').reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-theme-primary">Debts Manager</h2>
          <p className="text-theme-secondary text-sm mt-1">Track unpaid orders and manual shop debts.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 rounded-xl flex items-center justify-between cursor-pointer" onClick={() => setActiveTab('orders')} style={{ borderColor: activeTab === 'orders' ? '#6366f1' : 'var(--border)' }}>
          <div>
            <p className="text-sm font-medium text-theme-secondary">Unpaid Orders</p>
            <p className="text-2xl font-bold text-red-600">{KSH}{totalOrderDebts.toFixed(2)}</p>
          </div>
          <span className="text-2xl">📦</span>
        </div>
        <div className="card p-4 rounded-xl flex items-center justify-between cursor-pointer" onClick={() => setActiveTab('manual')} style={{ borderColor: activeTab === 'manual' ? '#6366f1' : 'var(--border)' }}>
          <div>
            <p className="text-sm font-medium text-theme-secondary">Manual Debts</p>
            <p className="text-2xl font-bold text-red-600">{KSH}{totalManualDebts.toFixed(2)}</p>
          </div>
          <span className="text-2xl">📝</span>
        </div>
      </div>

      <div className="card rounded-xl overflow-hidden">
        {activeTab === 'orders' ? (
          <div>
            <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-theme-primary">Unpaid Orders</h3>
            </div>
            {loading ? <div className="p-8 text-center text-theme-secondary">Loading...</div> : orderDebts.length === 0 ? <div className="p-8 text-center text-theme-secondary">No unpaid orders found.</div> : (
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--bg-muted)' }}>
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-theme-secondary">Order #</th>
                    <th className="text-left py-3 px-4 font-medium text-theme-secondary">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-theme-secondary">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-theme-secondary">Total</th>
                    <th className="text-left py-3 px-4 font-medium text-theme-secondary">Balance</th>
                    <th className="text-right py-3 px-4 font-medium text-theme-secondary">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDebts.map(o => (
                    <tr key={o.order_id} style={{ borderTop: '1px solid var(--border-light)' }}>
                      <td className="py-3 px-4">#{o.order_id}</td>
                      <td className="py-3 px-4 font-medium">{o.resolved_name} <span className="text-xs text-theme-muted block">{o.resolved_contact}</span></td>
                      <td className="py-3 px-4 text-theme-secondary">{new Date(o.order_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{KSH}{o.total_price.toFixed(2)}</td>
                      <td className="py-3 px-4 font-bold text-red-600">{KSH}{o.balance_amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => { setPayOrder(o); setPayAmount(o.balance_amount); }} className="btn-secondary text-xs py-1 px-3">Log Payment</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div>
            <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-theme-primary">Manual Shop Debts</h3>
              <button onClick={() => { setAddForm({ client_name:'', contact:'', amount:'', description:'' }); setShowAddModal(true); }} className="btn-primary text-xs py-1.5 px-3">
                + Add Debt
              </button>
            </div>
            {loading ? <div className="p-8 text-center text-theme-secondary">Loading...</div> : manualDebts.length === 0 ? <div className="p-8 text-center text-theme-secondary">No manual debts logged.</div> : (
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--bg-muted)' }}>
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-theme-secondary">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-theme-secondary">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-theme-secondary">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-theme-secondary">Amount</th>
                    <th className="text-right py-3 px-4 font-medium text-theme-secondary">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {manualDebts.map(d => (
                    <tr key={d.id} style={{ borderTop: '1px solid var(--border-light)' }} className={d.status === 'paid' ? 'opacity-50' : ''}>
                      <td className="py-3 px-4 font-medium">{d.client_name} <span className="text-xs text-theme-muted block">{d.contact}</span></td>
                      <td className="py-3 px-4 text-theme-secondary">{d.description || '—'}</td>
                      <td className="py-3 px-4 text-theme-secondary">{new Date(d.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-bold text-red-600">{KSH}{d.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        {d.status !== 'paid' ? (
                          <button onClick={() => handlePayManualDebt(d.id)} className="btn-secondary text-xs py-1 px-3">Mark Paid</button>
                        ) : (
                          <span className="text-emerald-600 font-medium text-xs px-2 py-1 rounded bg-emerald-50">PAID</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <Modal title="Log Manual Debt" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddManualDebt} className="space-y-4">
            <div>
              <label className="label">Debtor Name *</label>
              <input required className="input" value={addForm.client_name} onChange={e => setAddForm(f => ({...f, client_name: e.target.value}))} />
            </div>
            <div>
              <label className="label">Contact</label>
              <input className="input" value={addForm.contact} onChange={e => setAddForm(f => ({...f, contact: e.target.value}))} />
            </div>
            <div>
              <label className="label">Amount (Ksh) *</label>
              <input required type="number" min="1" step="0.01" className="input" value={addForm.amount} onChange={e => setAddForm(f => ({...f, amount: e.target.value}))} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows="2" value={addForm.description} onChange={e => setAddForm(f => ({...f, description: e.target.value}))} placeholder="e.g. Took 5 shirts for reselling..." />
            </div>
            <div className="pt-2">
              <button disabled={saving} type="submit" className="btn-primary w-full py-2">{saving ? 'Saving...' : 'Save Debt'}</button>
            </div>
          </form>
        </Modal>
      )}

      {payOrder && (
        <Modal title={`Pay Balance: Order #${payOrder.order_id}`} onClose={() => setPayOrder(null)}>
          <form onSubmit={handlePayOrderDebt} className="space-y-4">
            <div className="p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-100 flex justify-between font-bold">
              <span>Current Balance:</span>
              <span>{KSH}{payOrder.balance_amount.toFixed(2)}</span>
            </div>
            <div>
              <label className="label">Payment Amount (Ksh) *</label>
              <input required type="number" min="1" max={payOrder.balance_amount} step="0.01" className="input" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
            <div className="pt-2">
              <button disabled={saving} type="submit" className="btn-primary w-full py-2">{saving ? 'Processing...' : 'Record Payment'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
