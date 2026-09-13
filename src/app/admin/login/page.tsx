'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, Loader2, AlertCircle, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMsg('กรุณาตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน .env.local ก่อนใช้งานระบบ Auth');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // เข้าสู่ระบบ
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // ตรวจสอบสิทธิ์ Role จากตาราง profiles อย่างเข้มงวด
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        // หากพบบัญชีแต่สิทธิ์เป็น 'user' (ไม่ใช่ admin) ให้ตัดสิทธิ์และ Sign Out ทันที
        if (profile && profile.role !== 'admin') {
          await supabase.auth.signOut();
          setErrorMsg(
            'ขออภัย บัญชีนี้เป็นสิทธิ์ผู้ใช้งานทั่วไป (Customer) ไม่สามารถเข้าสู่ระบบผู้ดูแลระบบ (Admin) ได้ หากคุณเป็นลูกค้า กรุณาเข้าสู่ระบบผ่านหน้าร้านหลักครับ'
          );
          return;
        }
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Back to Showcase */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับสู่หน้าหลักร้านค้า
      </Link>

      {/* Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 mb-4 border border-purple-100">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            เข้าสู่ระบบผู้ดูแล (Admin)
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            เฉพาะผู้ดูแลร้านค้า Berrypink เท่านั้น
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-rose-50 p-4 text-xs font-medium text-rose-700 border border-rose-200 leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              อีเมลแอดมิน (Admin Email)
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@berrypink.com"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-purple-600 focus:ring-4 focus:ring-purple-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-11 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-purple-600 focus:ring-4 focus:ring-purple-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-purple-600 transition-colors focus:outline-none"
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-500" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 py-3 text-sm font-semibold text-white shadow-md shadow-purple-200 transition-all hover:from-purple-700 hover:to-pink-600 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <span>เข้าสู่ระบบ Admin</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-100 pt-5 leading-relaxed">
          <p>
            ระบบความปลอดภัยสำหรับผู้ดูแลร้านค้า<br />
            หากคุณเป็นลูกค้าทั่วไป{' '}
            <Link href="/login" className="font-semibold text-purple-600 hover:underline">
              เข้าสู่ระบบลูกค้าที่นี่
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 py-12 bg-slate-50/50">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
