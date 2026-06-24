import { useState, useEffect, useRef } from 'react';

const KSH = 'Ksh ';

function Modal({ title, onClose, children, wide, extraWide }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const maxW = extraWide ? 'max-w-4xl' : wide ? 'max-w-2xl' : 'max-w-md';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`card rounded-xl shadow-xl w-full ${maxW} max-h-[92vh] flex flex-col`}
        style={{ borderRadius: '0.75rem' }}>
        <div className="flex items-center justify-between p-5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-base font-semibold text-theme-primary">{title}</h3>
          <button onClick={onClose}
            className="text-xl leading-none text-theme-secondary p-1 rounded hover-theme">
            X
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:    { background: '#fef3c7', color: '#92400e' },
    processing: { background: '#dbeafe', color: '#1e40af' },
    completed:  { background: '#d1fae5', color: '#065f46' },
    cancelled:  { background: '#fee2e2', color: '#991b1b' },
  };
  const s = map[status] || { background: '#f3f4f6', color: '#374151' };
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize" style={s}>
      {status}
    </span>
  );
}

function Avatar({ imageUrl, name, large }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  const size = large ? 'w-20 h-20 text-2xl' : 'w-12 h-12 text-base';
  if (imageUrl) {
    return (
      <img src={imageUrl} alt={name}
        className={`${size} rounded-full object-cover`}
        style={{ border: '2px solid var(--border)' }} />
    );
  }
  return (
    <div className={`${size} rounded-full flex items-center justify-center font-bold`}
      style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
      {initials}
    </div>
  );
}

// ── Uniform Photos Section ─────────────────────────────────────────────────
function UniformPhotos({ clientId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  // queue: array of { file, preview, caption }
  const [queue, setQueue] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef(null);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const r = await fetch(`/api/clients/${clientId}/photos`);
      setPhotos(await r.json());
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchPhotos(); }, [clientId]);

  // When user picks files, add them all to the queue
  const handleFilesChange = e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setQueue(q => [...q, { file, preview: reader.result, caption: '' }]);
      };
      reader.readAsDataURL(file);
    });
    // reset input so same files can be re-selected
    e.target.value = '';
  };

  const updateCaption = (idx, value) => {
    setQueue(q => q.map((item, i) => i === idx ? { ...item, caption: value } : item));
  };

  const removeFromQueue = idx => {
    setQueue(q => q.filter((_, i) => i !== idx));
  };

  const handleUploadAll = async () => {
    if (!queue.length) return;
    setUploading(true);
    try {
      // Upload all photos in parallel
      await Promise.all(queue.map(item => {
        const fd = new FormData();
        fd.append('photo', item.file);
        fd.append('caption', item.caption);
        return fetch(`/api/clients/${clientId}/photos`, { method: 'POST', body: fd });
      }));
      await fetchPhotos();
      setQueue([]);
      setShowUpload(false);
    } catch (e) { alert('Some uploads failed: ' + e.message); }
    finally { setUploading(false); }
  };

  const handleDelete = async photoId => {
    if (!window.confirm('Delete this photo?')) return;
    await fetch(`/api/clients/${clientId}/photos/${photoId}`, { method: 'DELETE' });
    setPhotos(p => p.filter(x => x.id !== photoId));
  };

  const cancelUpload = () => {
    setShowUpload(false);
    setQueue([]);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-theme-secondary">
          Uniform Photos
          {photos.length > 0 && (
            <span className="ml-2 text-xs font-normal text-theme-muted">
              ({photos.length} photo{photos.length !== 1 ? 's' : ''})
            </span>
          )}
        </h4>
        <button
          onClick={() => showUpload ? cancelUpload() : setShowUpload(true)}
          className="text-xs font-medium px-3 py-1 rounded-lg"
          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
          {showUpload ? 'Cancel' : '+ Add Photos'}
        </button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="mb-4 p-4 rounded-lg space-y-3"
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-muted)' }}>

          {/* Drop zone / pick button */}
          <div
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-lg flex flex-col items-center justify-center py-5 text-center transition-colors hover-theme"
            style={{ border: '2px dashed var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <span style={{ fontSize: '28px' }}>📁</span>
            <p className="text-sm font-medium text-theme-primary mt-1">Click to choose photos</p>
            <p className="text-xs text-theme-muted mt-0.5">Select one or multiple images at once</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesChange} />

          {/* Queue list */}
          {queue.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-theme-secondary">
                {queue.length} photo{queue.length !== 1 ? 's' : ''} selected — add captions then upload
              </p>
              {queue.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center p-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <img src={item.preview} alt=""
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                    style={{ border: '1px solid var(--border)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-theme-muted truncate mb-1">{item.file.name}</p>
                    <input
                      className="input text-xs py-1"
                      placeholder="Caption (e.g. Girls skirt — Age 9-10)"
                      value={item.caption}
                      onChange={e => updateCaption(idx, e.target.value)} />
                  </div>
                  <button onClick={() => removeFromQueue(idx)}
                    className="shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                    style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
                    x
                  </button>
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <button onClick={handleUploadAll} disabled={uploading} className="btn-primary flex-1">
                  {uploading
                    ? 'Uploading...'
                    : `Upload ${queue.length} Photo${queue.length !== 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn-secondary text-xs px-3">
                  + More
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Photo grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-lg animate-pulse"
              style={{ height: '90px', backgroundColor: 'var(--bg-muted)' }} />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-6 rounded-lg"
          style={{ border: '1px dashed var(--border)', backgroundColor: 'var(--bg-muted)' }}>
          <p style={{ fontSize: '28px' }}>👗</p>
          <p className="text-xs text-theme-muted mt-1">No uniform photos yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border)' }}>
              <img
                src={photo.image_url}
                alt={photo.caption || 'Uniform photo'}
                className="w-full object-cover cursor-pointer"
                style={{ height: '90px' }}
                onClick={() => setLightbox(photo)} />
              {photo.caption && (
                <div className="px-1.5 py-1"
                  style={{ backgroundColor: 'var(--bg-muted)', borderTop: '1px solid var(--border)' }}>
                  <p className="text-xs text-theme-secondary truncate">{photo.caption}</p>
                </div>
              )}
              <button
                onClick={() => handleDelete(photo.id)}
                className="absolute top-1 right-1 rounded-full text-white text-xs w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: 'rgba(239,68,68,0.85)' }}>
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightbox(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.image_url} alt={lightbox.caption || 'Uniform'}
              className="w-full rounded-xl object-contain"
              style={{ maxHeight: '75vh' }} />
            {lightbox.caption && (
              <p className="text-center text-white mt-3 text-sm">{lightbox.caption}</p>
            )}
            {/* Navigation arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); const i = photos.findIndex(p => p.id === lightbox.id); setLightbox(photos[(i - 1 + photos.length) % photos.length]); }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-10 w-8 h-8 rounded-full text-white font-bold flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  &lt;
                </button>
                <button
                  onClick={e => { e.stopPropagation(); const i = photos.findIndex(p => p.id === lightbox.id); setLightbox(photos[(i + 1) % photos.length]); }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-10 w-8 h-8 rounded-full text-white font-bold flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  &gt;
                </button>
              </>
            )}
            <button onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full text-white font-bold flex items-center justify-center"
              style={{ backgroundColor: '#ef4444' }}>
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
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
      const r = await fetch('/api/clients');
      setClients(await r.json());
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { fetchClients(); }, []);

  const openDetail = async client => {
    setViewClient(client);
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/clients/${client.id}`);
      setClientDetail(await r.json());
    } catch { setClientDetail(null); } finally { setDetailLoading(false); }
  };

  const openAdd = () => {
    setEditClient(null);
    setForm({ name: '', school: '', contact: '', email: '', description: '' });
    setImageFile(null); setImagePreview(null); setFormError(''); setShowForm(true);
  };

  const openEdit = (e, client) => {
    e.stopPropagation();
    setEditClient(client);
    setForm({ name: client.name || '', school: client.school || '', contact: client.contact || '', email: client.email || '', description: client.description || '' });
    setImageFile(null); setImagePreview(client.image_url || null); setFormError(''); setShowForm(true);
  };

  const handleImageChange = e => {
    const f = e.target.files[0]; if (!f) return; setImageFile(f);
    const reader = new FileReader(); reader.onloadend = () => setImagePreview(reader.result); reader.readAsDataURL(f);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.school.trim()) { setFormError('School is required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);
      const r = await fetch(
        editClient ? `/api/clients/${editClient.id}` : '/api/clients',
        { method: editClient ? 'PUT' : 'POST', body: fd }
      );
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed'); }
      await fetchClients(); setShowForm(false);
    } catch (e) { setFormError(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this client and all their orders?')) return;
    const r = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (r.ok) {
      await fetchClients();
      if (viewClient?.id === id) { setViewClient(null); setClientDetail(null); }
    }
  };

  if (error) return (
    <div className="rounded-lg p-4" style={{ background: '#fee2e2', color: '#991b1b' }}>{error}</div>
  );

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
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card p-5 h-36 animate-pulse" style={{ backgroundColor: 'var(--bg-muted)' }} />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-theme-secondary">
          <span className="text-5xl">👥</span><p className="mt-3">No clients yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => (
            <div key={client.id} onClick={() => openDetail(client)}
              className="card p-5 cursor-pointer hover-theme transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="shrink-0"><Avatar imageUrl={client.image_url} name={client.name} /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-theme-primary truncate">{client.name}</h3>
                  <p className="text-xs font-medium truncate" style={{ color: '#6366f1' }}>{client.school}</p>
                  {client.contact && <p className="text-xs text-theme-secondary mt-0.5">{client.contact}</p>}
                </div>
              </div>
              {client.description && (
                <p className="text-xs text-theme-secondary line-clamp-2 mb-3">{client.description}</p>
              )}
              <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border-light)' }}
                onClick={e => e.stopPropagation()}>
                <button onClick={e => openEdit(e, client)} className="text-xs font-medium" style={{ color: '#6366f1' }}>Edit</button>
                <button onClick={e => handleDelete(e, client.id)} className="text-xs font-medium ml-auto" style={{ color: '#ef4444' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Client Detail Modal ── */}
      {viewClient && (
        <Modal title={viewClient.name} extraWide onClose={() => { setViewClient(null); setClientDetail(null); }}>
          {detailLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-muted)' }} />)}
            </div>
          ) : clientDetail ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <Avatar imageUrl={clientDetail.image_url} name={clientDetail.name} large />
                <div>
                  <h2 className="text-xl font-bold text-theme-primary">{clientDetail.name}</h2>
                  <p className="font-medium" style={{ color: '#6366f1' }}>{clientDetail.school}</p>
                  {clientDetail.contact && <p className="text-sm text-theme-secondary mt-1">📞 {clientDetail.contact}</p>}
                  {clientDetail.email && <p className="text-sm text-theme-secondary">✉️ {clientDetail.email}</p>}
                </div>
              </div>

              {clientDetail.description && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)' }}>
                  <p className="text-xs font-medium text-theme-secondary mb-1">Description</p>
                  <p className="text-sm text-theme-primary">{clientDetail.description}</p>
                </div>
              )}

              <p className="text-xs text-theme-muted">
                Client since {new Date(clientDetail.created_at).toLocaleDateString()}
              </p>

              {/* Two-column layout on larger screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Uniform Photos */}
                <div className="card p-4" style={{ borderRadius: '0.75rem' }}>
                  <UniformPhotos clientId={clientDetail.id} />
                </div>

                {/* Order History */}
                <div>
                  <h4 className="text-sm font-semibold text-theme-secondary mb-2">Order History</h4>
                  {!clientDetail.orders?.length ? (
                    <p className="text-sm italic text-theme-muted">No orders yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {clientDetail.orders.map(order => (
                        <div key={order.id} className="p-3 rounded-lg flex items-center justify-between"
                          style={{ border: '1px solid var(--border)' }}>
                          <div>
                            <span className="text-xs font-medium" style={{ color: '#6366f1' }}>Order #{order.id}</span>
                            <span className="text-xs text-theme-muted mx-2">—</span>
                            <span className="text-xs text-theme-secondary">
                              {new Date(order.order_date).toLocaleDateString()}
                            </span>
                            <div className="mt-0.5 text-xs text-theme-secondary">
                              {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm text-theme-primary">
                              {KSH}{Number(order.total_price || 0).toFixed(2)}
                            </div>
                            <StatusBadge status={order.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : <p className="text-theme-secondary">Failed to load client details.</p>}
        </Modal>
      )}

      {/* ── Add / Edit Client Modal ── */}
      {showForm && (
        <Modal title={editClient ? 'Edit Client' : 'Add Client'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <p className="text-sm p-2 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>{formError}</p>
            )}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}>
                {imagePreview
                  ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  : <span className="text-2xl">📷</span>}
              </div>
              <div>
                <label className="label">Client Photo</label>
                <input type="file" accept="image/*" onChange={handleImageChange}
                  className="text-sm text-theme-secondary file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium" />
              </div>
            </div>
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Client / School name" />
            </div>
            <div>
              <label className="label">School *</label>
              <input className="input" value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))} placeholder="School name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Contact</label>
                <input className="input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Phone number" />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@school.edu" />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={3} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Notes about this client..." />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : editClient ? 'Update Client' : 'Add Client'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
