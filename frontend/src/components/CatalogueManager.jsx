import React, { useState } from 'react';
import { apiFetch } from '../utils/api';

const CATEGORIES = ['Sweaters', 'Tops', 'Bottoms', 'Sports', 'Outerwear', 'Accessories', 'Other'];

export default function CatalogueManager({ user }) {
  const [baseProduct, setBaseProduct] = useState('');
  const [category, setCategory] = useState('Sweaters');
  const [colors, setColors] = useState('');
  const [sizes, setSizes] = useState('');
  const [price, setPrice] = useState('');
  
  const [variants, setVariants] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const generateBarcode = () => {
    // Basic 12 digit numeric barcode
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    if (!baseProduct) {
      setError('Base product name is required.');
      return;
    }

    const colorList = colors.split(',').map(c => c.trim()).filter(Boolean);
    const sizeList = sizes.split(',').map(s => s.trim()).filter(Boolean);
    
    if (colorList.length === 0 && sizeList.length === 0) {
       setVariants([{
         name: baseProduct,
         category,
         size: '',
         price: price ? parseFloat(price) : null,
         barcode: generateBarcode()
       }]);
       return;
    }
    
    const newVariants = [];
    const _colors = colorList.length > 0 ? colorList : [''];
    const _sizes = sizeList.length > 0 ? sizeList : [''];

    for (const c of _colors) {
      for (const s of _sizes) {
        let name = baseProduct;
        if (c) name += `: ${c}`;
        newVariants.push({
          name,
          category,
          size: s,
          price: price ? parseFloat(price) : null,
          barcode: generateBarcode()
        });
      }
    }
    setVariants(newVariants);
  };

  const handleBarcodeChange = (index, val) => {
    const newVars = [...variants];
    newVars[index].barcode = val;
    setVariants(newVars);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch('/api/stock/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: variants }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save variants.');
      
      setSuccess(true);
      setVariants([]);
      setBaseProduct('');
      setColors('');
      setSizes('');
      setPrice('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'attendant') {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-theme-primary">Product Catalogue</h1>
      </div>
      <p className="text-theme-secondary text-sm">
        Use this tool to automatically generate product variants with unique barcodes. 
        Each variant gets its own barcode for use in the POS system.
      </p>

      {error && <div className="p-3 bg-red-100 text-red-800 rounded">{error}</div>}
      {success && <div className="p-3 bg-green-100 text-green-800 rounded">Variants successfully saved to inventory!</div>}

      <div className="card p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Base Product Name *</label>
              <input type="text" className="input" placeholder="e.g. Sweater" value={baseProduct} onChange={e => setBaseProduct(e.target.value)} required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Colors / Styles (comma separated)</label>
              <input type="text" className="input" placeholder="e.g. Red White Stripe, Navy Plain" value={colors} onChange={e => setColors(e.target.value)} />
            </div>
            <div>
              <label className="label">Sizes (comma separated)</label>
              <input type="text" className="input" placeholder="e.g. 32, 34, 36" value={sizes} onChange={e => setSizes(e.target.value)} />
            </div>
            <div>
              <label className="label">Default Price (optional)</label>
              <input type="number" step="0.01" className="input" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full md:w-auto mt-4">Generate Variants</button>
        </form>
      </div>

      {variants.length > 0 && (
        <div className="card p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
          <h3 className="text-lg font-bold text-theme-primary">Preview Variants ({variants.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b dark:border-zinc-800">
                  <th className="py-2 px-3 text-theme-secondary">Product Name</th>
                  <th className="py-2 px-3 text-theme-secondary">Size</th>
                  <th className="py-2 px-3 text-theme-secondary">Price (Ksh)</th>
                  <th className="py-2 px-3 text-theme-secondary">Barcode</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={i} className="border-b dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="py-2 px-3 text-theme-primary">{v.name}</td>
                    <td className="py-2 px-3 text-theme-primary">{v.size || '-'}</td>
                    <td className="py-2 px-3 text-theme-primary">{v.price || '-'}</td>
                    <td className="py-2 px-3">
                      <input type="text" className="input text-xs py-1 w-full" value={v.barcode} onChange={e => handleBarcodeChange(i, e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 justify-end mt-4">
             <button type="button" onClick={() => setVariants([])} className="btn-secondary">Clear</button>
             <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
               {saving ? 'Saving...' : 'Save to Inventory'}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
