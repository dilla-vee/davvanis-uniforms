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

module.exports = router;
