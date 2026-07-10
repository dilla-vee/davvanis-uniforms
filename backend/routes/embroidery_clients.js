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

// GET /api/embroidery-clients - List all embroidery clients
router.get('/', async (req, res) => {
  try {
    const rows = await db.query_rows('SELECT * FROM embroidery_clients ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/embroidery-clients/:id - Get a single client with detailed history and designs
router.get('/:id', async (req, res) => {
  try {
    const client = await db.query_one('SELECT * FROM embroidery_clients WHERE id = $1', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Embroidery client not found' });

    // Fetch logo designs
    const designs = await db.query_rows(
      'SELECT * FROM embroidery_client_designs WHERE client_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    // Fetch related embroidery service/sale logs
    const logs = await db.query_rows(
      'SELECT * FROM embroidery_logs WHERE client_id = $1 ORDER BY logged_at DESC',
      [req.params.id]
    );

    res.json({
      ...client,
      designs,
      logs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/embroidery-clients - Create new embroidery client
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, contact, email, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

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
      `INSERT INTO embroidery_clients (name, contact, email, description, image_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, contact || null, email || null, description || null, image_url]
    );
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/embroidery-clients/:id - Update embroidery client info
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const existing = await db.query_one('SELECT * FROM embroidery_clients WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Embroidery client not found' });

    const { name, contact, email, description } = req.body;
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
      `UPDATE embroidery_clients 
       SET name=$1, contact=$2, email=$3, description=$4, image_url=$5
       WHERE id=$6 RETURNING *`,
      [
        name !== undefined ? name : existing.name,
        contact !== undefined ? contact : existing.contact,
        email !== undefined ? email : existing.email,
        description !== undefined ? description : existing.description,
        image_url,
        req.params.id
      ]
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/embroidery-clients/:id - Delete embroidery client
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.query_one('SELECT * FROM embroidery_clients WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Embroidery client not found' });

    await db.query_rows('DELETE FROM embroidery_clients WHERE id = $1', [req.params.id]);

    // Cleanup main avatar image if local
    if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
      const imgPath = path.join(__dirname, '..', existing.image_url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    res.json({ message: 'Embroidery client deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/embroidery-clients/:id/designs - Get design logos
router.get('/:id/designs', async (req, res) => {
  try {
    const designs = await db.query_rows(
      'SELECT * FROM embroidery_client_designs WHERE client_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(designs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/embroidery-clients/:id/designs - Add branding design logo/image
router.post('/:id/designs', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Design logo image file is required' });
    const { design_name, notes } = req.body;

    let image_url;
    try {
      image_url = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype);
    } catch (uploadError) {
      console.error('Supabase upload failed, falling back to local storage:', uploadError.message);
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname);
      fs.writeFileSync(path.join(uploadsDir, uniqueName), req.file.buffer);
      image_url = `/uploads/${uniqueName}`;
    }

    const design = await db.query_one(
      `INSERT INTO embroidery_client_designs (client_id, image_url, design_name, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, image_url, design_name || null, notes || null]
    );
    res.status(201).json(design);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/embroidery-clients/:id/designs/:designId - Delete branding logo design
router.delete('/:id/designs/:designId', async (req, res) => {
  try {
    const design = await db.query_one(
      'SELECT * FROM embroidery_client_designs WHERE id = $1 AND client_id = $2',
      [req.params.designId, req.params.id]
    );
    if (!design) return res.status(404).json({ error: 'Branding logo design not found' });

    await db.query_rows('DELETE FROM embroidery_client_designs WHERE id = $1', [req.params.designId]);

    // Cleanup local file if applicable
    if (design.image_url && design.image_url.startsWith('/uploads/')) {
      const imgPath = path.join(__dirname, '..', design.image_url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    res.json({ message: 'Logo design deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
