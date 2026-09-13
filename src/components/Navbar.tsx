'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShoppingBag, LogOut, Package, Boxes, Users, User, ShieldCheck } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { UserProfile } from '@/lib/types';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);

  const fetchUserProfile = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Navbar profile fetch error:', err);
    }
  };

  useEffect(() => {
    setSupabaseReady(isSupabaseConfigured());
    const supabase = createClient();

    // ตรวจสอบ session ปัจจุบัน
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    // ฟังเหตุการณ์เปลี่ยนแปลง Auth State
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    if (isAdminRoute) {
      router.push('/admin/login');
    } else {
      router.push('/login');
    }
    router.refresh();
  };

  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 group py-1">
          <img
            src="/logo.jpg"
            alt="Berrypink Logo"
            className="h-8 sm:h-10 w-auto object-contain rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex items-baseline">
            <span className="text-base sm:text-xl font-bold tracking-tight">
              <span className="text-purple-600">Berry</span>
              <span className="text-pink-500">pink</span>
            </span>
          </div>
          {isAdminRoute && (
            <span className="rounded-md sm:rounded-lg bg-purple-100 px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-purple-700 shadow-xs ml-0.5 sm:ml-1">
              Admin
            </span>
          )}
        </Link>

        {/* Public Header Buttons: เช็คเลขพัสดุ & ติดต่อสั่งซื้อ Facebook & สถานะสมาชิก */}
        {!isAdminRoute && (
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* เช็คเลขพัสดุ */}
            <Link
              href="/tracking"
              className={`flex items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-xl border px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-2xs shrink-0 ${
                pathname === '/tracking'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'border-purple-200/90 bg-gradient-to-r from-purple-50 to-pink-50/60 text-purple-700 hover:text-purple-900 hover:border-purple-300 hover:shadow-xs'
              }`}
            >
              <Package className={`h-4 w-4 shrink-0 ${pathname === '/tracking' ? 'text-white' : 'text-purple-600'}`} />
              <span className="hidden sm:inline">เช็คเลขพัสดุ</span>
              <span className="sm:hidden">พัสดุ</span>
            </Link>

            {/* ติดต่อสั่งซื้อ Facebook */}
            <a
              href="https://www.facebook.com/profile.php?id=61593625937584"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 p-2 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:from-purple-700 hover:to-pink-600 transition-all hover:shadow-md active:scale-95 shrink-0"
              title="ติดต่อสั่งซื้อผ่าน Facebook"
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
              <span className="hidden md:inline ml-2">ติดต่อสั่งซื้อผ่าน Facebook</span>
              <span className="hidden sm:inline md:hidden ml-1.5">สั่งซื้อ</span>
            </a>

            {/* User Auth Section */}
            {user ? (
              <div className="flex items-center gap-1.5 shrink-0">
                {profile?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="hidden md:flex items-center gap-1 rounded-xl bg-purple-100 px-2.5 py-2 text-xs font-bold text-purple-800 hover:bg-purple-200 transition-colors shrink-0"
                    title="ไปที่แผงควบคุม Admin"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-700" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link
                  href="/profile"
                  className={`flex items-center gap-1.5 rounded-xl border p-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                    pathname === '/profile'
                      ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/50'
                  }`}
                  title={profile?.full_name || user.email}
                >
                  <div className="flex h-6 w-6 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-[11px] sm:text-[10px] font-bold text-white shadow-2xs shrink-0">
                    {(profile?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[90px] truncate">
                    {profile?.full_name || 'โปรไฟล์'}
                  </span>
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className={`flex items-center gap-1 whitespace-nowrap rounded-xl border px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                  pathname === '/login' || pathname === '/register'
                    ? 'border-purple-600 bg-purple-50 text-purple-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/50'
                }`}
              >
                <User className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="text-xs sm:text-sm">เข้าสู่ระบบ</span>
              </Link>
            )}
          </div>
        )}

        {/* Navigation - แสดงเฉพาะเมื่อผู้ดูแลอยู่ในฝั่งระบบหลังบ้าน (/admin) */}
        {isAdminRoute && (
          <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link
              href="/admin"
              className={`flex items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-medium transition-colors ${
                pathname === '/admin' || pathname.startsWith('/admin/products')
                  ? 'bg-purple-100 text-purple-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Boxes className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">จัดการสินค้า</span>
              <span className="sm:hidden">สินค้า</span>
            </Link>

            <Link
              href="/admin/tracking"
              className={`flex items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-medium transition-colors ${
                pathname.startsWith('/admin/tracking')
                  ? 'bg-purple-100 text-purple-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Package className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">จัดการเลขพัสดุ</span>
              <span className="sm:hidden">พัสดุ</span>
            </Link>

            <Link
              href="/admin/users"
              className={`flex items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-medium transition-colors ${
                pathname.startsWith('/admin/users')
                  ? 'bg-purple-100 text-purple-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">จัดการผู้ใช้งาน</span>
              <span className="sm:hidden">ผู้ใช้</span>
            </Link>

            <Link
              href="/"
              className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">หน้าร้าน</span>
            </Link>

            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-lg border border-rose-200 bg-rose-50/70 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors ml-0.5 sm:ml-1"
                title="ออกจากระบบ"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">ออก</span>
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
