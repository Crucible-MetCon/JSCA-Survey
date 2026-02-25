import bcryptjs from 'bcryptjs';
import pool from '../src/lib/db';

async function updateAdmin() {
  const newEmail = 'crucible@metcon.co.za';
  const newPassword = process.argv[2] || 'crucible@2026';

  // Find existing admin user (could be under old email)
  const existing = await pool.query('SELECT id, email FROM admin_users LIMIT 1');

  if (existing.rows.length === 0) {
    console.log('No admin users found. Run npm run seed first.');
    await pool.end();
    return;
  }

  const oldEmail = existing.rows[0].email;
  console.log(`Found admin user: ${oldEmail}`);

  const hash = await bcryptjs.hash(newPassword, 12);
  await pool.query(
    'UPDATE admin_users SET email = $1, password_hash = $2 WHERE id = $3',
    [newEmail, hash, existing.rows[0].id]
  );

  console.log(`Updated admin: ${oldEmail} -> ${newEmail} with new password`);
  await pool.end();
}

updateAdmin();
