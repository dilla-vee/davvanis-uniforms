import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor:'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`card rounded-xl shadow-xl w-full ${wide?'max-w-2xl':'max-w-lg'} max-h-[90vh] flex flex-col`} style={{ borderRadius:'0.75rem' }}>
        <div className="flex items-center justify-between p-5 shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
          <h3 className="text-base font-semibold text-theme-primary">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none text-theme-secondary hover-theme rounded p-1">✕</button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:    { background:'#fef3c7', color:'#92400e' },
    processing: { background:'#dbeafe', color:'#1e40af' },
    completed:  { background:'#d1fae5', color:'#065f46' },
    cancelled:  { background:'#fee2e2', color:'#991b1b' },
  };
  const s = map[status] || { background:'#f3f4f6', color:'#374151' };
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize" style={s}>{status}</span>;
}

const STATUSES = ['pending','processing','completed','cancelled'];
const KSH = 'Ksh ';

export default function OrdersManager({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [stock, setStock] = useState([]);
  const [addForm, setAddForm] = useState({ client_id:'', guest_name: '', guest_contact: '', isGuest: false, deposit_amount: '', collection_date: '', notes:'', items:[] });
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = async () => {
    try { setLoading(true); const r = await apiFetch('/api/orders'); setOrders(await r.json()); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { fetchOrders(); }, []);

  const openDetail = async order => {
    setViewOrder(order); setDetailLoading(true);
    try { const r = await apiFetch(`/api/orders/${order.id}`); setOrderDetail(await r.json()); }
    catch { setOrderDetail(null); } finally { setDetailLoading(false); }
  };

  const openAdd = async () => {
    setAddError(''); setAddForm({ client_id:'', guest_name: '', guest_contact: '', isGuest: false, deposit_amount: '', collection_date: '', notes:'', items:[] });
    const [cR, sR] = await Promise.all([apiFetch('/api/clients'), apiFetch('/api/stock')]);
    setClients(await cR.json()); setStock(await sR.json()); setShowAddModal(true);
  };

  const addItem = () => setAddForm(f => ({ ...f, items:[...f.items, { stock_id:'', quantity:'1', size:'', unit_price:'' }] }));
  const removeItem = idx => setAddForm(f => ({ ...f, items: f.items.filter((_,i)=>i!==idx) }));
  const updateItem = (idx, field, val) => setAddForm(f => {
    const items = [...f.items]; items[idx] = { ...items[idx], [field]: val };
    if (field==='stock_id') { const s=stock.find(s=>String(s.id)===String(val)); if(s){items[idx].unit_price=s.price!=null?String(s.price):''; items[idx].size=s.size||'';} }
    return { ...f, items };
  });

  const runningTotal = addForm.items.reduce((s,i) => s+(parseFloat(i.quantity)||0)*(parseFloat(i.unit_price)||0), 0);

  const handleAddSubmit = async e => {
    e.preventDefault();
    if (!addForm.isGuest && !addForm.client_id) { setAddError('Please select a client'); return; }
    if (addForm.isGuest && !addForm.guest_name.trim()) { setAddError('Please enter a guest name'); return; }
    if (!addForm.items.length) { setAddError('Add at least one item'); return; }
    for (const i of addForm.items) { if(!i.stock_id){setAddError('Each item needs a stock selection');return;} }
    setSaving(true);
    try {
      const r = await apiFetch('/api/orders', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ 
          client_id: addForm.isGuest ? null : parseInt(addForm.client_id), 
          guest_name: addForm.isGuest ? addForm.guest_name : null,
          guest_contact: addForm.isGuest ? addForm.guest_contact : null,
          deposit_amount: addForm.deposit_amount || 0,
          collection_date: addForm.collection_date || null,
          notes:addForm.notes||null,
          items: addForm.items.map(i=>({ stock_id:parseInt(i.stock_id), quantity:parseInt(i.quantity), unit_price:parseFloat(i.unit_price)||0, size:i.size||null })) 
        }) 
      });
      if (!r.ok) { const d=await r.json(); throw new Error(d.error||'Failed'); }
      await fetchOrders(); setShowAddModal(false);
    } catch (e) { setAddError(e.message); } finally { setSaving(false); }
  };

  const handleStatusChange = async (id, status) => {
    setUpdatingStatus(true);
    try {
      const r = await apiFetch(`/api/orders/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status }) });
      const d = await r.json(); setOrderDetail(o => o?{...o,status:d.status}:o); await fetchOrders();
    } catch {} finally { setUpdatingStatus(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this order?')) return;
    const r = await apiFetch(`/api/orders/${id}`, { method:'DELETE' });
    if (r.ok) { await fetchOrders(); setViewOrder(null); setOrderDetail(null); }
  };

  if (error) return <div className="rounded-lg p-4" style={{background:'#fee2e2',color:'#991b1b'}}>{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">Orders</h2>
          <p className="text-sm mt-1 text-theme-secondary">{orders.length} total orders</p>
        </div>
        {user?.role !== 'workshop' && (
          <button onClick={openAdd} className="btn-primary">+ New Order</button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4].map(i=><div key={i} className="h-10 rounded animate-pulse" style={{backgroundColor:'var(--bg-muted)'}} />)}</div>
        ) : orders.length===0 ? (
          <div className="text-center py-16 text-theme-secondary"><span className="text-5xl">📋</span><p className="mt-3">No orders yet.</p></div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{backgroundColor:'var(--bg-muted)',borderBottom:'1px solid var(--border)'}}>
                  <tr>{['Order #','Client','School','Date','Items','Total','Status','Actions'].map(h=>(
                    <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide text-theme-secondary font-medium">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {orders.map(order=>(
                    <tr key={order.id} className="hover-theme cursor-pointer" style={{borderBottom:'1px solid var(--border-light)'}} onClick={()=>openDetail(order)}>
                      <td className="py-3 px-4 font-medium" style={{color:'#6366f1'}}>#{order.id}</td>
                      <td className="py-3 px-4 font-medium text-theme-primary">{order.client_name||'—'}</td>
                      <td className="py-3 px-4 text-xs text-theme-secondary">{order.client_school||'—'}</td>
                      <td className="py-3 px-4 text-theme-secondary">{new Date(order.order_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-theme-primary">{order.item_count}</td>
                      <td className="py-3 px-4 font-medium text-theme-primary">{KSH}{(order.total_price||0).toFixed(2)}</td>
                      <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                      <td className="py-3 px-4" onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>openDetail(order)} className="text-xs font-medium mr-3" style={{color:'#6366f1'}}>View</button>
                        {user?.role === 'admin' && (
                          <button onClick={()=>handleDelete(order.id)} className="text-xs font-medium" style={{color:'#ef4444'}}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden">
              {orders.map(order=>(
                <div key={order.id} className="p-4 cursor-pointer hover-theme" style={{borderBottom:'1px solid var(--border-light)'}} onClick={()=>openDetail(order)}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <span className="font-semibold text-sm" style={{color:'#6366f1'}}>Order #{order.id}</span>
                      <p className="font-medium text-theme-primary">{order.client_name||'—'}</p>
                      <p className="text-xs text-theme-secondary">{order.client_school||'—'}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-3 text-xs text-theme-secondary">
                      <span>{new Date(order.order_date).toLocaleDateString()}</span>
                      <span>{order.item_count} item{order.item_count!==1?'s':''}</span>
                    </div>
                    <span className="font-bold text-theme-primary">{KSH}{(order.total_price||0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {viewOrder && (
        <Modal title={`Order #${viewOrder.id}`} wide onClose={()=>{setViewOrder(null);setOrderDetail(null);}}>
          {detailLoading ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-10 rounded animate-pulse" style={{backgroundColor:'var(--bg-muted)'}} />)}</div>
          : orderDetail ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg" style={{backgroundColor:'var(--bg-muted)'}}>
                  <p className="text-xs font-medium text-theme-secondary mb-1">Client</p>
                  <p className="font-semibold text-theme-primary">{orderDetail.client_name || orderDetail.guest_name || '—'}</p>
                  {orderDetail.client_school && <p className="text-sm text-theme-secondary">{orderDetail.client_school}</p>}
                  {orderDetail.guest_contact && <p className="text-sm text-theme-secondary">{orderDetail.guest_contact}</p>}
                </div>
                <div className="p-3 rounded-lg" style={{backgroundColor:'var(--bg-muted)'}}>
                  <p className="text-xs font-medium text-theme-secondary mb-1">Order Date</p>
                  <p className="font-semibold text-theme-primary">{new Date(orderDetail.order_date).toLocaleDateString()}</p>
                  <p className="text-sm text-theme-secondary">{new Date(orderDetail.order_date).toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-theme-secondary">Status:</label>
                {user?.role === 'workshop' ? (
                  <StatusBadge status={orderDetail.status} />
                ) : (
                  <>
                    <select value={orderDetail.status} onChange={e=>handleStatusChange(orderDetail.id,e.target.value)} disabled={updatingStatus} className="input w-40">
                      {STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                    {updatingStatus && <span className="text-xs text-theme-muted">Saving...</span>}
                  </>
                )}
              </div>
              {orderDetail.notes && (
                <div className="p-3 rounded-lg text-theme-secondary" style={{backgroundColor:'var(--bg-muted)'}}>
                  <p className="text-xs font-medium mb-1">Notes</p>
                  <p className="text-sm">{orderDetail.notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-theme-secondary mb-2">Order Items</p>
                <div className="rounded-lg overflow-hidden" style={{border:'1px solid var(--border)'}}>
                  <table className="w-full text-sm">
                    <thead style={{backgroundColor:'var(--bg-muted)'}}>
                      <tr>{['Item','Size','Qty','Unit Price','Subtotal'].map(h=><th key={h} className="text-left py-2 px-3 text-xs font-medium text-theme-secondary">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {(orderDetail.items||[]).map((item,idx)=>(
                        <tr key={idx} style={{borderTop:'1px solid var(--border-light)'}}>
                          <td className="py-2 px-3 font-medium text-theme-primary">{item.stock_name||`#${item.stock_id}`}</td>
                          <td className="py-2 px-3 text-theme-secondary">{item.size||'—'}</td>
                          <td className="py-2 px-3 text-theme-primary">{item.quantity}</td>
                          <td className="py-2 px-3 text-theme-primary">{KSH}{(item.unit_price||0).toFixed(2)}</td>
                          <td className="py-2 px-3 font-medium text-theme-primary">{KSH}{((item.unit_price||0)*item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <div className="px-5 py-3 rounded-lg w-64 space-y-2" style={{backgroundColor:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.1)'}}>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Total:</span>
                    <span className="font-semibold text-theme-primary">{KSH}{(orderDetail.total_price||0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Deposit:</span>
                    <span className="font-semibold text-emerald-600">{KSH}{(orderDetail.deposit_amount||0).toFixed(2)}</span>
                  </div>
                  <div className="pt-2 flex justify-between border-t" style={{borderColor:'var(--border)'}}>
                    <span className="text-sm font-semibold text-theme-secondary">Balance:</span>
                    <span className="font-bold text-red-600">{KSH}{(orderDetail.balance_amount||0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : <p className="text-theme-secondary">Failed to load order details.</p>}
        </Modal>
      )}

      {showAddModal && (
        <Modal title="New Order" wide onClose={()=>setShowAddModal(false)}>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            {addError && <p className="text-sm p-2 rounded" style={{background:'#fee2e2',color:'#991b1b'}}>{addError}</p>}
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!addForm.isGuest} onChange={() => setAddForm(f => ({...f, isGuest: false, guest_name: '', guest_contact: ''}))} />
                <span className="text-sm font-medium text-theme-primary">Existing Client</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={addForm.isGuest} onChange={() => setAddForm(f => ({...f, isGuest: true, client_id: ''}))} />
                <span className="text-sm font-medium text-theme-primary">Guest / Walk-in</span>
              </label>
            </div>
            {!addForm.isGuest ? (
              <div><label className="label">Client *</label>
                <select className="input" value={addForm.client_id} onChange={e=>setAddForm(f=>({...f,client_id:e.target.value}))}>
                  <option value="">Select client...</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name} — {c.school}</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Guest Name *</label><input className="input" placeholder="e.g. John Doe" value={addForm.guest_name} onChange={e=>setAddForm(f=>({...f,guest_name:e.target.value}))} /></div>
                <div><label className="label">Contact</label><input className="input" placeholder="e.g. 0712345678" value={addForm.guest_contact} onChange={e=>setAddForm(f=>({...f,guest_contact:e.target.value}))} /></div>
              </div>
            )}
            <div><label className="label">Notes</label>
              <textarea className="input" rows={2} value={addForm.notes} onChange={e=>setAddForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Items *</label>
                <button type="button" onClick={addItem} className="text-sm font-medium" style={{color:'#6366f1'}}>+ Add Item</button>
              </div>
              {addForm.items.length===0 ? <p className="text-sm italic text-theme-muted">No items added yet.</p> : (
                <div className="space-y-2">
                  {addForm.items.map((item,idx)=>(
                    <div key={idx} className="p-3 rounded-lg" style={{border:'1px solid var(--border)',backgroundColor:'var(--bg-muted)'}}>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div><label className="text-xs text-theme-muted mb-1 block">Stock Item</label>
                          <select className="input text-xs" value={item.stock_id} onChange={e=>updateItem(idx,'stock_id',e.target.value)}>
                            <option value="">Select...</option>
                             {stock.map(s=><option key={s.id} value={s.id}>{s.name}{s.size?` (${s.size})`:''} — Ksh {s.price?.toFixed(2)||'N/A'}</option>)}
                          </select>
                        </div>
                        <div><label className="text-xs text-theme-muted mb-1 block">Size</label>
                          <input className="input text-xs" value={item.size} onChange={e=>updateItem(idx,'size',e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 items-end">
                        <div><label className="text-xs text-theme-muted mb-1 block">Qty</label><input type="number" min="1" className="input text-xs" value={item.quantity} onChange={e=>updateItem(idx,'quantity',e.target.value)} /></div>
                        <div><label className="text-xs text-theme-muted mb-1 block">Price (Ksh)</label><input type="number" min="0" step="0.01" className="input text-xs" value={item.unit_price} onChange={e=>updateItem(idx,'unit_price',e.target.value)} /></div>
                        <button type="button" onClick={()=>removeItem(idx)} className="text-xs pb-1" style={{color:'#ef4444'}}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {addForm.items.length>0 && (
              <div className="px-4 py-3 rounded-lg space-y-3" style={{backgroundColor:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.1)'}}>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-theme-secondary">Running Total</span>
                  <span className="font-bold" style={{color:'#4f46e5'}}>{KSH}{runningTotal.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{borderColor:'var(--border)'}}>
                  <div>
                    <label className="text-xs font-semibold text-theme-secondary mb-1 block">Deposit Paid (Ksh)</label>
                    <input type="number" min="0" max={runningTotal} className="input text-sm" placeholder="0" value={addForm.deposit_amount} onChange={e=>setAddForm(f=>({...f,deposit_amount:e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-theme-secondary mb-1 block">Collection Date</label>
                    <input type="date" className="input text-sm" value={addForm.collection_date} onChange={e=>setAddForm(f=>({...f,collection_date:e.target.value}))} />
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-theme-secondary">Balance Due</span>
                  <span className="font-bold text-red-600">{KSH}{Math.max(0, runningTotal - (parseFloat(addForm.deposit_amount)||0)).toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Creating...':'Create Order'}</button>
              <button type="button" onClick={()=>setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
