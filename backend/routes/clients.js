const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');

const { uploadToSupabase } = require('../supabase');

// Ensure uploads directory exists (for fallback local uploads)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase());
  ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/clients
router.get('/', async (req, res) => {
  try {
    const rows = await db.query_rows('SELECT * FROM clients ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const client = await db.query_one('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const orders = await db.query_rows(
      `SELECT o.*,
         (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
       FROM orders o
       WHERE o.client_id = $1
       ORDER BY o.order_date DESC`,
      [req.params.id]
    );
    const parsedOrders = orders.map(o => ({
      ...o,
      total_price: parseFloat(o.total_price) || 0,
      item_count:  parseInt(o.item_count) || 0,
    }));
    res.json({ ...client, orders: parsedOrders });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/clients
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, school, contact, email, description } = req.body;
    if (!name)   return res.status(400).json({ error: 'Name is required' });
    if (!school) return res.status(400).json({ error: 'School is required' });

    let image_url = null;
    if (req.file) {
      try {
        image_url = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype);
      } catch (uploadError) {
        console.error('Supabase upload failed, falling back to local storage:', uploadError.message);
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname);
        fs.writeFileSync(path.join(uploadsDir, uniqueName), req.file.buffer);
        image_url = `/uploads/${uniqueName}`;
      }
    }

    const client = await db.query_one(
      `INSERT INTO clients (name,school,contact,email,description,image_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, school, contact||null, email||null, description||null, image_url]
    );
    res.status(201).json(client);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/clients/:id
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const existing = await db.query_one('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    const { name, school, contact, email, description } = req.body;
    let image_url = existing.image_url;

    if (req.file) {
      try {
        image_url = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype);
      } catch (uploadError) {
        console.error('Supabase upload failed, falling back to local storage:', uploadError.message);
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname);
        fs.writeFileSync(path.join(uploadsDir, uniqueName), req.file.buffer);
        image_url = `/uploads/${uniqueName}`;
      }
    }

    const updated = await db.query_one(
      `UPDATE clients SET name=$1,school=$2,contact=$3,email=$4,description=$5,image_url=$6
       WHERE id=$7 RETURNING *`,
      [
        name!==undefined ? name : existing.name,
        school!==undefined ? school : existing.school,
        contact!==undefined ? contact : existing.contact,
        email!==undefined ? email : existing.email,
        description!==undefined ? description : existing.description,
        image_url,
        req.params.id,
      ]
    );
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.query_one('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    // ON DELETE CASCADE handles orders + order_items automatically
    await db.query_rows('DELETE FROM clients WHERE id = $1', [req.params.id]);

    if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
      const imgPath = path.join(__dirname, '..', existing.image_url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    res.json({ message: 'Client deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/clients/:id/photos
router.get('/:id/photos', async (req, res) => {
  try {
    const photos = await db.query_rows(
      'SELECT * FROM client_uniform_photos WHERE client_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(photos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/clients/:id/photos
router.post('/:id/photos', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Photo is required' });
    const { caption } = req.body;
    let image_url;
    try {
      image_url = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype);
    } catch (uploadError) {
      console.error('Supabase upload failed, falling back to local storage:', uploadError.message);
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname);
      fs.writeFileSync(path.join(uploadsDir, uniqueName), req.file.buffer);
      image_url = `/uploads/${uniqueName}`;
    }
    const photo = await db.query_one(
      `INSERT INTO client_uniform_photos (client_id, image_url, caption)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, image_url, caption || null]
    );
    res.status(201).json(photo);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/clients/:id/photos/:photoId
router.delete('/:id/photos/:photoId', async (req, res) => {
  try {
    const photo = await db.query_one(
      'SELECT * FROM client_uniform_photos WHERE id = $1 AND client_id = $2',
      [req.params.photoId, req.params.id]
    );
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    await db.query_rows('DELETE FROM client_uniform_photos WHERE id = $1', [req.params.photoId]);
    if (photo.image_url && photo.image_url.startsWith('/uploads/')) {
      const imgPath = path.join(__dirname, '..', photo.image_url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    res.json({ message: 'Photo deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
