import { useState, useEffect, useRef } from 'react';
import { apiFetch, resolveImageUrl } from '../utils/api';

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

function Avatar({ imageUrl, name, large }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  const size = large ? 'w-20 h-20 text-2xl' : 'w-12 h-12 text-base';
  if (imageUrl) {
    return (
      <img src={resolveImageUrl(imageUrl)} alt={name}
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

export default function EmbroideryClientsManager({ user }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected client for detail view
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // Add/Edit Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    contact: '',
    email: '',
    description: '',
    image: null
  });

  // Logo uploads queue
  const [showUploadDesign, setShowUploadDesign] = useState(false);
  const [designForm, setDesignForm] = useState({
    design_name: '',
    notes: '',
    file: null,
    preview: ''
  });
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/embroidery-clients');
      if (!res.ok) throw new Error('Failed to fetch clients');
      setClients(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClientDetails = async (id) => {
    try {
      setDetailLoading(true);
      const res = await apiFetch(`/api/embroidery-clients/${id}`);
      if (!res.ok) throw new Error('Failed to load client details');
      const data = await res.json();
      setDetailData(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenDetails = (client) => {
    setSelectedClient(client);
    fetchClientDetails(client.id);
  };

  const handleCloseDetails = () => {
    setSelectedClient(null);
    setDetailData(null);
    setShowUploadDesign(false);
    setDesignForm({ design_name: '', notes: '', file: null, preview: '' });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Name is required');

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('contact', form.contact.trim());
      fd.append('email', form.email.trim());
      fd.append('description', form.description.trim());
      if (form.image) {
        fd.append('image', form.image);
      }

      const res = await apiFetch('/api/embroidery-clients', {
        method: 'POST',
        body: fd
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save client');
      }

      setShowAddModal(false);
      setForm({ name: '', contact: '', email: '', description: '', image: null });
      await fetchClients();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = () => {
    setForm({
      name: detailData.name || '',
      contact: detailData.contact || '',
      email: detailData.email || '',
      description: detailData.description || '',
      image: null
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Name is required');

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('contact', form.contact.trim());
      fd.append('email', form.email.trim());
      fd.append('description', form.description.trim());
      if (form.image) {
        fd.append('image', form.image);
      }

      const res = await apiFetch(`/api/embroidery-clients/${detailData.id}`, {
        method: 'PUT',
        body: fd
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update client');
      }

      setShowEditModal(false);
      setForm({ name: '', contact: '', email: '', description: '', image: null });
      await fetchClientDetails(detailData.id);
      await fetchClients();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!window.confirm(`Are you sure you want to delete ${detailData.name}? This will remove all their saved logos/designs.`)) return;

    try {
      const res = await apiFetch(`/api/embroidery-clients/${detailData.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete client');

      handleCloseDetails();
      await fetchClients();
    } catch (err) {
      alert(err.message);
    }
  };

  // Design logs handling
  const handleDesignFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setDesignForm(prev => ({
        ...prev,
        file,
        preview: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUploadDesignSubmit = async (e) => {
    e.preventDefault();
    if (!designForm.file) return alert('Please choose an image file');

    setUploadingDesign(true);
    try {
      const fd = new FormData();
      fd.append('photo', designForm.file);
      fd.append('design_name', designForm.design_name.trim());
      fd.append('notes', designForm.notes.trim());

      const res = await apiFetch(`/api/embroidery-clients/${detailData.id}/designs`, {
        method: 'POST',
        body: fd
      });
      if (!res.ok) throw new Error('Failed to upload logo design image');

      setDesignForm({ design_name: '', notes: '', file: null, preview: '' });
      setShowUploadDesign(false);
      await fetchClientDetails(detailData.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingDesign(false);
    }
  };

  const handleDeleteDesign = async (designId) => {
    if (!window.confirm('Are you sure you want to delete this logo design?')) return;

    try {
      const res = await apiFetch(`/api/embroidery-clients/${detailData.id}/designs/${designId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete design');

      await fetchClientDetails(detailData.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.contact && c.contact.includes(searchQuery)) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="container-fluid py-4 space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span>🧵</span> Embroidery & Branding Clients
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage clients, upload their embroidery logos/designs, and review branding service logs.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shrink-0">
          <span>+</span> Add Embroidery Client
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            className="input w-full pl-10"
            placeholder="Search by client name, description, contact..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* Main Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-6 h-40 animate-pulse bg-gray-50 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-50 text-red-700 rounded-xl border border-red-100">
          <p className="font-semibold">Error loading embroidery clients</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <span className="text-4xl">👥</span>
          <h3 className="font-semibold text-gray-700 mt-3">No Embroidery Clients Found</h3>
          <p className="text-sm text-gray-400 mt-1">Try refining your search or add a new client to start recording history.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <div key={client.id} className="card p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between bg-white">
              <div className="flex gap-4 items-start">
                <Avatar imageUrl={client.image_url} name={client.name} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-800 truncate text-base">{client.name}</h4>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{client.contact || 'No contact info'}</p>
                  <div className="mt-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full inline-block">
                    Total Spent: {KSH}{client.total_spent ? Number(client.total_spent).toFixed(2) : '0.00'}
                  </div>
                  {client.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 italic">
                      "{client.description}"
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => handleOpenDetails(client)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-theme-primary bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  View Profile & History →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Profile Modal */}
      {selectedClient && (
        <Modal
          title={`Client Profile: ${selectedClient.name}`}
          onClose={handleCloseDetails}
          extraWide>
          {detailLoading || !detailData ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="animate-spin text-2xl">⏳</div>
              <p className="text-sm text-gray-500">Loading client history and designs...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile card summary */}
              <div className="lg:col-span-1 bg-gray-50 p-5 rounded-xl border border-gray-100 flex flex-col items-center text-center space-y-4">
                <Avatar imageUrl={detailData.image_url} name={detailData.name} large />
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{detailData.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{detailData.contact || 'No Phone/Contact'}</p>
                  {detailData.email && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">{detailData.email}</p>
                  )}
                </div>

                <div className="w-full bg-white p-3 rounded-lg border border-gray-100 text-center shadow-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Branding / Spent</p>
                  <p className="text-lg font-extrabold text-green-600 mt-1">
                    {KSH}{(detailData.logs || []).reduce((sum, l) => sum + (parseFloat(l.price_charged) || 0), 0).toFixed(2)}
                  </p>
                </div>

                {detailData.description && (
                  <div className="w-full text-left bg-white p-3 rounded-lg border border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes / Description</p>
                    <p className="text-xs text-gray-600 mt-1">{detailData.description}</p>
                  </div>
                )}

                <div className="flex gap-2 w-full pt-4">
                  <button
                    onClick={handleEditOpen}
                    className="btn-secondary text-xs flex-1 py-2">
                    Edit Profile
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={handleDeleteClient}
                      className="bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold rounded-lg px-3 py-2 flex-1 transition-colors">
                      Delete Client
                    </button>
                  )}
                </div>
              </div>

              {/* Design logo designs & history logs */}
              <div className="lg:col-span-2 space-y-6">
                {/* Branding Designs Gallery */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <span>🎨</span> Branding Logos & Designs ({detailData.designs?.length || 0})
                    </h4>
                    <button
                      onClick={() => setShowUploadDesign(prev => !prev)}
                      className="text-xs font-semibold text-theme-primary bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                      {showUploadDesign ? 'Cancel' : '+ Add Logo'}
                    </button>
                  </div>

                  {showUploadDesign && (
                    <form onSubmit={handleUploadDesignSubmit} className="p-4 bg-gray-50 rounded-lg border border-gray-150 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="label text-xs">Design / Logo Name *</label>
                          <input
                            type="text"
                            required
                            className="input w-full text-xs"
                            placeholder="e.g. School Crest Badge"
                            value={designForm.design_name}
                            onChange={e => setDesignForm(p => ({ ...p, design_name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label text-xs">Notes / Details</label>
                          <input
                            type="text"
                            className="input w-full text-xs"
                            placeholder="e.g. Yellow threads, front breast pocket"
                            value={designForm.notes}
                            onChange={e => setDesignForm(p => ({ ...p, notes: e.target.value }))} />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-4 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                          <span className="text-2xl">📸</span>
                          <span className="text-xs text-gray-500 font-medium mt-1">
                            {designForm.file ? designForm.file.name : 'Select branding image'}
                          </span>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleDesignFileChange} />

                        {designForm.preview && (
                          <img
                            src={designForm.preview}
                            alt="Preview"
                            className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                        )}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={uploadingDesign}
                          className="btn-primary text-xs py-1.5 px-4">
                          {uploadingDesign ? 'Uploading...' : 'Save Design'}
                        </button>
                      </div>
                    </form>
                  )}

                  {detailData.designs?.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-400">No branding logos uploaded for this client yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {detailData.designs.map(design => (
                        <div key={design.id} className="relative group border border-gray-150 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                          <img
                            src={resolveImageUrl(design.image_url)}
                            alt={design.design_name || 'Logo design'}
                            className="w-full object-cover cursor-pointer"
                            style={{ height: '90px' }}
                            onClick={() => setLightbox(design)} />
                          <div className="p-2 border-t border-gray-100 flex-1 flex flex-col justify-between">
                            <h5 className="text-xs font-bold text-gray-800 truncate">{design.design_name || 'Branding Design'}</h5>
                            {design.notes && (
                              <p className="text-[10px] text-gray-500 line-clamp-1 italic mt-0.5">{design.notes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteDesign(design.id)}
                            className="absolute top-1 right-1 rounded-full text-white text-[10px] w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 bg-opacity-90">
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* History Logs */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span>📋</span> Services & Sales History ({detailData.logs?.length || 0})
                  </h4>

                  {detailData.logs?.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-400">No services or sales recorded under this client.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Details / Items</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                            <th className="py-2.5 px-3">Paid By</th>
                            <th className="py-2.5 px-3">Served By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {detailData.logs.map(log => {
                            const dateStr = new Date(log.logged_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                            const isSale = log.log_type === 'item_sale';
                            return (
                              <tr key={log.id} className="hover:bg-gray-50">
                                <td className="py-2 px-3 text-gray-500 font-mono whitespace-nowrap">{dateStr}</td>
                                <td className="py-2 px-3 whitespace-nowrap">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isSale ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {isSale ? 'Yarn Sale' : 'Branding'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 font-medium">
                                  {isSale ? log.item_name : log.service_description}
                                </td>
                                <td className="py-2 px-3 text-right font-mono">
                                  {isSale ? log.quantity : log.customer_item_count}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold font-mono">
                                  {KSH}{parseFloat(log.price_charged).toLocaleString()}
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    log.payment_method?.toLowerCase() === 'paybill' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {log.payment_method || 'Cash'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-gray-500 truncate max-w-[120px]">{log.recorded_by}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Lightbox for designs */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-80"
          onClick={() => setLightbox(null)}>
          <div className="relative max-w-2xl w-full text-center" onClick={e => e.stopPropagation()}>
            <img src={resolveImageUrl(lightbox.image_url)} alt={lightbox.design_name || 'Design'}
              className="max-h-[75vh] max-w-full rounded-xl object-contain mx-auto border border-gray-800" />
            <h4 className="text-white font-semibold mt-3 text-base">{lightbox.design_name || 'Branding Design'}</h4>
            {lightbox.notes && (
              <p className="text-gray-400 text-xs mt-1 italic">"{lightbox.notes}"</p>
            )}
            <button onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full text-white font-bold bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center">
              X
            </button>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <Modal title="Add New Embroidery Client" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="label text-sm font-semibold">Client / School Name *</label>
              <input
                type="text"
                required
                className="input w-full mt-1"
                placeholder="e.g. Uhuru Primary School"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>

            <div>
              <label className="label text-sm font-semibold">Contact / Phone Number</label>
              <input
                type="text"
                className="input w-full mt-1"
                placeholder="e.g. 0712345678"
                value={form.contact}
                onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} />
            </div>

            <div>
              <label className="label text-sm font-semibold">Email Address</label>
              <input
                type="email"
                className="input w-full mt-1"
                placeholder="e.g. info@school.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>

            <div>
              <label className="label text-sm font-semibold">Description / Notes</label>
              <textarea
                rows="3"
                className="input w-full mt-1"
                placeholder="e.g. Custom branding jobs, specific logo requirements"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div>
              <label className="label text-sm font-semibold">Client Photo / Logo Avatar</label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="btn-secondary text-xs px-3 py-1.5">
                  Choose Image
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setForm(p => ({ ...p, image: e.target.files[0] }))} />
                {form.image && (
                  <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
                    {form.image.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-150">
              <button
                type="button"
                className="btn-secondary px-4 py-2"
                onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary px-4 py-2 font-semibold">
                {submitting ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Client Modal */}
      {showEditModal && (
        <Modal title="Edit Embroidery Client" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="label text-sm font-semibold">Client Name *</label>
              <input
                type="text"
                required
                className="input w-full mt-1"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>

            <div>
              <label className="label text-sm font-semibold">Contact / Phone Number</label>
              <input
                type="text"
                className="input w-full mt-1"
                value={form.contact}
                onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} />
            </div>

            <div>
              <label className="label text-sm font-semibold">Email Address</label>
              <input
                type="email"
                className="input w-full mt-1"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>

            <div>
              <label className="label text-sm font-semibold">Description / Notes</label>
              <textarea
                rows="3"
                className="input w-full mt-1"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div>
              <label className="label text-sm font-semibold">Update Photo / Logo Avatar</label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="btn-secondary text-xs px-3 py-1.5">
                  Choose Image
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setForm(p => ({ ...p, image: e.target.files[0] }))} />
                {form.image && (
                  <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
                    {form.image.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-150">
              <button
                type="button"
                className="btn-secondary px-4 py-2"
                onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary px-4 py-2 font-semibold">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
