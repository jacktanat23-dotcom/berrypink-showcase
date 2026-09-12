'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Package,
  Boxes,
  CheckCircle,
  AlertCircle,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { Product } from '@/lib/types';
import { MOCK_PRODUCTS } from '@/lib/mock-data';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { deleteProductImage } from '@/lib/supabase/storage';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import ProductModal from '@/components/ProductModal';

export default function AdminDashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);

  // State สำหรับ Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiveDatabase, setIsLiveDatabase] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchProducts = async () => {
    setLoading(true);

    if (!isSupabaseConfigured()) {
      setProducts(MOCK_PRODUCTS);
      setIsLiveDatabase(false);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error, fallback to mock:', error.message);
        setProducts(MOCK_PRODUCTS);
        setIsLiveDatabase(false);
      } else {
        setProducts(data || []);
        setIsLiveDatabase(true);
      }
    } catch (err: any) {
      console.error(err);
      setProducts(MOCK_PRODUCTS);
      setIsLiveDatabase(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (isLiveDatabase) {
        const supabase = createClient();

        // 1. ลบจาก Database Table
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', deleteTarget.id);

        if (error) throw error;

        // 2. ลบรูปจาก Supabase Storage (ถ้ามี)
        if (deleteTarget.image_url) {
          await deleteProductImage(deleteTarget.image_url);
        }
      }

      // Update State ในหน้าจอ
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setFeedback({ type: 'success', message: `ลบสินค้า "${deleteTarget.name}" สำเร็จแล้ว` });
    } catch (err: any) {
      console.error('Delete error:', err);
      setFeedback({ type: 'error', message: err.message || 'ไม่สามารถลบสินค้าได้ กรุณาลองใหม่' });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.condition && p.condition.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.size_category && p.size_category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [products, searchQuery]);

  // คำนวณสถิติ
  const totalCount = products.length;
  const activeCount = products.filter((p) => p.is_active).length;
  const totalValue = products.reduce((sum, p) => sum + Number(p.price || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            ระบบจัดการสินค้า (Admin Dashboard)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            จัดการรายการสินค้า ตรวจสอบสต็อก และอัปเดตข้อมูลบนหน้าโชว์รูม
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            เปิดดูหน้าบ้าน
          </Link>

          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            เพิ่มสินค้าใหม่
          </Link>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`mb-6 flex items-center justify-between rounded-2xl p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:no-underline ml-4"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">สินค้าทั้งหมด</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalCount} รายการ</h3>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">เปิดแสดงหน้าบ้าน</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">{activeCount} รายการ</h3>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">มูลค่าสินค้ารวม</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{formatCurrency(totalValue)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        
        {/* Table Search & Controls */}
        <div className="border-b border-slate-200/80 p-5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อสินค้า หรือหมวดหมู่..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">รูปภาพ</th>
                <th className="px-6 py-4">ชื่อสินค้า</th>
                <th className="px-6 py-4">หมวดหมู่</th>
                <th className="px-6 py-4">ราคา</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    กำลังโหลดข้อมูลสินค้า...
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Thumbnail */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Tag className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Product Name */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 line-clamp-1">{product.name}</div>
                      {(product.condition || product.size_category) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {product.condition && (
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                                product.condition === 'มือ 1'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                  : 'bg-amber-50 text-amber-700 border-amber-200/60'
                              }`}
                            >
                              {product.condition}
                            </span>
                          )}
                          {product.size_category && (
                            <span className="inline-flex items-center rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 border border-purple-200/60">
                              {product.size_category}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {product.description || '-'}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {product.category || 'ทั่วไป'}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                      {formatCurrency(product.price)}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          แสดงผล
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          ซ่อนไว้
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedProductForModal(product)}
                          title="ดูตัวอย่าง"
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          title="แก้ไขสินค้า"
                          className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>

                        <button
                          onClick={() => setDeleteTarget(product)}
                          title="ลบสินค้า"
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    ไม่พบรายการสินค้าที่ตรงกับคำค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="ยืนยันการลบสินค้า"
        itemName={deleteTarget?.name || ''}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* View Preview Modal */}
      <ProductModal
        product={selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
      />
    </div>
  );
}
