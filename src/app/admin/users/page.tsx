'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Boxes,
  Package,
  Calendar,
  Mail,
  User,
  Check,
  X,
  Lock,
} from 'lucide-react';
import { UserProfile, UserRole } from '@/lib/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal ยืนยันการเปลี่ยนสิทธิ์
  const [confirmModal, setConfirmModal] = useState<{
    profile: UserProfile;
    nextRole: UserRole;
  } | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    setDbError(null);

    if (!isSupabaseConfigured()) {
      setDbError('ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // ตรวจสอบ user ที่กำลังล็อกอินอยู่
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentAdminId(session.user.id);
      }

      // ดึงรายชื่อโปรไฟล์ทั้งหมด
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setProfiles(data || []);
    } catch (err: any) {
      console.error('Fetch profiles error:', err);
      setDbError(err.message || 'ไม่สามารถโหลดข้อมูลผู้ใช้งานได้ กรุณาตรวจสอบว่าได้รันคำสั่ง SQL Migration แล้ว');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  // ฟังก์ชันอัปเดตสิทธิ์ (Promote / Demote)
  const handleUpdateRole = async (targetProfile: UserProfile, newRole: UserRole) => {
    if (targetProfile.id === currentAdminId && newRole === 'user') {
      setFeedback({
        type: 'error',
        message: 'ไม่อนุญาตให้ลดระดับสิทธิ์บัญชีของตัวเอง เพื่อป้องกันการถูกล็อคออกจากระบบหลังบ้าน',
      });
      return;
    }

    setActionLoadingId(targetProfile.id);
    setConfirmModal(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', targetProfile.id);

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((p) => (p.id === targetProfile.id ? { ...p, role: newRole } : p))
      );

      setFeedback({
        type: 'success',
        message: `เปลี่ยนสิทธิ์ของ "${targetProfile.full_name || targetProfile.email}" เป็น "${
          newRole === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'ผู้ใช้ทั่วไป (User)'
        }" เรียบร้อยแล้ว`,
      });
    } catch (err: any) {
      console.error('Update role error:', err);
      setFeedback({
        type: 'error',
        message: `ไม่สามารถเปลี่ยนสิทธิ์ได้: ${err.message}`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // กรองรายชื่อผู้ใช้
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (p.full_name && p.full_name.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q);

      const matchRole = roleFilter === 'all' || p.role === roleFilter;

      return matchQuery && matchRole;
    });
  }, [profiles, searchQuery, roleFilter]);

  // คำนวณสถิติ
  const adminCount = useMemo(() => profiles.filter((p) => p.role === 'admin').length, [profiles]);
  const userCount = useMemo(() => profiles.filter((p) => p.role === 'user').length, [profiles]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Top Admin Subheader with Tabs */}
      <div className="border-b border-slate-200 bg-white shadow-2xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 mb-1">
                <span>🛡️ Berrypink User & Role Management</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                ระบบจัดการผู้ใช้งานและกำหนดสิทธิ์ (User & RBAC)
              </h1>
            </div>

            <button
              onClick={fetchProfiles}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs self-start sm:self-auto"
            >
              <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-4 border-t border-slate-100 pt-2 -mb-px">
            <Link
              href="/admin"
              className="flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-all"
            >
              <Boxes className="h-4 w-4" />
              <span>จัดการสินค้าในร้าน</span>
            </Link>

            <Link
              href="/admin/tracking"
              className="flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-all"
            >
              <Package className="h-4 w-4" />
              <span>จัดการเลขพัสดุ</span>
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center gap-2 border-b-2 border-purple-600 px-3 py-2.5 text-xs sm:text-sm font-bold text-purple-600 transition-all"
            >
              <Users className="h-4 w-4 text-purple-600" />
              <span>จัดการผู้ใช้งาน ({profiles.length})</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mb-6 flex items-center justify-between rounded-2xl p-4 text-sm font-medium shadow-2xs animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Database Migration Warning */}
        {dbError && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-amber-900 shadow-2xs">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-base text-amber-900">ตรวจพบข้อผิดพลาดเกี่ยวกับฐานข้อมูล Supabase</h3>
                <p className="mt-1 text-sm text-amber-800 leading-relaxed">
                  {dbError}
                </p>
                <div className="mt-3 text-xs bg-white/80 p-3 rounded-xl border border-amber-200 font-mono text-slate-700">
                  💡 คำแนะนำ: กรุณารันไฟล์ migration ที่ <span className="font-semibold text-purple-700">supabase/rbac_migration.sql</span> ใน SQL Editor ของ Supabase Dashboard เพื่อสร้างตาราง profiles และระบบ Role อัตโนมัติ
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                ผู้ใช้งานทั้งหมด
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                {loading ? '-' : profiles.length}
              </span>
              <span className="text-xs text-slate-500">บัญชี</span>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/30 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                ผู้ดูแลระบบ (Admin)
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-2xs">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-purple-900">
                {loading ? '-' : adminCount}
              </span>
              <span className="text-xs text-purple-600 font-medium">มีสิทธิ์จัดการระบบ</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                ลูกค้าทั่วไป (User)
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                {loading ? '-' : userCount}
              </span>
              <span className="text-xs text-slate-500">สมาชิกลูกค้า</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ, อีเมล หรือ User ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100"
            />
          </div>

          {/* Role Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                roleFilter === 'all'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({profiles.length})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                roleFilter === 'admin'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin ({adminCount})
            </button>
            <button
              onClick={() => setRoleFilter('user')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                roleFilter === 'user'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              User ({userCount})
            </button>
          </div>
        </div>

        {/* Users Table / List */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
              <p className="mt-3 text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลผู้ใช้งาน...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">ไม่พบข้อมูลผู้ใช้งาน</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm">
                {searchQuery
                  ? `ไม่พบบัญชีที่ตรงกับคำค้นหา "${searchQuery}"`
                  : 'ยังไม่มีผู้ใช้งานลงทะเบียนในระบบ หรือยังไม่ได้เชื่อมต่อตาราง profiles'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">ผู้ใช้งาน</th>
                    <th className="px-6 py-4">อีเมล</th>
                    <th className="px-6 py-4">สิทธิ์การเข้าถึง (Role)</th>
                    <th className="px-6 py-4">วันที่สมัคร</th>
                    <th className="px-6 py-4 text-right">จัดการสิทธิ์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProfiles.map((p) => {
                    const isSelf = p.id === currentAdminId;
                    const isAdmin = p.role === 'admin';
                    const isActioning = actionLoadingId === p.id;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* User Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 text-sm font-bold text-white shadow-2xs">
                              {(p.full_name?.[0] || p.email?.[0] || 'U').toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{p.full_name || 'ไม่ระบุชื่อ'}</span>
                                {isSelf && (
                                  <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                                    คุณ
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 font-mono">
                                ID: {p.id.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span>{p.email}</span>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-6 py-4">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 text-xs font-bold text-purple-800 border border-purple-200/80 shadow-2xs">
                              <ShieldCheck className="h-3.5 w-3.5 text-purple-700" />
                              Admin (ผู้ดูแล)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                              <User className="h-3.5 w-3.5 text-slate-500" />
                              User (ลูกค้าทั่วไป)
                            </span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="px-6 py-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{formatDate(p.created_at)}</span>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-6 py-4 text-right">
                          {isActioning ? (
                            <span className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              กำลังบันทึก...
                            </span>
                          ) : isSelf ? (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed border border-slate-200"
                              title="ไม่สามารถลดระดับสิทธิ์บัญชีของตัวเองได้ เพื่อป้องกันระบบถูกล็อค"
                            >
                              <Lock className="h-3.5 w-3.5 text-slate-400" />
                              <span>บัญชีของคุณ</span>
                            </span>
                          ) : isAdmin ? (
                            <button
                              type="button"
                              onClick={() => setConfirmModal({ profile: p, nextRole: 'user' })}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors active:scale-95 shadow-2xs"
                              title="ลดระดับสิทธิ์เป็นสมาชิกลูกค้าทั่วไป"
                            >
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                              <span>ปรับเป็น User</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmModal({ profile: p, nextRole: 'admin' })}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-3 py-1.5 text-xs font-semibold text-white hover:from-purple-700 hover:to-pink-600 transition-all shadow-2xs active:scale-95"
                              title="แต่งตั้งให้เป็นผู้ดูแลระบบ (Admin)"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>แต่งตั้งเป็น Admin</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 mb-4">
              {confirmModal.nextRole === 'admin' ? (
                <ShieldCheck className="h-6 w-6 text-purple-600" />
              ) : (
                <ShieldAlert className="h-6 w-6 text-amber-600" />
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              {confirmModal.nextRole === 'admin'
                ? 'ยืนยันการแต่งตั้งเป็นผู้ดูแลระบบ (Admin)?'
                : 'ยืนยันการลดระดับเป็นลูกค้าทั่วไป (User)?'}
            </h3>

            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {confirmModal.nextRole === 'admin' ? (
                <>
                  คุณต้องการแต่งตั้งให้ <strong className="text-slate-800">{confirmModal.profile.full_name || confirmModal.profile.email}</strong> มีสิทธิ์เป็น <strong>Admin</strong> หรือไม่? ผู้ใช้จะสามารถจัดการสินค้า เลขพัสดุ และสิทธิ์ผู้ใช้งานทั้งหมดในระบบหลังบ้านได้
                </>
              ) : (
                <>
                  คุณต้องการปรับสิทธิ์ของ <strong className="text-slate-800">{confirmModal.profile.full_name || confirmModal.profile.email}</strong> เป็น <strong>User (ลูกค้าทั่วไป)</strong> หรือไม่? ผู้ใช้จะไม่สามารถเข้าถึงหน้าจัดการหลังบ้าน (/admin/*) ได้อีกต่อไป
                </>
              )}
            </p>

            {confirmModal.profile.id === currentAdminId && confirmModal.nextRole === 'user' && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                ⚠️ คำเตือน: นี่คือบัญชีที่คุณกำลังใช้งานอยู่ หากปรับเป็น User คุณจะไม่สามารถเข้าสู่ระบบ Admin ได้อีกจนกว่า Admin ท่านอื่นจะแต่งตั้งให้ใหม่
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleUpdateRole(confirmModal.profile, confirmModal.nextRole)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all ${
                  confirmModal.nextRole === 'admin'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                ยืนยันการเปลี่ยนสิทธิ์
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
