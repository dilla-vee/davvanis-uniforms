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
      <div className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] flex flex-col`}>
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

function Avatar({ imageUrl, name, large }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  const size = large ? 'w-20 h-20 text-2xl' : 'w-12 h-12 text-base';
  if (imageUrl) {
    return <img src={imageUrl} alt={name} className={`${size} rounded-full object-cover border-2 border-gray-100 dark:border-gray-700`} />;
  }
  return (
    <div className={`${size} rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-300`}>
      {initials}
    </div>
  );
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
  const [form, setForm] = useState({ name: '', school: '', contact: '', email: '', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Failed to fetch clients');
      setClients(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  const openDetail = async (client) => {
    setViewClient(client); setDetailLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`);
      if (!res.ok) throw new Error();
      setClientDetail(await res.json());
    } catch { setClientDetail(null); } finally { setDetailLoading(false); }
  };

  const openAdd = () => {
    setEditClient(null);
    setForm({ name: '', school: '', contact: '', email: '', description: '' });
    setImageFile(null); setImagePreview(null); setFormError(''); setShowForm(true);
  };

  const openEdit = (e, client) => {
    e.stopPropagation(); setEditClient(client);
    setForm({ name: client.name || '', school: client.school || '', contact: client.contact || '', email: client.email || '', description: client.description || '' });
    setImageFile(null); setImagePreview(client.image_url || null); setFormError(''); setShowForm(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.school.trim()) { setFormError('School is required'); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (imageFile) formData.append('image', imageFile);
      const url = editClient ? `/api/clients/${editClient.id}` : '/api/clients';
      const res = await fetch(url, { method: editClient ? 'PUT' : 'POST', body: formData });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save'); }
      await fetchClients(); setShowForm(false);
    } catch (err) { setFormError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this client and all their orders?')) return;
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchClients();
      if (viewClient?.id === id) { setViewClient(null); setClientDetail(null); }
    }
  };

  if (error) return <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clients</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{clients.length} clients</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Add Client</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="card p-5 h-36 animate-pulse bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <span className="text-5xl">👥</span>
          <p className="mt-3">No clients yet. Add your first client!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div key={client.id} onClick={() => openDetail(client)}
              className="card p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="shrink-0"><Avatar imageUrl={client.image_url} name={client.name} /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{client.name}</h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">{client.school}</p>
                  {client.contact && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{client.contact}</p>}
                </div>
              </div>
              {client.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{client.description}</p>}
              <div className="flex gap-2 pt-2 border-t border-gray-50 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <button onClick={(e) => openEdit(e, client)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 text-xs font-medium">Edit</button>
                <button onClick={(e) => handleDelete(e, client.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-xs font-medium ml-auto">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client Detail Modal */}
      {viewClient && (
        <Modal title={viewClient.name} wide onClose={() => { setViewClient(null); setClientDetail(null); }}>
          {detailLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />)}</div>
          ) : clientDetail ? (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <Avatar imageUrl={clientDetail.image_url} name={clientDetail.name} large />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{clientDetail.name}</h2>
                  <p className="text-indigo-600 dark:text-indigo-400 font-medium">{clientDetail.school}</p>
                  {clientDetail.contact && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">📞 {clientDetail.contact}</p>}
                  {clientDetail.email && <p className="text-sm text-gray-500 dark:text-gray-400">✉️ {clientDetail.email}</p>}
                </div>
              </div>
              {clientDetail.description && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{clientDetail.description}</p>
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">Client since {new Date(clientDetail.created_at).toLocaleDateString()}</p>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Order History</h4>
                {clientDetail.orders?.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No orders yet.</p>
                ) : (
                  <div className="space-y-2">
                    {clientDetail.orders?.map(order => (
                      <div key={order.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Order #{order.id}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 mx-2">—</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.order_date).toLocaleDateString()}</span>
                          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">£{(order.total_price || 0).toFixed(2)}</div>
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : <p className="text-gray-500 dark:text-gray-400">Failed to load client details.</p>}
        </Modal>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <Modal title={editClient ? 'Edit Client' : 'Add Client'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">{formError}</p>}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center shrink-0">
                {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-2xl">📷</span>}
              </div>
              <div>
                <label className="label">Client Photo</label>
                <input type="file" accept="image/*" onChange={handleImageChange}
                  className="text-sm text-gray-500 dark:text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-indigo-50 dark:file:bg-indigo-950 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900" />
              </div>
            </div>
            <div>
              <label className="label">Name <span className="text-red-500">*</span></label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Client / School name" />
            </div>
            <div>
              <label className="label">School <span className="text-red-500">*</span></label>
              <input className="input" value={form.school} onChange={e => setForm(f => ({...f, school: e.target.value}))} placeholder="School name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Contact</label>
                <input className="input" value={form.contact} onChange={e => setForm(f => ({...f, contact: e.target.value}))} placeholder="Phone number" />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@school.edu" />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Notes about this client..." />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editClient ? 'Update Client' : 'Add Client'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
