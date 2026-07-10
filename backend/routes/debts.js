const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/debts/orders (Get debts from orders)
router.get('/orders', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'DATABASE_URL not configured' });
  try {
    const rows = await db.query_rows(
      `SELECT o.id as order_id, o.order_date, o.total_price, o.deposit_amount, o.balance_amount, o.guest_name, o.guest_contact,
              c.name as client_name, c.contact as client_contact
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       WHERE o.balance_amount > 0
       ORDER BY o.order_date DESC`
    );
    const parsed = rows.map(r => ({
      ...r,
      total_price: parseFloat(r.total_price) || 0,
      deposit_amount: parseFloat(r.deposit_amount) || 0,
      balance_amount: parseFloat(r.balance_amount) || 0,
      resolved_name: r.client_name || r.guest_name || 'Unknown',
      resolved_contact: r.client_contact || r.guest_contact || ''
    }));
    res.json(parsed);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/debts/manual (Get manual debts)
router.get('/manual', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'DATABASE_URL not configured' });
  try {
    const rows = await db.query_rows(`SELECT * FROM debts ORDER BY created_at DESC`);
    const parsed = rows.map(r => ({
      ...r,
      amount: parseFloat(r.amount) || 0
    }));
    res.json(parsed);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/debts/manual
router.post('/manual', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'DATABASE_URL not configured' });
  try {
    const { client_name, contact, amount, description } = req.body;
    if (!client_name || !amount) return res.status(400).json({ error: 'Name and amount are required' });
    const row = await db.query_one(
      `INSERT INTO debts (client_name, contact, amount, description) VALUES ($1,$2,$3,$4) RETURNING *`,
      [client_name, contact || null, parseFloat(amount), description || null]
    );
    res.status(201).json({ ...row, amount: parseFloat(row.amount) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/debts/manual/:id
router.put('/manual/:id', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'DATABASE_URL not configured' });
  try {
    const { status } = req.body;
    const row = await db.query_one(
      `UPDATE debts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Debt not found' });
    res.json({ ...row, amount: parseFloat(row.amount) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/debts/orders/:id/pay
router.post('/orders/:id/pay', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'DATABASE_URL not configured' });
  try {
    const { payment_amount } = req.body;
    const amount = parseFloat(payment_amount) || 0;
    if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    
    const row = await db.query_one(
      `UPDATE orders 
       SET deposit_amount = deposit_amount + $1, 
           balance_amount = GREATEST(0, balance_amount - $1)
       WHERE id = $2 RETURNING *`,
      [amount, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Order not found' });
    res.json({ ...row, deposit_amount: parseFloat(row.deposit_amount), balance_amount: parseFloat(row.balance_amount) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
