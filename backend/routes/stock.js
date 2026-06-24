const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/stock
router.get('/', async (req, res) => {
  try {
    const rows = await db.query_rows('SELECT * FROM stock ORDER BY category, name, size');
    const parsed = rows.map(r => ({
      ...r,
      quantity:            parseInt(r.quantity) || 0,
      price:               r.price != null ? parseFloat(r.price) : null,
      low_stock_threshold: parseInt(r.low_stock_threshold) || 10,
    }));
    res.json(parsed);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stock/low  — must come before /:id
router.get('/low', async (req, res) => {
  try {
    const rows = await db.query_rows(
      'SELECT * FROM stock WHERE quantity <= low_stock_threshold ORDER BY quantity ASC'
    );
    const parsed = rows.map(r => ({
      ...r,
      quantity:            parseInt(r.quantity) || 0,
      price:               r.price != null ? parseFloat(r.price) : null,
      low_stock_threshold: parseInt(r.low_stock_threshold) || 10,
    }));
    res.json(parsed);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stock/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await db.query_one('SELECT * FROM stock WHERE id = $1', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Stock item not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/stock
router.post('/', async (req, res) => {
  try {
    const { name, category, size, quantity, price, low_stock_threshold } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const item = await db.query_one(
      `INSERT INTO stock (name, category, size, quantity, price, low_stock_threshold, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
      [name, category||null, size||null,
       quantity!==undefined ? parseInt(quantity) : 0,
       price!==undefined ? parseFloat(price) : null,
       low_stock_threshold!==undefined ? parseInt(low_stock_threshold) : 10]
    );
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/stock/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await db.query_one('SELECT * FROM stock WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Stock item not found' });

    const { name, category, size, quantity, price, low_stock_threshold } = req.body;
    const updated = await db.query_one(
      `UPDATE stock SET
        name=$1, category=$2, size=$3, quantity=$4,
        price=$5, low_stock_threshold=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [
        name!==undefined ? name : existing.name,
        category!==undefined ? category : existing.category,
        size!==undefined ? size : existing.size,
        quantity!==undefined ? parseInt(quantity) : existing.quantity,
        price!==undefined ? parseFloat(price) : existing.price,
        low_stock_threshold!==undefined ? parseInt(low_stock_threshold) : existing.low_stock_threshold,
        req.params.id,
      ]
    );
    res.json(updated);
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

// ── Daily Sales ──────────────────────────────────────────────────────────

// POST /api/stock/sales — record a daily sales batch, deduct from stock
router.post('/sales', async (req, res) => {
  const client = await db.connect();
  try {
    const { sale_date, notes, items } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'At least one item is required' });

    await client.query('BEGIN');

    // Validate quantities and lock rows
    for (const item of items) {
      const row = await client.query(
        'SELECT id, quantity, name FROM stock WHERE id = $1 FOR UPDATE',
        [item.stock_id]
      );
      if (!row.rows[0]) throw new Error(`Stock item ${item.stock_id} not found`);
      const available = parseInt(row.rows[0].quantity);
      const selling   = parseInt(item.qty_sold);
      if (selling <= 0) throw new Error(`Quantity sold must be > 0 for "${row.rows[0].name}"`);
      if (selling > available) throw new Error(`Cannot sell ${selling} of "${row.rows[0].name}" — only ${available} in stock`);
    }

    // Calculate total
    const total_value = items.reduce(
      (s, i) => s + (parseFloat(i.unit_price) || 0) * parseInt(i.qty_sold),
      0
    );

    // Insert sale record
    const saleRow = await client.query(
      `INSERT INTO daily_sales (sale_date, notes, total_value)
       VALUES ($1, $2, $3) RETURNING *`,
      [sale_date || new Date().toISOString().split('T')[0], notes || null, total_value]
    );
    const saleId = saleRow.rows[0].id;

    // Insert items + deduct stock
    for (const item of items) {
      const stockRow = await client.query('SELECT * FROM stock WHERE id = $1', [item.stock_id]);
      const s = stockRow.rows[0];
      const subtotal = (parseFloat(item.unit_price) || 0) * parseInt(item.qty_sold);

      await client.query(
        `INSERT INTO daily_sale_items (sale_id, stock_id, stock_name, stock_size, qty_sold, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [saleId, item.stock_id, s.name, s.size, parseInt(item.qty_sold),
         parseFloat(item.unit_price) || 0, subtotal]
      );

      // Deduct from stock
      await client.query(
        'UPDATE stock SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
        [parseInt(item.qty_sold), item.stock_id]
      );
    }

    await client.query('COMMIT');

    // Return the sale with updated stock
    const updatedStock = await db.query_rows('SELECT * FROM stock ORDER BY category, name, size');
    res.status(201).json({
      sale: { ...saleRow.rows[0], total_value: parseFloat(saleRow.rows[0].total_value) },
      updatedStock: updatedStock.map(r => ({
        ...r,
        quantity:            parseInt(r.quantity) || 0,
        price:               r.price != null ? parseFloat(r.price) : null,
        low_stock_threshold: parseInt(r.low_stock_threshold) || 10,
      })),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/stock/sales — get recent sales history
router.get('/sales', async (req, res) => {
  try {
    const sales = await db.query_rows(
      `SELECT ds.*,
         json_agg(json_build_object(
           'id', dsi.id,
           'stock_id', dsi.stock_id,
           'stock_name', dsi.stock_name,
           'stock_size', dsi.stock_size,
           'qty_sold', dsi.qty_sold,
           'unit_price', dsi.unit_price::float,
           'subtotal', dsi.subtotal::float
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
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
