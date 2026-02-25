import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT 1 as ok');
    return NextResponse.json({
      status: 'ok',
      database: result.rows[0]?.ok === 1 ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: 'error', database: 'disconnected', timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
