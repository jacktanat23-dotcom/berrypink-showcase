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
  Edit3,
  Check,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { UserProfile } from '@/lib/types';

export default function CustomerProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // State สำหรับการเปลี่ยนชื่อเล่น
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
        setNameInput(data.full_name || '');
      } else {
        // Fallback จาก user_metadata
        const metaName = session.user.user_metadata?.full_name || null;
        setProfile({
          id: session.user.id,
          email: session.user.email || '',
          full_name: metaName,
          role: 'user',
          created_at: session.user.created_at,
          updated_at: session.user.created_at,
        });
        setNameInput(metaName || '');
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

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameFeedback(null);
    const trimmed = nameInput.trim();

    if (!trimmed) {
      setNameFeedback({ type: 'error', message: 'กรุณากรอกชื่อเล่นหรือชื่อที่ต้องการแสดง' });
      return;
    }

    setSavingName(true);
    try {
      const supabase = createClient();

      // 1. อัปเดตในตาราง public.profiles
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: trimmed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      // 2. ซิงค์กับ auth user metadata
      await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });

      // 3. อัปเดต state
      setProfile((prev) => (prev ? { ...prev, full_name: trimmed } : null));
      setNameFeedback({ type: 'success', message: 'อัปเดตชื่อเล่นสำเร็จเรียบร้อยแล้ว ✨' });
      setIsEditingName(false);
      router.refresh();
    } catch (err: any) {
      console.error('Update name error:', err);
      setNameFeedback({ type: 'error', message: `บันทึกไม่สำเร็จ: ${err.message}` });
    } finally {
      setSavingName(false);
    }
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
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 text-2xl font-bold text-white shadow-2xs">
                  {(profile?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-14 p-6 sm:p-8">
            {/* Feedback Alert */}
            {nameFeedback && (
              <div
                className={`mb-5 flex items-center justify-between rounded-2xl p-3.5 text-xs font-medium border animate-fade-in ${
                  nameFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {nameFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span>{nameFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNameFeedback(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex-1">
                {!isEditingName ? (
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-2xl font-bold text-slate-900">
                        {profile?.full_name || user.email?.split('@')[0] || 'สมาชิก Berrypink'}
                      </h1>
                      <button
                        type="button"
                        onClick={() => {
                          setNameInput(profile?.full_name || '');
                          setIsEditingName(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200/90 bg-purple-50/60 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 hover:text-purple-900 transition-colors shadow-2xs"
                        title="เปลี่ยนชื่อเล่น / ชื่อที่แสดง"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-purple-600" />
                        <span>เปลี่ยนชื่อเล่น</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{user.email}</span>
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSaveName} className="space-y-3 max-w-sm animate-fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ชื่อเล่น หรือชื่อที่ต้องการให้แสดง:
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="เช่น พี่แจ็ค, น้องเบอร์รี่"
                        className="w-full rounded-xl border border-purple-300 px-3.5 py-2 text-sm text-slate-900 outline-none transition-all focus:border-purple-600 focus:ring-4 focus:ring-purple-50"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={savingName}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-purple-700 hover:to-pink-600 transition-all disabled:opacity-50"
                      >
                        {savingName ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        )}
                        <span>บันทึกชื่อ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingName(false);
                          setNameInput(profile?.full_name || '');
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </form>
                )}
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
