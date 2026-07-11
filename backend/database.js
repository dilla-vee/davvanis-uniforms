require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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
        barcode             TEXT UNIQUE,
        workshop_quantity   INTEGER DEFAULT 0,
        source_type         TEXT DEFAULT 'purchased',
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

      CREATE TABLE IF NOT EXISTS stock_transfers (
        id            SERIAL PRIMARY KEY,
        transfer_date TIMESTAMPTZ DEFAULT NOW(),
        received_date TIMESTAMPTZ,
        status        TEXT DEFAULT 'pending',
        notes         TEXT
      );

      CREATE TABLE IF NOT EXISTS stock_transfer_items (
        id             SERIAL PRIMARY KEY,
        transfer_id    INTEGER REFERENCES stock_transfers(id) ON DELETE CASCADE,
        stock_id       INTEGER REFERENCES stock(id) ON DELETE SET NULL,
        qty_dispatched INTEGER NOT NULL,
        qty_received   INTEGER
      );

      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'attendant',
        name          TEXT NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Schema migration for existing stock table:
    await client.query(`
      ALTER TABLE stock ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;
      ALTER TABLE stock ADD COLUMN IF NOT EXISTS workshop_quantity INTEGER DEFAULT 0;
      ALTER TABLE stock ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'purchased';
      ALTER TABLE stock ADD COLUMN IF NOT EXISTS embroidery_quantity INTEGER DEFAULT 0;
    `);

    // Migration for stock transfers tracking details:
    await client.query(`
      ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS dispatched_by TEXT;
      ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS carrier_name TEXT;
      ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS order_name TEXT;
      ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS received_by TEXT;
      ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS transfer_type TEXT DEFAULT 'workshop_to_shop';
    `);

    // Migration for daily sales, guest orders, deposits, and debts:
    await client.query(`
      ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS client_name TEXT;
      ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';

      ALTER TABLE orders ALTER COLUMN client_id DROP NOT NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_name TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_contact TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS collection_date DATE;

      CREATE TABLE IF NOT EXISTS debts (
        id SERIAL PRIMARY KEY,
        client_name TEXT NOT NULL,
        contact TEXT,
        amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        description TEXT,
        status TEXT DEFAULT 'unpaid',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Migration for staff PIN, sales attendant tracking, and embroidery logging:
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pin TEXT UNIQUE;
      ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS sold_by TEXT;

      CREATE TABLE IF NOT EXISTS embroidery_logs (
        id SERIAL PRIMARY KEY,
        log_type TEXT NOT NULL,
        logged_at TIMESTAMPTZ DEFAULT NOW(),
        item_name TEXT,
        quantity INTEGER DEFAULT 1,
        price_charged NUMERIC(10,2) NOT NULL DEFAULT 0,
        payment_method TEXT DEFAULT 'Cash',
        service_description TEXT,
        customer_item_count INTEGER,
        recorded_by TEXT
      );

      CREATE TABLE IF NOT EXISTS embroidery_clients (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        contact     TEXT,
        email       TEXT,
        description TEXT,
        image_url   TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS embroidery_client_designs (
        id          SERIAL PRIMARY KEY,
        client_id   INTEGER REFERENCES embroidery_clients(id) ON DELETE CASCADE,
        image_url   TEXT NOT NULL,
        design_name TEXT,
        notes       TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE embroidery_logs ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES embroidery_clients(id) ON DELETE SET NULL;
      ALTER TABLE embroidery_logs ADD COLUMN IF NOT EXISTS manual_client_name TEXT;
      ALTER TABLE stock ADD COLUMN IF NOT EXISTS last_adjusted_by TEXT;
    `);

    // Create database indexes for scaling and search optimization
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_embroidery_logs_client_id ON embroidery_logs(client_id);
      CREATE INDEX IF NOT EXISTS idx_embroidery_client_designs_client_id ON embroidery_client_designs(client_id);

      CREATE INDEX IF NOT EXISTS idx_client_uniform_photos_client_id ON client_uniform_photos(client_id);
      CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
      CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_stock_id ON order_items(stock_id);
      CREATE INDEX IF NOT EXISTS idx_daily_sales_sale_date ON daily_sales(sale_date);
      CREATE INDEX IF NOT EXISTS idx_daily_sale_items_sale_id ON daily_sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS idx_daily_sale_items_stock_id ON daily_sale_items(stock_id);
      CREATE INDEX IF NOT EXISTS idx_stock_transfers_transfer_date ON stock_transfers(transfer_date);
      CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);
      CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer_id ON stock_transfer_items(transfer_id);
      CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_stock_id ON stock_transfer_items(stock_id);
      CREATE INDEX IF NOT EXISTS idx_stock_category ON stock(category);
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

    // Seed default admin user if no users exist
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('Seeding default administrator...');
      const adminPassHash = bcrypt.hashSync('admin123', 10);
      await client.query(
        `INSERT INTO users (username, password_hash, role, name) VALUES ($1, $2, $3, $4)`,
        ['admin', adminPassHash, 'admin', 'Administrator']
      );
      console.log('Admin user created successfully (username: admin, password: admin123).');
    }

    // Seed sweaters if count is 0
    const sweaterCount = await client.query("SELECT COUNT(*) as count FROM stock WHERE category = 'Sweaters'");
    if (parseInt(sweaterCount.rows[0].count) === 0) {
      console.log('Seeding sweater stock items (colors + sizes 22-40)...');
      const colors = {
        'navy plain': 'Sweater: Navy Plain',
        'navy white': 'Sweater: Navy with White stripes',
        'navy sky': 'Sweater: Navy with Sky stripes',
        'navy red': 'Sweater: Navy with Red stripes',
        'navy yellow': 'Sweater: Navy with Yellow stripes',
        'red plain': 'Sweater: Red Plain',
        'red white': 'Sweater: Red with White stripes',
        'maroon plain': 'Sweater: Maroon Plain',
        'maroon white': 'Sweater: Maroon with White stripes',
        'green plain': 'Sweater: Green Plain',
        'green white': 'Sweater: Green with White stripes',
        'green safaricom': 'Sweater: Green with Safaricom stripes',
        'strathmore white': 'Sweater: Strathmore with White stripes',
        'royal plain': 'Sweater: Royal Plain',
        'royal white': 'Sweater: Royal with White stripes',
        'Kk Blue': 'Sweater: KK Blue Plain',
        'grey plain': 'Sweater: Grey Plain',
        'grey white': 'Sweater: Grey with White stripes',
        'grey red': 'Sweater: Grey with Red stripes',
        'grey red white': 'Sweater: Grey with Red and White stripes',
        'grey navy': 'Sweater: Grey with Navy stripes',
        'grey blue white': 'Sweater: Grey with Blue and White stripes',
        'grey white purple': 'Sweater: Grey with White and Purple stripes',
        'grey purple white': 'Sweater: Grey with Purple and White stripes',
        'school grey': 'Sweater: School Grey Plain',
        'ash grey': 'Sweater: Ash Grey Plain',
        'jungle': 'Sweater: Jungle Plain',
        'jungle white': 'Sweater: Jungle with White stripes',
        'jungle cream': 'Sweater: Jungle with Cream stripes',
        'light purple white': 'Sweater: Light Purple with White stripes',
        'dark purple plain': 'Sweater: Dark Purple Plain',
        'dark purple white': 'Sweater: Dark Purple with White stripes',
        'sky plain': 'Sweater: Sky Plain',
        'sky white': 'Sweater: Sky with White stripes',
        'beige plain': 'Sweater: Beige Plain',
        'biege whitw': 'Sweater: Beige with White stripes',
        'biege chocolate': 'Sweater: Beige with Chocolate stripes',
        'chocolate plain': 'Sweater: Chocolate Plain',
        'chocolate white': 'Sweater: Chocolate with White stripes',
        'chocolate beige': 'Sweater: Chocolate with Beige stripes',
        'black plain': 'Sweater: Black Plain',
        'black white': 'Sweater: Black with White stripes',
        'grey maroon': 'Sweater: Grey with Maroon stripes',
        'KK sky': 'Sweater: KK with Sky stripes',
        'grey(ash)red': 'Sweater: Grey (Ash) with Red stripes',
        'grey red white red': 'Sweater: Grey with Red, White, and Red stripes'
      };

      const sizes = ['22', '24', '26', '28', '30', '32', '34', '36', '38', '40'];
      
      for (const [key, value] of Object.entries(colors)) {
        for (const size of sizes) {
          await client.query(
            `INSERT INTO stock (name, category, size, quantity, price, low_stock_threshold, workshop_quantity, source_type, updated_at)
             VALUES ($1, 'Sweaters', $2, 0, null, 10, 0, 'manufactured', NOW())
             ON CONFLICT DO NOTHING`,
            [value, size]
          );
        }
      }
      console.log('Sweater stock seeding complete.');
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
