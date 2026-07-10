const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware
router.use(authenticateToken);

// GET /api/embroidery/logs (Retrieve all logs, with optional date filter)
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    let query = `
      SELECT 
        el.id, 
        el.log_type, 
        el.logged_at, 
        el.item_name, 
        el.quantity, 
        el.price_charged::float, 
        el.payment_method, 
        el.service_description, 
        el.customer_item_count, 
        el.recorded_by,
        el.client_id,
        ec.name as client_name
      FROM embroidery_logs el
      LEFT JOIN embroidery_clients ec ON el.client_id = ec.id
    `;
    const params = [];

    if (date) {
      query += ` WHERE el.logged_at::date = $1`;
      params.push(date);
    }
    query += ` ORDER BY el.logged_at DESC`;

    const logs = await db.query_rows(query, params);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/embroidery/logs (Record a new yarn sale or service log)
router.post('/', async (req, res) => {
  try {
    const {
      log_type,
      item_name,
      quantity,
      price_charged,
      payment_method,
      service_description,
      customer_item_count,
      client_id
    } = req.body;

    if (!log_type) {
      return res.status(400).json({ error: 'Log type is required' });
    }

    const recorded_by = `${req.user.name} (${req.user.role})`;

    const newLog = await db.query_one(
      `INSERT INTO embroidery_logs (
        log_type,
        item_name,
        quantity,
        price_charged,
        payment_method,
        service_description,
        customer_item_count,
        recorded_by,
        client_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, log_type, logged_at, item_name, quantity, price_charged::float, payment_method, service_description, customer_item_count, recorded_by, client_id`,
      [
        log_type,
        item_name || null,
        quantity != null ? parseInt(quantity) : 1,
        price_charged != null ? parseFloat(price_charged) : 0,
        payment_method || 'Cash',
        service_description || null,
        customer_item_count != null ? parseInt(customer_item_count) : null,
        recorded_by,
        client_id ? parseInt(client_id) : null
      ]
    );

    res.status(201).json(newLog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
