'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Executive Summary', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/admin/dashboard/metals', label: 'Metals & Mix', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { href: '/admin/dashboard/diamonds', label: 'Diamonds & Gems', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707' },
  { href: '/admin/dashboard/retail', label: 'Retail Pulse', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { href: '/admin/dashboard/supply', label: 'Supply Chain', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { href: '/admin/dashboard/explorer', label: 'Slice Explorer', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { href: '/admin/export', label: 'Export', icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href: '/admin/reset', label: 'Reset Database', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/session');
        if (res.ok) {
          setAuthenticated(true);
        } else {
          router.push('/admin/login');
        }
      } catch {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center bg-[#F5F5F0]">
        <div className="w-8 h-8 border-4 border-[#ECB421] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="flex min-h-[calc(100vh-140px)]">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 bg-[#1B2A4A] text-white p-2 rounded-lg"
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#1B2A4A] text-white transform transition-transform lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-[#ECB421]">JCSA Admin</h2>
        </div>
        <nav className="p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[#ECB421]/20 text-[#ECB421]'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 bg-[#F5F5F0] overflow-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
