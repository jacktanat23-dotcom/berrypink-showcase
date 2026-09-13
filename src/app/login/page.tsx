'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2, AlertCircle, ArrowLeft, Heart, User, Sparkles, Eye, EyeOff } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMsg('ระบบฐานข้อมูลยังไม่ได้เชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Back to Home */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับสู่หน้าร้านหลัก
      </Link>

      {/* Card */}
      <div className="overflow-hidden rounded-3xl border border-pink-100 bg-white p-8 shadow-xl shadow-pink-100/40">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-100 to-pink-100 text-purple-600 mb-4 shadow-2xs">
            <User className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            เข้าสู่ระบบสมาชิก
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            ยินดีต้อนรับสู่ Berrypink Store
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-rose-50 p-4 text-xs font-medium text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
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
                placeholder="you@example.com"
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
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 py-3 text-sm font-semibold text-white shadow-md shadow-pink-200 transition-all hover:from-purple-700 hover:to-pink-600 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <span>เข้าสู่ระบบ</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-5">
          <p>
            ยังไม่มีบัญชีสมาชิก?{' '}
            <Link
              href="/register"
              className="font-bold text-purple-600 hover:text-purple-700 hover:underline"
            >
              สมัครสมาชิกใหม่
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 py-12 bg-gradient-to-b from-pink-50/40 via-white to-purple-50/20">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        }
      >
        <CustomerLoginForm />
      </Suspense>
    </div>
  );
}
