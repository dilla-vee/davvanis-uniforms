import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const KSH = 'Ksh ';

export default function EmbroideryManager({ user }) {
  const [logs, setLogs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Today's date in local format
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(todayStr);

  // Yarn/Item Sale Form
  const [itemForm, setItemForm] = useState({
    item_name: '',
    quantity: '1',
    price_charged: '',
    payment_method: 'Cash',
    client_id: '',
    manual_client_name: ''
  });

  // Outside Service Form
  const [serviceForm, setServiceForm] = useState({
    service_description: '',
    customer_item_count: '1',
    price_charged: '',
    payment_method: 'Cash',
    client_id: '',
    manual_client_name: ''
  });

  const fetchLogs = async (dateVal) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/embroidery/logs?date=${dateVal || ''}`);
      if (!res.ok) throw new Error('Failed to load embroidery logs.');
      setLogs(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await apiFetch('/api/embroidery-clients');
      if (res.ok) {
        setClients(await res.json());
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchLogs(filterDate);
  }, [filterDate]);

  useEffect(() => {
    fetchClients();
  }, []);

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.item_name.trim() || !itemForm.price_charged) {
      alert('Please fill out all required fields.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/embroidery/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'item_sale',
          item_name: itemForm.item_name.trim(),
          quantity: parseInt(itemForm.quantity) || 1,
          price_charged: parseFloat(itemForm.price_charged) || 0,
          payment_method: itemForm.payment_method,
          client_id: itemForm.client_id ? parseInt(itemForm.client_id) : null,
          manual_client_name: !itemForm.client_id ? itemForm.manual_client_name.trim() : null
        })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save log');
      }
      setItemForm({ item_name: '', quantity: '1', price_charged: '', payment_method: 'Cash', client_id: '', manual_client_name: '' });
      await fetchLogs(filterDate);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    if (!serviceForm.service_description.trim() || !serviceForm.price_charged) {
      alert('Please fill out all required fields.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/embroidery/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'service',
          service_description: serviceForm.service_description.trim(),
          customer_item_count: parseInt(serviceForm.customer_item_count) || 1,
          price_charged: parseFloat(serviceForm.price_charged) || 0,
          payment_method: serviceForm.payment_method,
          client_id: serviceForm.client_id ? parseInt(serviceForm.client_id) : null,
          manual_client_name: !serviceForm.client_id ? serviceForm.manual_client_name.trim() : null
        })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save log');
      }
      setServiceForm({ service_description: '', customer_item_count: '1', price_charged: '', payment_method: 'Cash', client_id: '', manual_client_name: '' });
      await fetchLogs(filterDate);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalRevenue = logs.reduce((sum, log) => sum + (parseFloat(log.price_charged) || 0), 0);

  const clientTotals = logs.reduce((acc, log) => {
    if (log.client_name) {
      acc[log.client_name] = (acc[log.client_name] || 0) + (parseFloat(log.price_charged) || 0);
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">🪡 Embroidery & Branding Daily Log</h2>
          <p className="text-sm mt-1 text-theme-secondary">Manage outside customer services and yarn/supplies sales</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <label className="text-xs font-semibold text-theme-secondary">Filter Date:</label>
          <input
            type="date"
            className="input py-1 text-xs"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      {user?.role === 'embroidery' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Section 1: Item Sales (Yarns, etc.) */}
          <div className="card p-5 space-y-4">
            <h3 className="text-base font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
              🧶 Log Yarn & Supplies Sale
            </h3>
            <form onSubmit={handleItemSubmit} className="space-y-3">
              <div>
                <label className="label">Item Name / Color *</label>
                <input
                  className="input"
                  placeholder="e.g. Red Yarn, Knitting needle"
                  value={itemForm.item_name}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, item_name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <div>
                  <label className="label">Link to Embroidery Client (Optional)</label>
                  <select
                    className="input"
                    value={itemForm.client_id}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, client_id: e.target.value, manual_client_name: '' }))}
                  >
                    <option value="">-- Select Client (None) --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {!itemForm.client_id && (
                  <div>
                    <label className="label text-xs text-theme-secondary font-medium">Or Type Client Name Manually (Optional)</label>
                    <input
                      type="text"
                      className="input text-xs py-1.5"
                      placeholder="e.g. Walk-in Client Name"
                      value={itemForm.manual_client_name}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, manual_client_name: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Total Price (Ksh) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    placeholder="Total amount charged"
                    value={itemForm.price_charged}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, price_charged: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select
                  className="input"
                  value={itemForm.payment_method}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                >
                  <option value="Cash">Cash</option>
                  <option value="Paybill">Paybill</option>
                </select>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
                {saving ? 'Saving...' : 'Record Sale'}
              </button>
            </form>
          </div>

          {/* Section 2: Services Rendered (Branding, Logos, etc.) */}
          <div className="card p-5 space-y-4">
            <h3 className="text-base font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
              🪡 Log Embroidery / Branding Service
            </h3>
            <form onSubmit={handleServiceSubmit} className="space-y-3">
              <div>
                <label className="label">Service Transpired *</label>
                <input
                  className="input"
                  placeholder="e.g. Logo embroidered / label on customer item"
                  value={serviceForm.service_description}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, service_description: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <div>
                  <label className="label">Link to Embroidery Client (Optional)</label>
                  <select
                    className="input"
                    value={serviceForm.client_id}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, client_id: e.target.value, manual_client_name: '' }))}
                  >
                    <option value="">-- Select Client (None) --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {!serviceForm.client_id && (
                  <div>
                    <label className="label text-xs text-theme-secondary font-medium">Or Type Client Name Manually (Optional)</label>
                    <input
                      type="text"
                      className="input text-xs py-1.5"
                      placeholder="e.g. Walk-in Client Name"
                      value={serviceForm.manual_client_name}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, manual_client_name: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">No. of Items *</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={serviceForm.customer_item_count}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, customer_item_count: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Total Price (Ksh) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    placeholder="Total amount charged"
                    value={serviceForm.price_charged}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, price_charged: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select
                  className="input"
                  value={serviceForm.payment_method}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                >
                  <option value="Cash">Cash</option>
                  <option value="Paybill">Paybill</option>
                </select>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
                {saving ? 'Saving...' : 'Record Service'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Logs History Listing */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold text-theme-primary">Logs for {filterDate === todayStr ? 'Today' : filterDate}</h3>
          <div className="text-sm font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-3 py-1 rounded-full">
            Total Revenue: {KSH}{totalRevenue.toFixed(2)}
          </div>
        </div>

        <div className="px-5 py-2.5 border-b flex flex-wrap gap-2 items-center bg-zinc-50/50 dark:bg-zinc-950/30" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-semibold text-theme-secondary">Client Totals Today:</span>
          {Object.keys(clientTotals).length === 0 ? (
            <span className="text-xs text-theme-muted">No client logs recorded.</span>
          ) : (
            Object.entries(clientTotals).map(([name, total]) => (
              <span key={name} className="text-xs font-medium bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 px-2.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                {name}: <span className="font-bold">{KSH}{total.toFixed(2)}</span>
              </span>
            ))
          )}
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded animate-pulse bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-red-600 text-center">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-theme-secondary font-medium">
            No embroidery activities or sales logged for this date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-theme-secondary uppercase">Time</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-theme-secondary uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-theme-secondary uppercase">Client</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-theme-secondary uppercase">Description</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-theme-secondary uppercase">Qty / Items</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-theme-secondary uppercase">Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-theme-secondary uppercase">Payment Method</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-theme-secondary uppercase">Attendant</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const logTime = new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={log.id} className="hover-theme border-b border-zinc-100 dark:border-zinc-800/40">
                      <td className="py-3 px-4 font-medium text-theme-primary">{logTime}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            log.log_type === 'service'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                          }`}
                        >
                          {log.log_type === 'service' ? '🪡 Service' : '🧶 Yarn Sale'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-theme-primary">
                        {log.client_name ? (
                          <span className="inline-block px-2 py-0.5 rounded font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                            {log.client_name}
                          </span>
                        ) : (
                          <span className="text-theme-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-theme-primary">
                        {log.log_type === 'service' ? log.service_description : log.item_name}
                      </td>
                      <td className="py-3 px-4 text-theme-secondary">
                        {log.log_type === 'service' ? `${log.customer_item_count} items` : `${log.quantity} units`}
                      </td>
                      <td className="py-3 px-4 font-bold text-green-600 dark:text-green-400">
                        {KSH}{log.price_charged.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-theme-secondary">{log.payment_method}</span>
                      </td>
                      <td className="py-3 px-4 text-theme-secondary italic text-xs">{log.recorded_by || 'Staff'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
