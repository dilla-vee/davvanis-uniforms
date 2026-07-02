require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize DB (creates tables + seeds if needed)
require('./database');

const clientsRouter = require('./routes/clients');
const ordersRouter = require('./routes/orders');
const stockRouter = require('./routes/stock');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Delete guard helper
const restrictDeleteForAttendant = (req, res, next) => {
  if (req.method === 'DELETE' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Only administrators can delete records.' });
  }
  next();
};

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/clients', authenticateToken, restrictDeleteForAttendant, clientsRouter);
app.use('/api/orders', authenticateToken, restrictDeleteForAttendant, ordersRouter);
app.use('/api/stock', authenticateToken, restrictDeleteForAttendant, stockRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React frontend in production
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // All non-API routes serve the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // 404 handler for dev (no built frontend)
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`UniStore backend running on http://localhost:${PORT}`);
});
