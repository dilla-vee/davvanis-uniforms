const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'db.sqlite'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    school TEXT NOT NULL,
    contact TEXT,
    email TEXT,
    description TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    size TEXT,
    quantity INTEGER DEFAULT 0,
    price REAL,
    low_stock_threshold INTEGER DEFAULT 10,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_price REAL,
    status TEXT DEFAULT 'pending',
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id),
    stock_id INTEGER REFERENCES stock(id),
    quantity INTEGER,
    unit_price REAL,
    size TEXT
  );
`);

// Seed data if tables are empty
const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get();
if (clientCount.count === 0) {
  // Seed clients
  const insertClient = db.prepare(
    'INSERT INTO clients (name, school, contact, email, description) VALUES (?, ?, ?, ?, ?)'
  );
  const client1 = insertClient.run(
    'Greenwood Primary', 'Greenwood Primary School', '07700 900123', 'admin@greenwood.sch.uk',
    'Large primary school requiring full uniform sets including PE kits. Order twice yearly.'
  );
  const client2 = insertClient.run(
    'St. Mary\'s Academy', 'St. Mary\'s Academy', '07700 900456', 'bursar@stmarys.ac.uk',
    'Secondary school with blazers, ties, and sports uniforms. Special embroidery required on all items.'
  );
  const client3 = insertClient.run(
    'Riverside Community School', 'Riverside Community School', '07700 900789', 'office@riverside.sch.uk',
    'Community school with mixed age groups. Requires sizes from age 3 through to adult XL.'
  );

  // Seed stock
  const insertStock = db.prepare(
    'INSERT INTO stock (name, category, size, quantity, price, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertStock.run('Boys Shirt', 'Tops', 'Age 7-8', 45, 8.50, 10);
  insertStock.run('Boys Shirt', 'Tops', 'Age 9-10', 32, 8.50, 10);
  insertStock.run('Boys Shirt', 'Tops', 'Age 11-12', 8, 9.00, 10);
  insertStock.run('Girls Blouse', 'Tops', 'Age 7-8', 38, 8.50, 10);
  insertStock.run('Girls Blouse', 'Tops', 'Age 9-10', 15, 8.50, 10);
  insertStock.run('Girls Skirt', 'Bottoms', 'Age 7-8', 22, 11.00, 8);
  insertStock.run('Girls Skirt', 'Bottoms', 'Age 9-10', 7, 11.00, 8);
  insertStock.run('Boys Trousers', 'Bottoms', 'Age 7-8', 30, 12.00, 8);
  insertStock.run('Boys Trousers', 'Bottoms', 'Age 9-10', 5, 12.00, 8);
  insertStock.run('School Jumper', 'Tops', 'Age 7-8', 50, 14.00, 12);
  insertStock.run('School Jumper', 'Tops', 'Age 9-10', 42, 14.00, 12);
  insertStock.run('PE T-Shirt', 'Sports', 'Small', 25, 7.00, 10);
  insertStock.run('PE T-Shirt', 'Sports', 'Medium', 3, 7.00, 10);
  insertStock.run('PE Shorts', 'Sports', 'Small', 20, 9.00, 10);
  insertStock.run('PE Shorts', 'Sports', 'Medium', 18, 9.00, 10);
  insertStock.run('School Blazer', 'Outerwear', 'Age 11-12', 12, 35.00, 5);
  insertStock.run('School Blazer', 'Outerwear', 'Age 13-14', 4, 38.00, 5);
  insertStock.run('School Tie', 'Accessories', 'One Size', 60, 5.00, 15);
  insertStock.run('Book Bag', 'Accessories', 'One Size', 2, 6.50, 10);

  // Seed orders
  const insertOrder = db.prepare(
    'INSERT INTO orders (client_id, total_price, status, notes) VALUES (?, ?, ?, ?)'
  );
  const order1 = insertOrder.run(client1.lastInsertRowid, 255.00, 'completed', 'Autumn term order. Delivered on time.');
  const order2 = insertOrder.run(client2.lastInsertRowid, 430.00, 'processing', 'Needs embroidery on blazers before dispatch.');
  const order3 = insertOrder.run(client1.lastInsertRowid, 178.50, 'pending', 'Spring top-up order.');

  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, stock_id, quantity, unit_price, size) VALUES (?, ?, ?, ?, ?)'
  );
  insertItem.run(order1.lastInsertRowid, 1, 10, 8.50, 'Age 7-8');
  insertItem.run(order1.lastInsertRowid, 4, 10, 8.50, 'Age 7-8');
  insertItem.run(order1.lastInsertRowid, 6, 5, 11.00, 'Age 7-8');
  insertItem.run(order1.lastInsertRowid, 8, 10, 12.00, 'Age 7-8');
  insertItem.run(order1.lastInsertRowid, 10, 10, 14.00, 'Age 7-8');

  insertItem.run(order2.lastInsertRowid, 16, 8, 35.00, 'Age 11-12');
  insertItem.run(order2.lastInsertRowid, 18, 20, 5.00, 'One Size');
  insertItem.run(order2.lastInsertRowid, 12, 10, 7.00, 'Small');

  insertItem.run(order3.lastInsertRowid, 2, 5, 8.50, 'Age 9-10');
  insertItem.run(order3.lastInsertRowid, 5, 5, 8.50, 'Age 9-10');
  insertItem.run(order3.lastInsertRowid, 7, 5, 11.00, 'Age 9-10');
  insertItem.run(order3.lastInsertRowid, 11, 5, 14.00, 'Age 9-10');
}

module.exports = db;
