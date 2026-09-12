'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  CreditCard,
  UserCheck,
  ShieldAlert,
  MessageCircle,
} from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import ProductModal from '@/components/ProductModal';
import { Product, PRODUCT_CATEGORIES } from '@/lib/types';
import { MOCK_PRODUCTS } from '@/lib/mock-data';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const CATEGORY_TABS = ['ทั้งหมด', ...PRODUCT_CATEGORIES];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLiveDatabase, setIsLiveDatabase] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setDbError(null);

    // ตรวจสอบว่าได้กำหนดค่าเชื่อมต่อ Supabase แล้วหรือไม่
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
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not fetch from Supabase:', error.message);
        setDbError(error.message);
        // Fallback to mock data if database table isn't created yet
        setProducts(MOCK_PRODUCTS);
        setIsLiveDatabase(false);
      } else if (data && data.length > 0) {
        setProducts(data);
        setIsLiveDatabase(true);
      } else {
        // Table exists but empty, show mock products as placeholder
        setProducts(MOCK_PRODUCTS);
        setIsLiveDatabase(true);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setDbError(err.message);
      setProducts(MOCK_PRODUCTS);
      setIsLiveDatabase(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // หมวดหมู่สำหรับแสดงผลแท็บ: [ ทั้งหมด | ของจิ๋ว | ชุดเซ็ต | ตัวเปล่า | บ้าน | เสื้อผ้า ]
  const categories = CATEGORY_TABS;

  // กรองสินค้าตามการค้นหาและหมวดหมู่
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.condition && product.condition.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.size_category && product.size_category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'ทั้งหมด' || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-pink-100/80 py-14 sm:py-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.pink.50),theme(colors.purple.50),theme(colors.white))] opacity-80" />
        
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50/90 px-4 py-1.5 text-xs font-semibold text-pink-700 backdrop-blur-sm mb-5 shadow-xs">
            <span>🐰 Berrypink Toy & Sylvanian Store</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl max-w-4xl mx-auto leading-tight sm:leading-tight">
            อาณาจักรของเล่น &{' '}
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 bg-clip-text text-transparent">
              Sylvanian Families
            </span>{' '}
            ทั้งมือ 1 และมือ 2
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-slate-600 leading-relaxed">
            พื้นที่สำหรับคนรักของเล่น คัดสรรความน่ารักทั้งของแท้มือหนึ่งและมือสองสภาพสวย พร้อมบริการรับซื้อ-รับขาย สั่งซื้อง่ายๆ ทักแชทได้ทันที
          </p>

          {/* Facebook Contact Button in Hero */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://www.facebook.com/profile.php?id=61593625937584"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-md hover:from-purple-700 hover:to-pink-600 transition-all hover:shadow-lg active:scale-95"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>ทักแชทสั่งซื้อทาง Facebook</span>
            </a>
          </div>
        </div>
      </section>

      {/* Store Policy Section (ข้อตกลงและกติกาการสั่งซื้อ) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-4">
        <div className="overflow-hidden rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50/60 via-pink-50/40 to-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-pink-100 pb-5 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">
                <span>📋 เงื่อนไขของทางร้าน</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                ข้อตกลงและกติกาการสั่งซื้อ
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              โปรดอ่านและทำความเข้าใจก่อนทำการสั่งซื้อ เพื่อความสะดวกและรวดเร็วในการจัดส่งสินค้านะคะ
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Rule 1: ลูกค้าใหม่ */}
            <div className="flex flex-col justify-between rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-xs transition-all hover:shadow-md">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">ลูกค้าใหม่</h3>
                </div>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">
                  ทักบ้านเขียว โอนยอดแรก + ค่าส่ง <span className="text-emerald-700 font-bold">ภายใน 5 นาที</span>
                </p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>เกินเวลาขออนุญาตปล่อยหลุด</span>
              </div>
            </div>

            {/* Rule 2: การแบ่งจ่าย */}
            <div className="flex flex-col justify-between rounded-2xl border border-purple-100 bg-white/90 p-5 shadow-xs transition-all hover:shadow-md">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">การแบ่งจ่าย</h3>
                </div>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">
                  ไม่รับผ่อน แต่นัดแบ่งจ่ายได้ <span className="text-purple-700 font-bold">ไม่เกิน 3 วัน</span>
                </p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <span>หากเกินกำหนดขอสงวนสิทธิ์ไม่คืนเงินทุกกรณี</span>
              </div>
            </div>

            {/* Rule 3: การโอนเงิน */}
            <div className="flex flex-col justify-between rounded-2xl border border-pink-100 bg-white/90 p-5 shadow-xs transition-all hover:shadow-md">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-100 text-pink-700">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">การโอนเงิน</h3>
                </div>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">
                  โอนชำระเงินหลังจากสรุปยอด <span className="text-pink-700 font-bold">ภายใน 24 ชม.</span>
                </p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-700">
                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                <span>แจ้งสลิปในแชทได้ทันที</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
        {/* Controls: Search & Category Filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า หรือรายละเอียด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 shadow-sm"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
                <div className="aspect-[4/3] w-full rounded-xl bg-slate-200" />
                <div className="mt-4 h-4 w-3/4 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
                <div className="mt-4 flex justify-between">
                  <div className="h-5 w-16 rounded bg-slate-200" />
                  <div className="h-5 w-20 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={(p) => setSelectedProduct(p)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <SlidersHorizontal className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-base font-semibold text-slate-800">ไม่พบสินค้าที่ตรงกับการค้นหา</h3>
            <p className="mt-1 text-sm text-slate-500">ลองเปลี่ยนคำค้นหาหรือหมวดหมู่สินค้า</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ทั้งหมด');
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </section>

      {/* Product Quick View Modal */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
