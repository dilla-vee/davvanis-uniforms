import { useState, useEffect } from 'react';

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
      {status}
    </span>
  );
}

const STATUSES = ['pending', 'processing', 'completed', 'cancelled'];

export default function OrdersManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [stock, setStock] = useState([]);
  const [addForm, setAddForm] = useState({ client_id: '', notes: '', items: [] });
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      setOrders(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const openDetail = async (order) => {
    setViewOrder(order); setDetailLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`);
      if (!res.ok) throw new Error();
      setOrderDetail(await res.json());
    } catch { setOrderDetail(null); } finally { setDetailLoading(false); }
  };

  const openAdd = async () => {
    setAddError(''); setAddForm({ client_id: '', notes: '', items: [] });
    const [cRes, sRes] = await Promise.all([fetch('/api/clients'), fetch('/api/stock')]);
    setClients(await cRes.json()); setStock(await sRes.json());
    setShowAddModal(true);
  };

  const addItem = () => setAddForm(f => ({ ...f, items: [...f.items, { stock_id: '', quantity: '1', size: '', unit_price: '' }] }));
  const removeItem = (idx) => setAddForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx, field, val) => {
    setAddForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: val };
      if (field === 'stock_id') {
        const s = stock.find(s => String(s.id) === String(val));
        if (s) { items[idx].unit_price = s.price !== null ? String(s.price) : ''; items[idx].size = s.size || ''; }
      }
      return { ...f, items };
    });
  };

  const runningTotal = addForm.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.client_id) { setAddError('Please select a client'); return; }
    if (addForm.items.length === 0) { setAddError('Add at least one item'); return; }
    for (const item of addForm.items) {
      if (!item.stock_id) { setAddError('Each item needs a stock selection'); return; }
      if (!item.quantity || parseInt(item.quantity) < 1) { setAddError('Each item needs a valid quantity'); return; }
    }
    setSaving(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: parseInt(addForm.client_id), notes: addForm.notes || null,
          items: addForm.items.map(i => ({ stock_id: parseInt(i.stock_id), quantity: parseInt(i.quantity), unit_price: parseFloat(i.unit_price) || 0, size: i.size || null })),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create order'); }
      await fetchOrders(); setShowAddModal(false);
    } catch (err) { setAddError(err.message); } finally { setSaving(false); }
  };

  const handleStatusChange = async (orderId, status) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setOrderDetail(d => d ? { ...d, status: updated.status } : d);
      await fetchOrders();
    } catch (_) {} finally { setUpdatingStatus(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this order?')) return;
    const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    if (res.ok) { await fetchOrders(); setViewOrder(null); setOrderDetail(null); }
  };

  if (error) return <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Orders</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{orders.length} total orders</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ New Order</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <span className="text-5xl">📋</span><p className="mt-3">No orders yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    {['Order #', 'Client', 'School', 'Date', 'Items', 'Total', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => openDetail(order)}>
                      <td className="py-3 px-4 font-medium text-indigo-600 dark:text-indigo-400">#{order.id}</td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{order.client_name || '—'}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{order.client_school || '—'}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{new Date(order.order_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{order.item_count}</td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">£{(order.total_price || 0).toFixed(2)}</td>
                      <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button onClick={() => openDetail(order)} className="text-indigo-600 dark:text-indigo-400 text-xs font-medium">View</button>
                          <button onClick={() => handleDelete(order.id)} className="text-red-500 dark:text-red-400 text-xs font-medium">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {orders.map((order) => (
                <div key={order.id} className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => openDetail(order)}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-sm">Order #{order.id}</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{order.client_name || '—'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{order.client_school || '—'}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>{new Date(order.order_date).toLocaleDateString()}</span>
                      <span>{order.item_count} item{order.item_count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-gray-100">£{(order.total_price || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Order Detail Modal */}
      {viewOrder && (
        <Modal title={`Order #${viewOrder.id}`} wide onClose={() => { setViewOrder(null); setOrderDetail(null); }}>
          {detailLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />)}</div>
          ) : orderDetail ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Client</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{orderDetail.client_name || '—'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{orderDetail.client_school || '—'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Order Date</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{new Date(orderDetail.order_date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(orderDetail.order_date).toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                <select value={orderDetail.status} onChange={e => handleStatusChange(orderDetail.id, e.target.value)} disabled={updatingStatus} className="input w-40">
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                {updatingStatus && <span className="text-xs text-gray-400 dark:text-gray-500">Saving...</span>}
              </div>
              {orderDetail.notes && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{orderDetail.notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Order Items</p>
                <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {['Item', 'Size', 'Qty', 'Unit Price', 'Subtotal'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {(orderDetail.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">{item.stock_name || `Item #${item.stock_id}`}</td>
                          <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{item.size || '—'}</td>
                          <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{item.quantity}</td>
                          <td className="py-2 px-3 text-gray-900 dark:text-gray-100">£{(item.unit_price || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">£{((item.unit_price || 0) * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-indigo-50 dark:bg-indigo-950 rounded-lg px-5 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total: </span>
                  <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">£{(orderDetail.total_price || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : <p className="text-gray-500 dark:text-gray-400">Failed to load order details.</p>}
        </Modal>
      )}

      {/* Add Order Modal */}
      {showAddModal && (
        <Modal title="New Order" wide onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            {addError && <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">{addError}</p>}
            <div>
              <label className="label">Client <span className="text-red-500">*</span></label>
              <select className="input" value={addForm.client_id} onChange={e => setAddForm(f => ({ ...f, client_id: e.target.value }))}>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.school}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Items <span className="text-red-500">*</span></label>
                <button type="button" onClick={addItem} className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">+ Add Item</button>
              </div>
              {addForm.items.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No items added yet.</p>
              ) : (
                <div className="space-y-2">
                  {addForm.items.map((item, idx) => (
                    <div key={idx} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Stock Item</label>
                          <select className="input text-xs" value={item.stock_id} onChange={e => updateItem(idx, 'stock_id', e.target.value)}>
                            <option value="">Select stock...</option>
                            {stock.map(s => <option key={s.id} value={s.id}>{s.name}{s.size ? ` (${s.size})` : ''} — £{s.price?.toFixed(2) || 'N/A'}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Size</label>
                          <input className="input text-xs" value={item.size} onChange={e => updateItem(idx, 'size', e.target.value)} placeholder="e.g. Age 7-8" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 items-end">
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Quantity</label>
                          <input type="number" min="1" className="input text-xs" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Unit Price (£)</label>
                          <input type="number" min="0" step="0.01" className="input text-xs" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                        </div>
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-500 dark:text-red-400 text-xs pb-1">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {addForm.items.length > 0 && (
              <div className="flex justify-end bg-indigo-50 dark:bg-indigo-950 rounded-lg px-4 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Running Total: </span>
                <span className="ml-2 font-bold text-indigo-700 dark:text-indigo-300">£{runningTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create Order'}</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
