'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Tag, ArrowUpRight } from 'lucide-react';
import { Product } from '@/lib/types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);

  // จัดรูปแบบราคาด้วย comma คั่นหลักพัน
  const formattedPrice = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <div
      onClick={() => onSelect(product)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl cursor-pointer"
    >
      {/* Product Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {product.image_url && !imgError ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
            <Tag className="h-10 w-10 stroke-[1.5]" />
          </div>
        )}

        {/* Category Badge */}
        {product.category && (
          <span className="absolute top-3 left-3 rounded-full bg-white/95 backdrop-blur-md border border-purple-100/80 px-2.5 py-1 text-xs font-semibold text-purple-700 shadow-sm">
            {product.category}
          </span>
        )}

        {/* Quick Hover Action */}
        <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-800 opacity-0 shadow-sm backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>

      {/* Product Information */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 line-clamp-1">
          {product.name}
        </h3>

        {/* Badges: สภาพสินค้า & ขนาด/รุ่น */}
        {(product.condition || product.size_category) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {product.condition && (
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                  product.condition === 'มือ 1'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                    : 'bg-amber-50 text-amber-700 border-amber-200/70'
                }`}
              >
                {product.condition}
              </span>
            )}

            {product.size_category && (
              <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 border border-purple-200/70">
                {product.size_category}
              </span>
            )}
          </div>
        )}

        <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-2">
          {product.description || 'ไม่มีคำอธิบายรายละเอียดเพิ่มเติมสำหรับสินค้านี้'}
        </p>

        {/* Price & Action */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            <span className="text-xs text-slate-400 font-medium">ราคา</span>
            <div className="text-lg font-bold text-slate-900">
              {formattedPrice}
            </div>
          </div>

          <button
            type="button"
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600"
          >
            ดูรายละเอียด
          </button>
        </div>
      </div>
    </div>
  );
}
