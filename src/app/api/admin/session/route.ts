import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (session.isLoggedIn && session.adminId) {
      return NextResponse.json({
        authenticated: true,
        email: session.adminEmail,
      });
    }
    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
