const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/stock - get all stock items
router.get('/', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM stock ORDER BY category, name, size').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stock/low - get items where quantity <= low_stock_threshold
router.get('/low', (req, res) => {
  try {
    const items = db
      .prepare('SELECT * FROM stock WHERE quantity <= low_stock_threshold ORDER BY quantity ASC')
      .all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stock/:id - get single stock item
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM stock WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Stock item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stock - add new stock item
router.post('/', (req, res) => {
  try {
    const { name, category, size, quantity, price, low_stock_threshold } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const stmt = db.prepare(
      `INSERT INTO stock (name, category, size, quantity, price, low_stock_threshold, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    );
    const result = stmt.run(
      name,
      category || null,
      size || null,
      quantity !== undefined ? parseInt(quantity) : 0,
      price !== undefined ? parseFloat(price) : null,
      low_stock_threshold !== undefined ? parseInt(low_stock_threshold) : 10
    );

    const newItem = db.prepare('SELECT * FROM stock WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stock/:id - update stock item
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM stock WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Stock item not found' });

    const { name, category, size, quantity, price, low_stock_threshold } = req.body;

    const stmt = db.prepare(
      `UPDATE stock SET
        name = ?,
        category = ?,
        size = ?,
        quantity = ?,
        price = ?,
        low_stock_threshold = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    );
    stmt.run(
      name !== undefined ? name : existing.name,
      category !== undefined ? category : existing.category,
      size !== undefined ? size : existing.size,
      quantity !== undefined ? parseInt(quantity) : existing.quantity,
      price !== undefined ? parseFloat(price) : existing.price,
      low_stock_threshold !== undefined ? parseInt(low_stock_threshold) : existing.low_stock_threshold,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM stock WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stock/:id - delete stock item
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM stock WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Stock item not found' });

    db.prepare('DELETE FROM stock WHERE id = ?').run(req.params.id);
    res.json({ message: 'Stock item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
