const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/clients - get all clients
router.get('/', (req, res) => {
  try {
    const clients = db.prepare('SELECT * FROM clients ORDER BY name').all();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:id - get single client with their orders
router.get('/:id', (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const orders = db
      .prepare(
        `SELECT o.*,
          (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
         FROM orders o
         WHERE o.client_id = ?
         ORDER BY o.order_date DESC`
      )
      .all(req.params.id);

    res.json({ ...client, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients - create client with optional image
router.post('/', upload.single('image'), (req, res) => {
  try {
    const { name, school, contact, email, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!school) return res.status(400).json({ error: 'School is required' });

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const stmt = db.prepare(
      `INSERT INTO clients (name, school, contact, email, description, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(name, school, contact || null, email || null, description || null, image_url);

    const newClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newClient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/:id - update client
router.put('/:id', upload.single('image'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    const { name, school, contact, email, description } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : existing.image_url;

    const stmt = db.prepare(
      `UPDATE clients SET name = ?, school = ?, contact = ?, email = ?, description = ?, image_url = ?
       WHERE id = ?`
    );
    stmt.run(
      name !== undefined ? name : existing.name,
      school !== undefined ? school : existing.school,
      contact !== undefined ? contact : existing.contact,
      email !== undefined ? email : existing.email,
      description !== undefined ? description : existing.description,
      image_url,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clients/:id - delete client
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    // Delete associated orders and items
    const orders = db.prepare('SELECT id FROM orders WHERE client_id = ?').all(req.params.id);
    for (const order of orders) {
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order.id);
    }
    db.prepare('DELETE FROM orders WHERE client_id = ?').run(req.params.id);
    db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);

    // Delete image if exists
    if (existing.image_url) {
      const imgPath = path.join(__dirname, '..', existing.image_url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
