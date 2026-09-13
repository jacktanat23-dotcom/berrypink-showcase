'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Mail,
  Shield,
  Package,
  LogOut,
  ArrowLeft,
  Loader2,
  Calendar,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { UserProfile } from '@/lib/types';

export default function CustomerProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login?redirectTo=/profile');
        return;
      }

      setUser(session.user);

      // ดึงข้อมูลโปรไฟล์
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!error && data) {
        setProfile(data);
      } else {
        // Fallback จาก user_metadata
        setProfile({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || null,
          role: 'user',
          created_at: session.user.created_at,
          updated_at: session.user.created_at,
        });
      }

      setLoading(false);
    }

    loadUser();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/40 via-white to-purple-50/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับสู่หน้าร้านหลัก
        </Link>

        {/* Profile Card */}
        <div className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-xl shadow-pink-100/30">
          {/* Cover Header */}
          <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-400 h-28 sm:h-36 relative">
            <div className="absolute -bottom-10 left-6 sm:left-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md border-2 border-white">
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <User className="h-9 w-9" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-14 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {profile?.full_name || user.email?.split('@')[0] || 'สมาชิก Berrypink'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{user.email}</span>
                </p>
              </div>

              <div>
                {profile?.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800 border border-purple-200">
                    <Shield className="h-3.5 w-3.5 text-purple-600" />
                    <span>ผู้ดูแลระบบ (Admin)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-700 border border-pink-200">
                    <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                    <span>สมาชิกทั่วไป (Customer)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/tracking"
                className="group flex items-center gap-3.5 rounded-2xl border border-purple-100 bg-purple-50/40 p-4 transition-all hover:bg-purple-50 hover:border-purple-200 hover:shadow-xs"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                    เช็คเลขพัสดุของคุณ
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ค้นหาเลขพัสดุและติดตามการจัดส่ง
                  </p>
                </div>
              </Link>

              <Link
                href="/"
                className="group flex items-center gap-3.5 rounded-2xl border border-pink-100 bg-pink-50/40 p-4 transition-all hover:bg-pink-50 hover:border-pink-200 hover:shadow-xs"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-500 text-white shadow-xs">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-pink-600 transition-colors">
                    เลือกดูสินค้าหน้าร้าน
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    คอลเลกชัน Sylvanian ล่าสุด
                  </p>
                </div>
              </Link>
            </div>

            {/* If Admin, show shortcut to admin dashboard */}
            {profile?.role === 'admin' && (
              <div className="mt-4 rounded-2xl border border-purple-200 bg-purple-50/80 p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-900 block">
                    สิทธิ์การจัดการระบบ (Admin Rights)
                  </span>
                  <span className="text-xs text-purple-700">
                    คุณมีสิทธิ์เข้าถึงระบบจัดการหลังบ้านและจัดการสินค้า
                  </span>
                </div>
                <Link
                  href="/admin"
                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700"
                >
                  ไปที่หลังบ้าน
                </Link>
              </div>
            )}

            {/* Logout Button */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
