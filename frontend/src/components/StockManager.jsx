import { useState, useEffect, useRef } from 'react';

const CATEGORIES = ['Tops', 'Bottoms', 'Sports', 'Outerwear', 'Accessories', 'Other'];

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function StockManager() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingQty, setEditingQty] = useState(null);
  const [qtyValue, setQtyValue] = useState('');
  const qtyInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '', category: '', size: '', quantity: '', price: '', low_stock_threshold: '10',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stock');
      if (!res.ok) throw new Error('Failed to fetch stock');
      setStock(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStock(); }, []);

  useEffect(() => {
    if (editingQty && qtyInputRef.current) qtyInputRef.current.focus();
  }, [editingQty]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', category: '', size: '', quantity: '', price: '', low_stock_threshold: '10' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name || '',
      category: item.category || '',
      size: item.size || '',
      quantity: item.quantity !== null ? String(item.quantity) : '',
      price: item.price !== null ? String(item.price) : '',
      low_stock_threshold: item.low_stock_threshold !== null ? String(item.low_stock_threshold) : '10',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    setSaving(true);
    try {
      const url = editItem ? `/api/stock/${editItem.id}` : '/api/stock';
      const method = editItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: form.quantity !== '' ? parseInt(form.quantity) : 0,
          price: form.price !== '' ? parseFloat(form.price) : null,
          low_stock_threshold: form.low_stock_threshold !== '' ? parseInt(form.low_stock_threshold) : 10,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save'); }
      await fetchStock();
      setShowModal(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/stock/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await fetchStock();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const saveQty = async (item) => {
    const qty = parseInt(qtyValue);
    if (isNaN(qty) || qty < 0) { setEditingQty(null); return; }
    try {
      await fetch(`/api/stock/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      });
      await fetchStock();
    } catch (_) {}
    setEditingQty(null);
  };

  const qtyColor = (item) => {
    if (item.quantity <= item.low_stock_threshold) return 'text-red-600 font-bold';
    if (item.quantity <= item.low_stock_threshold * 2) return 'text-amber-600 font-semibold';
    return 'text-green-700 font-semibold';
  };

  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stock Manager</h2>
          <p className="text-gray-500 text-sm mt-1">{stock.length} items in inventory</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Add Stock</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}
          </div>
        ) : stock.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <span className="text-5xl">📦</span>
            <p className="mt-3">No stock items yet. Add your first item!</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Name', 'Category', 'Size', 'Quantity', 'Price', 'Threshold', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stock.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                      <td className="py-3 px-4 text-gray-500">{item.category || '—'}</td>
                      <td className="py-3 px-4 text-gray-500">{item.size || '—'}</td>
                      <td className="py-3 px-4">
                        {editingQty === item.id ? (
                          <input
                            ref={qtyInputRef}
                            type="number" min="0"
                            value={qtyValue}
                            onChange={e => setQtyValue(e.target.value)}
                            onBlur={() => saveQty(item)}
                            onKeyDown={e => { if (e.key === 'Enter') saveQty(item); if (e.key === 'Escape') setEditingQty(null); }}
                            className="w-20 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <button onClick={() => { setEditingQty(item.id); setQtyValue(String(item.quantity)); }} className={`hover:underline cursor-pointer ${qtyColor(item)}`} title="Click to edit">
                            {item.quantity}
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{item.price !== null ? `£${Number(item.price).toFixed(2)}` : '—'}</td>
                      <td className="py-3 px-4 text-gray-500">{item.low_stock_threshold}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(item)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Edit</button>
                          <button onClick={() => setDeleteConfirm(item)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {stock.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.category || '—'} {item.size ? `· ${item.size}` : ''}</p>
                    </div>
                    <div className="text-right">
                      {editingQty === item.id ? (
                        <input
                          ref={qtyInputRef}
                          type="number" min="0"
                          value={qtyValue}
                          onChange={e => setQtyValue(e.target.value)}
                          onBlur={() => saveQty(item)}
                          onKeyDown={e => { if (e.key === 'Enter') saveQty(item); if (e.key === 'Escape') setEditingQty(null); }}
                          className="w-20 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <button onClick={() => { setEditingQty(item.id); setQtyValue(String(item.quantity)); }} className={`text-lg font-bold hover:underline ${qtyColor(item)}`}>
                          {item.quantity}
                        </button>
                      )}
                      <p className="text-xs text-gray-400">qty</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>Price: <span className="text-gray-900 font-medium">{item.price !== null ? `£${Number(item.price).toFixed(2)}` : '—'}</span></span>
                      <span>Min: <span className="text-gray-900 font-medium">{item.low_stock_threshold}</span></span>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(item)} className="text-indigo-600 text-xs font-medium">Edit</button>
                      <button onClick={() => setDeleteConfirm(item)} className="text-red-500 text-xs font-medium">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editItem ? 'Edit Stock Item' : 'Add Stock Item'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{formError}</p>}
            <div>
              <label className="label">Name <span className="text-red-500">*</span></label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Boys Shirt" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Size</label>
                <input className="input" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="e.g. Age 7-8" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Quantity</label>
                <input type="number" min="0" className="input" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="label">Price (£)</label>
                <input type="number" min="0" step="0.01" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="label">Low Stock Threshold</label>
              <input type="number" min="0" className="input" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} placeholder="10" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal title="Delete Stock Item" onClose={() => setDeleteConfirm(null)}>
          <p className="text-gray-600 mb-5">
            Are you sure you want to delete <strong>{deleteConfirm.name}</strong>
            {deleteConfirm.size ? ` (${deleteConfirm.size})` : ''}? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => handleDelete(deleteConfirm.id)} className="btn-danger flex-1">Delete</button>
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
