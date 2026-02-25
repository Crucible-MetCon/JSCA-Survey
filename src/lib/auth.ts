import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import bcryptjs from 'bcryptjs';
import type { SessionData } from '@/types';

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET || 'default-dev-secret-must-be-32-chars!!',
  cookieName: 'jcsa_admin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.adminId) {
    throw new Error('Unauthorized');
  }
  return {
    adminId: session.adminId,
    adminEmail: session.adminEmail,
    isLoggedIn: session.isLoggedIn,
  };
}
