import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`card rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`} style={{ borderRadius: '0.75rem' }}>
        <div className="flex items-center justify-between p-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
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
    pending: { background: '#fef3c7', color: '#92400e' }, // Amber
    received: { background: '#d1fae5', color: '#065f46' }, // Green
    mismatch: { background: '#fee2e2', color: '#991b1b' }, // Red
  };
  const s = map[status] || { background: '#f3f4f6', color: '#374151' };
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize" style={s}>{status}</span>;
}

const KSH = 'Ksh ';

export default function TransitManager({ user }) {
  const [transfers, setTransfers] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewTransfer, setViewTransfer] = useState(null);

  // Tabs State
  const [activeTab, setActiveTab] = useState('all');

  // New Dispatch Form State
  const [dispatchItems, setDispatchItems] = useState([]);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [orderName, setOrderName] = useState('');
  const [transferType, setTransferType] = useState('workshop_to_shop');
  const [savingDispatch, setSavingDispatch] = useState(false);
  const [dispatchError, setDispatchError] = useState('');

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // Check-In Form State
  const [checkInItems, setCheckInItems] = useState([]);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [checkInError, setCheckInError] = useState('');

  // Admin: Correct Transfer Type State
  const [correctingTransfer, setCorrectingTransfer] = useState(null); // transfer object
  const [correctType, setCorrectType] = useState('');
  const [savingCorrect, setSavingCorrect] = useState(false);
  const [correctError, setCorrectError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, sRes] = await Promise.all([
        apiFetch('/api/stock/transfers'),
        apiFetch('/api/stock')
      ]);
      if (!tRes.ok || !sRes.ok) throw new Error('Failed to load data');
      setTransfers(await tRes.json());
      setStock(await sRes.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openCorrectType = (t) => {
    setCorrectingTransfer(t);
    setCorrectType(t.transfer_type || 'workshop_to_shop');
    setCorrectError('');
  };

  const handleCorrectType = async () => {
    if (!correctingTransfer || !correctType) return;
    setSavingCorrect(true);
    setCorrectError('');
    try {
      const res = await apiFetch(`/api/stock/transfers/${correctingTransfer.id}/type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfer_type: correctType })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to correct type');
      await fetchData();
      setCorrectingTransfer(null);
    } catch (err) {
      setCorrectError(err.message);
    } finally {
      setSavingCorrect(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setDispatchError('');
    setDispatchNotes('');
    setCarrierName('');
    setOrderName('');
    setDispatchItems([]);
    if (user?.role === 'embroidery') {
      // Embroidery role only has one option — pre-select it
      setTransferType('embroidery_to_shop');
    } else {
      // Workshop role: force explicit selection — no default so wrong type can't sneak in
      setTransferType('');
    }
    setShowAddModal(true);
  };

  const addDispatchItem = () => {
    setDispatchItems(items => [...items, { stock_id: '', qty_dispatched: '1', filterText: '' }]);
  };

  const removeDispatchItem = idx => {
    setDispatchItems(items => items.filter((_, i) => i !== idx));
  };

  const updateDispatchItem = (idx, field, val) => {
    setDispatchItems(items => {
      const next = [...items];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleDispatchSubmit = async e => {
    e.preventDefault();
    setDispatchError('');
    if (dispatchItems.length === 0) {
      setDispatchError('Please add at least one item to dispatch');
      return;
    }

    // Validate
    for (const item of dispatchItems) {
      if (!item.stock_id) {
        setDispatchError('Select a stock item for each row');
        return;
      }
      const qty = parseInt(item.qty_dispatched);
      if (isNaN(qty) || qty <= 0) {
        setDispatchError('Dispatch quantity must be greater than 0');
        return;
      }
      const s = stock.find(st => String(st.id) === String(item.stock_id));
      if (s) {
        const available = transferType === 'embroidery_to_shop' ? (s.embroidery_quantity || 0) : (s.workshop_quantity || 0);
        const sourceName = transferType === 'embroidery_to_shop' ? 'embroidery' : 'workshop';
        if (qty > available) {
          setDispatchError(`Insufficient ${sourceName} stock for "${s.name} (${s.size || 'No Size'})". Available: ${available}`);
          return;
        }
      }
    }

    setSavingDispatch(true);
    try {
      const res = await apiFetch('/api/stock/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: dispatchItems.map(i => ({
            stock_id: parseInt(i.stock_id),
            qty_dispatched: parseInt(i.qty_dispatched)
          })),
          notes: dispatchNotes,
          carrier_name: carrierName.trim() || null,
          order_name: orderName.trim() || null,
          transfer_type: transferType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch');
      await fetchData();
      setShowAddModal(false);
    } catch (err) {
      setDispatchError(err.message);
    } finally {
      setSavingDispatch(false);
    }
  };

  const openCheckIn = transfer => {
    setViewTransfer(transfer);
    setCheckInError('');
    setCheckInNotes('');
    // Prefill received quantities with dispatched quantities for user convenience
    setCheckInItems(transfer.items.map(item => ({
      stock_id: item.stock_id,
      stock_name: item.stock_name,
      stock_size: item.stock_size,
      qty_dispatched: item.qty_dispatched,
      qty_received: String(item.qty_dispatched)
    })));
  };

  const updateCheckInItem = (idx, val) => {
    setCheckInItems(items => {
      const next = [...items];
      next[idx] = { ...next[idx], qty_received: val };
      return next;
    });
  };

  const handleCheckInSubmit = async e => {
    e.preventDefault();
    setCheckInError('');

    // Validate
    for (const item of checkInItems) {
      const qty = parseInt(item.qty_received);
      if (isNaN(qty) || qty < 0) {
        setCheckInError('Received quantity must be 0 or greater');
        return;
      }
    }

    setSavingCheckIn(true);
    try {
      const res = await apiFetch(`/api/stock/transfers/${viewTransfer.id}/checkin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: checkInItems.map(i => ({
            stock_id: i.stock_id,
            qty_received: parseInt(i.qty_received)
          })),
          notes: checkInNotes || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check in');
      await fetchData();
      setViewTransfer(null);
    } catch (err) {
      setCheckInError(err.message);
    } finally {
      setSavingCheckIn(false);
    }
  };

  const canCheckIn = (t) => {
    if (t.status !== 'pending') return false;
    if (user?.role === 'admin') return true;
    const type = t.transfer_type || 'workshop_to_shop';
    if (type === 'workshop_to_embroidery') {
      return user?.role === 'embroidery';
    } else {
      // workshop_to_shop or embroidery_to_shop
      return user?.role === 'attendant';
    }
  };

  const getTransferTypeLabel = (type) => {
    switch (type) {
      case 'workshop_to_shop': return 'Workshop ➔ Shop';
      case 'workshop_to_embroidery': return 'Workshop ➔ Embroidery';
      case 'embroidery_to_shop': return 'Embroidery ➔ Shop';
      default: return 'Workshop ➔ Shop';
    }
  };

  const manufacturedStockList = stock.filter(s => s.source_type === 'manufactured');

  const filteredTransfers = transfers.filter(t => {
    const type = t.transfer_type || 'workshop_to_shop';

    // Role-based visibility: each role only sees transfers relevant to them
    if (user?.role === 'embroidery') {
      // Embroidery sees: incoming from workshop + their own outgoing to shop
      if (type !== 'workshop_to_embroidery' && type !== 'embroidery_to_shop') return false;
    } else if (user?.role === 'workshop') {
      // Workshop sees only transfers they dispatched
      if (type !== 'workshop_to_shop' && type !== 'workshop_to_embroidery') return false;
    } else if (user?.role === 'attendant') {
      // Shop attendant sees only what is coming to the shop
      if (type !== 'workshop_to_shop' && type !== 'embroidery_to_shop') return false;
    }
    // Admin sees everything

    // Tab filtering
    if (activeTab !== 'all' && type !== activeTab) return false;

    // Search query filtering
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchesId = String(t.id).includes(q);
    const matchesNotes = t.notes?.toLowerCase().includes(q);
    const matchesOrder = t.order_name?.toLowerCase().includes(q);
    const matchesCarrier = t.carrier_name?.toLowerCase().includes(q);
    const matchesDispBy = t.dispatched_by?.toLowerCase().includes(q);
    const matchesItems = t.items.some(i => i.stock_name?.toLowerCase().includes(q));
    return matchesId || matchesNotes || matchesOrder || matchesCarrier || matchesDispBy || matchesItems;
  });

  // Compute role-specific tabs
  const allTabDefs = [
    { id: 'all', label: 'All Transits' },
    { id: 'workshop_to_shop', label: 'Workshop ➔ Shop' },
    { id: 'workshop_to_embroidery', label: 'Workshop ➔ Embroidery' },
    { id: 'embroidery_to_shop', label: 'Embroidery ➔ Shop' },
  ];
  const visibleTabs = allTabDefs.filter(tab => {
    if (user?.role === 'admin') return true; // admin sees all tabs
    if (user?.role === 'embroidery') return ['all', 'workshop_to_embroidery', 'embroidery_to_shop'].includes(tab.id);
    if (user?.role === 'workshop') return ['all', 'workshop_to_shop', 'workshop_to_embroidery'].includes(tab.id);
    if (user?.role === 'attendant') return ['all', 'workshop_to_shop', 'embroidery_to_shop'].includes(tab.id);
    return true;
  });

  if (error) return <div className="rounded-lg p-4" style={{ background: '#fee2e2', color: '#991b1b' }}>{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">Stock Transit Manager</h2>
          <p className="text-sm mt-1 text-theme-secondary">{filteredTransfers.length} dispatch{filteredTransfers.length !== 1 ? 'es' : ''} visible to your role</p>
        </div>
        {user?.role !== 'attendant' && (
          <button onClick={openAdd} className="btn-primary">🚚 + New Dispatch</button>
        )}
      </div>

      {/* Tabs — filtered by role */}
      <div className="flex border-b border-theme-border text-sm font-semibold gap-4 shrink-0 overflow-x-auto pb-1">
        {visibleTabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="pb-2 border-b-2 px-1 transition-all whitespace-nowrap"
              style={{
                borderColor: active ? '#4f46e5' : 'transparent',
                color: active ? '#4f46e5' : 'var(--text-secondary)'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-muted">🔍</span>
        <input
          type="text"
          className="input pl-9 text-sm w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
          placeholder="Search by Dispatch #, Order Reference, Dispatcher, Carrier/Driver, or Garment Name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-muted)' }} />)}</div>
        ) : filteredTransfers.length === 0 ? (
          <div className="text-center py-16 text-theme-secondary">
            <span className="text-5xl">🚚</span>
            <p className="mt-3">{transfers.length === 0 ? 'No dispatches recorded yet.' : 'No transfers match your search.'}</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    {['Dispatch #', 'Type', 'Order Ref', 'Date', 'Items', 'Dispatched By', 'Carrier / Handled By', 'Received By', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide text-theme-secondary font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map(t => (
                    <tr key={t.id} className="hover-theme cursor-pointer" style={{ borderBottom: '1px solid var(--border-light)' }} onClick={() => openCheckIn(t)}>
                      <td className="py-3 px-4 font-semibold text-indigo-500">#{t.id}</td>
                      <td className="py-3 px-4 text-theme-secondary font-medium">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.transfer_type === 'workshop_to_embroidery'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400'
                            : t.transfer_type === 'embroidery_to_shop'
                              ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/20 dark:text-pink-400'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                        }`}>
                          {getTransferTypeLabel(t.transfer_type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-theme-primary truncate max-w-[150px]">{t.order_name || '—'}</td>
                      <td className="py-3 px-4 text-theme-secondary">{new Date(t.transfer_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-theme-primary">{t.items.reduce((s, i) => s + i.qty_dispatched, 0)} items ({t.items.length} types)</td>
                      <td className="py-3 px-4 text-theme-secondary font-medium">{t.dispatched_by || '—'}</td>
                      <td className="py-3 px-4 text-theme-secondary">{t.carrier_name || '—'}</td>
                      <td className="py-3 px-4 text-theme-secondary font-medium">{t.received_by || '—'}</td>
                      <td className="py-3 px-4"><StatusBadge status={t.status} /></td>
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openCheckIn(t)} className="text-xs font-medium mr-3 text-indigo-600 hover:underline">
                          {canCheckIn(t) ? 'Check-In' : 'View Details'}
                        </button>
                        {user?.role === 'admin' && t.status === 'pending' && (
                          <button
                            onClick={() => openCorrectType(t)}
                            className="text-xs font-medium text-amber-600 hover:underline"
                            title="Correct the transfer destination type"
                          >
                            ✏️ Fix Type
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden">
              {filteredTransfers.map(t => (
                <div key={t.id} className="p-4 cursor-pointer hover-theme" style={{ borderBottom: '1px solid var(--border-light)' }} onClick={() => openCheckIn(t)}>
                  <div className="flex items-start justify-between mb-1.5 flex-wrap gap-1">
                    <div>
                      <span className="font-semibold text-sm text-indigo-500">Dispatch #{t.id}</span>
                      <span className={`ml-2 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        t.transfer_type === 'workshop_to_embroidery'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400'
                          : t.transfer_type === 'embroidery_to_shop'
                            ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/20 dark:text-pink-400'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                      }`}>
                        {getTransferTypeLabel(t.transfer_type)}
                      </span>
                      {t.order_name && <p className="text-xs font-semibold text-theme-primary mt-0.5">Ref: {t.order_name}</p>}
                      <p className="text-[10px] text-theme-muted mt-1">By: {t.dispatched_by || '—'} | Carrier: {t.carrier_name || '—'}{t.received_by && ` | Recv: ${t.received_by}`}</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-dashed" style={{ borderColor: 'var(--border-light)' }}>
                    <span className="text-[10px] text-theme-secondary">{new Date(t.transfer_date).toLocaleDateString()} • {t.items.reduce((s, i) => s + i.qty_dispatched, 0)} items</span>
                    <div className="flex gap-2 items-center">
                      {user?.role === 'admin' && t.status === 'pending' && (
                        <button
                          onClick={e => { e.stopPropagation(); openCorrectType(t); }}
                          className="text-[10px] font-semibold text-amber-600"
                        >
                          ✏️ Fix Type
                        </button>
                      )}
                      <button className="text-xs font-semibold text-indigo-600">
                        {canCheckIn(t) ? 'Check-In' : 'View'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* New Dispatch Modal */}
      {showAddModal && (
        <Modal title={transferType === 'embroidery_to_shop' 
          ? "Create Embroidery Dispatch (Checkout)" 
          : transferType === 'workshop_to_embroidery'
            ? "Create Workshop ➔ Embroidery Dispatch"
            : "Create Workshop Dispatch (Checkout)"} wide onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleDispatchSubmit} className="space-y-4">
            {dispatchError && <p className="text-sm p-2 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>{dispatchError}</p>}
            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="label" style={{ color: !transferType ? '#dc2626' : undefined }}>
                  📦 Transfer Destination * {!transferType && <span style={{ fontWeight: 700 }}>— Please select a destination to continue</span>}
                </label>
                <select
                  className="input text-sm"
                  value={transferType}
                  onChange={e => setTransferType(e.target.value)}
                  style={{
                    borderColor: !transferType ? '#dc2626' : undefined,
                    fontWeight: 600
                  }}
                >
                  {(user?.role === 'workshop' || user?.role === 'admin') && (
                    <option value="" disabled>— Select where to send these items —</option>
                  )}
                  {user?.role === 'admin' && (
                    <>
                      <option value="workshop_to_shop">Workshop ➔ Retail Shop (Plain Garments)</option>
                      <option value="workshop_to_embroidery">Workshop ➔ Embroidery Shop (For Branding)</option>
                      <option value="embroidery_to_shop">Embroidery Shop ➔ Retail Shop (Finished Garments)</option>
                    </>
                  )}
                  {user?.role === 'workshop' && (
                    <>
                      <option value="workshop_to_shop">Workshop ➔ Retail Shop (Plain Garments)</option>
                      <option value="workshop_to_embroidery">Workshop ➔ Embroidery Shop (For Branding)</option>
                    </>
                  )}
                  {user?.role === 'embroidery' && (
                    <option value="embroidery_to_shop">Embroidery Shop ➔ Retail Shop (Finished Garments)</option>
                  )}
                </select>
                {!transferType && (
                  <p className="text-xs mt-1" style={{ color: '#dc2626' }}>⚠️ You must choose a destination before adding items or submitting.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-2 pt-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
              <label className="label mb-0">Dispatched Items *</label>
              <button
                type="button"
                onClick={addDispatchItem}
                disabled={!transferType}
                className="text-xs font-medium px-2 py-1 rounded"
                style={{
                  background: transferType ? 'rgba(99,102,241,0.1)' : 'var(--bg-muted)',
                  color: transferType ? '#6366f1' : 'var(--text-muted)',
                  cursor: transferType ? 'pointer' : 'not-allowed',
                  opacity: transferType ? 1 : 0.5
                }}
              >+ Add Item</button>
            </div>

            {dispatchItems.length === 0 ? (
              <p className="text-sm italic text-theme-muted text-center py-6">No items added to dispatch yet. Click "+ Add Item" above.</p>
            ) : (
              <div className="space-y-2">
                {dispatchItems.map((item, idx) => {
                  const stItem = stock.find(s => String(s.id) === String(item.stock_id));
                  const query = (item.filterText || '').toLowerCase();
                  const filteredList = manufacturedStockList.filter(s => {
                    const matchName = s.name.toLowerCase().includes(query);
                    const matchSize = s.size ? s.size.toLowerCase().includes(query) : false;
                    const matchCat = s.category ? s.category.toLowerCase().includes(query) : false;
                    return matchName || matchSize || matchCat;
                  });
                  const availableQty = transferType === 'embroidery_to_shop' ? (stItem?.embroidery_quantity || 0) : (stItem?.workshop_quantity || 0);
                  const sourceName = transferType === 'embroidery_to_shop' ? 'embroidery' : 'workshop';

                  return (
                    <div key={idx} className="grid gap-2 items-end" style={{ gridTemplateColumns: '1fr 100px 32px' }}>
                      <div className="space-y-1">
                        {idx === 0 && <p className="text-xs text-theme-muted mb-1">Stock Item (Manufactured)</p>}
                        <input
                          type="text"
                          className="input text-xs py-1"
                          style={{ padding: '0.25rem 0.5rem', height: '28px' }}
                          placeholder="Type to filter..."
                          value={item.filterText || ''}
                          onChange={e => updateDispatchItem(idx, 'filterText', e.target.value)}
                        />
                        <select className="input text-sm" value={item.stock_id} onChange={e => updateDispatchItem(idx, 'stock_id', e.target.value)}>
                          <option value="">Select garment...</option>
                          {filteredList.filter(s => {
                            const qty = transferType === 'embroidery_to_shop' ? (s.embroidery_quantity || 0) : (s.workshop_quantity || 0);
                            return qty > 0;
                          }).map(s => {
                            const qty = transferType === 'embroidery_to_shop' ? (s.embroidery_quantity || 0) : (s.workshop_quantity || 0);
                            return (
                              <option key={s.id} value={s.id}>
                                {s.name} {s.size ? `(${s.size})` : ''} — Available: {qty} ({sourceName})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        {idx === 0 && <p className="text-xs text-theme-muted mb-1">Qty to Send</p>}
                        <input type="number" min="1" max={availableQty || undefined} className="input text-sm"
                          value={item.qty_dispatched} onChange={e => updateDispatchItem(idx, 'qty_dispatched', e.target.value)} />
                      </div>
                      <button type="button" onClick={() => removeDispatchItem(idx)}
                        className="mb-0.5 w-8 h-8 rounded flex items-center justify-center text-sm font-bold bg-red-50 text-red-500 hover:bg-red-100">
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
              <div>
                <label className="label">Order Reference / Client Order Name</label>
                <input className="input text-sm" value={orderName} onChange={e => setOrderName(e.target.value)} placeholder="e.g. St. Mary's School Blazers" />
              </div>
              <div>
                <label className="label">Carrier / Driver Handled By</label>
                <input className="input text-sm" value={carrierName} onChange={e => setCarrierName(e.target.value)} placeholder="e.g. Driver John" />
              </div>
            </div>

            <div>
              <label className="label">Dispatch Notes / Remarks</label>
              <textarea className="input" rows={2} value={dispatchNotes} onChange={e => setDispatchNotes(e.target.value)} placeholder="e.g. Labeled package for embroidery branding" />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={savingDispatch || !transferType}
                className="btn-primary flex-1"
                style={{ opacity: (!transferType || savingDispatch) ? 0.5 : 1, cursor: (!transferType || savingDispatch) ? 'not-allowed' : 'pointer' }}
              >
                {savingDispatch
                  ? 'Dispatching...'
                  : !transferType
                    ? 'Select a destination above first'
                    : transferType === 'embroidery_to_shop'
                      ? 'Confirm Dispatch & Deduct Embroidery Stock'
                      : transferType === 'workshop_to_embroidery'
                        ? 'Confirm Dispatch to Embroidery & Deduct Workshop Stock'
                        : 'Confirm Dispatch & Deduct Workshop Stock'}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Details / Check-In Modal */}
      {viewTransfer && (
        <Modal title={`${getTransferTypeLabel(viewTransfer.transfer_type)} Dispatch #${viewTransfer.id} Details`} wide onClose={() => setViewTransfer(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)' }}>
                <p className="text-[10px] uppercase font-bold text-theme-secondary mb-1">Order Reference</p>
                <p className="font-semibold text-sm text-theme-primary truncate">{viewTransfer.order_name || '—'}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)' }}>
                <p className="text-[10px] uppercase font-bold text-theme-secondary mb-1">Dispatched By</p>
                <p className="font-semibold text-sm text-theme-primary truncate">{viewTransfer.dispatched_by || '—'}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)' }}>
                <p className="text-[10px] uppercase font-bold text-theme-secondary mb-1">Carrier / Handled By</p>
                <p className="font-semibold text-sm text-theme-primary truncate">{viewTransfer.carrier_name || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)' }}>
                <p className="text-[10px] uppercase font-bold text-theme-secondary mb-1">Dispatch Date</p>
                <p className="font-semibold text-sm text-theme-primary">{new Date(viewTransfer.transfer_date).toLocaleDateString()} {new Date(viewTransfer.transfer_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)' }}>
                <p className="text-[10px] uppercase font-bold text-theme-secondary mb-1">Status / Check-in Info</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <StatusBadge status={viewTransfer.status} />
                  {viewTransfer.received_date && (
                    <span className="text-xs text-theme-secondary font-medium">
                      Received: {new Date(viewTransfer.received_date).toLocaleDateString()} {viewTransfer.received_by ? `by ${viewTransfer.received_by}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {viewTransfer.notes && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)' }}>
                <p className="text-xs font-medium text-theme-secondary mb-0.5">Notes</p>
                <p className="text-sm text-theme-primary">{viewTransfer.notes}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-theme-secondary mb-2">Garments List</p>
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-sm">
                  <thead style={{ backgroundColor: 'var(--bg-muted)' }}>
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-medium text-theme-secondary">Garment</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-theme-secondary">Size</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-theme-secondary w-28">Sent Qty</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-theme-secondary w-28">Received Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!canCheckIn(viewTransfer) ? (
                      // Read Only view
                      viewTransfer.items.map((item, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid var(--border-light)' }}>
                          <td className="py-2.5 px-3 font-medium text-theme-primary">{item.stock_name || 'Deleted Item'}</td>
                          <td className="py-2.5 px-3 text-theme-secondary">{item.stock_size || '—'}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-theme-primary">{item.qty_dispatched}</td>
                          <td className="py-2.5 px-3 text-center font-semibold" style={{ color: item.qty_received === item.qty_dispatched ? '#22c55e' : '#ef4444' }}>
                            {item.qty_received != null ? item.qty_received : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      // Check-In Form view
                      checkInItems.map((item, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid var(--border-light)' }}>
                          <td className="py-2 px-3 font-medium text-theme-primary">{item.stock_name || 'Deleted Item'}</td>
                          <td className="py-2 px-3 text-theme-secondary">{item.stock_size || '—'}</td>
                          <td className="py-2 px-3 text-center font-semibold text-theme-secondary">{item.qty_dispatched}</td>
                          <td className="py-1 px-3 text-center">
                            <input type="number" min="0" className="input text-center text-sm w-20 mx-auto"
                              value={item.qty_received} onChange={e => updateCheckInItem(idx, e.target.value)} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {canCheckIn(viewTransfer) && (
              <form onSubmit={handleCheckInSubmit} className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                {checkInError && <p className="text-sm p-2 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>{checkInError}</p>}
                
                <div>
                  <label className="label">Check-In Notes / Discrepancy Remarks</label>
                  <input className="input" value={checkInNotes} onChange={e => setCheckInNotes(e.target.value)} placeholder="e.g. Confirmed all items received intact" />
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={savingCheckIn} className="btn-primary flex-1">
                    {savingCheckIn ? 'Saving Check-In...' : (viewTransfer.transfer_type === 'workshop_to_embroidery' 
                      ? 'Confirm Arrival & Update Embroidery Stock' 
                      : 'Confirm Arrival & Update Shop Stock')}
                  </button>
                  <button type="button" onClick={() => setViewTransfer(null)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            )}

            {!canCheckIn(viewTransfer) && (
              <button onClick={() => setViewTransfer(null)} className="btn-secondary w-full">Close</button>
            )}
          </div>
        </Modal>
      )}

      {/* Admin: Correct Dispatch Type Modal */}
      {correctingTransfer && (
        <Modal title={`✏️ Correct Dispatch #${correctingTransfer.id} Type`} onClose={() => setCorrectingTransfer(null)}>
          <div className="space-y-4">
            <div className="p-3 rounded-lg text-sm" style={{ background: '#fef3c7', color: '#92400e' }}>
              ⚠️ This dispatch was saved as <strong>{getTransferTypeLabel(correctingTransfer.transfer_type)}</strong>.
              Use this tool to reassign it to the correct destination. Only pending dispatches can be corrected.
            </div>
            <div>
              <label className="label">Correct Destination</label>
              <select className="input text-sm font-semibold" value={correctType} onChange={e => setCorrectType(e.target.value)}>
                <option value="workshop_to_shop">Workshop ➔ Retail Shop (Plain Garments)</option>
                <option value="workshop_to_embroidery">Workshop ➔ Embroidery Shop (For Branding)</option>
                <option value="embroidery_to_shop">Embroidery Shop ➔ Retail Shop (Finished Garments)</option>
              </select>
            </div>
            {correctError && (
              <p className="text-sm p-2 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>{correctError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleCorrectType}
                disabled={savingCorrect || correctType === correctingTransfer.transfer_type}
                className="btn-primary flex-1"
                style={{ opacity: (savingCorrect || correctType === correctingTransfer.transfer_type) ? 0.5 : 1 }}
              >
                {savingCorrect ? 'Saving...' : correctType === correctingTransfer.transfer_type ? 'No change selected' : `Save — Change to ${getTransferTypeLabel(correctType)}`}
              </button>
              <button onClick={() => setCorrectingTransfer(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>

  );
}
