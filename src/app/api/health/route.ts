import { NextResponse } from 'next/server';

export async function GET() {
  let dbStatus = 'not_configured';

  if (process.env.DATABASE_URL) {
    try {
      const pool = (await import('@/lib/db')).default;
      const result = await pool.query('SELECT 1 as ok');
      dbStatus = result.rows[0]?.ok === 1 ? 'connected' : 'error';
    } catch {
      dbStatus = 'disconnected';
    }
  }

  // Always return 200 so Railway healthcheck passes.
  // Database status is informational only.
  return NextResponse.json({
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
}
