import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getSession, verifyPassword } from '@/lib/auth';
import type { AdminUser } from '@/types';

export async function POST(request: NextRequest) {
  let body: { email: string; password: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  try {
    const admin = await queryOne<AdminUser>(
      'SELECT * FROM admin_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Set session
    const session = await getSession();
    session.adminId = admin.id;
    session.adminEmail = admin.email;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ success: true, email: admin.email });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
