const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query('SELECT id, barcode FROM stock WHERE barcode IS NULL OR barcode = \'\' OR barcode = \'000000000000\'');
    console.log(`Found ${res.rowCount} items without a valid barcode.`);

    let count = 0;
    for (let row of res.rows) {
      const generatedBarcode = `8810${String(row.id).padStart(8, '0')}`;
      await pool.query('UPDATE stock SET barcode = $1 WHERE id = $2', [generatedBarcode, row.id]);
      count++;
    }

    console.log(`Successfully generated and saved barcodes for ${count} items.`);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
