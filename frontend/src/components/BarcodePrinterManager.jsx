import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import Barcode from 'react-barcode';

// Generate a unique 12-digit barcode from item ID (EAN-13 compatible prefix)
// Format: 8810 + 8-digit zero-padded item ID = unique per product variant
function getItemBarcode(item) {
  if (item.barcode && item.barcode.trim() && item.barcode !== '000000000000') {
    return item.barcode.trim();
  }
  // Auto-generate: prefix 8810 + zero-padded ID (8 digits)
  const padded = String(item.id).padStart(8, '0');
  return `8810${padded}`;
}

// Use an invisible iframe to print — works in Android WebView where window.open is blocked
function printWithIframe(htmlContent) {
  const existingFrame = document.getElementById('__print_frame__');
  if (existingFrame) existingFrame.remove();

  const frame = document.createElement('iframe');
  frame.id = '__print_frame__';
  frame.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:-1;opacity:0;pointer-events:none;';
  document.body.appendChild(frame);

  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Wait for JsBarcode CDN to load then print
  frame.onload = () => {
    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 1500);
    }, 600);
  };
}

export default function BarcodePrinterManager({ user }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [printQueue, setPrintQueue] = useState([]);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const r = await apiFetch('/api/stock');
      const data = await r.json();

      // Workshop users can only see Sweaters and Ties/Blazers/Fleece Jackets
      if (user?.role === 'workshop') {
        setStock(data.filter(s =>
          s.category === 'Sweaters' ||
          s.category === 'Tracksuits' ||
          s.category === 'Fleece Jackets' ||
          s.category === 'Blazers' ||
          s.category === 'Ties' ||
          // backwards compat for old combined category names
          s.category === 'Ties, Blazers & Fleece Jackets' ||
          s.category === 'Outerwear'
        ));
      } else {
        setStock(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = stock.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.barcode && item.barcode.includes(searchTerm))
  );

  const addToQueue = (item) => {
    const existing = printQueue.find(q => q.item.id === item.id);
    if (existing) {
      setPrintQueue(printQueue.map(q => q.item.id === item.id ? { ...q, qty: q.qty + 1 } : q));
    } else {
      setPrintQueue([...printQueue, { item, qty: 1 }]);
    }
  };

  const updateQueueQty = (id, qty) => {
    const val = parseInt(qty);
    if (isNaN(val) || val < 1) return;
    setPrintQueue(printQueue.map(q => q.item.id === id ? { ...q, qty: val } : q));
  };

  const removeFromQueue = (id) => {
    setPrintQueue(printQueue.filter(q => q.item.id !== id));
  };

  const handlePrint = () => {
    if (printQueue.length === 0) return;
    setPrinting(true);

    const itemsToPrint = [];
    printQueue.forEach(q => {
      for (let i = 0; i < q.qty; i++) itemsToPrint.push(q.item);
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Labels - Davvanis Uniforms</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; background: #fff; }
            .page { display: flex; flex-wrap: wrap; padding: 8px; gap: 8px; }
            .tag { border: 1px dashed #bbb; padding: 8px; width: 200px; text-align: center; background: #fff; page-break-inside: avoid; }
            .brand { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #4338ca; margin-bottom: 2px; letter-spacing: 0.05em; }
            .title { font-size: 13px; font-weight: 900; color: #111; line-height: 1.2; margin: 3px 0; }
            .details { font-size: 10px; color: #555; margin-bottom: 4px; }
            .barcode-wrap { display: flex; justify-content: center; margin: 4px 0; }
            .price { font-size: 14px; font-weight: bold; color: #111; margin-top: 4px; }
            @media print {
              body { margin: 0; }
              .page { gap: 0; padding: 0; }
              .tag { border: 1px dashed #bbb; break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            ${itemsToPrint.map((item, i) => `
              <div class="tag">
                <div class="brand">Davvanis Uniforms</div>
                <div class="title">${item.name}</div>
                <div class="details">${item.size ? 'Size: ' + item.size : 'One Size'} &bull; ${item.category || 'Garment'}</div>
                <div class="barcode-wrap"><svg id="bc${i}"></svg></div>
                <div class="price">${item.price != null ? 'Ksh ' + Number(item.price).toFixed(2) : ''}</div>
              </div>
            `).join('')}
          </div>
          <script>
            window.addEventListener('load', function() {
              ${itemsToPrint.map((item, i) => `
                try {
                  JsBarcode("#bc${i}", "${getItemBarcode(item)}", {
                    format: "CODE128", width: 1.5, height: 38,
                    displayValue: true, fontSize: 11, margin: 0
                  });
                } catch(e) {}
              `).join('')}
              setTimeout(function() { window.print(); }, 600);
            });
          <\/script>
        </body>
      </html>
    `;

    printWithIframe(html);
    setTimeout(() => setPrinting(false), 2000);
  };

  if (user?.role !== 'admin' && user?.role !== 'workshop') {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-80px)] flex flex-col space-y-4">
      <div className="card p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        <h1 className="text-2xl font-bold text-theme-primary mb-1 flex items-center gap-2">
          🏷️ Barcode Label Printer
        </h1>
        <p className="text-theme-secondary text-sm">
          Tap an item to add to the print queue.
          {user?.role === 'workshop' && ' (Sweaters & Outerwear only)'}
        </p>
      </div>

      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Inventory */}
        <div className="flex-[2] card rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <input
              type="text"
              className="input"
              placeholder="Search by name or barcode..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <p className="text-theme-secondary text-center mt-10">Loading inventory...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : filteredStock.length === 0 ? (
              <p className="text-theme-muted text-center mt-10">No items found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStock.map(item => (
                  <div
                    key={item.id}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 hover:border-indigo-400 hover:shadow-md cursor-pointer flex flex-col justify-between transition-all active:scale-95"
                    onClick={() => addToQueue(item)}
                  >
                    <div>
                      <h4 className="font-bold text-theme-primary text-sm line-clamp-2">{item.name}</h4>
                      <p className="text-xs text-theme-secondary mt-1">{item.size ? `Size: ${item.size}` : 'One Size'}</p>
                    </div>
                    <div className="mt-3 flex justify-center bg-white p-1 rounded overflow-hidden">
                      <Barcode
                        value={getItemBarcode(item)}
                        width={1} height={28}
                        displayValue={true} fontSize={9} margin={0}
                      />
                    </div>
                    <p className="text-xs text-center text-indigo-600 font-semibold mt-1">+ Add to Queue</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Print Queue */}
        <div className="flex-1 card rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col shrink-0">
          <h2 className="font-bold text-theme-primary mb-4 text-lg">
            Print Queue
            <span className="ml-2 text-sm font-normal text-indigo-600">
              ({printQueue.reduce((s, q) => s + q.qty, 0)} labels)
            </span>
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
            {printQueue.length === 0 ? (
              <p className="text-theme-muted text-center mt-10 text-sm">Tap items on the left to add</p>
            ) : printQueue.map(q => (
              <div key={q.item.id} className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-theme-primary text-sm line-clamp-1 flex-1">{q.item.name}</span>
                  <button
                    onClick={() => removeFromQueue(q.item.id)}
                    className="text-red-500 hover:text-red-700 ml-2 font-bold text-lg leading-none"
                  >✕</button>
                </div>
                <div className="flex justify-between items-center text-xs text-theme-secondary">
                  <span>{q.item.size || 'One Size'}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQueueQty(q.item.id, q.qty - 1)} className="w-6 h-6 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center font-bold">-</button>
                    <input
                      type="number"
                      className="input text-center h-7 w-12 text-xs"
                      value={q.qty}
                      min="1"
                      onChange={e => updateQueueQty(q.item.id, e.target.value)}
                    />
                    <button onClick={() => updateQueueQty(q.item.id, q.qty + 1)} className="w-6 h-6 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center font-bold">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handlePrint}
            disabled={printQueue.length === 0 || printing}
            className="w-full py-3 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {printing ? '⏳ Preparing...' : '🖨️ Print Labels'}
          </button>
        </div>
      </div>
    </div>
  );
}
