const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const rows = await db.query_rows(
      `SELECT o.*,
         c.name  AS client_name,
         c.school AS client_school,
         (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       ORDER BY o.order_date DESC`
    );
    // PostgreSQL returns numeric columns as strings — cast them
    const parsed = rows.map(r => ({
      ...r,
      total_price: parseFloat(r.total_price) || 0,
      item_count:  parseInt(r.item_count) || 0,
    }));
    res.json(parsed);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/analytics/stock-summary  — must be before /:id
router.get('/analytics/stock-summary', async (req, res) => {
  try {
    const [totals, lowCount, categories] = await Promise.all([
      db.query_one(`
        SELECT
          COUNT(*)                                    AS total_items,
          COALESCE(SUM(quantity), 0)                  AS total_units,
          COALESCE(SUM(quantity * COALESCE(price,0)), 0) AS total_value,
          COUNT(*) FILTER (WHERE quantity <= low_stock_threshold) AS low_stock_count
        FROM stock
      `),
      null, // folded into totals above
      db.query_rows(`
        SELECT
          COALESCE(category,'Uncategorised')          AS name,
          SUM(quantity)                               AS total_quantity,
          SUM(quantity * COALESCE(price,0))           AS total_value
        FROM stock
        GROUP BY category
        ORDER BY total_quantity DESC
      `),
    ]);

    res.json({
      total_items:       parseInt(totals.total_items),
      total_units:       parseInt(totals.total_units),
      total_value:       parseFloat(totals.total_value),
      low_stock_count:   parseInt(totals.low_stock_count),
      category_breakdown: categories.map(r => ({
        name:           r.name,
        total_quantity: parseInt(r.total_quantity) || 0,
        total_value:    parseFloat(r.total_value) || 0,
      })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const order = await db.query_one(
      `SELECT o.*, c.name AS client_name, c.school AS client_school
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = await db.query_rows(
      `SELECT oi.*, s.name AS stock_name, s.category
       FROM order_items oi
       LEFT JOIN stock s ON oi.stock_id = s.id
       WHERE oi.order_id = $1`,
      [req.params.id]
    );
    const parsedOrder = {
      ...order,
      total_price: parseFloat(order.total_price) || 0,
      items: items.map(i => ({
        ...i,
        unit_price: parseFloat(i.unit_price) || 0,
        quantity:   parseInt(i.quantity) || 0,
      })),
    };
    res.json(parsedOrder);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/orders
router.post('/', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'DATABASE_URL not configured' });
  const client = await db.connect();
  try {
    const { client_id, notes, items } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });

    const total_price = items.reduce((s, i) => s + (parseFloat(i.unit_price)||0) * (parseInt(i.quantity)||0), 0);

    await client.query('BEGIN');

    const { rows: [order] } = await client.query(
      `INSERT INTO orders (client_id, total_price, status, notes) VALUES ($1,$2,'pending',$3) RETURNING *`,
      [client_id, total_price, notes||null]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id,stock_id,quantity,unit_price,size) VALUES ($1,$2,$3,$4,$5)`,
        [order.id, item.stock_id, parseInt(item.quantity), parseFloat(item.unit_price)||0, item.size||null]
      );
    }

    await client.query('COMMIT');

    const newOrder = await db.query_one(
      `SELECT o.*, c.name AS client_name, c.school AS client_school
       FROM orders o LEFT JOIN clients c ON o.client_id = c.id WHERE o.id = $1`,
      [order.id]
    );
    res.status(201).json(newOrder);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await db.query_one('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const { status, notes } = req.body;
    const valid = ['pending','processing','completed','cancelled'];
    if (status && !valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const updated = await db.query_one(
      `UPDATE orders SET status=$1, notes=$2 WHERE id=$3
       RETURNING *`,
      [status!==undefined?status:existing.status, notes!==undefined?notes:existing.notes, req.params.id]
    );
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.query_one('SELECT id FROM orders WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    // order_items deleted via ON DELETE CASCADE
    await db.query_rows('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ message: 'Order deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
