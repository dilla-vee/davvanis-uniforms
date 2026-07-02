const express = require('express');
const router = express.Router();
const db = require('../database');

const parseStock = r => ({
  ...r,
  quantity:            parseInt(r.quantity) || 0,
  price:               r.price != null ? parseFloat(r.price) : null,
  low_stock_threshold: parseInt(r.low_stock_threshold) || 10,
  workshop_quantity:   parseInt(r.workshop_quantity) || 0,
  source_type:         r.source_type || 'purchased',
  barcode:             r.barcode || null,
});

// GET /api/stock
router.get('/', async (req, res) => {
  try {
    const rows = await db.query_rows('SELECT * FROM stock ORDER BY category, name, size');
    res.json(rows.map(parseStock));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stock/low  ── before /:id
router.get('/low', async (req, res) => {
  try {
    const rows = await db.query_rows(
      'SELECT * FROM stock WHERE quantity <= low_stock_threshold ORDER BY quantity ASC'
    );
    res.json(rows.map(parseStock));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stock/sales  ── before /:id
router.get('/sales', async (req, res) => {
  try {
    const sales = await db.query_rows(
      `SELECT ds.id, ds.sale_date::text AS sale_date, ds.notes, ds.total_value, ds.created_at,
         json_agg(json_build_object(
           'id',         dsi.id,
           'stock_id',   dsi.stock_id,
           'stock_name', dsi.stock_name,
           'stock_size', dsi.stock_size,
           'qty_sold',   dsi.qty_sold,
           'unit_price', dsi.unit_price::float,
           'subtotal',   dsi.subtotal::float
         ) ORDER BY dsi.id) AS items
       FROM daily_sales ds
       LEFT JOIN daily_sale_items dsi ON dsi.sale_id = ds.id
       GROUP BY ds.id
       ORDER BY ds.sale_date DESC, ds.created_at DESC
       LIMIT 30`
    );
    res.json(sales.map(s => ({
      ...s,
      total_value: parseFloat(s.total_value) || 0,
      items: Array.isArray(s.items) ? s.items.filter(i => i.id !== null) : [],
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/stock/sales  ── before /:id
router.post('/sales', async (req, res) => {
  const client = await db.connect();
  try {
    const { sale_date, notes, items } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'At least one item is required' });

    await client.query('BEGIN');

    for (const item of items) {
      const row = await client.query(
        'SELECT id, quantity, name FROM stock WHERE id = $1 FOR UPDATE', [item.stock_id]
      );
      if (!row.rows[0]) throw new Error(`Stock item ${item.stock_id} not found`);
      const available = parseInt(row.rows[0].quantity);
      const selling   = parseInt(item.qty_sold);
      if (selling <= 0) throw new Error(`Qty must be > 0 for "${row.rows[0].name}"`);
      if (selling > available) throw new Error(`Cannot sell ${selling} of "${row.rows[0].name}" — only ${available} in stock`);
    }

    const total_value = items.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * parseInt(i.qty_sold), 0);

    const saleRow = await client.query(
      `INSERT INTO daily_sales (sale_date, notes, total_value) VALUES ($1,$2,$3) RETURNING *`,
      [sale_date || new Date().toISOString().split('T')[0], notes || null, total_value]
    );
    const saleId = saleRow.rows[0].id;

    for (const item of items) {
      const stockRow = await client.query('SELECT * FROM stock WHERE id = $1', [item.stock_id]);
      const s = stockRow.rows[0];
      const subtotal = (parseFloat(item.unit_price) || 0) * parseInt(item.qty_sold);
      await client.query(
        `INSERT INTO daily_sale_items (sale_id, stock_id, stock_name, stock_size, qty_sold, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [saleId, item.stock_id, s.name, s.size, parseInt(item.qty_sold), parseFloat(item.unit_price) || 0, subtotal]
      );
      await client.query(
        'UPDATE stock SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
        [parseInt(item.qty_sold), item.stock_id]
      );
    }

    await client.query('COMMIT');
    const updatedStock = await db.query_rows('SELECT * FROM stock ORDER BY category, name, size');
    res.status(201).json({
      sale: { ...saleRow.rows[0], total_value: parseFloat(saleRow.rows[0].total_value) },
      updatedStock: updatedStock.map(parseStock),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/stock/by-barcode/:barcode
router.get('/by-barcode/:barcode', async (req, res) => {
  try {
    const item = await db.query_one('SELECT * FROM stock WHERE barcode = $1', [req.params.barcode]);
    if (!item) return res.status(404).json({ error: 'Stock item not found for barcode: ' + req.params.barcode });
    res.json(parseStock(item));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stock/transfers
router.get('/transfers', async (req, res) => {
  try {
    const transfers = await db.query_rows(
      `SELECT st.id, st.transfer_date::text AS transfer_date, st.received_date::text AS received_date, st.status, st.notes,
          st.dispatched_by, st.carrier_name, st.order_name, st.received_by,
         json_agg(json_build_object(
           'id',             sti.id,
           'stock_id',       sti.stock_id,
           'qty_dispatched', sti.qty_dispatched,
           'qty_received',   sti.qty_received,
           'stock_name',     s.name,
           'stock_size',     s.size
         ) ORDER BY sti.id) AS items
       FROM stock_transfers st
       LEFT JOIN stock_transfer_items sti ON sti.transfer_id = st.id
       LEFT JOIN stock s ON s.id = sti.stock_id
       GROUP BY st.id
       ORDER BY st.transfer_date DESC`
    );
    res.json(transfers.map(t => ({
      ...t,
      items: Array.isArray(t.items) ? t.items.filter(i => i.id !== null) : [],
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stock/transfers (Dispatch)
router.post('/transfers', async (req, res) => {
  if (req.user?.role === 'attendant') {
    return res.status(403).json({ error: 'Access denied: Shop attendants cannot dispatch stock.' });
  }
  const client = await db.connect();
  try {
    const { items, notes, carrier_name, order_name } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required for dispatch' });
    }

    await client.query('BEGIN');

    for (const item of items) {
      const stockRow = await client.query(
        'SELECT id, workshop_quantity, name, source_type FROM stock WHERE id = $1 FOR UPDATE',
        [item.stock_id]
      );
      const stockItem = stockRow.rows[0];
      if (!stockItem) {
        throw new Error(`Stock item with ID ${item.stock_id} not found`);
      }
      if (stockItem.source_type !== 'manufactured') {
        throw new Error(`Item "${stockItem.name}" is not manufactured and cannot be dispatched from the workshop.`);
      }
      const available = parseInt(stockItem.workshop_quantity) || 0;
      const dispatching = parseInt(item.qty_dispatched) || 0;
      if (dispatching <= 0) {
        throw new Error(`Dispatch quantity must be greater than 0 for "${stockItem.name}"`);
      }
      if (dispatching > available) {
        throw new Error(`Insufficient workshop stock for "${stockItem.name}" — trying to dispatch ${dispatching} but only ${available} available.`);
      }
    }

    const transferRow = await client.query(
      `INSERT INTO stock_transfers (status, notes, dispatched_by, carrier_name, order_name) VALUES ('pending', $1, $2, $3, $4) RETURNING *`,
      [notes || null, req.user?.name || req.user?.username || 'System', carrier_name || null, order_name || null]
    );
    const transferId = transferRow.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO stock_transfer_items (transfer_id, stock_id, qty_dispatched) VALUES ($1, $2, $3)`,
        [transferId, item.stock_id, parseInt(item.qty_dispatched)]
      );
      await client.query(
        `UPDATE stock SET workshop_quantity = workshop_quantity - $1, updated_at = NOW() WHERE id = $2`,
        [parseInt(item.qty_dispatched), item.stock_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(transferRow.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/stock/transfers/:id/checkin (Check-in)
router.put('/transfers/:id/checkin', async (req, res) => {
  if (req.user?.role === 'workshop') {
    return res.status(403).json({ error: 'Access denied: Workshop attendants cannot confirm receipt.' });
  }
  const client = await db.connect();
  try {
    const transferId = req.params.id;
    const { items, notes } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    await client.query('BEGIN');

    const transferRow = await client.query(
      'SELECT * FROM stock_transfers WHERE id = $1 FOR UPDATE',
      [transferId]
    );
    const transfer = transferRow.rows[0];
    if (!transfer) {
      throw new Error(`Transfer with ID ${transferId} not found`);
    }
    if (transfer.status !== 'pending') {
      throw new Error(`Transfer has already been checked in. Current status: ${transfer.status}`);
    }

    let hasMismatch = false;

    for (const item of items) {
      const transferItemRow = await client.query(
        'SELECT * FROM stock_transfer_items WHERE transfer_id = $1 AND stock_id = $2 FOR UPDATE',
        [transferId, item.stock_id]
      );
      const transferItem = transferItemRow.rows[0];
      if (!transferItem) {
        throw new Error(`Item ${item.stock_id} was not part of this dispatch`);
      }

      const dispatched = parseInt(transferItem.qty_dispatched);
      const received = parseInt(item.qty_received);

      if (isNaN(received) || received < 0) {
        throw new Error('Received quantity must be 0 or greater');
      }

      if (received !== dispatched) {
        hasMismatch = true;
      }

      await client.query(
        'UPDATE stock_transfer_items SET qty_received = $1 WHERE id = $2',
        [received, transferItem.id]
      );

      await client.query(
        'UPDATE stock SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
        [received, item.stock_id]
      );
    }

    const allItemsRow = await client.query(
      'SELECT COUNT(*) as count FROM stock_transfer_items WHERE transfer_id = $1',
      [transferId]
    );
    if (parseInt(allItemsRow.rows[0].count) !== items.length) {
      hasMismatch = true;
    }

    const finalStatus = hasMismatch ? 'mismatch' : 'received';

    const updatedTransferRow = await client.query(
      `UPDATE stock_transfers
       SET status = $1, received_date = NOW(), notes = COALESCE($2, notes), received_by = $3
       WHERE id = $4 RETURNING *`,
      [finalStatus, notes || null, req.user?.name || req.user?.username || 'System', transferId]
    );

    await client.query('COMMIT');
    res.json(updatedTransferRow.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/stock/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await db.query_one('SELECT * FROM stock WHERE id = $1', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Stock item not found' });
    res.json(parseStock(item));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/stock
router.post('/', async (req, res) => {
  try {
    const { name, category, size, quantity, price, low_stock_threshold, barcode, workshop_quantity, source_type } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const item = await db.query_one(
      `INSERT INTO stock (name, category, size, quantity, price, low_stock_threshold, barcode, workshop_quantity, source_type, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) RETURNING *`,
      [
        name,
        category || null,
        size || null,
        quantity !== undefined ? parseInt(quantity) : 0,
        price !== undefined ? parseFloat(price) : null,
        low_stock_threshold !== undefined ? parseInt(low_stock_threshold) : 10,
        barcode || null,
        workshop_quantity !== undefined ? parseInt(workshop_quantity) : 0,
        source_type || 'purchased'
      ]
    );
    res.status(201).json(parseStock(item));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/stock/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await db.query_one('SELECT * FROM stock WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Stock item not found' });
    const { name, category, size, quantity, price, low_stock_threshold, barcode, workshop_quantity, source_type } = req.body;
    const updated = await db.query_one(
      `UPDATE stock SET name=$1, category=$2, size=$3, quantity=$4,
        price=$5, low_stock_threshold=$6, barcode=$7, workshop_quantity=$8, source_type=$9, updated_at=NOW() WHERE id=$10 RETURNING *`,
      [
        name  !== undefined ? name   : existing.name,
        category !== undefined ? category : existing.category,
        size  !== undefined ? size   : existing.size,
        quantity !== undefined ? parseInt(quantity) : existing.quantity,
        price !== undefined ? parseFloat(price) : existing.price,
        low_stock_threshold !== undefined ? parseInt(low_stock_threshold) : existing.low_stock_threshold,
        barcode !== undefined ? (barcode || null) : existing.barcode,
        workshop_quantity !== undefined ? parseInt(workshop_quantity) : existing.workshop_quantity,
        source_type !== undefined ? source_type : existing.source_type,
        req.params.id,
      ]
    );
    res.json(parseStock(updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/stock/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.query_one('SELECT id FROM stock WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Stock item not found' });
    await db.query_rows('DELETE FROM stock WHERE id = $1', [req.params.id]);
    res.json({ message: 'Stock item deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
