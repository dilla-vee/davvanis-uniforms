const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Apply authenticateToken middleware to all routes in this router
router.use(authenticateToken);

// GET /api/users (List all users - Admin only)
router.get('/', isAdmin, async (req, res) => {
  try {
    const users = await db.query_rows(
      'SELECT id, username, role, name, created_at FROM users ORDER BY role, name'
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users (Create new user - Admin only)
router.post('/', isAdmin, async (req, res) => {
  try {
    const { username, password, role, name } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name are required' });
    }

    const cleanedUsername = username.trim().toLowerCase();
    const existing = await db.query_one('SELECT id FROM users WHERE username = $1', [cleanedUsername]);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const passHash = bcrypt.hashSync(password, 10);
    const user = await db.query_one(
      `INSERT INTO users (username, password_hash, role, name)
       VALUES ($1, $2, $3, $4) RETURNING id, username, role, name, created_at`,
      [cleanedUsername, passHash, role || 'attendant', name.trim()]
    );

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id (Delete user - Admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const deleteId = parseInt(req.params.id);
    if (isNaN(deleteId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (req.user.id === deleteId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const existing = await db.query_one('SELECT id FROM users WHERE id = $1', [deleteId]);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.query_rows('DELETE FROM users WHERE id = $1', [deleteId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/password (Change/Reset password)
// Admin can reset anyone's password. A standard user can only reset their own.
router.put('/:id/password', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const { password } = req.body;

    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!password || password.trim().length === 0) {
      return res.status(400).json({ error: 'Password cannot be empty' });
    }

    // Authorization check
    if (req.user.role !== 'admin' && req.user.id !== targetId) {
      return res.status(403).json({ error: 'Access denied: You can only change your own password' });
    }

    const existing = await db.query_one('SELECT id FROM users WHERE id = $1', [targetId]);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passHash = bcrypt.hashSync(password, 10);
    await db.query_rows('UPDATE users SET password_hash = $1 WHERE id = $2', [passHash, targetId]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
