import { NextRequest, NextResponse } from 'next/server';
import pool, { queryOne, execute } from '@/lib/db';
import { requireAdmin, verifyPassword } from '@/lib/auth';
import type { AdminUser } from '@/types';

export async function POST(request: NextRequest) {
  let adminSession;
  try {
    adminSession = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { password: string; confirmation: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { password, confirmation } = body;

  if (confirmation !== 'DELETE ALL SURVEY DATA') {
    return NextResponse.json(
      { error: 'Confirmation text does not match. Type exactly: DELETE ALL SURVEY DATA' },
      { status: 400 }
    );
  }

  // Verify password
  const admin = await queryOne<AdminUser>(
    'SELECT * FROM admin_users WHERE id = $1',
    [adminSession.adminId]
  );

  if (!admin) {
    return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
  }

  const validPassword = await verifyPassword(password, admin.password_hash);
  if (!validPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete in correct order to respect foreign keys
    const answersDeleted = await client.query('DELETE FROM answers');
    const receiptCodesDeleted = await client.query('DELETE FROM receipt_codes');
    const submissionsDeleted = await client.query('DELETE FROM submissions');
    const cacheDeleted = await client.query('DELETE FROM aggregates_cache');

    // Log the reset action
    await client.query(
      `INSERT INTO admin_audit_log (admin_user_id, action, details)
       VALUES ($1, 'database_reset', $2)`,
      [
        adminSession.adminId,
        JSON.stringify({
          answers_deleted: answersDeleted.rowCount,
          receipt_codes_deleted: receiptCodesDeleted.rowCount,
          submissions_deleted: submissionsDeleted.rowCount,
          cache_deleted: cacheDeleted.rowCount,
          timestamp: new Date().toISOString(),
        }),
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      deleted: {
        answers: answersDeleted.rowCount,
        receipt_codes: receiptCodesDeleted.rowCount,
        submissions: submissionsDeleted.rowCount,
        aggregates_cache: cacheDeleted.rowCount,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reset error:', err);
    return NextResponse.json({ error: 'Failed to reset database' }, { status: 500 });
  } finally {
    client.release();
  }
}
