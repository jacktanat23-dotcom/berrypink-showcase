'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShoppingBag, LogOut } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    setSupabaseReady(isSupabaseConfigured());
    const supabase = createClient();

    // ตรวจสอบ session ปัจจุบัน
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // ฟังเหตุการณ์เปลี่ยนแปลง Auth State
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/admin/login');
    router.refresh();
  };

  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group py-1">
          <img
            src="/logo.jpg"
            alt="Berrypink Logo"
            className="h-10 sm:h-12 w-auto object-contain rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105"
          />
          {isAdminRoute && (
            <span className="rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700 shadow-xs">
              Admin
            </span>
          )}
        </Link>

        {/* Action Button: ติดต่อสั่งซื้อผ่าน Facebook (แสดงในหน้าหลัก) */}
        {!isAdminRoute && (
          <a
            href="https://www.facebook.com/profile.php?id=61593625937584"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:from-purple-700 hover:to-pink-600 transition-all hover:shadow-md active:scale-95"
          >
            <svg
              className="h-4 w-4 fill-current shrink-0"
              viewBox="0 0 24 24"
              width={16}
              height={16}
              style={{ width: 16, height: 16, minWidth: 16, minHeight: 16 }}
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="hidden sm:inline">ติดต่อสั่งซื้อผ่าน Facebook</span>
            <span className="sm:hidden">ติดต่อสั่งซื้อ</span>
          </a>
        )}

        {/* Navigation - แสดงเฉพาะเมื่อผู้ดูแลอยู่ในฝั่งระบบหลังบ้าน (/admin) */}
        {isAdminRoute && (
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>เปิดดูหน้าร้าน</span>
            </Link>

            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>ออกจากระบบ Admin</span>
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
