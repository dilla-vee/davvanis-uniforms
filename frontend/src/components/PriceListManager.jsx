import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

export default function PriceListManager({ user }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBase, setSelectedBase] = useState(null);   // base name clicked
  const [selectedVariant, setSelectedVariant] = useState(''); // colour/variant selected
  const [prices, setPrices] = useState({});   // { itemId: priceString }
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchStock = useCallback(async () => {
    try {
      setLoading(true);
      const r = await apiFetch('/api/stock');
      const data = await r.json();
      setStock(data);
      const p = {};
      data.forEach(item => { p[item.id] = item.price != null ? String(item.price) : ''; });
      setPrices(p);
    } catch (e) {
      showToast('Failed to load stock: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Grouping logic ──────────────────────────────────────────────
  // Extract base name (part before ":") and variant (part after ":")
  const getBaseName = (name) => {
    const idx = name.indexOf(':');
    return idx > -1 ? name.slice(0, idx).trim() : name;
  };
  const getVariantLabel = (name) => {
    const idx = name.indexOf(':');
    return idx > -1 ? name.slice(idx + 1).trim() : '—';
  };

  // Build: { baseName: { category, items: [...] } }
  const grouped = {};
  stock.forEach(item => {
    const base = getBaseName(item.name);
    if (!grouped[base]) grouped[base] = { category: item.category || 'Other', items: [] };
    grouped[base].items.push(item);
  });

  // Unique variants within a base group
  const getVariantsFor = (base) => {
    if (!grouped[base]) return [];
    const variants = {};
    grouped[base].items.forEach(item => {
      const v = getVariantLabel(item.name);
      if (!variants[v]) variants[v] = [];
      variants[v].push(item);
    });
    return Object.entries(variants); // [[variantLabel, [items]], ...]
  };

  // Items for the selected base + variant
  const selectedItems = (() => {
    if (!selectedBase) return [];
    const variants = getVariantsFor(selectedBase);
    const entry = variants.find(([v]) => v === selectedVariant);
    if (!entry) return [];
    return entry[1].sort((a, b) => String(a.size || '').localeCompare(String(b.size || ''), undefined, { numeric: true }));
  })();

  // Filtered base names from search
  const filteredBases = Object.entries(grouped).filter(([base, { category }]) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return base.toLowerCase().includes(q) || category.toLowerCase().includes(q);
  }).sort(([a], [b]) => a.localeCompare(b));

  // ── Handlers ───────────────────────────────────────────────────
  const handleBaseClick = (base) => {
    if (selectedBase === base) { setSelectedBase(null); setSelectedVariant(''); return; }
    setSelectedBase(base);
    // Auto-select first variant
    const variants = getVariantsFor(base);
    setSelectedVariant(variants.length ? variants[0][0] : '');
  };

  const handleVariantChange = (v) => setSelectedVariant(v);

  const handlePriceChange = (id, val) => {
    setPrices(p => ({ ...p, [id]: val }));
  };

  const handleSave = async () => {
    if (!selectedItems.length) return;
    setSaving(true);
    try {
      const updates = selectedItems
        .filter(item => prices[item.id] !== '' && !isNaN(parseFloat(prices[item.id])))
        .map(item => apiFetch(`/api/stock/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: parseFloat(prices[item.id]) })
        }));
      await Promise.all(updates);
      await fetchStock();
      showToast(`✅ Prices saved for ${selectedBase}`, 'success');
    } catch (e) {
      showToast('❌ Save failed: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Apply same price to all sizes in selected variant
  const applyToAll = (val) => {
    const updates = {};
    selectedItems.forEach(item => { updates[item.id] = val; });
    setPrices(p => ({ ...p, ...updates }));
  };

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center text-red-500">Access Denied — Admins only</div>;
  }

  const variants = selectedBase ? getVariantsFor(selectedBase) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-theme-primary">💰 Price List</h2>
        <p className="text-sm text-theme-secondary mt-0.5">
          Set prices per item variant &amp; size. Prices reflect instantly in POS and Add Stock.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: searchable item list */}
        <div className="card rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>
          {/* Search */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <input
              type="text"
              className="input text-sm"
              placeholder="🔍 Search item name or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Item list */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {loading ? (
              <div className="p-6 text-center text-sm text-theme-secondary animate-pulse">Loading items...</div>
            ) : filteredBases.length === 0 ? (
              <div className="p-6 text-center text-sm text-theme-muted">No items found.</div>
            ) : filteredBases.map(([base, { category, items }]) => {
              const isActive = selectedBase === base;
              const totalVariants = new Set(items.map(i => getVariantLabel(i.name))).size;
              return (
                <button
                  key={base}
                  onClick={() => handleBaseClick(base)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  style={{ backgroundColor: isActive ? 'rgba(99,102,241,0.08)' : '' }}
                >
                  <div>
                    <p className="text-sm font-semibold text-theme-primary">{base}</p>
                    <p className="text-xs text-theme-muted">{category} · {totalVariants} variant{totalVariants !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: isActive ? '#6366f1' : 'var(--text-muted)' }}>
                    {isActive ? '▾' : '›'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: variant selector + price editor */}
        <div className="card rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col" style={{ maxHeight: '70vh' }}>
          {!selectedBase ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <span className="text-4xl mb-3">💰</span>
              <p className="text-sm font-semibold text-theme-primary">Select an item</p>
              <p className="text-xs text-theme-muted mt-1">Click any item on the left to set its prices</p>
            </div>
          ) : (
            <>
              {/* Variant selector header */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-theme-muted mb-1">Colour / Variant</p>
                  <p className="text-base font-bold text-theme-primary">{selectedBase}</p>
                </div>
                {variants.length > 1 ? (
                  <select
                    className="input text-sm"
                    value={selectedVariant}
                    onChange={e => handleVariantChange(e.target.value)}
                  >
                    {variants.map(([v]) => (
                      <option key={v} value={v}>{v === '—' ? selectedBase : v}</option>
                    ))}
                  </select>
                ) : variants.length === 1 ? (
                  <p className="text-sm text-theme-secondary px-1">
                    {variants[0][0] === '—' ? 'Single item (no colour variants)' : variants[0][0]}
                  </p>
                ) : null}

                {/* Apply-to-all shortcut */}
                {selectedItems.length > 1 && (
                  <div className="flex gap-2 items-center">
                    <input
                      id="bulk-price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="input text-sm flex-1"
                      placeholder="Set same price for all sizes..."
                      onKeyDown={e => { if (e.key === 'Enter') applyToAll(e.target.value); }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('bulk-price');
                        if (el?.value) applyToAll(el.value);
                      }}
                      className="px-3 py-2 text-xs font-bold rounded-lg text-white bg-indigo-500 hover:bg-indigo-600 transition-colors shrink-0"
                    >
                      Apply All
                    </button>
                  </div>
                )}
              </div>

              {/* Size + price rows */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {selectedItems.length === 0 ? (
                  <p className="text-sm text-theme-muted text-center py-6">No items for this variant.</p>
                ) : selectedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-theme-primary">{item.size ? `Size: ${item.size}` : 'One Size'}</p>
                      <p className="text-[10px] text-theme-muted">{item.category}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-theme-muted font-medium">Ksh</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input text-sm text-right font-semibold"
                        style={{ width: '100px' }}
                        value={prices[item.id] ?? ''}
                        onChange={e => handlePriceChange(item.id, e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Save button */}
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                <button
                  onClick={handleSave}
                  disabled={saving || selectedItems.length === 0}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
                  style={{ background: saving ? '#9ca3af' : 'linear-gradient(135deg, #6366f1, #4338ca)' }}
                >
                  {saving ? '⏳ Saving...' : `💾 Save Prices for ${selectedBase}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary table (optional quick overview) */}
      {selectedBase && selectedItems.length > 0 && (
        <div className="card rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-theme-muted mb-3">Current Price Summary — {selectedBase}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-theme-secondary">Variant</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-theme-secondary">Size</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-theme-secondary">Price (Ksh)</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-theme-secondary">Stock Qty</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map(item => (
                  <tr key={item.id} className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="py-2 px-3 text-theme-secondary text-xs">{getVariantLabel(item.name)}</td>
                    <td className="py-2 px-3 text-theme-primary font-medium">{item.size || 'One Size'}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600">
                      {item.price != null ? `${Number(item.price).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-theme-secondary">{item.quantity ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
