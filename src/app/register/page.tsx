'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Loader2, AlertCircle, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMsg('ระบบฐานข้อมูลยังไม่ได้เชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // สมัครสมาชิกผ่าน Supabase Auth
      // ระบบจะส่ง metadata ชื่อเต็มไปด้วย เพื่อให้ Trigger นำไปใส่ในตาราง profiles พร้อมกำหนด role: 'user'
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        // ล็อกอินอัตโนมัติสำเร็จ
        router.push('/');
        router.refresh();
      } else {
        // หากเปิดระบบยืนยันอีเมลใน Supabase
        setSuccessMsg(
          'สมัครสมาชิกสำเร็จเรียบร้อย! หากมีการเปิดระบบยืนยันอีเมล กรุณาตรวจสอบกล่องข้อความในอีเมลของคุณเพื่อเปิดใช้งานบัญชีครับ'
        );
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 py-12 bg-gradient-to-b from-pink-50/40 via-white to-purple-50/20">
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
              <Sparkles className="h-6 w-6 text-pink-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              สมัครสมาชิก Berrypink
            </h1>
            <p className="mt-1.5 text-xs text-slate-500">
              สร้างบัญชีสำหรับติดตามออเดอร์และบันทึกข้อมูลของคุณ
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
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-1">ยินดีต้อนรับ!</span>
                <span>{successMsg}</span>
                <div className="mt-3">
                  <Link
                    href="/login"
                    className="inline-block rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs"
                  >
                    ไปที่หน้าเข้าสู่ระบบ
                  </Link>
                </div>
              </div>
            </div>
          )}

          {!successMsg && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="เช่น ชลธิชา มั่นคง"
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-purple-600 focus:ring-4 focus:ring-purple-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  อีเมล (Email) <span className="text-rose-500">*</span>
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
                  รหัสผ่าน (อย่างน้อย 6 ตัวอักษร) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-purple-600 focus:ring-4 focus:ring-purple-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ยืนยันรหัสผ่าน <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-purple-600 focus:ring-4 focus:ring-purple-50"
                  />
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
                    <span>กำลังสมัครสมาชิก...</span>
                  </>
                ) : (
                  <span>สมัครสมาชิก</span>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-5">
            <p>
              มีบัญชีสมาชิกอยู่แล้ว?{' '}
              <Link
                href="/login"
                className="font-bold text-purple-600 hover:text-purple-700 hover:underline"
              >
                เข้าสู่ระบบที่นี่
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
