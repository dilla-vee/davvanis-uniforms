import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const KSH = 'Ksh ';

// Print using a hidden iframe — works inside Capacitor Android WebView
function printWithIframe(htmlContent) {
  const old = document.getElementById('__print_receipt_frame__');
  if (old) old.remove();

  const frame = document.createElement('iframe');
  frame.id = '__print_receipt_frame__';
  frame.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:-999;opacity:0;pointer-events:none;';
  document.body.appendChild(frame);

  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  frame.onload = () => {
    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 2000);
    }, 300);
  };
}

export default function POSManager({ user }) {
  const [scanInput, setScanInput] = useState('');
  const [cart, setCart] = useState([]);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(null);
  const [view, setView] = useState('cart'); // 'cart' | 'receipt'
  const scanInputRef = useRef(null);

  // Refocus scan input whenever cart changes (ensures scanner always sends here)
  useEffect(() => {
    if (!success && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [cart, success]);

  const handleScan = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setError(null);

      const barcode = scanInput.trim();
      if (!barcode) return;

      try {
        const res = await apiFetch(`/api/stock/by-barcode/${encodeURIComponent(barcode)}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || `Barcode "${barcode}" not found in stock`);

        const existingIdx = cart.findIndex(item => String(item.stock_id) === String(data.id));

        if (existingIdx !== -1) {
          const current = cart[existingIdx];
          if (current.qty_sold >= current.max_qty) {
            setError(`Only ${current.max_qty} of "${data.name}" in stock — cannot add more.`);
          } else {
            const newCart = cart.map((item, i) =>
              i === existingIdx
                ? { ...item, qty_sold: item.qty_sold + 1, subtotal: (item.qty_sold + 1) * item.unit_price }
                : item
            );
            setCart(newCart);
          }
        } else {
          if (data.quantity < 1) {
            setError(`"${data.name}" is out of stock.`);
          } else {
            setCart(prev => [...prev, {
              stock_id: data.id,
              name: data.name,
              size: data.size,
              qty_sold: 1,
              unit_price: Number(data.price) || 0,
              subtotal: Number(data.price) || 0,
              max_qty: data.quantity,
            }]);
          }
        }
        setScanInput('');
      } catch (err) {
        setError(err.message || 'Product not found');
        setScanInput('');
      }
    }
  };

  const updateQty = (idx, newQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) return;
    setCart(cart.map((item, i) => {
      if (i !== idx) return item;
      if (qty > item.max_qty) {
        setError(`Only ${item.max_qty} of "${item.name}" available.`);
        return item;
      }
      return { ...item, qty_sold: qty, subtotal: qty * item.unit_price };
    }));
  };

  const removeItem = (idx) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const totalValue = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;
    setProcessing(true);
    setError(null);

    try {
      const r = await apiFetch('/api/stock/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sale_date: new Date().toISOString().split('T')[0],
          notes: 'POS Sale',
          items: cart.map(i => ({
            stock_id: i.stock_id,
            qty_sold: i.qty_sold,
            unit_price: i.unit_price,
          })),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Checkout failed');

      let saleData = data.sale;
      
      // Handle offline mode mock response
      if (data.offline) {
        saleData = {
          id: 'OFFLINE-' + Date.now(),
          created_at: new Date().toISOString(),
          sale_date: new Date().toISOString().split('T')[0],
          total_value: cart.reduce((sum, item) => sum + item.subtotal, 0)
        };

        // Optimistically deduct stock from cached /api/stock
        try {
          const CACHE_KEY = 'unistore_cache_/api/stock';
          let cachedStock = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
          cachedStock = cachedStock.map(s => {
            const soldItem = cart.find(i => String(i.stock_id) === String(s.id));
            if (soldItem) {
              return { ...s, quantity: Math.max(0, s.quantity - soldItem.qty_sold) };
            }
            return s;
          });
          localStorage.setItem(CACHE_KEY, JSON.stringify(cachedStock));
        } catch (err) {}
      }

      setSuccess({
        sale: saleData,
        items: [...cart],
        timestamp: new Date().toLocaleString('en-KE'),
      });
      setCart([]);
      setView('receipt');
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = () => {
    if (!success) return;
    const { sale, items, timestamp } = success;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${sale.id}</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: 'Courier New', Courier, monospace; font-size: 13px; color: #000; padding: 12px; max-width: 320px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .lg { font-size: 15px; }
            .sm { font-size: 11px; }
            hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 3px 2px; vertical-align: top; }
            .r { text-align: right; }
            .total-row td { font-size: 15px; font-weight: bold; padding-top: 6px; }
            .footer { text-align: center; margin-top: 16px; font-size: 11px; }
            @media print { body { padding: 4px; } }
          </style>
        </head>
        <body>
          <div class="center bold lg">DAVVANIS UNIFORMS</div>
          <div class="center sm">Workshop &amp; Retail Shop</div>
          <div class="center sm">Tel: 0710 289 290 / 0711 404 753</div>
          <hr/>
          <div>Receipt No: <b>#${sale.id}</b></div>
          <div>Date: ${timestamp}</div>
          <div>Status: <b>PAID</b></div>
          <hr/>
          <table>
            <thead>
              <tr class="bold">
                <td style="width:52%">Item</td>
                <td style="width:12%" class="r">Qty</td>
                <td style="width:36%" class="r">Amount</td>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.name}${item.size ? ' (' + item.size + ')' : ''}</td>
                  <td class="r">${item.qty_sold}</td>
                  <td class="r">Ksh ${item.subtotal.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tbody>
              <tr><td colspan="3"><hr style="margin:4px 0"/></td></tr>
              <tr class="total-row">
                <td colspan="2">TOTAL</td>
                <td class="r">Ksh ${Number(sale.total_value).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <hr/>
          <div class="footer">
            Thank you for shopping with us!<br/>
            Goods once sold cannot be returned.<br/>
            Powered by UniStore POS
          </div>
          <script>
            window.addEventListener('load', function() {
              setTimeout(function() { window.print(); }, 200);
            });
          <\/script>
        </body>
      </html>
    `;

    printWithIframe(html);
  };

  const startNewSale = () => {
    setSuccess(null);
    setView('cart');
    setScanInput('');
    setError(null);
  };

  if (user?.role !== 'admin' && user?.role !== 'attendant') {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  // ── Receipt View ──────────────────────────────────────────────────────────
  if (success && view === 'receipt') {
    const { sale, items, timestamp } = success;
    return (
      <div className="max-w-lg mx-auto space-y-4 p-4">
        <div className="card rounded-xl border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-xl font-extrabold text-green-800 dark:text-green-300">Sale Complete!</h2>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">Receipt #{sale.id}</p>
        </div>

        {/* Receipt Preview */}
        <div className="card rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 font-mono text-sm">
          <div className="text-center font-extrabold text-base">DAVVANIS UNIFORMS</div>
          <div className="text-center text-xs text-zinc-500">Workshop &amp; Retail Shop</div>
          <div className="border-t border-dashed border-zinc-400 my-3" />
          <div>Receipt: <b>#{sale.id}</b></div>
          <div>Date: {timestamp}</div>
          <div>Status: <b className="text-green-600">PAID</b></div>
          <div className="border-t border-dashed border-zinc-400 my-3" />
          <table className="w-full text-xs">
            <thead>
              <tr className="font-bold">
                <td className="pb-1" style={{width:'55%'}}>Item</td>
                <td className="pb-1 text-right" style={{width:'15%'}}>Qty</td>
                <td className="pb-1 text-right" style={{width:'30%'}}>Price</td>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="py-0.5">{item.name}{item.size ? ` (${item.size})` : ''}</td>
                  <td className="py-0.5 text-right">{item.qty_sold}</td>
                  <td className="py-0.5 text-right">Ksh {item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-dashed border-zinc-400 my-3" />
          <div className="flex justify-between font-extrabold text-base">
            <span>TOTAL</span>
            <span>Ksh {Number(sale.total_value).toFixed(2)}</span>
          </div>
          <div className="border-t border-dashed border-zinc-400 my-3" />
          <div className="text-center text-xs text-zinc-500">Thank you for shopping with us!</div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={printReceipt}
            className="flex-1 py-3 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow"
          >
            🖨️ Print Receipt
          </button>
          <button
            onClick={startNewSale}
            className="flex-1 py-3 text-sm font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 text-theme-primary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            🛒 New Sale
          </button>
        </div>
      </div>
    );
  }

  // ── Cart View ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-4 p-4">
      {/* Header */}
      <div className="card p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h1 className="text-2xl font-extrabold text-theme-primary mb-3 flex items-center gap-2">
          🛒 Point of Sale
        </h1>

        {error && (
          <div className="p-3 mb-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg text-sm flex justify-between items-start">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-3 font-bold text-red-600">✕</button>
          </div>
        )}

        <label className="block text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-400 mb-1">
          Scan Barcode
        </label>
        <input
          ref={scanInputRef}
          type="text"
          inputMode="numeric"
          className="input text-lg py-3 w-full tracking-widest font-mono"
          placeholder="Scan or type barcode + Enter..."
          value={scanInput}
          onChange={e => setScanInput(e.target.value)}
          onKeyDown={handleScan}
          autoFocus
          autoComplete="off"
        />
        <p className="text-xs text-zinc-400 mt-1">Hardware scanner: just scan — Enter is sent automatically.</p>
      </div>

      {/* Cart */}
      <div className="card rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="font-bold text-theme-primary">Cart Items ({cart.length})</h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-theme-muted">
            <div className="text-5xl mb-3">🛍️</div>
            <p className="text-sm">Scan a product to begin</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {cart.map((item, idx) => (
              <div key={idx} className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-3">
                    <h4 className="font-bold text-theme-primary">{item.name}</h4>
                    <p className="text-xs text-theme-secondary mt-0.5">
                      {item.size ? `Size: ${item.size}` : 'One Size'} • {KSH}{item.unit_price.toFixed(2)} each
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-red-500 hover:text-red-700 font-bold text-lg shrink-0"
                  >✕</button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(idx, item.qty_sold - 1)}
                      className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-lg font-bold text-theme-primary"
                    >−</button>
                    <span className="w-8 text-center font-bold text-theme-primary">{item.qty_sold}</span>
                    <button
                      onClick={() => updateQty(idx, item.qty_sold + 1)}
                      className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-lg font-bold text-theme-primary"
                    >+</button>
                  </div>
                  <div className="font-extrabold text-lg text-theme-primary">
                    {KSH}{item.subtotal.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Summary + Checkout */}
      {cart.length > 0 && (
        <div className="card rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="flex justify-between text-sm text-theme-secondary mb-2">
            <span>Items</span>
            <span>{cart.reduce((s, i) => s + i.qty_sold, 0)} pcs</span>
          </div>
          <div className="flex justify-between text-sm text-theme-secondary mb-4">
            <span>Subtotal</span>
            <span>{KSH}{totalValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-2xl text-theme-primary border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <span>Total</span>
            <span>{KSH}{totalValue.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={processing}
            className="mt-5 w-full py-4 text-lg font-extrabold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors shadow-lg"
          >
            {processing ? '⏳ Processing...' : `✅ Confirm Sale & Generate Receipt`}
          </button>
        </div>
      )}
    </div>
  );
}
