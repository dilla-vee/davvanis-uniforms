const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize DB (creates tables + seeds if needed)
require('./database');

const clientsRouter = require('./routes/clients');
const ordersRouter = require('./routes/orders');
const stockRouter = require('./routes/stock');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/clients', clientsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/stock', stockRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`UniStore backend running on http://localhost:${PORT}`);
});
