'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Tag, Calendar, CheckCircle2 } from 'lucide-react';
import { Product } from '@/lib/types';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const formattedPrice = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm backdrop-blur-md transition-colors hover:bg-white hover:text-slate-900"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Product Image */}
          <div className="relative aspect-square md:aspect-auto w-full bg-slate-100">
            {product.image_url && !imgError ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                <Tag className="h-16 w-16 stroke-[1.5]" />
              </div>
            )}
          </div>

          {/* Details Content */}
          <div className="flex flex-col p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-100">
                {product.category || 'สินค้าทั่วไป'}
              </span>
              {product.condition && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                    product.condition === 'มือ 1'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {product.condition}
                </span>
              )}
              {product.size_category && (
                <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700 border border-pink-200">
                  ไซส์: {product.size_category}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium sm:ml-auto">
                <CheckCircle2 className="h-3.5 w-3.5" />
                มีสินค้าพร้อมจัดแสดง
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {product.name}
            </h2>

            <div className="mt-4">
              <span className="text-xs font-medium text-slate-400">ราคาพิเศษ</span>
              <p className="text-3xl font-extrabold text-indigo-600">
                {formattedPrice}
              </p>
            </div>

            <div className="mt-6 flex-1 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                รายละเอียดสินค้า
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                {product.description || 'ไม่มีคำอธิบายเพิ่มเติมสำหรับสินค้านี้'}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                อัปเดต: {new Date(product.updated_at).toLocaleDateString('th-TH')}
              </span>
              <button
                onClick={onClose}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-800 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
