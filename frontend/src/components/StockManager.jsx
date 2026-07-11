import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { Html5Qrcode } from 'html5-qrcode';
import Barcode from 'react-barcode';
const CATEGORIES = [
  'Sweaters',
  'Tracksuits',
  'T-Shirts',
  'Shirts',
  'Skirts',
  'Blouses',
  'Trousers',
  'P.E. Games Kits',
  'Ties',
  'Blazers',
  'Fleece Jackets',
  'Handkerchiefs',
  'Gloves',
  'Mavins',
  'Socks',
  'Other',
];
const SWEATER_STYLES = [
  'Sweater: Navy Plain',
  'Sweater: Navy with White stripes',
  'Sweater: Navy with Sky Blue stripes',
  'Sweater: Navy with Red stripes',
  'Sweater: Navy with Yellow stripes',
  'Sweater: Red Plain',
  'Sweater: Red with White stripes',
  'Sweater: Maroon Plain',
  'Sweater: Maroon with White stripes',
  'Sweater: Green Plain',
  'Sweater: Green with White stripes',
  'Sweater: Green with Yellow stripes',
  'Sweater: Green with Safaricom stripes',
  'Sweater: Green with Red stripes',
  'Sweater: Royal Blue Plain',
  'Sweater: Royal Blue with White stripes',
  'Sweater: Royal Blue with Yellow stripes',
  'Sweater: Sky Blue Plain',
  'Sweater: Sky Blue with White stripes',
  'Sweater: Black Plain',
  'Sweater: Black with White stripes',
  'Sweater: Grey (Ash) Plain',
  'Sweater: Grey (Ash) with Red stripes',
  'Sweater: Grey (Ash) with Blue stripes',
  'Sweater: Grey (Ash) with Green stripes',
  'Sweater: Grey (Dark) Plain',
  'Sweater: Grey (Dark) with White stripes',
  'Sweater: White Plain',
  'Sweater: White with Navy stripes',
  'Sweater: White with Red stripes',
  'Sweater: Brown Plain',
  'Sweater: Brown with Yellow stripes',
  'Sweater: Gold/Yellow Plain',
  'Sweater: Gold/Yellow with Green stripes',
  'Sweater: Orange Plain',
  'Sweater: Orange with Black stripes',
  'Sweater: Purple Plain',
  'Sweater: Purple with White stripes',
  'Sweater: Pink Plain',
  'Sweater: Strathmore White',
  'Sweater: Strathmore Blue',
  'Sweater: Strathmore Navy',
  'Sweater: Strathmore Red',
  'Sweater: Beige Plain',
  'Sweater: Beige with Chocolate stripes',
  'Sweater: Navy with Safaricom stripes'
];
const TRACKSUIT_STYLES = [
  'Tracksuit: Black with White stripes',
  'Tracksuit: Navy with White stripes',
  'Tracksuit: Navy with Red stripes',
  'Tracksuit: Navy with Yellow stripes',
  'Tracksuit: Navy with Sky stripes',
  'Tracksuit: Green with White stripes',
  'Tracksuit: Safaricom Green with White stripes',
  'Tracksuit: Royal Blue with White stripes',
  'Tracksuit: Red with White stripes',
  'Tracksuit: Yellow with White stripes',
  'Tracksuit: Maroon with White stripes',
  'Tracksuit: Maroon with Yellow stripes',
  'Tracksuit: Dark Purple with White stripes',
  'Tracksuit: Light Purple with White stripes',
  'Tracksuit: Light Grey with White stripes',
  'Tracksuit: Ash Grey with White stripes',
  'Tracksuit: Charcoal Grey with White stripes',
  'Tracksuit: Sky with White stripes',
];
const FLEECE_JACKET_STYLES = [
  'Fleece Jacket: Navy Blue',
  'Fleece Jacket: Black',
  'Fleece Jacket: Sky Blue',
  'Fleece Jacket: Green',
  'Fleece Jacket: Royal Blue',
  'Fleece Jacket: Grey',
  'Fleece Jacket: Ash Grey',
  'Fleece Jacket: Purple',
];
const SOCK_STYLES = [
  'Socks: White Plain',
  'Socks: White with Grey stripes',
  'Socks: White with Blue stripes',
  'Socks: White with Red stripes',
  'Socks: White with Green stripes',
  'Socks: White with Black stripes',
  'Socks: Grey Plain',
  'Socks: Grey with White stripes',
  'Socks: Grey with Blue stripes',
  'Socks: Grey with Red stripes',
  'Socks: Black Plain',
  'Socks: Black with White stripes',
  'Socks: Navy Plain',
  'Socks: Navy with White stripes',
  'Socks: Navy with Red stripes',
];
const KSH = 'Ksh ';

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`card rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[92vh] flex flex-col`}
        style={{ borderRadius: '0.75rem' }}>
        <div className="flex items-center justify-between p-5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-base font-semibold text-theme-primary">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none text-theme-secondary hover-theme rounded p-1">x</button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// Camera Scanner Modal
function CameraScannerModal({ onClose, onScan }) {
  const [scanError, setScanError] = useState('');
  useEffect(() => {
    let html5Qrcode;
    const elementId = 'scanner-view';

    const startScanner = async () => {
      try {
        // Pre-check camera permission with getUserMedia to get a clear error early
        const testStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        testStream.getTracks().forEach(t => t.stop());
      } catch (permErr) {
        const msg = permErr?.name === 'NotAllowedError' || permErr?.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please go to: Settings → Apps → Davannis Uniforms → Permissions → Camera → Allow.'
          : permErr?.name === 'NotFoundError'
            ? 'No camera found on this device.'
            : 'Camera unavailable: ' + (permErr?.message || permErr?.name || String(permErr) || 'Unknown error');
        setScanError(msg);
        return;
      }

      try {
        html5Qrcode = new Html5Qrcode(elementId);
        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            onScan(decodedText);
            stopScanner();
          },
          () => {} // ignore per-frame decode errors
        );
      } catch (err) {
        const msg = err?.message || err?.name || (typeof err === 'string' ? err : null)
          || 'Could not start scanner. Ensure camera permissions are enabled.';
        setScanError('Scanner error: ' + msg);
      }
    };

    const stopScanner = async () => {
      try {
        if (html5Qrcode && html5Qrcode.isScanning) {
          await html5Qrcode.stop();
        }
      } catch (e) {
        console.error(e);
      }
      onClose();
    };

    const timer = setTimeout(startScanner, 200);

    return () => {
      clearTimeout(timer);
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(console.error);
      }
    };
  }, [onClose, onScan]);


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 max-w-md w-full flex flex-col space-y-4 shadow-xl border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Camera Barcode Scanner</h3>
          <button onClick={onClose} className="text-lg leading-none text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">✕</button>
        </div>
        
        {scanError ? (
          <p className="text-sm p-3 bg-red-100 text-red-800 rounded">{scanError}</p>
        ) : (
          <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden border border-zinc-700">
            <div id="scanner-view" className="w-full h-full"></div>
            <div className="absolute inset-0 border-2 border-dashed border-indigo-500 rounded-lg pointer-events-none m-12 opacity-60"></div>
          </div>
        )}
        
        <p className="text-xs text-center text-zinc-500">Align a barcode or QR code inside the viewfinder to scan.</p>
        <button onClick={onClose} className="btn-secondary w-full">Cancel</button>
      </div>
    </div>
  );
}

// Tag Print Modal
function TagPrintModal({ item, onClose }) {
  const padded = String(item.id).padStart(8, '0');
  const barcodeValue = item.barcode || `8810${padded}`;

  const handlePrint = () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Tag - ${item.name}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
            .tag { border: 2px solid #000; padding: 18px; width: 260px; text-align: center; background: #fff; }
            .brand { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #4338ca; margin-bottom: 4px; }
            .title { font-size: 16px; font-weight: 900; color: #111; margin: 4px 0; line-height: 1.2; }
            .details { font-size: 11px; color: #666; margin-bottom: 12px; }
            .barcode-wrap { display: flex; justify-content: center; margin: 10px 0; }
            .price { font-size: 18px; font-weight: bold; color: #111; margin-top: 8px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="tag">
            <div class="brand">Davvanis Uniforms</div>
            <div class="title">${item.name}</div>
            <div class="details">${item.size ? 'Size: ' + item.size : 'One Size'} &bull; ${item.category || 'Garment'}</div>
            <div class="barcode-wrap"><svg id="barcode"></svg></div>
            <div class="price">${item.price != null ? 'Ksh ' + Number(item.price).toFixed(2) : ''}</div>
          </div>
          <script>
            window.addEventListener('load', function() {
              JsBarcode("#barcode", "${barcodeValue}", {
                format: "CODE128", width: 2, height: 50,
                displayValue: true, fontSize: 13, margin: 0
              });
              setTimeout(function() { window.print(); }, 400);
            });
          <\/script>
        </body>
      </html>
    `;

    const old = document.getElementById('__tag_print_frame__');
    if (old) old.remove();
    const frame = document.createElement('iframe');
    frame.id = '__tag_print_frame__';
    frame.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:-999;opacity:0;pointer-events:none;';
    document.body.appendChild(frame);
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    frame.onload = () => {
      setTimeout(() => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => frame.remove(), 2000);
      }, 500);
    };
  };

  return (
    <Modal title="Garment Tag Print Preview" onClose={onClose}>
      <div className="flex flex-col items-center space-y-5 py-4">
        <div id="tag-print-area" className="border-2 border-zinc-300 dark:border-zinc-700 p-5 w-72 text-center rounded-xl bg-white dark:bg-zinc-950 shadow-md">
          <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">👔 Davvanis Uniforms</div>
          <h4 className="text-lg font-extrabold text-zinc-900 dark:text-white leading-tight">{item.name}</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{item.size ? `Size: ${item.size}` : 'One Size'} • {item.category || 'Garment'}</p>
          <div className="my-4 flex justify-center bg-white p-2 rounded">
            <Barcode value={barcodeValue} width={1.5} height={50} displayValue={true} fontSize={14} margin={0} />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-white mt-2">{item.price != null ? 'Ksh ' + Number(item.price).toFixed(2) : '—'}</div>
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={handlePrint} className="btn-primary flex-1">Print Tag</button>
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
        </div>
      </div>
    </Modal>
  );
}

// Daily Sales Modal
function DailySalesModal({ stock, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [saleDate, setSaleDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [clientName, setClientName] = useState('');
  const [pin, setPin] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [items, setItems] = useState([{ stock_id: '', name: '', qty_sold: '1', unit_price: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  // Scanner integrations
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const scanInputRef = useRef(null);

  useEffect(() => {
    if (scanInputRef.current) scanInputRef.current.focus();
  }, []);

  const addRow = () => setItems(i => [...i, { stock_id: '', name: '', qty_sold: '1', unit_price: '' }]);
  const removeRow = idx => setItems(i => i.filter((_, n) => n !== idx));
  const updateRow = (idx, field, val) => setItems(i => {
    const next = [...i];
    next[idx] = { ...next[idx], [field]: val };
    if (field === 'stock_id' && val !== 'custom') {
      const s = stock.find(s => String(s.id) === String(val));
      if (s) next[idx].unit_price = s.price != null ? String(s.price) : '';
    }
    return next;
  });

  const handleScanInputKeyDown = async e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = scanInput.trim();
      if (!val) return;

      const item = stock.find(s => s.barcode === val);
      if (!item) {
        setScanError(`Item with barcode/SKU "${val}" not found`);
        return;
      }

      setScanError('');
      setScanInput('');

      // Add item to sales list or increment qty if already present
      const existingIdx = items.findIndex(i => String(i.stock_id) === String(item.id));
      if (existingIdx > -1) {
        const currentQty = parseInt(items[existingIdx].qty_sold) || 0;
        if (currentQty < item.quantity) {
          updateRow(existingIdx, 'qty_sold', String(currentQty + 1));
        } else {
          setScanError(`Cannot add more "${item.name}" — only ${item.quantity} in stock`);
        }
      } else {
        if (items.length === 1 && !items[0].stock_id) {
          setItems([{ stock_id: String(item.id), name: '', qty_sold: '1', unit_price: String(item.price || '') }]);
        } else {
          setItems([...items, { stock_id: String(item.id), name: '', qty_sold: '1', unit_price: String(item.price || '') }]);
        }
      }
    }
  };

  const total = items.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (parseInt(i.qty_sold) || 0), 0);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!pin.trim()) { setError('Enter your unique 4-digit staff PIN'); return; }
    if (!/^\d{4}$/.test(pin.trim())) { setError('PIN must be exactly 4 digits'); return; }

    for (const item of items) {
      if (!item.stock_id) { setError('Select a stock item for each row'); return; }
      if (item.stock_id === 'custom' && !item.name?.trim()) { setError('Enter a name for the custom item'); return; }
      if (!item.qty_sold || parseInt(item.qty_sold) < 1) { setError('Quantity must be at least 1'); return; }
    }
    setSaving(true);
    try {
      const r = await apiFetch('/api/stock/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sale_date: saleDate, notes: notes || null,
          client_name: clientName || null,
          payment_method: paymentMethod,
          pin: pin,
          items: items.map(i => ({
            stock_id: i.stock_id === 'custom' ? null : parseInt(i.stock_id),
            name: i.stock_id === 'custom' ? i.name : undefined,
            qty_sold: parseInt(i.qty_sold),
            unit_price: parseFloat(i.unit_price) || 0,
          })),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed');
      
      let saleData = data.sale;
      let updatedStock = data.updatedStock;

      // Handle offline mode mock response
      if (data.offline) {
        saleData = {
          id: 'OFFLINE-' + Date.now(),
          created_at: new Date().toISOString(),
          sale_date: saleDate,
          total_value: items.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (parseInt(i.qty_sold) || 0), 0)
        };
        
        // Optimistically deduct stock
        updatedStock = stock.map(s => {
          const soldItem = items.find(i => String(i.stock_id) === String(s.id));
          if (soldItem) {
            return { ...s, quantity: Math.max(0, s.quantity - parseInt(soldItem.qty_sold)) };
          }
          return s;
        });
        
        // Update the cached GET request so other parts of the app see the deducted stock
        try {
          const CACHE_KEY = 'unistore_cache_/api/stock';
          localStorage.setItem(CACHE_KEY, JSON.stringify(updatedStock));
        } catch (err) {}
      }

      setSuccess({ sale: saleData, items: [...items] });
      if (updatedStock) onSaved(updatedStock);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  if (success) {
    const saleId = success.sale.id;
    const saleDate = new Date(success.sale.created_at || new Date()).toLocaleString('en-KE');
    
    const formatServedBy = (soldBy) => {
      if (!soldBy) return 'Staff';
      return soldBy.split('(')[0].trim();
    };

    const receiptItems = success.items.map(item => {
      const s = stock.find(st => String(st.id) === String(item.stock_id));
      return {
        name: s ? s.name : (item.name || 'Unknown Item'),
        size: s ? s.size : (item.size || ''),
        qty: parseInt(item.qty_sold) || 0,
        price: parseFloat(item.unit_price) || 0,
        subtotal: (parseFloat(item.unit_price) || 0) * (parseInt(item.qty_sold) || 0)
      };
    });

    const totalVal = success.sale.total_value != null ? parseFloat(success.sale.total_value) : 0;

    const getWhatsAppUrl = () => {
      let text = `Hello! Thank you for purchasing from *Davvanis Uniforms*.\n\n`;
      text += `*Receipt No:* #${saleId}\n`;
      text += `*Date:* ${new Date(success.sale.created_at || new Date()).toLocaleDateString('en-KE')}\n`;
      text += `*Served By:* ${formatServedBy(success.sale.sold_by || 'Staff')}\n`;
      text += `*Payment Status:* PAID ✅\n\n`;
      text += `*Items Purchased:*\n`;
      receiptItems.forEach(item => {
        text += `- ${item.name} ${item.size ? `(${item.size})` : ''} x ${item.qty} @ Ksh ${item.price.toFixed(2)}: *Ksh ${item.subtotal.toFixed(2)}*\n`;
      });
      text += `\n*TOTAL PAID:* *Ksh ${totalVal.toFixed(2)}*\n\n`;
      text += `We appreciate your business! If you have any questions, feel free to reach out.`;
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    };

    const handlePrintReceipt = () => {
      const method = success.sale.payment_method || paymentMethod || 'Cash';
      const client = success.sale.client_name || clientName || '';
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${saleId}</title>
            <style>
              @media print { @page { margin: 0; } body { margin: 1.6cm; } }
              body { font-family: 'Times New Roman', Times, serif; width: 400px; font-size: 14px; color: #000; }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .italic { font-style: italic; }
              .title { font-size: 24px; font-weight: 800; color: #166534; margin-bottom: 2px; }
              .subtitle { font-size: 11px; color: #166534; font-weight: bold; margin-bottom: 8px; }
              .header-table { width: 100%; font-size: 12px; margin-bottom: 10px; color: #166534; }
              .header-table td { vertical-align: top; }
              .cash-sale { background-color: #166534; color: white; padding: 2px 10px; font-weight: bold; display: inline-block; font-size: 13px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { padding: 4px 6px; }
              .items-table th { border-top: 2px solid #166534; border-bottom: 2px solid #166534; color: #166534; text-align: left; }
              .items-table td { border-bottom: 1px solid #166534; border-left: 1px solid #166534; border-right: 1px solid #166534; }
              .items-table th:first-child, .items-table td:first-child { border-left: none; }
              .items-table th:last-child, .items-table td:last-child { border-right: none; }
              .right { text-align: right; }
              .total-row td { border-bottom: 2px solid #166534 !important; font-weight: bold; color: #166534; }
              .footer { text-align: center; margin-top: 20px; font-style: italic; color: #166534; font-weight: bold; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="center title">DAVANIS UNIFORMS</div>
            <div class="center subtitle">School Uniforms / Corporate Wear / All Uniforms / Embroidery & Branding</div>
            <table class="header-table">
              <tr>
                <td style="width: 35%;">Uhuru Market,<br>Shop J-100, J-101<br>&<br>Shop 6 Block C</td>
                <td style="width: 30%; text-align: center;"><div class="cash-sale">${method === 'Cash' ? 'CASH SALE' : method.toUpperCase()}</div></td>
                <td style="width: 35%; text-align: right;">Tel: 0710 289 290<br>0711 404 753<br>Email: davanisuniformsltd@gmail.com</td>
              </tr>
            </table>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
              <div style="width: 65%; display: flex;">
                <span style="color: #166534; font-weight: bold;">M/S</span>
                <span style="border-bottom: 1px dotted #000; flex-grow: 1; margin-left: 4px; padding-left: 4px;">${client}</span>
              </div>
              <div style="width: 30%; display: flex;">
                <span style="color: #166534; font-weight: bold;">Date:</span>
                <span style="border-bottom: 1px dotted #000; flex-grow: 1; margin-left: 4px; padding-left: 4px;">${saleDate}</span>
              </div>
            </div>
 
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px;">
              <div style="width: 100%; display: flex;">
                <span style="color: #166534; font-weight: bold;">Served By:</span>
                <span style="border-bottom: 1px dotted #000; flex-grow: 1; margin-left: 4px; padding-left: 4px;">${formatServedBy(success?.sale?.sold_by || 'Staff')}</span>
              </div>
            </div>
 
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 15%;">Qty</th>
                  <th style="width: 50%;">Particulars</th>
                  <th class="right" style="width: 15%;">@</th>
                  <th class="right" style="width: 20%;">Shs</th>
                </tr>
              </thead>
              <tbody>
                ${receiptItems.map(item => `
                  <tr>
                    <td>${item.qty}</td>
                    <td>${item.name} ${item.size ? `(${item.size})` : ''}</td>
                    <td class="right">${item.price.toFixed(2)}</td>
                    <td class="right">${item.subtotal.toFixed(2)}</td>
                  </tr>
                `).join('')}
                ${Array.from({ length: Math.max(0, 5 - receiptItems.length) }).map(() => `
                  <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="2" style="border: none !important;">
                    <span style="color: #166534; font-weight: bold;">E.&.O.E No.</span>
                    <span style="color: #dc2626; font-size: 18px; margin-left: 5px;">${saleId}</span>
                  </td>
                  <td class="right">TOTAL</td>
                  <td class="right">${totalVal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="footer">
              Thank you for shopping Davanis Uniforms.
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    };
 
    return (
      <div className="space-y-4">
        <div className="text-center py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center gap-2">
          <span className="text-xl">✅</span>
          <span className="font-semibold text-sm">Sale Authorized & Recorded Successfully</span>
        </div>
 
        {/* Receipt Mockup Preview */}
        <div className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 font-mono text-xs text-theme-primary space-y-3 shadow-inner">
          <div className="text-center space-y-0.5">
            <h4 className="font-bold text-sm tracking-wide" style={{ color: '#166534' }}>DAVANIS UNIFORMS</h4>
            <p className="text-[10px] text-theme-muted">School Uniforms / Corporate Wear / Embroidery & Branding</p>
            <p className="text-[10px] text-theme-muted">Uhuru Market, Shop J-100, J-101 & Shop 6 Block C</p>
          </div>
          <div className="border-t border-dashed border-zinc-300 dark:border-zinc-800 pt-2 space-y-0.5 text-[10px] text-theme-secondary">
            {success.sale.client_name && <div className="flex justify-between"><span>M/S:</span><span className="font-bold">{success.sale.client_name}</span></div>}
            <div className="flex justify-between"><span>Receipt No:</span><span className="font-bold text-red-600">#{saleId}</span></div>
            <div className="flex justify-between"><span>Date:</span><span>{saleDate}</span></div>
            <div className="flex justify-between"><span>Payment:</span><span className="font-bold" style={{ color: '#166534' }}>{success.sale.payment_method || paymentMethod}</span></div>
            <div className="flex justify-between"><span>Served By:</span><span className="font-bold">{formatServedBy(success.sale.sold_by || 'Staff')}</span></div>
          </div>
          <div className="border-t border-dashed border-zinc-300 dark:border-zinc-800 my-2"></div>
          <div className="space-y-1">
            {receiptItems.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.qty}x {item.name} {item.size ? `(${item.size})` : ''}</span>
                <span>{KSH}{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-zinc-300 dark:border-zinc-800 pt-2 flex justify-between font-bold text-sm" style={{ color: '#166534' }}>
            <span>TOTAL</span>
            <span>{KSH}{totalVal.toFixed(2)}</span>
          </div>
          <p className="text-center text-[10px] text-theme-muted italic">Thank you for shopping Davanis Uniforms.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap pt-2">
          <button type="button" onClick={handlePrintReceipt} className="btn-primary flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs">
            🖨️ Print Receipt / PDF
          </button>
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 text-center"
          >
            💬 Share via WhatsApp
          </a>
        </div>
        
        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={() => { setSuccess(null); setItems([{ stock_id:'', name: '', qty_sold:'1', unit_price:'' }]); setNotes(''); setClientName(''); setPaymentMethod('Cash'); setPin(''); setScanInput(''); setScanError(''); }} className="btn-secondary flex-1">Record Another Sale</button>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Close</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm p-2 rounded" style={{ background:'#fee2e2', color:'#991b1b' }}>{error}</p>}
      
      {/* QR/Barcode Scanner Section */}
      <div className="p-3.5 rounded-lg border border-indigo-100 dark:border-zinc-800" style={{ backgroundColor: 'rgba(99,102,241,0.04)' }}>
        <label className="label text-indigo-700 dark:text-indigo-400 font-semibold mb-1">Scan QR / Barcode Checkout</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={scanInputRef}
              type="text"
              className="input pr-8"
              placeholder="Scan item tag or type SKU & hit Enter..."
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={handleScanInputKeyDown}
            />
            {scanInput && (
              <button type="button" onClick={() => setScanInput('')} className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600">✕</button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="px-3 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-indigo-400 flex items-center justify-center text-sm"
            title="Scan with Camera"
          >
            📷 Camera Scan
          </button>
        </div>
        {scanError && <p className="text-xs text-red-600 mt-1 font-semibold">⚠️ {scanError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Sale Date</label>
          <input type="date" className="input" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Payment Method</label>
          <select className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="Cash">Cash</option>
            <option value="Paybill">Paybill / Till</option>
            <option value="Bank">Bank Transfer</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Client Name <span className="text-theme-muted font-normal text-[10px]">(Optional)</span></label>
          <input className="input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="For the receipt..." />
        </div>
        <div>
          <label className="label">Staff PIN *</label>
          <input type="password" maxLength="4" className="input font-mono" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 1234" required />
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Evening sales" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Items Sold</label>
          <button type="button" onClick={addRow} className="text-xs font-medium px-2 py-1 rounded"
            style={{ background:'rgba(99,102,241,0.1)', color:'#6366f1' }}>+ Add Row</button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => {
            const si = stock.find(s => String(s.id) === String(item.stock_id));
            const isCustom = item.stock_id === 'custom';
            return (
              <div key={idx} className="grid gap-2 items-end" style={{ gridTemplateColumns: isCustom ? 'minmax(120px, 1fr) minmax(120px, 1fr) 80px 110px 28px' : '1fr 80px 110px 28px' }}>
                <div>
                  {idx === 0 && <p className="text-xs text-theme-muted mb-1">Stock Item</p>}
                  <select className="input text-sm" value={item.stock_id} onChange={e => updateRow(idx,'stock_id',e.target.value)}>
                    <option value="">Select...</option>
                    <option value="custom" className="font-bold text-indigo-600 bg-indigo-50">➕ Custom Item (Not in stock)</option>
                    {stock.filter(s => (s.quantity || 0) > 0).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.size ? ` (${s.size})` : ''} — {s.quantity} left
                      </option>
                    ))}
                  </select>
                </div>
                {isCustom && (
                  <div>
                    {idx === 0 && <p className="text-xs text-theme-muted mb-1">Item Name</p>}
                    <input type="text" className="input text-sm" placeholder="e.g. Sweater Red" value={item.name} onChange={e => updateRow(idx, 'name', e.target.value)} />
                  </div>
                )}
                <div>
                  {idx === 0 && <p className="text-xs text-theme-muted mb-1">Qty</p>}
                  <input type="number" min="1" max={!isCustom ? (si?.quantity || undefined) : undefined} className="input text-sm"
                    value={item.qty_sold} onChange={e => updateRow(idx,'qty_sold',e.target.value)} />
                </div>
                <div>
                  {idx === 0 && <p className="text-xs text-theme-muted mb-1">Price</p>}
                  <input type="number" min="0" step="0.01" className="input text-sm"
                    value={item.unit_price} onChange={e => updateRow(idx,'unit_price',e.target.value)} placeholder="0" />
                </div>
                <button type="button" onClick={() => removeRow(idx)} disabled={items.length === 1}
                  className="mb-0.5 w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: items.length===1?'var(--bg-muted)':'#fee2e2', color: items.length===1?'var(--text-muted)':'#ef4444' }}>
                  x
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-between items-center px-3 py-2 rounded-lg"
        style={{ backgroundColor:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)' }}>
        <span className="text-sm text-theme-secondary">Total Sales Value</span>
        <span className="font-bold text-lg" style={{ color:'#6366f1' }}>{KSH}{total.toFixed(2)}</span>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Recording...' : 'Record Sales & Update Stock'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
      </div>

      {showCamera && (
        <CameraScannerModal
          onClose={() => setShowCamera(false)}
          onScan={handleScan}
        />
      )}
    </form>
  );
}

// Sales History Modal
function SalesHistoryModal({ onClose }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    apiFetch('/api/stock/sales')
      .then(r => r.json())
      .then(data => setSales(Array.isArray(data) ? data : []))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, []);

  const formatServedBy = (soldBy) => {
    if (!soldBy) return '';
    return soldBy.split('(')[0].trim();
  };

  const handlePrintReceipt = (sale) => {
    const receiptItems = (sale.items || []).map(item => ({
      name: item.stock_name || 'Unknown Item',
      size: item.stock_size || '',
      qty: parseInt(item.qty_sold) || 0,
      price: parseFloat(item.unit_price) || 0,
      subtotal: parseFloat(item.subtotal) || 0
    }));
    const saleId = sale.id;
    const saleDate = new Date(sale.created_at || sale.sale_date).toLocaleString('en-KE');
    const paymentMethod = sale.payment_method || 'Cash';
    const clientName = sale.client_name || '';
    const totalVal = parseFloat(sale.total_value) || 0;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${saleId}</title>
          <style>
            @media print { @page { margin: 0; } body { margin: 1.6cm; } }
            body { font-family: 'Times New Roman', Times, serif; width: 400px; font-size: 14px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .italic { font-style: italic; }
            .title { font-size: 24px; font-weight: 800; color: #166534; margin-bottom: 2px; }
            .subtitle { font-size: 11px; color: #166534; font-weight: bold; margin-bottom: 8px; }
            .header-table { width: 100%; font-size: 12px; margin-bottom: 10px; color: #166534; }
            .header-table td { vertical-align: top; }
            .cash-sale { background-color: #166534; color: white; padding: 2px 10px; font-weight: bold; display: inline-block; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 4px 6px; }
            .items-table th { border-top: 2px solid #166534; border-bottom: 2px solid #166534; color: #166534; text-align: left; }
            .items-table td { border-bottom: 1px solid #166534; border-left: 1px solid #166534; border-right: 1px solid #166534; }
            .items-table th:first-child, .items-table td:first-child { border-left: none; }
            .items-table th:last-child, .items-table td:last-child { border-right: none; }
            .right { text-align: right; }
            .total-row td { border-bottom: 2px solid #166534 !important; font-weight: bold; color: #166534; }
            .footer { text-align: center; margin-top: 20px; font-style: italic; color: #166534; font-weight: bold; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="center title">DAVANIS UNIFORMS</div>
          <div class="center subtitle">School Uniforms / Corporate Wear / All Uniforms / Embroidery & Branding</div>
          <table class="header-table">
            <tr>
              <td style="width: 35%;">Uhuru Market,<br>Shop J-100, J-101<br>&<br>Shop 6 Block C</td>
              <td style="width: 30%; text-align: center;"><div class="cash-sale">${paymentMethod === 'Cash' ? 'CASH SALE' : paymentMethod.toUpperCase()}</div></td>
              <td style="width: 35%; text-align: right;">Tel: 0710 289 290<br>0711 404 753<br>Email: davanisuniformsltd@gmail.com</td>
            </tr>
          </table>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
            <div style="width: 65%; display: flex;">
              <span style="color: #166534; font-weight: bold;">M/S</span>
              <span style="border-bottom: 1px dotted #000; flex-grow: 1; margin-left: 4px; padding-left: 4px;">${clientName}</span>
            </div>
            <div style="width: 30%; display: flex;">
              <span style="color: #166534; font-weight: bold;">Date:</span>
              <span style="border-bottom: 1px dotted #000; flex-grow: 1; margin-left: 4px; padding-left: 4px;">${saleDate}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px;">
            <div style="width: 100%; display: flex;">
              <span style="color: #166534; font-weight: bold;">Served By:</span>
              <span style="border-bottom: 1px dotted #000; flex-grow: 1; margin-left: 4px; padding-left: 4px;">${formatServedBy(sale.sold_by || 'Staff')}</span>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 15%;">Qty</th>
                <th style="width: 50%;">Particulars</th>
                <th class="right" style="width: 15%;">@</th>
                <th class="right" style="width: 20%;">Shs</th>
              </tr>
            </thead>
            <tbody>
              ${receiptItems.map(item => `
                <tr>
                  <td>${item.qty}</td>
                  <td>${item.name} ${item.size ? `(${item.size})` : ''}</td>
                  <td class="right">${item.price.toFixed(2)}</td>
                  <td class="right">${item.subtotal.toFixed(2)}</td>
                </tr>
              `).join('')}
              ${Array.from({ length: Math.max(0, 5 - receiptItems.length) }).map(() => `
                <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2" style="border: none !important;">
                  <span style="color: #166534; font-weight: bold;">E.&.O.E No.</span>
                  <span style="color: #dc2626; font-size: 18px; margin-left: 5px;">${saleId}</span>
                </td>
                <td class="right">TOTAL</td>
                <td class="right">${totalVal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            Thank you for shopping Davanis Uniforms.
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShareWhatsApp = (sale) => {
    const receiptItems = (sale.items || []).map(item => ({
      name: item.stock_name || 'Unknown Item',
      size: item.stock_size || '',
      qty: parseInt(item.qty_sold) || 0,
      price: parseFloat(item.unit_price) || 0,
      subtotal: parseFloat(item.subtotal) || 0
    }));
    const saleId = sale.id;
    const saleDate = new Date(sale.created_at || sale.sale_date).toLocaleDateString('en-KE');
    const totalVal = parseFloat(sale.total_value) || 0;

    let text = `Hello! Thank you for purchasing from *Davvanis Uniforms*.\n\n`;
    text += `*Receipt No:* #${saleId}\n`;
    text += `*Date:* ${saleDate}\n`;
    text += `*Served By:* ${formatServedBy(sale.sold_by || 'Staff')}\n`;
    text += `*Payment Status:* PAID ✅\n\n`;
    text += `*Items Purchased:*\n`;
    receiptItems.forEach(item => {
      text += `- ${item.name} ${item.size ? `(${item.size})` : ''} x ${item.qty} @ Ksh ${item.price.toFixed(2)}: *Ksh ${item.subtotal.toFixed(2)}*\n`;
    });
    text += `\n*TOTAL PAID:* *Ksh ${totalVal.toFixed(2)}*\n\n`;
    text += `We appreciate your business! If you have any questions, feel free to reach out.`;
    
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3">
      {loading ? (
        [1,2,3].map(i => <div key={i} className="h-12 rounded animate-pulse" style={{ backgroundColor:'var(--bg-muted)' }} />)
      ) : sales.length === 0 ? (
        <div className="text-center py-10">
          <p style={{ fontSize:'36px' }}>📋</p>
          <p className="text-sm text-theme-muted mt-2">No sales recorded yet.</p>
        </div>
      ) : sales.map(sale => (
        <div key={sale.id} className="rounded-lg overflow-hidden" style={{ border:'1px solid var(--border)' }}>
          <button className="w-full flex items-center justify-between px-4 py-3 hover-theme text-left"
            onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}>
            <div>
              <span className="font-semibold text-theme-primary text-sm">
                {new Date(String(sale.sale_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
              </span>
              {sale.notes && <span className="ml-2 text-xs text-theme-muted">— {sale.notes}</span>}
              <div className="text-xs text-theme-secondary mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{(sale.items||[]).length} item{sale.items?.length!==1?'s':''} sold</span>
                {sale.sold_by && <span className="inline-block px-2 py-0.5 rounded font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">👤 {formatServedBy(sale.sold_by)}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold" style={{ color:'#22c55e' }}>{KSH}{Number(sale.total_value).toFixed(2)}</div>
              <div className="text-xs text-theme-muted">{expanded===sale.id?'▲':'▼'}</div>
            </div>
          </button>
          {expanded === sale.id && (
            <div style={{ borderTop:'1px solid var(--border)', backgroundColor:'var(--bg-muted)' }}>
              <table className="w-full text-sm">
                <thead><tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Item','Size','Qty Sold','Unit Price','Subtotal'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs text-theme-secondary font-medium">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(sale.items||[]).map((item,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid var(--border-light)' }}>
                      <td className="px-4 py-2 font-medium text-theme-primary">{item.stock_name||'--'}</td>
                      <td className="px-4 py-2 text-theme-secondary">{item.stock_size||'--'}</td>
                      <td className="px-4 py-2 font-semibold" style={{ color:'#ef4444' }}>{item.qty_sold}</td>
                      <td className="px-4 py-2 text-theme-primary">{KSH}{Number(item.unit_price).toFixed(2)}</td>
                      <td className="px-4 py-2 font-medium text-theme-primary">{KSH}{Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-2 p-3 border-t border-dashed" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(sale)}
                  className="btn-primary text-xs py-1.5 px-3 flex-1 flex items-center justify-center gap-1">
                  🖨️ Reprint Receipt
                </button>
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(sale)}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex-1 flex items-center justify-center gap-1">
                  💬 Share on WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Main StockManager component
export default function StockManager({ user }) {
  const [stock, setStock] = useState([]);
  const [adminStockView, setAdminStockView] = useState('shop');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingQty, setEditingQty] = useState(null);
  const [qtyValue, setQtyValue] = useState('');
  const [editingWorkshopQty, setEditingWorkshopQty] = useState(null);
  const [workshopQtyValue, setWorkshopQtyValue] = useState('');
  const [editingEmbroideryQty, setEditingEmbroideryQty] = useState(null);
  const [embroideryQtyValue, setEmbroideryQtyValue] = useState('');
  const qtyRef = useRef(null);
  const [form, setForm] = useState({ name:'', category:'', custom_category:'', size:'', selectedSizes:[], quantity:'', price:'', low_stock_threshold:'10', barcode:'', workshop_quantity:'0', embroidery_quantity:'0', source_type:'purchased', pin:'' });
  const [overrideShopQty, setOverrideShopQty] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSales, setShowSales] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [printTagItem, setPrintTagItem] = useState(null);
  const [sweatersExpanded, setSweatersExpanded] = useState(false);
  const [expandedStyles, setExpandedStyles] = useState({});
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [prodSearch, setProdSearch] = useState('');
  const [selectedProdStyle, setSelectedProdStyle] = useState(null);
  const [prodQuantities, setProdQuantities] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStock = async () => {
    try { setLoading(true); const r = await apiFetch('/api/stock'); setStock(await r.json()); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { fetchStock(); }, []);
  useEffect(() => { if ((editingQty || editingWorkshopQty || editingEmbroideryQty) && qtyRef.current) qtyRef.current.focus(); }, [editingQty, editingWorkshopQty, editingEmbroideryQty]);

  const openAdd = () => { 
    setEditItem(null); 
    setForm({ 
      name:'', 
      category:'', 
      custom_category:'', 
      size:'', 
      selectedSizes: [], 
      sizeQuantities: {},
      sizeWorkshopQuantities: {},
      quantity: user?.role === 'workshop' || user?.role === 'embroidery' ? '0' : '', 
      price:'', 
      low_stock_threshold:'10', 
      barcode:'', 
      workshop_quantity:'0', 
      embroidery_quantity:'0', 
      source_type: user?.role === 'workshop' ? 'manufactured' : 'purchased',
      pin: ''
    }); 
    setFormError(''); 
    setOverrideShopQty(false);
    setShowModal(true); 
  };
  
  const openEdit = item => { 
    setEditItem(item); 
    setForm({ 
      name:item.name||'', 
      category:item.category||'', 
      custom_category: '', 
      size:item.size||'', 
      selectedSizes: [item.size||''], 
      sizeQuantities: {},
      sizeWorkshopQuantities: {},
      quantity:item.quantity!=null?String(item.quantity):'', 
      price:item.price!=null?String(item.price):'', 
      low_stock_threshold:item.low_stock_threshold!=null?String(item.low_stock_threshold):'10', 
      barcode:item.barcode||'', 
      workshop_quantity:item.workshop_quantity!=null?String(item.workshop_quantity):'0', 
      embroidery_quantity:item.embroidery_quantity!=null?String(item.embroidery_quantity):'0', 
      source_type:item.source_type||'purchased',
      pin: ''
    }); 
    setFormError(''); 
    setOverrideShopQty(false);
    setShowModal(true); 
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    
    // Resolve final category name
    const finalCategory = form.category === 'Other' 
      ? (form.custom_category.trim() || 'Other')
      : form.category;
      
    if (!finalCategory) { setFormError('Category is required'); return; }

    setSaving(true);
    setFormError('');
    try {
      if (editItem) {
        // Edit single item
        const r = await apiFetch(`/api/stock/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            category: finalCategory,
            size: form.size.trim() || null,
            quantity: form.quantity !== '' ? parseInt(form.quantity) : 0,
            workshop_quantity: form.workshop_quantity !== '' ? parseInt(form.workshop_quantity) : 0,
            embroidery_quantity: form.embroidery_quantity !== '' ? parseInt(form.embroidery_quantity) : 0,
            price: form.price !== '' ? parseFloat(form.price) : null,
            low_stock_threshold: form.low_stock_threshold !== '' ? parseInt(form.low_stock_threshold) : 10,
            barcode: form.barcode.trim() || null,
            source_type: form.source_type,
            pin: form.pin
          })
        });
        if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed to update item'); }
      } else {
        // Resolve list of sizes to add
        let sizesToAdd = [...form.selectedSizes];
        if (sizesToAdd.length === 0) {
          if (form.size.trim()) {
            sizesToAdd.push(form.size.trim());
          } else {
            setFormError('Please select or type at least one size');
            setSaving(false);
            return;
          }
        }

        for (const sz of sizesToAdd) {
          // Check if item already exists in local stock state
          const existing = stock.find(s => 
            s.category === finalCategory && 
            s.name.toLowerCase() === form.name.toLowerCase() && 
            String(s.size) === String(sz)
          );

          if (existing) {
            // Update existing item
            const qtyToAdd = (!editItem && form.selectedSizes.length > 0) ? (form.sizeQuantities && form.sizeQuantities[sz] !== undefined && form.sizeQuantities[sz] !== '' ? parseInt(form.sizeQuantities[sz]) : 0) : (form.quantity !== '' ? parseInt(form.quantity) : 0);
            const workshopQtyToAdd = (!editItem && form.selectedSizes.length > 0) ? (form.sizeWorkshopQuantities && form.sizeWorkshopQuantities[sz] !== undefined && form.sizeWorkshopQuantities[sz] !== '' ? parseInt(form.sizeWorkshopQuantities[sz]) : 0) : (form.workshop_quantity !== '' ? parseInt(form.workshop_quantity) : 0);
            const embroideryQtyToAdd = form.embroidery_quantity !== '' ? parseInt(form.embroidery_quantity) : 0;
            
            const r = await apiFetch(`/api/stock/${existing.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                quantity: (existing.quantity || 0) + qtyToAdd,
                workshop_quantity: (existing.workshop_quantity || 0) + workshopQtyToAdd,
                embroidery_quantity: (existing.embroidery_quantity || 0) + embroideryQtyToAdd,
                price: form.price !== '' ? parseFloat(form.price) : existing.price,
                low_stock_threshold: form.low_stock_threshold !== '' ? parseInt(form.low_stock_threshold) : existing.low_stock_threshold,
                pin: form.pin
              })
            });
            if (!r.ok) { const d = await r.json(); throw new Error(d.error || `Failed to update existing item for size ${sz}`); }
          } else {
            // Create new item
            const qtyToAdd = (!editItem && form.selectedSizes.length > 0) ? (form.sizeQuantities && form.sizeQuantities[sz] !== undefined && form.sizeQuantities[sz] !== '' ? parseInt(form.sizeQuantities[sz]) : 0) : (form.quantity !== '' ? parseInt(form.quantity) : 0);
            const workshopQtyToAdd = (!editItem && form.selectedSizes.length > 0) ? (form.sizeWorkshopQuantities && form.sizeWorkshopQuantities[sz] !== undefined && form.sizeWorkshopQuantities[sz] !== '' ? parseInt(form.sizeWorkshopQuantities[sz]) : 0) : (form.workshop_quantity !== '' ? parseInt(form.workshop_quantity) : 0);
            const embroideryQtyToAdd = form.embroidery_quantity !== '' ? parseInt(form.embroidery_quantity) : 0;

            const r = await apiFetch('/api/stock', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: form.name.trim(),
                category: finalCategory,
                size: sz,
                quantity: qtyToAdd,
                workshop_quantity: workshopQtyToAdd,
                embroidery_quantity: embroideryQtyToAdd,
                price: form.price !== '' ? parseFloat(form.price) : null,
                low_stock_threshold: form.low_stock_threshold !== '' ? parseInt(form.low_stock_threshold) : 10,
                barcode: form.barcode.trim() || null,
                source_type: form.source_type,
                pin: form.pin
              })
            });
            if (!r.ok) { const d = await r.json(); throw new Error(d.error || `Failed to create new item for size ${sz}`); }
          }
        }
      }
      await fetchStock();
      setShowModal(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogProductionSubmit = async (e, styleStockItems) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const updates = [];
      for (const [size, qtyStr] of Object.entries(prodQuantities)) {
        const qtyToAdd = parseInt(qtyStr);
        if (!isNaN(qtyToAdd) && qtyToAdd > 0) {
          const item = styleStockItems.find(s => s.size === size);
          if (item) {
            const newQty = (item.workshop_quantity || 0) + qtyToAdd;
            updates.push(
              apiFetch(`/api/stock/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workshop_quantity: newQty })
              })
            );
          }
        }
      }
      if (updates.length > 0) {
        await Promise.all(updates);
        await fetchStock();
      }
      setShowProductionModal(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    const r = await apiFetch(`/api/stock/${id}`, { method:'DELETE' });
    if (r.ok) { await fetchStock(); setDeleteConfirm(null); }
  };

  const saveQty = async item => {
    const qty = parseInt(qtyValue);
    if (!isNaN(qty) && qty >= 0) {
      await apiFetch(`/api/stock/${item.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ quantity:qty }) });
      await fetchStock();
    }
    setEditingQty(null);
  };

  const saveWorkshopQty = async item => {
    const qty = parseInt(workshopQtyValue);
    if (!isNaN(qty) && qty >= 0) {
      await apiFetch(`/api/stock/${item.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ workshop_quantity:qty }) });
      await fetchStock();
    }
    setEditingWorkshopQty(null);
  };

  const saveEmbroideryQty = async item => {
    const qty = parseInt(embroideryQtyValue);
    if (!isNaN(qty) && qty >= 0) {
      await apiFetch(`/api/stock/${item.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ embroidery_quantity:qty }) });
      await fetchStock();
    }
    setEditingEmbroideryQty(null);
  };

  const qtyStyle = item => {
    if (item.quantity <= item.low_stock_threshold) return { color:'#ef4444', fontWeight:'bold' };
    if (item.quantity <= item.low_stock_threshold*2) return { color:'#f59e0b', fontWeight:'600' };
    return { color:'#22c55e', fontWeight:'600' };
  };

  const handlePrintTag = item => {
    setPrintTagItem(item);
  };

  const isWorkshop = user?.role === 'workshop' || (user?.role === 'admin' && adminStockView === 'workshop');

  const displayStock = (
    isWorkshop
      ? stock.filter(item => item.source_type === 'manufactured')
      : stock
  ).filter(item => {
    if (!showZeroStock && !((item.quantity || 0) > 0 || (item.workshop_quantity || 0) > 0 || (item.embroidery_quantity || 0) > 0)) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchCategory = item.category?.toLowerCase().includes(q);
      const matchSize = String(item.size || '').toLowerCase().includes(q);
      const matchBarcode = String(item.barcode || '').toLowerCase().includes(q);
      return matchName || matchCategory || matchSize || matchBarcode;
    }
    return true;
  });

  const headers = isWorkshop
    ? ['Name','Category','Size','Source','Workshop Qty','Actions']
    : ['Name','Category','Size','Source','Shop Qty','Embroidery Qty','Price','Barcode','Actions'];

  const sweaters = displayStock.filter(item => item.category === 'Sweaters');
  const nonSweaters = displayStock.filter(item => item.category !== 'Sweaters');
  const totalSweaterShopQty = sweaters.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalSweaterWorkshopQty = sweaters.reduce((sum, item) => sum + (item.workshop_quantity || 0), 0);
  const totalSweaterEmbroideryQty = sweaters.reduce((sum, item) => sum + (item.embroidery_quantity || 0), 0);

  // Group sweaters by style name
  const sweatersGroupedByStyle = {};
  sweaters.forEach(item => {
    if (!sweatersGroupedByStyle[item.name]) {
      sweatersGroupedByStyle[item.name] = [];
    }
    sweatersGroupedByStyle[item.name].push(item);
  });

  // Group non-sweaters by style name
  const nonSweatersGroupedByStyle = {};
  nonSweaters.forEach(item => {
    if (!nonSweatersGroupedByStyle[item.name]) {
      nonSweatersGroupedByStyle[item.name] = [];
    }
    nonSweatersGroupedByStyle[item.name].push(item);
  });

  if (error) return <div className="rounded-lg p-4" style={{ background:'#fee2e2', color:'#991b1b' }}>{error}</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">
            {isWorkshop ? 'Workshop Stock Control' : 'Stock Manager'}
          </h2>
          <p className="text-sm mt-1 text-theme-secondary">{displayStock.length} items in inventory</p>
          <label className="flex items-center gap-2 text-xs text-theme-secondary cursor-pointer mt-1.5">
            <input
              type="checkbox"
              checked={showZeroStock}
              onChange={e => setShowZeroStock(e.target.checked)}
              className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
            />
            <span>Show items with zero stock</span>
          </label>
        </div>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-xs min-w-[200px]">
          <input
            type="text"
            placeholder="Search stock by name, category, size..."
            className="input text-sm w-full py-1.5 px-3"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {!isWorkshop && (
            <>
              <button onClick={() => setShowHistory(true)} className="btn-secondary text-sm">📋 Sales History</button>
              <button onClick={() => setShowSales(true)} className="btn-primary text-sm">💰 Record Daily Sales</button>
            </>
          )}
          {isWorkshop && (
            <button onClick={() => { setProdSearch(''); setSelectedProdStyle(null); setProdQuantities({}); setFormError(''); setShowProductionModal(true); }} className="btn-secondary text-sm">🧶 Log Production</button>
          )}
          {(user?.role === 'admin' || user?.role === 'workshop' || user?.role === 'attendant') && (
            <button onClick={openAdd} className="btn-primary text-sm">+ Add Stock</button>
          )}
        </div>
      </div>

      {/* Admin Tab Selector */}
      {user?.role === 'admin' && (
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1.5">
          <button
            onClick={() => setAdminStockView('shop')}
            className={`px-4 py-2.5 text-xs uppercase tracking-wider font-bold border-b-2 transition-colors ${adminStockView === 'shop' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            🏪 Shop Inventory
          </button>
          <button
            onClick={() => setAdminStockView('workshop')}
            className={`px-4 py-2.5 text-xs uppercase tracking-wider font-bold border-b-2 transition-colors ${adminStockView === 'workshop' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            🧶 Workshop Inventory
          </button>
        </div>
      )}

      {/* Stock table / cards */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4,5].map(i=><div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor:'var(--bg-muted)' }} />)}</div>
        ) : displayStock.length === 0 ? (
          <div className="text-center py-16 text-theme-secondary"><span className="text-5xl">📦</span><p className="mt-3">No stock items found.</p></div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor:'var(--bg-muted)', borderBottom:'1px solid var(--border)' }}>
                  <tr>{headers.map(h=>(
                    <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide text-theme-secondary font-medium">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {Object.keys(nonSweatersGroupedByStyle).map(styleName => {
                    const styleItems = nonSweatersGroupedByStyle[styleName];
                    if (styleItems.length === 1) {
                      const item = styleItems[0];
                      return (
                        <tr key={item.id} className="hover-theme" style={{ borderBottom:'1px solid var(--border-light)' }}>
                          <td className="py-3 px-4 font-medium text-theme-primary">{item.name}</td>
                          <td className="py-3 px-4 text-theme-secondary">{item.category||'--'}</td>
                          <td className="py-3 px-4 text-theme-secondary">{item.size||'--'}</td>
                          <td className="py-3 px-4 text-theme-secondary capitalize">{item.source_type}</td>
                          {isWorkshop ? (
                            <>
                              <td className="py-3 px-4 text-theme-secondary">
                                {item.source_type === 'manufactured' ? (
                                  (user?.role === 'workshop' || user?.role === 'admin') ? (
                                    editingWorkshopQty === item.id
                                      ? <input ref={qtyRef} type="number" min="0" value={workshopQtyValue} onChange={e=>setWorkshopQtyValue(e.target.value)} onBlur={()=>saveWorkshopQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveWorkshopQty(item);if(e.key==='Escape')setEditingWorkshopQty(null);}} className="input w-20" />
                                      : <button onClick={()=>{setEditingWorkshopQty(item.id);setWorkshopQtyValue(String(item.workshop_quantity));}} className="hover:underline font-semibold text-theme-primary">{item.workshop_quantity}</button>
                                  ) : (
                                    <span className="font-semibold text-theme-primary">{item.workshop_quantity}</span>
                                  )
                                ) : '—'}
                              </td>
                              <td className="py-3 px-4">
                                {(user?.role === 'workshop' || user?.role === 'admin') && item.source_type === 'manufactured' && (
                                  <button onClick={()=>openEdit(item)} className="text-xs font-medium mr-3" style={{ color:'#6366f1' }}>Edit</button>
                                )}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3 px-4">
                                {item.source_type === 'purchased' ? (
                                  editingQty === item.id
                                    ? <input ref={qtyRef} type="number" min="0" value={qtyValue} onChange={e=>setQtyValue(e.target.value)} onBlur={()=>saveQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveQty(item);if(e.key==='Escape')setEditingQty(null);}} className="input w-20" />
                                    : <button onClick={()=>{setEditingQty(item.id);setQtyValue(String(item.quantity));}} style={qtyStyle(item)} className="hover:underline">{item.quantity}</button>
                                ) : (
                                  <span style={qtyStyle(item)}>{item.quantity}</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-theme-secondary">
                                {item.source_type === 'manufactured' ? (
                                  <span className="font-semibold" style={{ color: '#a855f7' }}>{item.embroidery_quantity || 0}</span>
                                ) : '—'}
                              </td>
                              <td className="py-3 px-4 text-theme-primary">{item.price!=null?KSH+Number(item.price).toFixed(2):'--'}</td>
                              <td className="py-3 px-4 text-theme-secondary font-mono text-xs">{item.barcode||'--'}</td>
                              <td className="py-3 px-4">
                                <button onClick={()=>openEdit(item)} className="text-xs font-medium mr-3" style={{ color:'#6366f1' }}>Edit</button>
                                {user?.role === 'admin' && (
                                  <button onClick={()=>setDeleteConfirm(item)} className="text-xs font-medium mr-3" style={{ color:'#ef4444' }}>Delete</button>
                                )}
                                <button onClick={()=>handlePrintTag(item)} className="text-xs font-medium text-emerald-600 hover:underline">🏷️ Tag</button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    }

                    // Render group with expander
                    const totalShopQty = styleItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                    const totalWorkshopQty = styleItems.reduce((sum, item) => sum + (item.workshop_quantity || 0), 0);
                    const totalEmbroideryQty = styleItems.reduce((sum, item) => sum + (item.embroidery_quantity || 0), 0);
                    const firstItem = styleItems[0];
                    const isExpanded = !!expandedStyles[styleName];

                    return (
                      <React.Fragment key={styleName}>
                        <tr className="bg-indigo-50/10 dark:bg-indigo-950/10 hover-theme" style={{ borderBottom:'1px solid var(--border)' }}>
                          <td className="py-3 px-4 flex items-center gap-2 font-semibold text-theme-primary">
                            <button
                              onClick={() => setExpandedStyles(prev => ({ ...prev, [styleName]: !prev[styleName] }))}
                              className="text-indigo-600 dark:text-indigo-400 font-bold text-xs w-6 h-6 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded"
                              type="button"
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                            <span>{styleName} ({styleItems.length} sizes)</span>
                          </td>
                          <td className="py-3 px-4 text-theme-secondary">{firstItem.category}</td>
                          <td className="py-3 px-4 text-theme-secondary font-medium">Mixed</td>
                          <td className="py-3 px-4 text-theme-secondary capitalize">{firstItem.source_type}</td>
                          {isWorkshop ? (
                            <>
                              <td className="py-3 px-4 text-indigo-600 font-bold">{totalWorkshopQty}</td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => setExpandedStyles(prev => ({ ...prev, [styleName]: !prev[styleName] }))}
                                  className="text-xs font-semibold text-indigo-600 hover:underline"
                                >
                                  {isExpanded ? 'Collapse' : 'Expand'}
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3 px-4 text-indigo-600 font-bold">{totalShopQty}</td>
                              <td className="py-3 px-4 font-bold" style={{ color: '#a855f7' }}>{totalEmbroideryQty > 0 ? totalEmbroideryQty : '—'}</td>
                              <td className="py-3 px-4 text-theme-secondary">—</td>
                              <td className="py-3 px-4 text-theme-secondary">—</td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => setExpandedStyles(prev => ({ ...prev, [styleName]: !prev[styleName] }))}
                                  className="text-xs font-semibold text-indigo-600 hover:underline"
                                >
                                  {isExpanded ? 'Collapse' : 'Expand'}
                                </button>
                              </td>
                            </>
                          )}
                        </tr>

                        {isExpanded && styleItems.map(item => (
                          <tr key={item.id} className="hover-theme" style={{ borderBottom:'1px solid var(--border-light)', backgroundColor:'rgba(99,102,241,0.02)' }}>
                            <td className="py-2.5 px-4 pl-12 text-theme-secondary font-medium">Size {item.size || '--'}</td>
                            <td className="py-2.5 px-4 text-theme-muted">{item.category}</td>
                            <td className="py-2.5 px-4 text-theme-secondary">{item.size || '--'}</td>
                            <td className="py-2.5 px-4 text-theme-secondary capitalize">{item.source_type}</td>
                            {isWorkshop ? (
                              <>
                                <td className="py-2.5 px-4 text-theme-secondary">
                                  {item.source_type === 'manufactured' ? (
                                    (user?.role === 'workshop' || user?.role === 'admin') ? (
                                      editingWorkshopQty === item.id
                                        ? <input ref={qtyRef} type="number" min="0" value={workshopQtyValue} onChange={e=>setWorkshopQtyValue(e.target.value)} onBlur={()=>saveWorkshopQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveWorkshopQty(item);if(e.key==='Escape')setEditingWorkshopQty(null);}} className="input w-20" />
                                        : <button onClick={()=>{setEditingWorkshopQty(item.id);setWorkshopQtyValue(String(item.workshop_quantity));}} className="hover:underline font-semibold text-theme-primary">{item.workshop_quantity}</button>
                                    ) : (
                                      <span className="font-semibold text-theme-primary">{item.workshop_quantity}</span>
                                    )
                                  ) : '—'}
                                </td>
                                <td className="py-2.5 px-4">
                                  {(user?.role === 'workshop' || user?.role === 'admin') && item.source_type === 'manufactured' && (
                                    <button onClick={()=>openEdit(item)} className="text-xs font-medium mr-3" style={{ color:'#6366f1' }}>Edit</button>
                                  )}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2.5 px-4">
                                  {item.source_type === 'purchased' ? (
                                    editingQty === item.id
                                      ? <input ref={qtyRef} type="number" min="0" value={qtyValue} onChange={e=>setQtyValue(e.target.value)} onBlur={()=>saveQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveQty(item);if(e.key==='Escape')setEditingQty(null);}} className="input w-20" />
                                      : <button onClick={()=>{setEditingQty(item.id);setQtyValue(String(item.quantity));}} style={qtyStyle(item)} className="hover:underline">{item.quantity}</button>
                                  ) : (
                                    <span style={qtyStyle(item)}>{item.quantity}</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-theme-secondary">
                                  {item.source_type === 'manufactured' ? (
                                    <span className="font-semibold" style={{ color: '#a855f7' }}>{item.embroidery_quantity || 0}</span>
                                  ) : '—'}
                                </td>
                                <td className="py-2.5 px-4 text-theme-primary">{item.price!=null?KSH+Number(item.price).toFixed(2):'--'}</td>
                                <td className="py-2.5 px-4 text-theme-secondary font-mono text-xs">{item.barcode||'--'}</td>
                                <td className="py-2.5 px-4">
                                  <button onClick={()=>openEdit(item)} className="text-xs font-medium mr-3" style={{ color:'#6366f1' }}>Edit</button>
                                  {user?.role === 'admin' && (
                                    <button onClick={()=>setDeleteConfirm(item)} className="text-xs font-medium mr-3" style={{ color:'#ef4444' }}>Delete</button>
                                  )}
                                  <button onClick={()=>handlePrintTag(item)} className="text-xs font-medium text-emerald-600 hover:underline">🏷️ Tag</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {sweaters.length > 0 && (
                    <>
                      <tr className="bg-indigo-50/20 dark:bg-indigo-950/20 font-semibold" style={{ borderBottom:'1px solid var(--border)' }}>
                        <td className="py-3 px-4 flex items-center gap-2 text-theme-primary">
                          <button
                            onClick={() => setSweatersExpanded(!sweatersExpanded)}
                            className="text-indigo-600 dark:text-indigo-400 font-bold text-xs w-6 h-6 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded"
                            type="button"
                          >
                            {sweatersExpanded ? '▼' : '▶'}
                          </button>
                          <span>🧶 Sweaters ({sweaters.length} items)</span>
                        </td>
                        <td className="py-3 px-4 text-theme-secondary">Sweaters</td>
                        <td className="py-3 px-4 text-theme-secondary">—</td>
                        <td className="py-3 px-4 text-theme-secondary capitalize">Mixed</td>
                        {isWorkshop ? (
                          <>
                            <td className="py-3 px-4 text-indigo-600 font-bold">{totalSweaterWorkshopQty}</td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => setSweatersExpanded(!sweatersExpanded)}
                                className="text-xs font-semibold text-indigo-600 hover:underline"
                              >
                                {sweatersExpanded ? 'Collapse' : 'Expand All'}
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 text-indigo-600 font-bold">{totalSweaterShopQty}</td>
                            <td className="py-3 px-4 font-bold" style={{ color: '#a855f7' }}>{totalSweaterEmbroideryQty > 0 ? totalSweaterEmbroideryQty : '—'}</td>
                            <td className="py-3 px-4 text-theme-secondary">—</td>
                            <td className="py-3 px-4 text-theme-secondary">—</td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => setSweatersExpanded(!sweatersExpanded)}
                                className="text-xs font-semibold text-indigo-600 hover:underline"
                              >
                                {sweatersExpanded ? 'Collapse' : 'Expand All'}
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                      {sweatersExpanded && Object.keys(sweatersGroupedByStyle).map(styleName => {
                        const styleItems = sweatersGroupedByStyle[styleName];
                        const styleShopQty = styleItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                        const styleWorkshopQty = styleItems.reduce((sum, item) => sum + (item.workshop_quantity || 0), 0);
                        const styleEmbroideryQty = styleItems.reduce((sum, item) => sum + (item.embroidery_quantity || 0), 0);
                        const isStyleExpanded = !!expandedStyles[styleName];

                        return (
                          <React.Fragment key={styleName}>
                            {/* Style group row */}
                            <tr className="bg-indigo-50/10 dark:bg-indigo-950/10 hover-theme" style={{ borderBottom:'1px solid var(--border-light)' }}>
                              <td className="py-2.5 px-4 pl-8 flex items-center gap-2 font-medium text-theme-primary">
                                <button
                                  onClick={() => setExpandedStyles(prev => ({ ...prev, [styleName]: !prev[styleName] }))}
                                  className="text-xs font-bold w-5 h-5 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded"
                                  type="button"
                                >
                                  {isStyleExpanded ? '▼' : '▶'}
                                </button>
                                <span>{styleName}</span>
                              </td>
                              <td className="py-2.5 px-4 text-theme-secondary">Sweaters</td>
                              <td className="py-2.5 px-4 text-theme-secondary font-medium">Sizes 22-40</td>
                              <td className="py-2.5 px-4 text-theme-secondary capitalize">Manufactured</td>
                              {isWorkshop ? (
                                <>
                                  <td className="py-2.5 px-4 text-theme-primary font-semibold">{styleWorkshopQty}</td>
                                  <td className="py-2.5 px-4">
                                    <button
                                      onClick={() => setExpandedStyles(prev => ({ ...prev, [styleName]: !prev[styleName] }))}
                                      className="text-xs font-semibold text-indigo-600 hover:underline"
                                    >
                                      {isStyleExpanded ? 'Hide Sizes' : 'Show Sizes'}
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="py-2.5 px-4 text-theme-primary font-semibold">{styleShopQty}</td>
                                  <td className="py-2.5 px-4 font-semibold" style={{ color: '#a855f7' }}>{styleEmbroideryQty > 0 ? styleEmbroideryQty : '—'}</td>
                                  <td className="py-2.5 px-4 text-theme-secondary">—</td>
                                  <td className="py-2.5 px-4 text-theme-secondary">—</td>
                                  <td className="py-2.5 px-4">
                                    <button
                                      onClick={() => setExpandedStyles(prev => ({ ...prev, [styleName]: !prev[styleName] }))}
                                      className="text-xs font-semibold text-indigo-600 hover:underline"
                                    >
                                      {isStyleExpanded ? 'Hide Sizes' : 'Show Sizes'}
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>

                            {/* Render individual sizes only if expanded */}
                            {isStyleExpanded && styleItems.map(item => (
                              <tr key={item.id} className="hover-theme" style={{ borderBottom:'1px solid var(--border-light)', backgroundColor:'rgba(99,102,241,0.02)' }}>
                                <td className="py-2 px-4 pl-16 text-theme-secondary font-medium">Size {item.size}</td>
                                <td className="py-2 px-4 text-theme-muted">{item.category}</td>
                                <td className="py-2 px-4 text-theme-secondary">{item.size}</td>
                                <td className="py-2 px-4 text-theme-secondary capitalize">{item.source_type}</td>
                                {isWorkshop ? (
                                  <>
                                    <td className="py-2 px-4 text-theme-secondary">
                                      {item.source_type === 'manufactured' ? (
                                        (user?.role === 'workshop' || user?.role === 'admin') ? (
                                          editingWorkshopQty === item.id
                                            ? <input ref={qtyRef} type="number" min="0" value={workshopQtyValue} onChange={e=>setWorkshopQtyValue(e.target.value)} onBlur={()=>saveWorkshopQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveWorkshopQty(item);if(e.key==='Escape')setEditingWorkshopQty(null);}} className="input w-20" />
                                            : <button onClick={()=>{setEditingWorkshopQty(item.id);setWorkshopQtyValue(String(item.workshop_quantity));}} className="hover:underline font-semibold text-theme-primary">{item.workshop_quantity}</button>
                                        ) : (
                                          <span className="font-semibold text-theme-primary">{item.workshop_quantity}</span>
                                        )
                                      ) : '—'}
                                    </td>
                                    <td className="py-2 px-4">
                                      {(user?.role === 'workshop' || user?.role === 'admin') && item.source_type === 'manufactured' && (
                                        <button onClick={()=>openEdit(item)} className="text-xs font-medium mr-3" style={{ color:'#6366f1' }}>Edit</button>
                                      )}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2 px-4">
                                      {item.source_type === 'purchased' ? (
                                        editingQty === item.id
                                          ? <input ref={qtyRef} type="number" min="0" value={qtyValue} onChange={e=>setQtyValue(e.target.value)} onBlur={()=>saveQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveQty(item);if(e.key==='Escape')setEditingQty(null);}} className="input w-20" />
                                          : <button onClick={()=>{setEditingQty(item.id);setQtyValue(String(item.quantity));}} style={qtyStyle(item)} className="hover:underline">{item.quantity}</button>
                                      ) : (
                                        <span style={qtyStyle(item)}>{item.quantity}</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-4 text-theme-secondary">
                                      {item.source_type === 'manufactured' ? (
                                        <span className="font-semibold" style={{ color: '#a855f7' }}>{item.embroidery_quantity || 0}</span>
                                      ) : '—'}
                                    </td>
                                    <td className="py-2 px-4 text-theme-primary">{item.price!=null?KSH+Number(item.price).toFixed(2):'--'}</td>
                                    <td className="py-2 px-4 text-theme-secondary font-mono text-xs">{item.barcode||'--'}</td>
                                    <td className="py-2 px-4">
                                      <button onClick={()=>openEdit(item)} className="text-xs font-medium mr-3" style={{ color:'#6366f1' }}>Edit</button>
                                      {user?.role === 'admin' && (
                                        <button onClick={()=>setDeleteConfirm(item)} className="text-xs font-medium mr-3" style={{ color:'#ef4444' }}>Delete</button>
                                      )}
                                      <button onClick={()=>handlePrintTag(item)} className="text-xs font-medium text-emerald-600 hover:underline">🏷️ Tag</button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden">
              {Object.keys(nonSweatersGroupedByStyle).map(styleName => {
                const styleItems = nonSweatersGroupedByStyle[styleName];
                if (styleItems.length === 1) {
                  const item = styleItems[0];
                  return (
                    <div key={item.id} className="p-4" style={{ borderBottom:'1px solid var(--border-light)' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-theme-primary">{item.name}</p>
                          <p className="text-xs text-theme-secondary">
                            {item.category||'--'}{item.size?` - ${item.size}`:''} • <span className="capitalize">{item.source_type}</span>
                          </p>
                          {!isWorkshop && item.barcode && <p className="text-xs text-theme-muted font-mono mt-0.5">BC: {item.barcode}</p>}
                        </div>
                        <div className="text-right">
                          {isWorkshop ? (
                            item.source_type === 'manufactured' && (
                              editingWorkshopQty === item.id ? (
                                <input ref={qtyRef} type="number" min="0" value={workshopQtyValue} onChange={e=>setWorkshopQtyValue(e.target.value)} onBlur={()=>saveWorkshopQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveWorkshopQty(item);}} className="input w-20" />
                              ) : (
                                <button onClick={()=>{if(user?.role==='workshop'||user?.role==='admin'){setEditingWorkshopQty(item.id);setWorkshopQtyValue(String(item.workshop_quantity));}}} style={{ fontSize:'1.1rem' }} className="text-theme-secondary hover:underline block font-semibold">
                                  {item.workshop_quantity}
                                </button>
                              )
                            )
                          ) : (
                            <>
                              {user?.role !== 'workshop' && item.source_type === 'purchased' ? (
                                editingQty===item.id
                                  ? <input ref={qtyRef} type="number" min="0" value={qtyValue} onChange={e=>setQtyValue(e.target.value)} onBlur={()=>saveQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveQty(item);}} className="input w-20" />
                                  : <button onClick={()=>{setEditingQty(item.id);setQtyValue(String(item.quantity));}} style={{ ...qtyStyle(item), fontSize:'1.1rem' }} className="hover:underline">{item.quantity}</button>
                              ) : (
                                <span style={{ ...qtyStyle(item), fontSize:'1.1rem' }}>{item.quantity}</span>
                              )}
                              <p className="text-xs text-theme-muted font-medium">shop qty</p>
                            </>
                          )}
                          {isWorkshop && <p className="text-xs text-theme-muted font-medium">workshop qty</p>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-3 text-xs text-theme-secondary">
                          {!isWorkshop && <span>Price: <strong className="text-theme-primary">{item.price!=null?KSH+Number(item.price).toFixed(2):'--'}</strong></span>}
                        </div>
                        <div className="flex gap-3">
                          {((isWorkshop && item.source_type === 'manufactured') || !isWorkshop) && (
                            <button onClick={()=>openEdit(item)} className="text-xs font-medium" style={{ color:'#6366f1' }}>Edit</button>
                          )}
                          {user?.role === 'admin' && (
                            <button onClick={()=>setDeleteConfirm(item)} className="text-xs font-medium" style={{ color:'#ef4444' }}>Delete</button>
                          )}
                          {!isWorkshop && <button onClick={()=>handlePrintTag(item)} className="text-xs font-medium text-emerald-600 hover:underline">🏷️ Tag</button>}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Render group mobile card
                const totalShopQty = styleItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const totalWorkshopQty = styleItems.reduce((sum, item) => sum + (item.workshop_quantity || 0), 0);
                const firstItem = styleItems[0];
                const isExpanded = !!expandedStyles[styleName];

                return (
                  <div key={styleName} className="p-4" style={{ borderBottom:'1px solid var(--border-light)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-theme-primary">{styleName}</p>
                        <p className="text-xs text-theme-secondary">{firstItem.category} • {styleItems.length} sizes</p>
                        <p className="text-[11px] text-theme-secondary mt-0.5">
                          {isWorkshop ? (
                            <>Worksp: <strong className="text-theme-primary">{totalWorkshopQty}</strong></>
                          ) : (
                            <>Shop: <strong className="text-theme-primary">{totalShopQty}</strong></>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => setExpandedStyles(prev => ({ ...prev, [styleName]: !prev[styleName] }))}
                        className="px-3 py-1 text-xs font-bold rounded-lg border bg-white dark:bg-zinc-950"
                        style={{ color:'#6366f1', borderColor:'rgba(99,102,241,0.2)' }}
                      >
                        {isExpanded ? 'Hide Sizes' : 'Show Sizes'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-3">
                        {styleItems.map(item => (
                          <div key={item.id} className="py-2" style={{ borderBottom:'1px dashed var(--border-light)' }}>
                            <div className="flex items-start justify-between mb-1">
                              <div>
                                <p className="font-semibold text-xs text-theme-primary">Size: {item.size || '--'}</p>
                                <p className="text-[10px] text-theme-muted">{item.source_type}</p>
                              </div>
                              <div className="text-right">
                                {isWorkshop ? (
                                  item.source_type === 'manufactured' && (
                                    editingWorkshopQty === item.id ? (
                                      <input ref={qtyRef} type="number" min="0" value={workshopQtyValue} onChange={e=>setWorkshopQtyValue(e.target.value)} onBlur={()=>saveWorkshopQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveWorkshopQty(item);}} className="input w-16 mt-0.5" />
                                    ) : (
                                      <button onClick={()=>{if(user?.role==='workshop'||user?.role==='admin'){setEditingWorkshopQty(item.id);setWorkshopQtyValue(String(item.workshop_quantity));}}} className="text-[10px] text-theme-secondary hover:underline block mt-0.5 font-bold">
                                        Worksp: {item.workshop_quantity}
                                      </button>
                                    )
                                  )
                                ) : (
                                  <>
                                    <span style={{ ...qtyStyle(item), fontSize:'0.9rem' }}>Shop: {item.quantity}</span>
                                    {item.source_type === 'manufactured' && (
                                      <span className="text-[10px] text-theme-secondary block mt-0.5 font-bold">
                                        Emb: {item.embroidery_quantity || 0}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] mt-1">
                              <span className="text-theme-muted">
                                {!isWorkshop && `Price: ${item.price!=null?KSH+Number(item.price).toFixed(2):'--'}`}
                                {item.last_adjusted_by && (
                                  <span className="ml-2 italic text-[10px] text-indigo-600 dark:text-indigo-400">
                                    (Adjusted: {item.last_adjusted_by})
                                  </span>
                                )}
                              </span>
                              <div className="flex gap-2">
                                {((isWorkshop && item.source_type === 'manufactured') || !isWorkshop) && (
                                  <button onClick={()=>openEdit(item)} className="text-indigo-600 font-medium">Edit</button>
                                )}
                                {user?.role === 'admin' && (
                                  <button onClick={()=>setDeleteConfirm(item)} className="text-red-500 font-medium">Delete</button>
                                )}
                                {!isWorkshop && <button onClick={()=>handlePrintTag(item)} className="text-emerald-600 font-medium">Tag</button>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {sweaters.length > 0 && (
                <div className="p-4 bg-indigo-50/10 dark:bg-indigo-950/10" style={{ borderBottom:'1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-theme-primary text-sm">🧶 Sweaters Group ({sweaters.length} items)</p>
                      <p className="text-[11px] text-theme-secondary mt-0.5">
                        {isWorkshop ? (
                          <>Worksp: <strong className="text-theme-primary">{totalSweaterWorkshopQty}</strong></>
                        ) : (
                          <>Shop: <strong className="text-theme-primary">{totalSweaterShopQty}</strong></>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setSweatersExpanded(!sweatersExpanded)}
                      className="px-3 py-1 text-xs font-bold rounded-lg border bg-white dark:bg-zinc-950"
                      style={{ color:'#6366f1', borderColor:'rgba(99,102,241,0.2)' }}
                    >
                      {sweatersExpanded ? 'Hide All' : 'Expand All'}
                    </button>
                  </div>

                  {sweatersExpanded && (
                    <div className="mt-3 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-4">
                      {Object.keys(sweatersGroupedByStyle).map(styleName => {
                        const styleItems = sweatersGroupedByStyle[styleName];
                        const styleShopQty = styleItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                        const styleWorkshopQty = styleItems.reduce((sum, item) => sum + (item.workshop_quantity || 0), 0);
                        const isStyleExpanded = !!expandedStyles[styleName];

                        return (
                          <div key={styleName} className="space-y-2">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border" style={{ borderColor: 'var(--border)' }}>
                              <div>
                                <p className="font-semibold text-xs text-theme-primary">{styleName}</p>
                                <p className="text-[10px] text-theme-muted mt-0.5">
                                  {isWorkshop ? (
                                    <>Worksp: {styleWorkshopQty}</>
                                  ) : (
                                    <>Shop: {styleShopQty}</>
                                  )}
                                </p>
                              </div>
                              <button
                                onClick={() => setExpandedStyles(prev => ({ ...prev, [styleName]: !prev[styleName] }))}
                                className="text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200 text-indigo-600 dark:border-zinc-700 dark:text-indigo-400"
                              >
                                {isStyleExpanded ? 'Hide Sizes' : 'Show Sizes'}
                              </button>
                            </div>

                            {isStyleExpanded && (
                              <div className="pl-3 space-y-3">
                                {styleItems.map(item => (
                                  <div key={item.id} className="py-2" style={{ borderBottom:'1px dashed var(--border-light)' }}>
                                    <div className="flex items-start justify-between mb-1">
                                      <div>
                                        <p className="font-medium text-xs text-theme-secondary">Size {item.size}</p>
                                        <p className="text-[9px] text-theme-muted">{item.source_type}</p>
                                      </div>
                                      <div className="text-right">
                                        {isWorkshop ? (
                                          item.source_type === 'manufactured' && (
                                            editingWorkshopQty === item.id ? (
                                              <input ref={qtyRef} type="number" min="0" value={workshopQtyValue} onChange={e=>setWorkshopQtyValue(e.target.value)} onBlur={()=>saveWorkshopQty(item)} onKeyDown={e=>{if(e.key==='Enter')saveWorkshopQty(item);}} className="input w-16 mt-0.5" />
                                            ) : (
                                              <button onClick={()=>{if(user?.role==='workshop'||user?.role==='admin'){setEditingWorkshopQty(item.id);setWorkshopQtyValue(String(item.workshop_quantity));}}} className="text-[10px] text-theme-secondary hover:underline block mt-0.5 font-bold">
                                                Worksp: {item.workshop_quantity}
                                              </button>
                                            )
                                          )
                                        ) : (
                                          <>
                                            <span style={{ ...qtyStyle(item), fontSize:'0.9rem' }}>Shop: {item.quantity}</span>
                                            {item.source_type === 'manufactured' && (
                                              <span className="text-[10px] text-theme-secondary block mt-0.5 font-bold">
                                                Emb: {item.embroidery_quantity || 0}
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] mt-1">
                                      <span className="text-theme-muted">{!isWorkshop && `Price: ${item.price!=null?KSH+Number(item.price).toFixed(2):'--'}`}</span>
                                      <div className="flex gap-2">
                                        {((isWorkshop && item.source_type === 'manufactured') || !isWorkshop) && (
                                          <button onClick={()=>openEdit(item)} className="text-indigo-600 font-medium">Edit</button>
                                        )}
                                        {user?.role === 'admin' && (
                                          <button onClick={()=>setDeleteConfirm(item)} className="text-red-500 font-medium">Delete</button>
                                        )}
                                        {!isWorkshop && <button onClick={()=>handlePrintTag(item)} className="text-emerald-600 font-medium">Tag</button>}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal title={editItem?'Edit Stock Item':'Add Stock Item'} onClose={()=>setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <p className="text-sm p-2 rounded" style={{ background:'#fee2e2', color:'#991b1b' }}>{formError}</p>}
            <div>
              <label className="label">Name *</label>
              {form.category === 'Sweaters' ? (
                <select className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}>
                  {SWEATER_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                </select>
              ) : form.category === 'Tracksuits' ? (
                <select className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}>
                  {TRACKSUIT_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                </select>
              ) : form.category === 'Socks' ? (
                <select className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}>
                  {SOCK_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                </select>
              ) : form.category === 'Fleece Jackets' ? (
                <select className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}>
                  {FLEECE_JACKET_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                </select>
              ) : (
                <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Boys Shirt" />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Source Type</label>
                <select className="input" value={form.source_type} onChange={e=>setForm(f=>({...f,source_type:e.target.value}))} disabled={user?.role === 'workshop'}>
                  <option value="purchased">Purchased (Direct to Shop)</option>
                  <option value="manufactured">Manufactured (Workshop)</option>
                </select>
              </div>
              <div>
                <label className="label">Barcode / SKU</label>
                <input className="input" value={form.barcode} onChange={e=>setForm(f=>({...f,barcode:e.target.value}))} placeholder="e.g. 7123456789" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => {
                    const cat = e.target.value;
                    setForm(f => ({
                      ...f,
                      category: cat,
                      source_type: (cat === 'Sweaters' || cat === 'Tracksuits' || cat === 'Fleece Jackets') ? 'manufactured' : f.source_type,
                      name: cat === 'Sweaters' && !SWEATER_STYLES.includes(f.name) ? 'Sweater: Navy Plain'
                          : cat === 'Tracksuits' && !TRACKSUIT_STYLES.includes(f.name) ? 'Tracksuit: Black with White stripes'
                          : cat === 'Socks' && !SOCK_STYLES.includes(f.name) ? 'Socks: White Plain'
                          : cat === 'Fleece Jackets' && !FLEECE_JACKET_STYLES.includes(f.name) ? 'Fleece Jacket: Navy Blue'
                          : f.name,
                      size: (cat === 'Sweaters' || cat === 'Tracksuits') ? '22' : f.size
                    }));
                  }}>
                    <option value="">Select...</option>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                {editItem ? (
                  <div>
                    <label className="label">Size</label>
                    {(form.category === 'Sweaters' || form.category === 'Tracksuits') ? (
                      <select className="input" value={form.size} onChange={e=>setForm(f=>({...f,size:e.target.value}))}>
                        {['22', '24', '26', '28', '30', '32', '34', '36', '38', '40'].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                      </select>
                    ) : (
                      <input className="input" value={form.size} onChange={e=>setForm(f=>({...f,size:e.target.value}))} placeholder="e.g. Age 7-8" />
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="label">Single Size Input (Optional)</label>
                    <input
                      className="input"
                      value={form.size}
                      onChange={e=>setForm(f=>({...f,size:e.target.value}))}
                      placeholder="e.g. Age 7-8"
                      disabled={form.category === 'Sweaters' || form.category === 'Tracksuits'}
                    />
                  </div>
                )}
              </div>

              {form.category === 'Other' && (
                <div>
                  <label className="label">Custom Category Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Aprons, Chef Coats"
                    value={form.custom_category}
                    onChange={(e) => setForm(f => ({ ...f, custom_category: e.target.value }))}
                  />
                </div>
              )}

              {!editItem && (
                <div className="border-t border-zinc-150 pt-3">
                  <label className="label font-bold text-indigo-700 dark:text-indigo-400">Select Sizes to Add *</label>
                  <div className="grid grid-cols-5 gap-2 border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg max-h-32 overflow-y-auto bg-zinc-50 dark:bg-zinc-900/30">
                    {[
                      '20', '22', '24', '26', '28', '30', '32', '34', '36', '38', '40', '42',
                      'S', 'M', 'L', 'XL', 'XXL',
                      'Age 3-4', 'Age 5-6', 'Age 7-8', 'Age 9-10', 'Age 11-12', 'Age 13-14'
                    ].map(sz => {
                      const isChecked = (form.selectedSizes || []).includes(sz);
                      return (
                        <label key={sz} className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-theme-primary">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm(f => ({ ...f, selectedSizes: [...(f.selectedSizes || []), sz] }));
                              } else {
                                setForm(f => ({ ...f, selectedSizes: (f.selectedSizes || []).filter(x => x !== sz) }));
                              }
                            }}
                          />
                          {sz}
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex gap-2 items-center">
                    <button
                      type="button"
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded"
                      onClick={() => {
                        const sz = form.size.trim();
                        if (sz && !(form.selectedSizes || []).includes(sz)) {
                          setForm(f => ({ ...f, selectedSizes: [...(f.selectedSizes || []), sz], size: '' }));
                        }
                      }}
                      disabled={!form.size.trim()}
                    >
                      + Link Size Input
                    </button>
                  </div>

                  {form.selectedSizes && form.selectedSizes.length > 0 && (
                    <div className="mt-2 flex flex-col gap-2">
                      <span className="text-[10px] text-theme-muted font-bold uppercase shrink-0">Selected Sizes Quantities:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {form.selectedSizes.map(sz => (
                        <div key={sz} className="flex flex-col bg-indigo-50 dark:bg-indigo-950/20 p-2 rounded border border-indigo-100 dark:border-indigo-900/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-indigo-800 dark:text-indigo-400">{sz}</span>
                            <button
                                type="button"
                                className="text-red-500 hover:text-red-700 font-extrabold text-sm ml-1 leading-none"
                                onClick={() => setForm(f => ({ ...f, selectedSizes: f.selectedSizes.filter(x => x !== sz) }))}
                              >
                                &times;
                              </button>
                          </div>
                          <div className="flex gap-2">
                             <input type="number" min="0" placeholder="Shop Qty" className="input py-1 px-2 text-xs flex-1" 
                               value={form.sizeQuantities?.[sz] !== undefined ? form.sizeQuantities[sz] : form.quantity}
                               onChange={e => setForm(f => ({...f, sizeQuantities: {...(f.sizeQuantities||{}), [sz]: e.target.value}}))}
                               title="Shop Quantity"
                             />
                             <input type="number" min="0" placeholder="Workshop Qty" className="input py-1 px-2 text-xs flex-1" 
                               value={form.sizeWorkshopQuantities?.[sz] !== undefined ? form.sizeWorkshopQuantities[sz] : form.workshop_quantity}
                               onChange={e => setForm(f => ({...f, sizeWorkshopQuantities: {...(f.sizeWorkshopQuantities||{}), [sz]: e.target.value}}))}
                               disabled={form.source_type === 'purchased'}
                               title="Workshop Quantity"
                             />
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Shop Quantity {!editItem && form.selectedSizes?.length > 0 && <span className="text-[9px] font-bold text-indigo-500">(Auto-Summed)</span>}</label>
                <input 
                  type="number" 
                  min="0" 
                  className="input" 
                  value={!editItem && form.selectedSizes?.length > 0 ? form.selectedSizes.reduce((sum, sz) => sum + (form.sizeQuantities?.[sz] ? parseInt(form.sizeQuantities[sz]) : 0), 0) : form.quantity} 
                  onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} 
                  disabled={user?.role === 'workshop' || (form.source_type === 'manufactured' && editItem && !overrideShopQty) || (!editItem && form.selectedSizes?.length > 0)} 
                />
                {form.source_type === 'manufactured' && editItem && (
                  <div className="mt-1 flex flex-col gap-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      <input
                        type="checkbox"
                        checked={overrideShopQty}
                        onChange={(e) => setOverrideShopQty(e.target.checked)}
                      />
                      Override & Adjust Directly
                    </label>
                    {!overrideShopQty && (
                      <p className="text-[10px] text-theme-muted">{user?.role === 'workshop' ? 'Managed by workshop stock control' : 'Managed via dispatches'}</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="label">Workshop Quantity {!editItem && form.selectedSizes?.length > 0 && <span className="text-[9px] font-bold text-indigo-500">(Auto-Summed)</span>}</label>
                <input type="number" min="0" className="input" value={!editItem && form.selectedSizes?.length > 0 ? form.selectedSizes.reduce((sum, sz) => sum + (form.sizeWorkshopQuantities?.[sz] ? parseInt(form.sizeWorkshopQuantities[sz]) : 0), 0) : form.workshop_quantity} onChange={e=>setForm(f=>({...f,workshop_quantity:e.target.value}))} disabled={form.source_type === 'purchased' || (!editItem && form.selectedSizes?.length > 0)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Price (Ksh)</label>
                <input type="number" min="0" step="0.01" className="input" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} />
              </div>
              <div>
                <label className="label">Low Stock Threshold</label>
                <input type="number" min="0" className="input" value={form.low_stock_threshold} onChange={e=>setForm(f=>({...f,low_stock_threshold:e.target.value}))} />
              </div>
            </div>

            {/* PIN Authorization for direct stock adjustments */}
            {((!editItem && (
                ((!editItem && form.selectedSizes?.length > 0) ? form.selectedSizes.reduce((sum, sz) => sum + (form.sizeQuantities?.[sz] ? parseInt(form.sizeQuantities[sz]) : 0), 0) : parseInt(form.quantity || 0)) > 0 || 
                ((!editItem && form.selectedSizes?.length > 0) ? form.selectedSizes.reduce((sum, sz) => sum + (form.sizeWorkshopQuantities?.[sz] ? parseInt(form.sizeWorkshopQuantities[sz]) : 0), 0) : parseInt(form.workshop_quantity || 0)) > 0
              )) || (editItem && (
                parseInt(form.quantity || 0) !== parseInt(editItem.quantity || 0) ||
                parseInt(form.workshop_quantity || 0) !== parseInt(editItem.workshop_quantity || 0) ||
                parseInt(form.embroidery_quantity || 0) !== parseInt(editItem.embroidery_quantity || 0)
              ))
            ) && (
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                <label className="label text-indigo-800 dark:text-indigo-300 font-bold flex items-center gap-1">
                  <span>🔐</span> Staff Authorization PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  className="input font-mono tracking-widest text-center text-sm py-1.5"
                  placeholder="Enter 4-Digit PIN to Save"
                  value={form.pin || ''}
                  onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                />
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  Direct stock adjustments require your security PIN code for auditing.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving...':editItem?'Update':'Add Item'}</button>
              <button type="button" onClick={()=>setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Modal title="Delete Stock Item" onClose={()=>setDeleteConfirm(null)}>
          <p className="text-theme-secondary mb-5">
            Delete <strong className="text-theme-primary">{deleteConfirm.name}</strong>
            {deleteConfirm.size ? ` (${deleteConfirm.size})` : ''}? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={()=>handleDelete(deleteConfirm.id)} className="btn-danger flex-1">Delete</button>
            <button onClick={()=>setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Daily Sales Modal */}
      {showSales && (
        <Modal title="Record Daily Sales" wide onClose={()=>setShowSales(false)}>
          <DailySalesModal
            stock={stock}
            onClose={()=>setShowSales(false)}
            onSaved={updatedStock=>setStock(updatedStock)}
          />
        </Modal>
      )}

      {/* Sales History Modal */}
      {showHistory && (
        <Modal title="Sales History (Last 30 Days)" wide onClose={()=>setShowHistory(false)}>
          <SalesHistoryModal onClose={()=>setShowHistory(false)} />
        </Modal>
      )}

      {/* Tag Print Modal */}
      {printTagItem && (
        <TagPrintModal
          item={printTagItem}
          onClose={() => setPrintTagItem(null)}
        />
      )}

      {/* Log Production Modal */}
      {showProductionModal && (() => {
        const manufacturedStyles = Array.from(new Set(
          stock.filter(s => s.source_type === 'manufactured').map(s => s.name)
        )).sort();

        const filteredStyles = manufacturedStyles.filter(name =>
          name.toLowerCase().includes(prodSearch.toLowerCase())
        );

        const styleStockItems = selectedProdStyle ? stock.filter(s => s.name === selectedProdStyle) : [];

        return (
          <Modal title="Log Manufactured Production" wide onClose={() => setShowProductionModal(false)}>
            <form onSubmit={e => handleLogProductionSubmit(e, styleStockItems)} className="space-y-4">
              {formError && <p className="text-sm p-2 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>{formError}</p>}
              
              <div>
                <label className="label">Search Sweater Color / Style *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Type to filter (e.g. Sweater: Navy plain, Strathmore, Green)..."
                  value={prodSearch}
                  onChange={e => {
                    setProdSearch(e.target.value);
                    setSelectedProdStyle(null);
                  }}
                  autoFocus
                />
              </div>

              {!selectedProdStyle ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto border rounded-lg p-2 bg-zinc-50 dark:bg-zinc-900" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10px] uppercase font-bold text-theme-muted mb-1 px-1">Select matching style:</p>
                  {filteredStyles.slice(0, 15).map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => {
                        setSelectedProdStyle(style);
                        setProdSearch(style);
                        setProdQuantities({});
                      }}
                      className="w-full text-left p-2.5 rounded-lg border bg-white dark:bg-zinc-950 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-sm font-medium transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      {style}
                    </button>
                  ))}
                  {filteredStyles.length === 0 && (
                    <p className="text-xs text-theme-muted p-2 text-center">No matching styles found.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between items-center bg-indigo-50/30 dark:bg-indigo-950/30 p-3 rounded-lg">
                    <div>
                      <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Selected Style</p>
                      <p className="font-semibold text-theme-primary text-sm mt-0.5">{selectedProdStyle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProdStyle(null);
                        setProdSearch('');
                        setProdQuantities({});
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Change Style
                    </button>
                  </div>

                  <div>
                    <label className="label">Enter Produced Quantities per Size:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {['22', '24', '26', '28', '30', '32', '34', '36', '38', '40'].map(size => {
                        const item = styleStockItems.find(s => s.size === size);
                        const currentQty = item ? (item.workshop_quantity || 0) : 0;
                        return (
                          <div key={size} className="p-2.5 rounded-lg border space-y-1 bg-white dark:bg-zinc-950" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-xs text-theme-primary">Size {size}</span>
                              <span className="text-[10px] text-theme-muted">({currentQty} current)</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              className="input text-xs py-1 mt-1 text-center"
                              placeholder="+0"
                              value={prodQuantities[size] || ''}
                              onChange={e => setProdQuantities(prev => ({ ...prev, [size]: e.target.value }))}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving || Object.values(prodQuantities).every(q => !q.trim())}
                      className="btn-primary flex-1"
                    >
                      {saving ? 'Saving...' : 'Confirm & Log Production'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProductionModal(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </form>
          </Modal>
        );
      })()}
    </div>
  );
}
