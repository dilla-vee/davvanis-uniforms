import { useState, useEffect } from 'react';

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor:'rgba(0,0,0,0.5)'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={`card rounded-xl shadow-xl w-full ${wide?'max-w-2xl':'max-w-md'} max-h-[90vh] flex flex-col`} style={{borderRadius:'0.75rem'}}>
        <div className="flex items-center justify-between p-5 shrink-0" style={{borderBottom:'1px solid var(--border)'}}>
          <h3 className="text-base font-semibold text-theme-primary">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none text-theme-secondary p-1 rounded hover-theme">✕</button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { pending:{background:'#fef3c7',color:'#92400e'}, processing:{background:'#dbeafe',color:'#1e40af'}, completed:{background:'#d1fae5',color:'#065f46'}, cancelled:{background:'#fee2e2',color:'#991b1b'} };
  const s = map[status]||{background:'#f3f4f6',color:'#374151'};
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize" style={s}>{status}</span>;
}

function Avatar({ imageUrl, name, large }) {
  const initials = name ? name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) : '?';
  const size = large ? 'w-20 h-20 text-2xl' : 'w-12 h-12 text-base';
  if (imageUrl) return <img src={imageUrl} alt={name} className={`${size} rounded-full object-cover`} style={{border:'2px solid var(--border)'}} />;
  return <div className={`${size} rounded-full flex items-center justify-center font-bold`} style={{backgroundColor:'rgba(99,102,241,0.1)',color:'#6366f1'}}>{initials}</div>;
}

export default function ClientsManager() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [form, setForm] = useState({ name:'', school:'', contact:'', email:'', description:'' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    try { setLoading(true); const r = await fetch('/api/clients'); setClients(await r.json()); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { fetchClients(); }, []);

  const openDetail = async client => {
    setViewClient(client); setDetailLoading(true);
    try { const r = await fetch(`/api/clients/${client.id}`); setClientDetail(await r.json()); }
    catch { setClientDetail(null); } finally { setDetailLoading(false); }
  };

  const openAdd = () => { setEditClient(null); setForm({ name:'', school:'', contact:'', email:'', description:'' }); setImageFile(null); setImagePreview(null); setFormError(''); setShowForm(true); };
  const openEdit = (e, client) => { e.stopPropagation(); setEditClient(client); setForm({ name:client.name||'', school:client.school||'', contact:client.contact||'', email:client.email||'', description:client.description||'' }); setImageFile(null); setImagePreview(client.image_url||null); setFormError(''); setShowForm(true); };

  const handleImageChange = e => {
    const file = e.target.files[0]; if (!file) return; setImageFile(file);
    const reader = new FileReader(); reader.onloadend = () => setImagePreview(reader.result); reader.readAsDataURL(file);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.school.trim()) { setFormError('School is required'); return; }
    setSaving(true);
    try {
      const fd = new FormData(); Object.entries(form).forEach(([k,v])=>fd.append(k,v)); if(imageFile) fd.append('image',imageFile);
      const r = await fetch(editClient?`/api/clients/${editClient.id}`:'/api/clients', { method:editClient?'PUT':'POST', body:fd });
      if (!r.ok) { const d=await r.json(); throw new Error(d.error||'Failed'); }
      await fetchClients(); setShowForm(false);
    } catch (e) { setFormError(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this client and all their orders?')) return;
    const r = await fetch(`/api/clients/${id}`, { method:'DELETE' });
    if (r.ok) { await fetchClients(); if(viewClient?.id===id){setViewClient(null);setClientDetail(null);} }
  };

  if (error) return <div className="rounded-lg p-4" style={{background:'#fee2e2',color:'#991b1b'}}>{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">Clients</h2>
          <p className="text-sm mt-1 text-theme-secondary">{clients.length} clients</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Add Client</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i=><div key={i} className="card p-5 h-36 animate-pulse" style={{backgroundColor:'var(--bg-muted)'}} />)}
        </div>
      ) : clients.length===0 ? (
        <div className="text-center py-16 text-theme-secondary"><span className="text-5xl">👥</span><p className="mt-3">No clients yet.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client=>(
            <div key={client.id} onClick={()=>openDetail(client)} className="card p-5 cursor-pointer hover-theme transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="shrink-0"><Avatar imageUrl={client.image_url} name={client.name} /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-theme-primary truncate">{client.name}</h3>
                  <p className="text-xs font-medium truncate" style={{color:'#6366f1'}}>{client.school}</p>
                  {client.contact && <p className="text-xs text-theme-secondary mt-0.5">{client.contact}</p>}
                </div>
              </div>
              {client.description && <p className="text-xs text-theme-secondary line-clamp-2 mb-3">{client.description}</p>}
              <div className="flex gap-2 pt-2" style={{borderTop:'1px solid var(--border-light)'}} onClick={e=>e.stopPropagation()}>
                <button onClick={e=>openEdit(e,client)} className="text-xs font-medium" style={{color:'#6366f1'}}>Edit</button>
                <button onClick={e=>handleDelete(e,client.id)} className="text-xs font-medium ml-auto" style={{color:'#ef4444'}}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewClient && (
        <Modal title={viewClient.name} wide onClose={()=>{setViewClient(null);setClientDetail(null);}}>
          {detailLoading ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-10 rounded animate-pulse" style={{backgroundColor:'var(--bg-muted)'}} />)}</div>
          : clientDetail ? (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <Avatar imageUrl={clientDetail.image_url} name={clientDetail.name} large />
                <div>
                  <h2 className="text-xl font-bold text-theme-primary">{clientDetail.name}</h2>
                  <p className="font-medium" style={{color:'#6366f1'}}>{clientDetail.school}</p>
                  {clientDetail.contact && <p className="text-sm text-theme-secondary mt-1">📞 {clientDetail.contact}</p>}
                  {clientDetail.email && <p className="text-sm text-theme-secondary">✉️ {clientDetail.email}</p>}
                </div>
              </div>
              {clientDetail.description && (
                <div className="p-3 rounded-lg" style={{backgroundColor:'var(--bg-muted)'}}>
                  <p className="text-xs font-medium text-theme-secondary mb-1">Description</p>
                  <p className="text-sm text-theme-primary">{clientDetail.description}</p>
                </div>
              )}
              <p className="text-xs text-theme-muted">Client since {new Date(clientDetail.created_at).toLocaleDateString()}</p>
              <div>
                <h4 className="text-sm font-semibold text-theme-secondary mb-2">Order History</h4>
                {!clientDetail.orders?.length ? <p className="text-sm italic text-theme-muted">No orders yet.</p> : (
                  <div className="space-y-2">
                    {clientDetail.orders.map(order=>(
                      <div key={order.id} className="p-3 rounded-lg flex items-center justify-between" style={{border:'1px solid var(--border)'}}>
                        <div>
                          <span className="text-xs font-medium" style={{color:'#6366f1'}}>Order #{order.id}</span>
                          <span className="text-xs text-theme-muted mx-2">—</span>
                          <span className="text-xs text-theme-secondary">{new Date(order.order_date).toLocaleDateString()}</span>
                          <div className="mt-0.5 text-xs text-theme-secondary">{order.item_count} item{order.item_count!==1?'s':''}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm text-theme-primary">£{(order.total_price||0).toFixed(2)}</div>
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : <p className="text-theme-secondary">Failed to load client details.</p>}
        </Modal>
      )}

      {showForm && (
        <Modal title={editClient?'Edit Client':'Add Client'} onClose={()=>setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <p className="text-sm p-2 rounded" style={{background:'#fee2e2',color:'#991b1b'}}>{formError}</p>}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{backgroundColor:'rgba(99,102,241,0.1)'}}>
                {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-2xl">📷</span>}
              </div>
              <div>
                <label className="label">Client Photo</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm text-theme-secondary file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium" style={{'--file-bg':'rgba(99,102,241,0.1)'}} />
              </div>
            </div>
            <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Client / School name" /></div>
            <div><label className="label">School *</label><input className="input" value={form.school} onChange={e=>setForm(f=>({...f,school:e.target.value}))} placeholder="School name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Contact</label><input className="input" value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))} placeholder="Phone number" /></div>
              <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@school.edu" /></div>
            </div>
            <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Notes about this client..." /></div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving...':editClient?'Update Client':'Add Client'}</button>
              <button type="button" onClick={()=>setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
