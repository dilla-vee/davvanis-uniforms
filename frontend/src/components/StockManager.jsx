import { useState, useEffect, useRef } from 'react';

const CATEGORIES = ['Tops', 'Bottoms', 'Sports', 'Outerwear', 'Accessories', 'Other'];

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card rounded-xl shadow-xl w-full max-w-md" style={{ borderRadius: '0.75rem' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-base font-semibold text-theme-primary">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none text-theme-secondary hover-theme rounded p-1">✕</button>
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
  const qtyRef = useRef(null);
  const [form, setForm] = useState({ name:'', category:'', size:'', quantity:'', price:'', low_stock_threshold:'10' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStock = async () => {
    try { setLoading(true); const r = await fetch('/api/stock'); setStock(await r.json()); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { fetchStock(); }, []);
  useEffect(() => { if (editingQty && qtyRef.current) qtyRef.current.focus(); }, [editingQty]);

  const openAdd = () => { setEditItem(null); setForm({ name:'', category:'', size:'', quantity:'', price:'', low_stock_threshold:'10' }); setFormError(''); setShowModal(true); };
  const openEdit = item => { setEditItem(item); setForm({ name: item.name||'', category: item.category||'', size: item.size||'', quantity: item.quantity!=null?String(item.quantity):'', price: item.price!=null?String(item.price):'', low_stock_threshold: item.low_stock_threshold!=null?String(item.low_stock_threshold):'10' }); setFormError(''); setShowModal(true); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    setSaving(true);
    try {
      const r = await fetch(editItem ? `/api/stock/${editItem.id}` : '/api/stock', {
        method: editItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: form.quantity!==''?parseInt(form.quantity):0, price: form.price!==''?parseFloat(form.price):null, low_stock_threshold: form.low_stock_threshold!==''?parseInt(form.low_stock_threshold):10 }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error||'Failed'); }
      await fetchStock(); setShowModal(false);
    } catch (e) { setFormError(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    const r = await fetch(`/api/stock/${id}`, { method: 'DELETE' });
    if (r.ok) { await fetchStock(); setDeleteConfirm(null); }
  };

  const saveQty = async item => {
    const qty = parseInt(qtyValue);
    if (!isNaN(qty) && qty >= 0) {
      await fetch(`/api/stock/${item.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ quantity: qty }) });
      await fetchStock();
    }
    setEditingQty(null);
  };

  const qtyStyle = item => {
    if (item.quantity <= item.low_stock_threshold) return { color: '#ef4444', fontWeight: 'bold' };
    if (item.quantity <= item.low_stock_threshold * 2) return { color: '#f59e0b', fontWeight: '600' };
    return { color: '#22c55e', fontWeight: '600' };
  };

  if (error) return <div className="rounded-lg p-4" style={{ background:'#fee2e2', color:'#991b1b' }}>{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">Stock Manager</h2>
          <p className="text-sm mt-1 text-theme-secondary">{stock.length} items in inventory</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Add Stock</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor:'var(--bg-muted)' }} />)}</div>
        ) : stock.length === 0 ? (
          <div className="text-center py-16 text-theme-secondary"><span className="text-5xl">📦</span><p className="mt-3">No stock items yet.</p></div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor:'var(--bg-muted)', borderBottom:'1px solid var(--border)' }}>
                  <tr>{['Name','Category','Size','Quantity','Price','Threshold','Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide text-theme-secondary font-medium">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {stock.map(item => (
                    <tr key={item.id} className="hover-theme" style={{ borderBottom:'1px solid var(--border-light)' }}>
                      <td className="py-3 px-4 font-medium text-theme-primary">{item.name}</td>
                      <td className="py-3 px-4 text-theme-secondary">{item.category||'—'}</td>
                      <td className="py-3 px-4 text-theme-secondary">{item.size||'—'}</td>
                      <td className="py-3 px-4">
                        {editingQty === item.id
                          ? <input ref={qtyRef} type="number" min="0" value={qtyValue} onChange={e=>setQtyValue(e.target.value)} onBlur={()=>saveQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveQty(item);if(e.key==='Escape')setEditingQty(null);}} className="input w-20" />
                          : <button onClick={()=>{setEditingQty(item.id);setQtyValue(String(item.quantity));}} style={qtyStyle(item)} className="hover:underline">{item.quantity}</button>}
                      </td>
                      <td className="py-3 px-4 text-theme-primary">{item.price!=null?`£${Number(item.price).toFixed(2)}`:'—'}</td>
                      <td className="py-3 px-4 text-theme-secondary">{item.low_stock_threshold}</td>
                      <td className="py-3 px-4">
                        <button onClick={()=>openEdit(item)} className="text-xs font-medium mr-3" style={{color:'#6366f1'}}>Edit</button>
                        <button onClick={()=>setDeleteConfirm(item)} className="text-xs font-medium" style={{color:'#ef4444'}}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden">
              {stock.map(item => (
                <div key={item.id} className="p-4" style={{ borderBottom:'1px solid var(--border-light)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-theme-primary">{item.name}</p>
                      <p className="text-xs text-theme-secondary">{item.category||'—'}{item.size?` · ${item.size}`:''}</p>
                    </div>
                    <div className="text-right">
                      {editingQty===item.id
                        ? <input ref={qtyRef} type="number" min="0" value={qtyValue} onChange={e=>setQtyValue(e.target.value)} onBlur={()=>saveQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveQty(item);}} className="input w-20" />
                        : <button onClick={()=>{setEditingQty(item.id);setQtyValue(String(item.quantity));}} style={{...qtyStyle(item),fontSize:'1.125rem'}} className="hover:underline">{item.quantity}</button>}
                      <p className="text-xs text-theme-muted">qty</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-theme-secondary">
                      <span>Price: <strong className="text-theme-primary">{item.price!=null?`£${Number(item.price).toFixed(2)}`:'—'}</strong></span>
                      <span>Min: <strong className="text-theme-primary">{item.low_stock_threshold}</strong></span>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={()=>openEdit(item)} className="text-xs font-medium" style={{color:'#6366f1'}}>Edit</button>
                      <button onClick={()=>setDeleteConfirm(item)} className="text-xs font-medium" style={{color:'#ef4444'}}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <Modal title={editItem?'Edit Stock Item':'Add Stock Item'} onClose={()=>setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <p className="text-sm p-2 rounded" style={{background:'#fee2e2',color:'#991b1b'}}>{formError}</p>}
            <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Boys Shirt" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Category</label>
                <select className="input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  <option value="">Select...</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="label">Size</label><input className="input" value={form.size} onChange={e=>setForm(f=>({...f,size:e.target.value}))} placeholder="Age 7-8" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Quantity</label><input type="number" min="0" className="input" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} /></div>
              <div><label className="label">Price (£)</label><input type="number" min="0" step="0.01" className="input" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} /></div>
            </div>
            <div><label className="label">Low Stock Threshold</label><input type="number" min="0" className="input" value={form.low_stock_threshold} onChange={e=>setForm(f=>({...f,low_stock_threshold:e.target.value}))} /></div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving...':editItem?'Update':'Add Item'}</button>
              <button type="button" onClick={()=>setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Delete Stock Item" onClose={()=>setDeleteConfirm(null)}>
          <p className="text-theme-secondary mb-5">Delete <strong className="text-theme-primary">{deleteConfirm.name}</strong>? This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={()=>handleDelete(deleteConfirm.id)} className="btn-danger flex-1">Delete</button>
            <button onClick={()=>setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
