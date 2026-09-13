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

  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [product]);

  if (!product) return null;

  const formattedPrice = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-fade-in p-3 sm:p-4 md:p-6 flex min-h-full items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-white shadow-2xl transition-all rounded-3xl overflow-hidden my-auto max-h-[calc(100dvh-2rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button (Always accessible at top-right) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur-md shadow-md transition-all hover:bg-slate-900 active:scale-95 sm:top-4 sm:right-4 sm:h-10 sm:w-10 sm:bg-white/80 sm:text-slate-600 sm:hover:bg-white sm:hover:text-slate-900"
          aria-label="ปิดหน้าต่าง"
          title="ปิดหน้าต่าง"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Product Image */}
            <div className="relative aspect-square w-full bg-slate-100 sm:aspect-square md:aspect-auto md:min-h-[380px]">
              {product.image_url && !imgError ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 min-h-[250px]">
                  <Tag className="h-16 w-16 stroke-[1.5]" />
                </div>
              )}
            </div>

            {/* Details Content */}
            <div className="flex flex-col p-5 sm:p-7 md:p-8">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="rounded-full bg-purple-50 px-2.5 sm:px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-100">
                  {product.category || 'สินค้าทั่วไป'}
                </span>
                {product.condition && (
                  <span
                    className={`rounded-full px-2.5 sm:px-3 py-1 text-xs font-semibold border ${
                      product.condition === 'มือ 1'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {product.condition}
                  </span>
                )}
                {product.size_category && (
                  <span className="rounded-full bg-pink-50 px-2.5 sm:px-3 py-1 text-xs font-semibold text-pink-700 border border-pink-200">
                    ไซส์: {product.size_category}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium sm:ml-auto mt-1 sm:mt-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  มีสินค้าพร้อมจัดแสดง
                </span>
              </div>

              <h2 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
                {product.name}
              </h2>

              <div className="mt-3 sm:mt-4">
                <span className="text-xs font-medium text-slate-400">ราคาพิเศษ</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
                  {formattedPrice}
                </p>
              </div>

              <div className="mt-4 sm:mt-6 flex-1 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  รายละเอียดสินค้า
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                  {product.description || 'ไม่มีคำอธิบายเพิ่มเติมสำหรับสินค้านี้'}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400 pb-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  อัปเดต: {new Date(product.updated_at).toLocaleDateString('th-TH')}
                </span>
                <button
                  onClick={onClose}
                  className="rounded-xl bg-slate-900 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow hover:bg-slate-800 transition-colors active:scale-95"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
