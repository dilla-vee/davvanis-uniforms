const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/orders - get all orders with client name and school
router.get('/', (req, res) => {
  try {
    const orders = db
      .prepare(
        `SELECT o.*,
          c.name as client_name,
          c.school as client_school,
          (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
         FROM orders o
         LEFT JOIN clients c ON o.client_id = c.id
         ORDER BY o.order_date DESC`
      )
      .all();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/stock-summary - must come before /:id
router.get('/analytics/stock-summary', (req, res) => {
  try {
    const totalItems = db.prepare('SELECT COUNT(*) as count FROM stock').get();
    const totalUnits = db.prepare('SELECT SUM(quantity) as total FROM stock').get();
    const totalValue = db
      .prepare('SELECT SUM(quantity * price) as total FROM stock WHERE price IS NOT NULL')
      .get();
    const lowStockCount = db
      .prepare('SELECT COUNT(*) as count FROM stock WHERE quantity <= low_stock_threshold')
      .get();

    const categoryBreakdown = db
      .prepare(
        `SELECT
          COALESCE(category, 'Uncategorised') as name,
          SUM(quantity) as total_quantity,
          SUM(quantity * COALESCE(price, 0)) as total_value
         FROM stock
         GROUP BY category
         ORDER BY total_quantity DESC`
      )
      .all();

    res.json({
      total_items: totalItems.count,
      total_units: totalUnits.total || 0,
      total_value: totalValue.total || 0,
      low_stock_count: lowStockCount.count,
      category_breakdown: categoryBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id - get order details with all items and stock names
router.get('/:id', (req, res) => {
  try {
    const order = db
      .prepare(
        `SELECT o.*, c.name as client_name, c.school as client_school
         FROM orders o
         LEFT JOIN clients c ON o.client_id = c.id
         WHERE o.id = ?`
      )
      .get(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = db
      .prepare(
        `SELECT oi.*, s.name as stock_name, s.category
         FROM order_items oi
         LEFT JOIN stock s ON oi.stock_id = s.id
         WHERE oi.order_id = ?`
      )
      .all(req.params.id);

    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders - create order with items array
router.post('/', (req, res) => {
  try {
    const { client_id, notes, items } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Calculate total
    const total_price = items.reduce((sum, item) => {
      return sum + (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 0);
    }, 0);

    const createOrder = db.transaction(() => {
      const orderStmt = db.prepare(
        'INSERT INTO orders (client_id, total_price, status, notes) VALUES (?, ?, ?, ?)'
      );
      const orderResult = orderStmt.run(client_id, total_price, 'pending', notes || null);
      const orderId = orderResult.lastInsertRowid;

      const itemStmt = db.prepare(
        'INSERT INTO order_items (order_id, stock_id, quantity, unit_price, size) VALUES (?, ?, ?, ?, ?)'
      );
      for (const item of items) {
        itemStmt.run(
          orderId,
          item.stock_id,
          parseInt(item.quantity),
          parseFloat(item.unit_price),
          item.size || null
        );
      }

      return orderId;
    });

    const orderId = createOrder();
    const newOrder = db
      .prepare(
        `SELECT o.*, c.name as client_name, c.school as client_school
         FROM orders o
         LEFT JOIN clients c ON o.client_id = c.id
         WHERE o.id = ?`
      )
      .get(orderId);

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id - update order status/notes
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const { status, notes } = req.body;
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    db.prepare('UPDATE orders SET status = ?, notes = ? WHERE id = ?').run(
      status !== undefined ? status : existing.status,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    );

    const updated = db
      .prepare(
        `SELECT o.*, c.name as client_name, c.school as client_school
         FROM orders o
         LEFT JOIN clients c ON o.client_id = c.id
         WHERE o.id = ?`
      )
      .get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id - delete order
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(req.params.id);
    db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);

    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
