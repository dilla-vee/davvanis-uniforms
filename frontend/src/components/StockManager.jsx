import { useState, useEffect, useRef } from 'react';

const CATEGORIES = ['Tops', 'Bottoms', 'Sports', 'Outerwear', 'Accessories', 'Other'];
const KSH = 'Ksh ';

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`card rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[92vh] flex flex-col`}
        style={{ borderRadius: '0.75rem' }}>
        <div className="flex items-center justify-between p-5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-base font-semibold text-theme-primary">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none text-theme-secondary hover-theme rounded p-1">x</button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// Daily Sales Modal
function DailySalesModal({ stock, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [saleDate, setSaleDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ stock_id: '', qty_sold: '1', unit_price: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const addRow = () => setItems(i => [...i, { stock_id: '', qty_sold: '1', unit_price: '' }]);
  const removeRow = idx => setItems(i => i.filter((_, n) => n !== idx));
  const updateRow = (idx, field, val) => setItems(i => {
    const next = [...i];
    next[idx] = { ...next[idx], [field]: val };
    if (field === 'stock_id') {
      const s = stock.find(s => String(s.id) === String(val));
      if (s) next[idx].unit_price = s.price != null ? String(s.price) : '';
    }
    return next;
  });
  const total = items.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (parseInt(i.qty_sold) || 0), 0);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    for (const item of items) {
      if (!item.stock_id) { setError('Select a stock item for each row'); return; }
      if (!item.qty_sold || parseInt(item.qty_sold) < 1) { setError('Quantity must be at least 1'); return; }
    }
    setSaving(true);
    try {
      const r = await fetch('/api/stock/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sale_date: saleDate, notes: notes || null,
          items: items.map(i => ({
            stock_id: parseInt(i.stock_id),
            qty_sold: parseInt(i.qty_sold),
            unit_price: parseFloat(i.unit_price) || 0,
          })),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed');
      setSuccess({ total: data.sale.total_value, count: items.length });
      onSaved(data.updatedStock);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  if (success) return (
    <div className="text-center py-6 space-y-4">
      <div style={{ fontSize: '52px' }}>✅</div>
      <h3 className="text-lg font-bold text-theme-primary">Sales Recorded!</h3>
      <p className="text-theme-secondary text-sm">
        {success.count} item{success.count !== 1 ? 's' : ''} sold —
        <span className="font-semibold text-theme-primary"> {KSH}{Number(success.total).toFixed(2)}</span>
      </p>
      <p className="text-xs text-theme-muted">Stock quantities updated automatically.</p>
      <div className="flex gap-3 justify-center pt-2">
        <button onClick={() => { setSuccess(null); setItems([{ stock_id:'', qty_sold:'1', unit_price:'' }]); setNotes(''); }} className="btn-secondary">Record More</button>
        <button onClick={onClose} className="btn-primary">Done</button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm p-2 rounded" style={{ background:'#fee2e2', color:'#991b1b' }}>{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Sale Date</label>
          <input type="date" className="input" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Evening sales" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Items Sold</label>
          <button type="button" onClick={addRow} className="text-xs font-medium px-2 py-1 rounded"
            style={{ background:'rgba(99,102,241,0.1)', color:'#6366f1' }}>+ Add Row</button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => {
            const si = stock.find(s => String(s.id) === String(item.stock_id));
            return (
              <div key={idx} className="grid gap-2 items-end" style={{ gridTemplateColumns:'1fr 80px 110px 28px' }}>
                <div>
                  {idx === 0 && <p className="text-xs text-theme-muted mb-1">Stock Item</p>}
                  <select className="input text-sm" value={item.stock_id} onChange={e => updateRow(idx,'stock_id',e.target.value)}>
                    <option value="">Select...</option>
                    {stock.map(s => (
                      <option key={s.id} value={s.id} disabled={s.quantity === 0}>
                        {s.name}{s.size ? ` (${s.size})` : ''} — {s.quantity} left
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  {idx === 0 && <p className="text-xs text-theme-muted mb-1">Qty Sold</p>}
                  <input type="number" min="1" max={si?.quantity || undefined} className="input text-sm"
                    value={item.qty_sold} onChange={e => updateRow(idx,'qty_sold',e.target.value)} />
                </div>
                <div>
                  {idx === 0 && <p className="text-xs text-theme-muted mb-1">Unit Price (Ksh)</p>}
                  <input type="number" min="0" step="0.01" className="input text-sm"
                    value={item.unit_price} onChange={e => updateRow(idx,'unit_price',e.target.value)} placeholder="0" />
                </div>
                <button type="button" onClick={() => removeRow(idx)} disabled={items.length === 1}
                  className="mb-0.5 w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: items.length===1?'var(--bg-muted)':'#fee2e2', color: items.length===1?'var(--text-muted)':'#ef4444' }}>
                  x
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-between items-center px-3 py-2 rounded-lg"
        style={{ backgroundColor:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)' }}>
        <span className="text-sm text-theme-secondary">Total Sales Value</span>
        <span className="font-bold text-lg" style={{ color:'#6366f1' }}>{KSH}{total.toFixed(2)}</span>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Recording...' : 'Record Sales & Update Stock'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

// Sales History Modal
function SalesHistoryModal({ onClose }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch('/api/stock/sales')
      .then(r => r.json())
      .then(data => setSales(Array.isArray(data) ? data : []))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-3">
      {loading ? (
        [1,2,3].map(i => <div key={i} className="h-12 rounded animate-pulse" style={{ backgroundColor:'var(--bg-muted)' }} />)
      ) : sales.length === 0 ? (
        <div className="text-center py-10">
          <p style={{ fontSize:'36px' }}>📋</p>
          <p className="text-sm text-theme-muted mt-2">No sales recorded yet.</p>
        </div>
      ) : sales.map(sale => (
        <div key={sale.id} className="rounded-lg overflow-hidden" style={{ border:'1px solid var(--border)' }}>
          <button className="w-full flex items-center justify-between px-4 py-3 hover-theme text-left"
            onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}>
            <div>
              <span className="font-semibold text-theme-primary text-sm">
                {new Date(sale.sale_date + 'T00:00:00').toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
              </span>
              {sale.notes && <span className="ml-2 text-xs text-theme-muted">— {sale.notes}</span>}
              <div className="text-xs text-theme-secondary mt-0.5">
                {(sale.items||[]).length} item{sale.items?.length!==1?'s':''} sold
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold" style={{ color:'#22c55e' }}>{KSH}{Number(sale.total_value).toFixed(2)}</div>
              <div className="text-xs text-theme-muted">{expanded===sale.id?'▲':'▼'}</div>
            </div>
          </button>
          {expanded === sale.id && (
            <div style={{ borderTop:'1px solid var(--border)', backgroundColor:'var(--bg-muted)' }}>
              <table className="w-full text-sm">
                <thead><tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Item','Size','Qty Sold','Unit Price','Subtotal'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs text-theme-secondary font-medium">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(sale.items||[]).map((item,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid var(--border-light)' }}>
                      <td className="px-4 py-2 font-medium text-theme-primary">{item.stock_name||'--'}</td>
                      <td className="px-4 py-2 text-theme-secondary">{item.stock_size||'--'}</td>
                      <td className="px-4 py-2 font-semibold" style={{ color:'#ef4444' }}>{item.qty_sold}</td>
                      <td className="px-4 py-2 text-theme-primary">{KSH}{Number(item.unit_price).toFixed(2)}</td>
                      <td className="px-4 py-2 font-medium text-theme-primary">{KSH}{Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Main StockManager component
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
  const [showSales, setShowSales] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchStock = async () => {
    try { setLoading(true); const r = await fetch('/api/stock'); setStock(await r.json()); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { fetchStock(); }, []);
  useEffect(() => { if (editingQty && qtyRef.current) qtyRef.current.focus(); }, [editingQty]);

  const openAdd = () => { setEditItem(null); setForm({ name:'', category:'', size:'', quantity:'', price:'', low_stock_threshold:'10' }); setFormError(''); setShowModal(true); };
  const openEdit = item => { setEditItem(item); setForm({ name:item.name||'', category:item.category||'', size:item.size||'', quantity:item.quantity!=null?String(item.quantity):'', price:item.price!=null?String(item.price):'', low_stock_threshold:item.low_stock_threshold!=null?String(item.low_stock_threshold):'10' }); setFormError(''); setShowModal(true); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    setSaving(true);
    try {
      const r = await fetch(editItem?`/api/stock/${editItem.id}`:'/api/stock', {
        method: editItem?'PUT':'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...form, quantity:form.quantity!==''?parseInt(form.quantity):0, price:form.price!==''?parseFloat(form.price):null, low_stock_threshold:form.low_stock_threshold!==''?parseInt(form.low_stock_threshold):10 }),
      });
      if (!r.ok) { const d=await r.json(); throw new Error(d.error||'Failed'); }
      await fetchStock(); setShowModal(false);
    } catch (e) { setFormError(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    const r = await fetch(`/api/stock/${id}`, { method:'DELETE' });
    if (r.ok) { await fetchStock(); setDeleteConfirm(null); }
  };

  const saveQty = async item => {
    const qty = parseInt(qtyValue);
    if (!isNaN(qty) && qty >= 0) {
      await fetch(`/api/stock/${item.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ quantity:qty }) });
      await fetchStock();
    }
    setEditingQty(null);
  };

  const qtyStyle = item => {
    if (item.quantity <= item.low_stock_threshold) return { color:'#ef4444', fontWeight:'bold' };
    if (item.quantity <= item.low_stock_threshold*2) return { color:'#f59e0b', fontWeight:'600' };
    return { color:'#22c55e', fontWeight:'600' };
  };

  if (error) return <div className="rounded-lg p-4" style={{ background:'#fee2e2', color:'#991b1b' }}>{error}</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">Stock Manager</h2>
          <p className="text-sm mt-1 text-theme-secondary">{stock.length} items in inventory</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowHistory(true)} className="btn-secondary text-sm">📋 Sales History</button>
          <button onClick={() => setShowSales(true)} className="btn-primary text-sm">💰 Record Daily Sales</button>
          <button onClick={openAdd} className="btn-primary">+ Add Stock</button>
        </div>
      </div>

      {/* Stock table / cards */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4,5].map(i=><div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor:'var(--bg-muted)' }} />)}</div>
        ) : stock.length === 0 ? (
          <div className="text-center py-16 text-theme-secondary"><span className="text-5xl">📦</span><p className="mt-3">No stock items yet.</p></div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor:'var(--bg-muted)', borderBottom:'1px solid var(--border)' }}>
                  <tr>{['Name','Category','Size','Quantity','Price','Min Stock','Actions'].map(h=>(
                    <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide text-theme-secondary font-medium">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {stock.map(item=>(
                    <tr key={item.id} className="hover-theme" style={{ borderBottom:'1px solid var(--border-light)' }}>
                      <td className="py-3 px-4 font-medium text-theme-primary">{item.name}</td>
                      <td className="py-3 px-4 text-theme-secondary">{item.category||'--'}</td>
                      <td className="py-3 px-4 text-theme-secondary">{item.size||'--'}</td>
                      <td className="py-3 px-4">
                        {editingQty===item.id
                          ? <input ref={qtyRef} type="number" min="0" value={qtyValue} onChange={e=>setQtyValue(e.target.value)} onBlur={()=>saveQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveQty(item);if(e.key==='Escape')setEditingQty(null);}} className="input w-20" />
                          : <button onClick={()=>{setEditingQty(item.id);setQtyValue(String(item.quantity));}} style={qtyStyle(item)} className="hover:underline">{item.quantity}</button>
                        }
                      </td>
                      <td className="py-3 px-4 text-theme-primary">{item.price!=null?KSH+Number(item.price).toFixed(2):'--'}</td>
                      <td className="py-3 px-4 text-theme-secondary">{item.low_stock_threshold}</td>
                      <td className="py-3 px-4">
                        <button onClick={()=>openEdit(item)} className="text-xs font-medium mr-3" style={{ color:'#6366f1' }}>Edit</button>
                        <button onClick={()=>setDeleteConfirm(item)} className="text-xs font-medium" style={{ color:'#ef4444' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden">
              {stock.map(item=>(
                <div key={item.id} className="p-4" style={{ borderBottom:'1px solid var(--border-light)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-theme-primary">{item.name}</p>
                      <p className="text-xs text-theme-secondary">{item.category||'--'}{item.size?` - ${item.size}`:''}</p>
                    </div>
                    <div className="text-right">
                      {editingQty===item.id
                        ? <input ref={qtyRef} type="number" min="0" value={qtyValue} onChange={e=>setQtyValue(e.target.value)} onBlur={()=>saveQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveQty(item);}} className="input w-20" />
                        : <button onClick={()=>{setEditingQty(item.id);setQtyValue(String(item.quantity));}} style={{ ...qtyStyle(item), fontSize:'1.1rem' }} className="hover:underline">{item.quantity}</button>
                      }
                      <p className="text-xs text-theme-muted">qty</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-theme-secondary">
                      <span>Price: <strong className="text-theme-primary">{item.price!=null?KSH+Number(item.price).toFixed(2):'--'}</strong></span>
                      <span>Min: <strong className="text-theme-primary">{item.low_stock_threshold}</strong></span>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={()=>openEdit(item)} className="text-xs font-medium" style={{ color:'#6366f1' }}>Edit</button>
                      <button onClick={()=>setDeleteConfirm(item)} className="text-xs font-medium" style={{ color:'#ef4444' }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal title={editItem?'Edit Stock Item':'Add Stock Item'} onClose={()=>setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <p className="text-sm p-2 rounded" style={{ background:'#fee2e2', color:'#991b1b' }}>{formError}</p>}
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Boys Shirt" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  <option value="">Select...</option>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Size</label>
                <input className="input" value={form.size} onChange={e=>setForm(f=>({...f,size:e.target.value}))} placeholder="e.g. Age 7-8" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Quantity</label>
                <input type="number" min="0" className="input" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} />
              </div>
              <div>
                <label className="label">Price (Ksh)</label>
                <input type="number" min="0" step="0.01" className="input" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} />
              </div>
            </div>
            <div>
              <label className="label">Low Stock Threshold</label>
              <input type="number" min="0" className="input" value={form.low_stock_threshold} onChange={e=>setForm(f=>({...f,low_stock_threshold:e.target.value}))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving...':editItem?'Update':'Add Item'}</button>
              <button type="button" onClick={()=>setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Modal title="Delete Stock Item" onClose={()=>setDeleteConfirm(null)}>
          <p className="text-theme-secondary mb-5">
            Delete <strong className="text-theme-primary">{deleteConfirm.name}</strong>
            {deleteConfirm.size ? ` (${deleteConfirm.size})` : ''}? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={()=>handleDelete(deleteConfirm.id)} className="btn-danger flex-1">Delete</button>
            <button onClick={()=>setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Daily Sales Modal */}
      {showSales && (
        <Modal title="Record Daily Sales" wide onClose={()=>setShowSales(false)}>
          <DailySalesModal
            stock={stock}
            onClose={()=>setShowSales(false)}
            onSaved={updatedStock=>setStock(updatedStock)}
          />
        </Modal>
      )}

      {/* Sales History Modal */}
      {showHistory && (
        <Modal title="Sales History (Last 30 Days)" wide onClose={()=>setShowHistory(false)}>
          <SalesHistoryModal onClose={()=>setShowHistory(false)} />
        </Modal>
      )}
    </div>
  );
}
