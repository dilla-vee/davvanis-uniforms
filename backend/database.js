require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

// Helper: run a query and return all rows
pool.query_rows = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
};

// Helper: run a query and return first row only
pool.query_one = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
};

// Create tables and seed initial data
async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.warn('WARNING: DATABASE_URL not set — skipping DB init. Add it in Railway Variables.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        school      TEXT NOT NULL,
        contact     TEXT,
        email       TEXT,
        description TEXT,
        image_url   TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stock (
        id                  SERIAL PRIMARY KEY,
        name                TEXT NOT NULL,
        category            TEXT,
        size                TEXT,
        quantity            INTEGER DEFAULT 0,
        price               NUMERIC(10,2),
        low_stock_threshold INTEGER DEFAULT 10,
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id          SERIAL PRIMARY KEY,
        client_id   INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        order_date  TIMESTAMPTZ DEFAULT NOW(),
        total_price NUMERIC(10,2),
        status      TEXT DEFAULT 'pending',
        notes       TEXT
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id         SERIAL PRIMARY KEY,
        order_id   INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        stock_id   INTEGER REFERENCES stock(id) ON DELETE SET NULL,
        quantity   INTEGER,
        unit_price NUMERIC(10,2),
        size       TEXT
      );

      CREATE TABLE IF NOT EXISTS client_uniform_photos (
        id         SERIAL PRIMARY KEY,
        client_id  INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        image_url  TEXT NOT NULL,
        caption    TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS daily_sales (
        id         SERIAL PRIMARY KEY,
        sale_date  DATE NOT NULL DEFAULT CURRENT_DATE,
        notes      TEXT,
        total_value NUMERIC(10,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS daily_sale_items (
        id           SERIAL PRIMARY KEY,
        sale_id      INTEGER REFERENCES daily_sales(id) ON DELETE CASCADE,
        stock_id     INTEGER REFERENCES stock(id) ON DELETE SET NULL,
        stock_name   TEXT,
        stock_size   TEXT,
        qty_sold     INTEGER NOT NULL,
        unit_price   NUMERIC(10,2),
        subtotal     NUMERIC(10,2)
      );
    `);

    const { rows } = await client.query('SELECT COUNT(*) as count FROM clients');
    if (parseInt(rows[0].count) === 0) {
      console.log('Seeding database with sample data...');

      const c1 = await client.query(
        `INSERT INTO clients (name, school, contact, email, description) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        ['Greenwood Primary', 'Greenwood Primary School', '0712 345678', 'admin@greenwood.sc.ke',
         'Large primary school requiring full uniform sets including PE kits. Order twice yearly.']
      );
      const c2 = await client.query(
        `INSERT INTO clients (name, school, contact, email, description) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        ["St. Mary's Academy", "St. Mary's Academy", '0722 456789', 'bursar@stmarys.ac.ke',
         'Secondary school with blazers, ties, and sports uniforms.']
      );

      const cid1 = c1.rows[0].id;
      const cid2 = c2.rows[0].id;

      const stockItems = [
        ['Boys Shirt',    'Tops',        'Age 7-8',   45, 350,  10],
        ['Boys Shirt',    'Tops',        'Age 9-10',  32, 350,  10],
        ['Girls Blouse',  'Tops',        'Age 7-8',   38, 350,  10],
        ['Girls Skirt',   'Bottoms',     'Age 7-8',   22, 450,   8],
        ['Boys Trousers', 'Bottoms',     'Age 7-8',   30, 500,   8],
        ['School Jumper', 'Tops',        'Age 7-8',   50, 600,  12],
        ['PE T-Shirt',    'Sports',      'Small',     25, 300,  10],
        ['PE Shorts',     'Sports',      'Small',     20, 380,  10],
        ['School Blazer', 'Outerwear',   'Age 11-12', 12, 1500,  5],
        ['School Tie',    'Accessories', 'One Size',  60, 200,  15],
      ];
      const sIds = [];
      for (const [name, cat, size, qty, price, threshold] of stockItems) {
        const r = await client.query(
          `INSERT INTO stock (name,category,size,quantity,price,low_stock_threshold) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [name, cat, size, qty, price, threshold]
        );
        sIds.push(r.rows[0].id);
      }

      const o1 = await client.query(
        `INSERT INTO orders (client_id,total_price,status,notes) VALUES ($1,$2,$3,$4) RETURNING id`,
        [cid1, 9800, 'completed', 'Autumn term order.']
      );
      const o2 = await client.query(
        `INSERT INTO orders (client_id,total_price,status,notes) VALUES ($1,$2,$3,$4) RETURNING id`,
        [cid2, 17600, 'processing', 'Needs embroidery on blazers.']
      );

      const itemsToInsert = [
        [o1.rows[0].id, sIds[0], 10, 350, 'Age 7-8'],
        [o1.rows[0].id, sIds[2], 10, 350, 'Age 7-8'],
        [o2.rows[0].id, sIds[8],  8, 1500, 'Age 11-12'],
        [o2.rows[0].id, sIds[9], 20, 200, 'One Size'],
      ];
      for (const [oid, sid, qty, price, size] of itemsToInsert) {
        await client.query(
          `INSERT INTO order_items (order_id,stock_id,quantity,unit_price,size) VALUES ($1,$2,$3,$4,$5)`,
          [oid, sid, qty, price, size]
        );
      }
      console.log('Seed complete.');
    }

    await client.query('COMMIT');
    console.log('Database ready.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DB init error:', err.message);
  } finally {
    client.release();
  }
}

initDB();

module.exports = pool;
