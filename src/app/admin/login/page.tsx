'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, Loader2, AlertCircle, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

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
      if (isSignUp) {
        // ลงทะเบียน Admin ผู้ใช้ใหม่
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          router.push(redirectTo);
          router.refresh();
        } else {
          setSuccessMsg('สมัครสมาชิกสำเร็จ! หากเปิดระบบยืนยันอีเมล กรุณาตรวจสอบอีเมลของคุณก่อนเข้าสู่ระบบ');
        }
      } else {
        // เข้าสู่ระบบ
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
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
        กลับสู่หน้าโชว์รูมสินค้า
      </Link>

      {/* Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isSignUp ? 'สร้างบัญชีผู้ดูแลระบบ' : 'เข้าสู่ระบบผู้ดูแล (Admin)'}
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            ระบบจัดการสินค้า เพิ่ม แก้ไข และอัปโหลดรูปภาพ
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-rose-50 p-4 text-xs font-medium text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-emerald-50 p-4 text-xs font-medium text-emerald-700 border border-emerald-200">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              อีเมล (Email)
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50"
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
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading
              ? 'กำลังดำเนินการ...'
              : isSignUp
              ? 'สมัครสมาชิก Admin'
              : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Switch Mode */}
        <div className="mt-6 text-center text-xs text-slate-500">
          {isSignUp ? (
            <p>
              มีบัญชีอยู่แล้ว?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="font-semibold text-indigo-600 hover:underline"
              >
                เข้าสู่ระบบ
              </button>
            </p>
          ) : (
            <p>
              ยังไม่มีบัญชี Admin?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="font-semibold text-indigo-600 hover:underline"
              >
                สร้างบัญชีใหม่
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 py-12">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
