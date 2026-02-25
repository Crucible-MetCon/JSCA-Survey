import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log('Running migrations...');

    // First, ensure the migrations tracking table exists
    const trackingSQL = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', '003_migrations_tracking.sql'),
      'utf-8'
    );
    await pool.query(trackingSQL);

    // Get already-applied migrations
    const applied = await pool.query('SELECT filename FROM _migrations ORDER BY id');
    const appliedSet = new Set(applied.rows.map((r: { filename: string }) => r.filename));

    // Read migration files in order
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  Skipping (already applied): ${file}`);
        continue;
      }

      console.log(`  Applying: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
    }

    console.log('Migrations complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
