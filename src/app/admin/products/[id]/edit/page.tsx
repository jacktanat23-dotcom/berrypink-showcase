'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ProductForm from '@/components/ProductForm';
import { Product } from '@/lib/types';
import { MOCK_PRODUCTS } from '@/lib/mock-data';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setLoading(true);

      // Check if it's in mock data first (for local preview testing)
      const mockItem = MOCK_PRODUCTS.find((p) => p.id === id);

      if (!isSupabaseConfigured()) {
        if (mockItem) {
          setProduct(mockItem);
        } else {
          setError('ไม่พบข้อมูลสินค้านี้ในระบบ');
        }
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error: dbError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (dbError) {
          if (mockItem) {
            setProduct(mockItem);
          } else {
            setError(dbError.message);
          }
        } else if (data) {
          setProduct(data);
        }
      } catch (err: any) {
        if (mockItem) {
          setProduct(mockItem);
        } else {
          setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-4 text-sm text-slate-500">กำลังโหลดข้อมูลสินค้า...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-lg py-20 px-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">ไม่พบข้อมูลสินค้า</h2>
        <p className="mt-2 text-sm text-slate-500">
          {error || 'สินค้านี้อาจถูกลบออกไปแล้ว หรือรหัสสินค้าไม่ถูกต้อง'}
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปยังหน้าจัดการสินค้า
        </Link>
      </div>
    );
  }

  return <ProductForm initialData={product} isEditMode={true} />;
}
