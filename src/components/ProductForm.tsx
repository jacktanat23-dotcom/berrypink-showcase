'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { UploadCloud, X, ArrowLeft, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Product, ProductFormData, PRODUCT_CATEGORIES, PRODUCT_CONDITIONS, PRODUCT_SIZES } from '@/lib/types';
import { uploadProductImage, deleteProductImage } from '@/lib/supabase/storage';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface ProductFormProps {
  initialData?: Product;
  isEditMode?: boolean;
}

export default function ProductForm({ initialData, isEditMode = false }: ProductFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price ? String(initialData.price) : '',
    category: initialData?.category || PRODUCT_CATEGORIES[0],
    condition: initialData?.condition || PRODUCT_CONDITIONS[0],
    size_category: initialData?.size_category || '',
    is_active: initialData ? initialData.is_active : true,
    image_url: initialData?.image_url || null,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.image_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ตรวจสอบชนิดไฟล์ (เฉพาะรูปภาพ)
    if (!file.type.startsWith('image/')) {
      setErrorMsg('กรุณาเลือกไฟล์ที่เป็นรูปภาพ (JPEG, PNG, WebP, GIF)');
      return;
    }

    // จำกัดขนาดไฟล์ไม่เกิน 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData((prev) => ({ ...prev, image_url: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!formData.name.trim()) {
      setErrorMsg('กรุณาระบุชื่อสินค้า');
      return;
    }

    const numericPrice = parseFloat(String(formData.price));
    if (isNaN(numericPrice) || numericPrice < 0) {
      setErrorMsg('กรุณาระบุราคาที่ถูกต้อง (ตัวเลขมากกว่าหรือเท่ากับ 0)');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.image_url;

      // 1. ถ้ามีการเลือกไฟล์รูปภาพใหม่ ให้อัปโหลดไปยัง Supabase Storage
      if (selectedFile) {
        if (!isSupabaseConfigured()) {
          throw new Error('ยังไม่ได้ตั้งค่า Supabase URL และ Anon Key ใน .env.local');
        }

        setUploadStatus('กำลังอัปโหลดรูปภาพไปยัง Supabase Storage...');
        const uploadedUrl = await uploadProductImage(selectedFile);
        finalImageUrl = uploadedUrl;

        // ถ้าเป็นการแก้ไข และรูปเดิมมาจาก storage ให้ลองลบรูปเดิมออกเพื่อประหยัดพื้นที่
        if (isEditMode && initialData?.image_url && initialData.image_url !== uploadedUrl) {
          deleteProductImage(initialData.image_url).catch(() => {});
        }
      }

      setUploadStatus('กำลังบันทึกข้อมูลสินค้าลงฐานข้อมูล...');
      const supabase = createClient();

      const productPayload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: numericPrice,
        category: formData.category,
        condition: formData.condition || 'มือ 1',
        size_category: formData.size_category || null,
        image_url: finalImageUrl,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (isEditMode && initialData?.id) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', initialData.id);

        if (updateError) throw updateError;
      } else {
        // CREATE
        const { error: insertError } = await supabase
          .from('products')
          .insert([productPayload]);

        if (insertError) throw insertError;
      }

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      console.error('Error saving product:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
      {/* Header & Back Button */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isEditMode ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditMode ? 'อัปเดตรายละเอียดและรูปภาพของสินค้า' : 'กรอกรายละเอียดและอัปโหลดรูปภาพสินค้าเข้าสู่ระบบ'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-rose-700 border border-rose-200">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{errorMsg}</div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
        
        {/* Section 1: Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            รูปภาพสินค้า (Supabase Storage)
          </label>
          <p className="text-xs text-slate-500 mb-4">
            รองรับไฟล์ PNG, JPG, WebP สูงสุด 5MB (จะถูกอัปโหลดขึ้น Bucket 'products')
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {previewUrl ? (
            <div className="relative group max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={previewUrl}
                  alt="Product preview"
                  fill
                  className="object-cover"
                />
              </div>

              {/* Overlay Actions */}
              <div className="absolute inset-0 flex items-center justify-center gap-3 bg-slate-900/40 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 shadow-md hover:bg-slate-100"
                >
                  <ImageIcon className="h-4 w-4" />
                  เปลี่ยนรูปภาพ
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-rose-700"
                >
                  <X className="h-4 w-4" />
                  ลบรูป
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:border-indigo-500 hover:bg-indigo-50/20 cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                คลิกเพื่อเลือกรูปภาพ หรือลากไฟล์มาวางที่นี่
              </p>
              <p className="text-xs text-slate-400 mt-1">
                PNG, JPG, WebP หรือ GIF สูงสุด 5MB
              </p>
            </div>
          )}
        </div>

        {/* Section 2: General Information */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Product Name */}
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-sm font-semibold text-slate-900 mb-2">
              ชื่อสินค้า <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="เช่น หูฟังบลูทูธไร้สาย Pro Sound"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-slate-900 mb-2">
              หมวดหมู่สินค้า
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50"
            >
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-semibold text-slate-900 mb-2">
              ราคา (บาท) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-sm font-semibold text-slate-400">
                ฿
              </span>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50"
              />
            </div>
          </div>

          {/* สภาพสินค้า (Condition) */}
          <div>
            <label htmlFor="condition" className="block text-sm font-semibold text-slate-900 mb-2">
              สภาพสินค้า (Condition)
            </label>
            <select
              id="condition"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 bg-white"
            >
              {PRODUCT_CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>

          {/* ขนาด/รุ่น (Size Category) */}
          <div>
            <label htmlFor="size_category" className="block text-sm font-semibold text-slate-900 mb-2">
              ขนาด/รุ่น (Size Category)
            </label>
            <select
              id="size_category"
              value={formData.size_category}
              onChange={(e) => setFormData({ ...formData, size_category: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 bg-white"
            >
              <option value="">-- ไม่ระบุขนาด / ทั่วไป --</option>
              {PRODUCT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-2">
              รายละเอียดสินค้า
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="ระบุคุณสมบัติ จุดเด่น และรายละเอียดเพิ่มเติมของสินค้า..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 leading-relaxed"
            />
          </div>

          {/* Active Status Toggle */}
          <div className="sm:col-span-2 flex items-center gap-3 pt-2">
            <input
              id="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
              เปิดให้แสดงสินค้านี้ในหน้าโชว์รูม (Public Showcase)
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-6">
          <Link
            href="/admin"
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ยกเลิก
          </Link>

          <div className="flex items-center gap-3">
            {uploadStatus && (
              <span className="text-xs text-indigo-600 font-medium animate-pulse">
                {uploadStatus}
              </span>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting
                ? 'กำลังบันทึก...'
                : isEditMode
                ? 'บันทึกการแก้ไข'
                : 'เพิ่มสินค้า'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
