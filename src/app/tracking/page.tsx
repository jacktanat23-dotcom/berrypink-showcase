'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Package,
  Truck,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  MessageCircle,
  HelpCircle,
} from 'lucide-react';
import { Shipment, getCarrierTrackingUrl } from '@/lib/types';
import { MOCK_SHIPMENTS } from '@/lib/mock-data';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function TrackingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<Shipment[]>([]);
  const [recentShipments, setRecentShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // โหลดรายการจัดส่งล่าสุดมาแสดงเป็นตัวอย่างรอบส่ง
  useEffect(() => {
    async function loadRecent() {
      if (!isSupabaseConfigured()) {
        setRecentShipments(MOCK_SHIPMENTS.slice(0, 5));
        return;
      }
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('shipments')
          .select('*')
          .order('shipping_date', { ascending: false })
          .limit(6);

        if (error || !data || data.length === 0) {
          setRecentShipments(MOCK_SHIPMENTS.slice(0, 5));
        } else {
          setRecentShipments(data);
        }
      } catch (e) {
        setRecentShipments(MOCK_SHIPMENTS.slice(0, 5));
      }
    }
    loadRecent();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setHasSearched(true);

    if (!isSupabaseConfigured()) {
      // ค้นหาใน Mock Data
      const q = cleanQuery.toLowerCase();
      const matched = MOCK_SHIPMENTS.filter(
        (s) =>
          s.customer_name.toLowerCase().includes(q) ||
          s.tracking_number.toLowerCase().includes(q)
      );
      setResults(matched);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      // ค้นหาแบบ Partial Match ไม่จำกัดตัวพิมพ์ใหญ่-เล็ก (ilike)
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .or(`customer_name.ilike.%${cleanQuery}%,tracking_number.ilike.%${cleanQuery}%`)
        .order('shipping_date', { ascending: false });

      if (error) {
        console.warn('Supabase search error, fallback to mock:', error.message);
        const q = cleanQuery.toLowerCase();
        const matched = MOCK_SHIPMENTS.filter(
          (s) =>
            s.customer_name.toLowerCase().includes(q) ||
            s.tracking_number.toLowerCase().includes(q)
        );
        setResults(matched);
      } else {
        setResults(data || []);
      }
    } catch (err) {
      console.error('Search exception:', err);
      const q = cleanQuery.toLowerCase();
      const matched = MOCK_SHIPMENTS.filter((s) =>
        s.customer_name.toLowerCase().includes(q)
      );
      setResults(matched);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const formatThaiDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      if (!year || !month || !day) return dateStr;
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getCarrierBadgeColor = (carrier: string) => {
    if (carrier.includes('Flash')) {
      return 'bg-amber-100 text-amber-900 border-amber-300';
    }
    if (carrier.includes('Kerry') || carrier.includes('KEX')) {
      return 'bg-orange-100 text-orange-900 border-orange-300';
    }
    if (carrier.includes('ไปรษณีย์ไทย') || carrier.includes('EMS')) {
      return 'bg-red-100 text-red-900 border-red-300';
    }
    if (carrier.includes('J&T')) {
      return 'bg-rose-100 text-rose-900 border-rose-300';
    }
    if (carrier.includes('Shopee') || carrier.includes('SPX')) {
      return 'bg-orange-100 text-orange-900 border-orange-300';
    }
    return 'bg-purple-100 text-purple-900 border-purple-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/40 via-purple-50/20 to-white pb-20">
      {/* Top Banner / Hero */}
      <section className="relative overflow-hidden border-b border-pink-100/80 bg-white/70 py-12 sm:py-16 backdrop-blur-xs">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับสู่หน้าร้านหลัก
          </Link>

          {/* Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50/90 px-4 py-1.5 text-xs font-semibold text-purple-700 shadow-2xs">
              <Truck className="h-4 w-4 text-purple-600" />
              <span>Berrypink Delivery & Tracking</span>
            </div>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            ตรวจสอบเลขพัสดุ
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-slate-600 leading-relaxed">
            พิมพ์ชื่อหรือนามสกุลของผู้รับ เพื่อค้นหาเลขพัสดุและติดตามสถานะการจัดส่งสินค้าของคุณ
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="mt-8 mx-auto max-w-2xl"
          >
            <div className="relative flex items-center rounded-2xl border-2 border-purple-200 bg-white p-1.5 shadow-md shadow-purple-100/50 transition-all focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-100">
              <div className="pl-3.5 pr-2 text-purple-500">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="พิมพ์ชื่อ หรือ นามสกุล ผู้รับ เช่น ชลธิชา..."
                className="w-full bg-transparent px-2 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 outline-none"
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="shrink-0 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-5 sm:px-7 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-purple-700 hover:to-pink-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'กำลังค้นหา...' : 'ค้นหาพัสดุ'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-10">
        {/* Results Section */}
        {hasSearched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>ผลการค้นหาสำหรับ &ldquo;{searchQuery}&rdquo;</span>
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                  {results.length} รายการ
                </span>
              </h2>
            </div>

            {results.length > 0 ? (
              <div className="grid gap-4 sm:gap-5">
                {results.map((shipment) => {
                  const trackingUrl = getCarrierTrackingUrl(
                    shipment.carrier,
                    shipment.tracking_number
                  );
                  const isCopied = copiedId === shipment.id;

                  return (
                    <div
                      key={shipment.id}
                      className="group overflow-hidden rounded-2xl border border-purple-100/90 bg-white p-5 sm:p-6 shadow-sm transition-all duration-200 hover:border-purple-300 hover:shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Customer & Date */}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-bold text-slate-900">
                              {shipment.customer_name}
                            </span>
                            <span
                              className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold border ${getCarrierBadgeColor(
                                shipment.carrier
                              )}`}
                            >
                              {shipment.carrier}
                            </span>
                          </div>

                          <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>รอบส่งวันที่: {formatThaiDate(shipment.shipping_date)}</span>
                            {shipment.note && (
                              <>
                                <span>•</span>
                                <span className="text-slate-400">{shipment.note}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {trackingUrl && (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 px-3.5 py-2 text-xs font-semibold text-purple-700 border border-purple-200 transition-colors"
                            >
                              <span>เช็คสถานะขนส่ง</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Tracking Number Highlight Box */}
                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-purple-600 shrink-0" />
                          <div>
                            <span className="text-[11px] font-medium text-slate-400 block">
                              หมายเลขพัสดุ (Tracking Number)
                            </span>
                            <span className="font-mono text-base font-bold text-slate-800 tracking-wide select-all">
                              {shipment.tracking_number}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy(shipment.id, shipment.tracking_number)}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>คัดลอกสำเร็จ!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>คัดลอกเลข</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Not Found State */
              <div className="rounded-3xl border border-pink-100 bg-white p-8 sm:p-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-500 mb-4">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  ไม่พบข้อมูลพัสดุสำหรับ &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
                  กรุณาตรวจสอบการสะกดชื่อ-นามสกุล หรือลองค้นหาเฉพาะชื่อจริง หรือหากพึ่งสั่งซื้อแอดมินอาจกำลังจัดเตรียมรอบส่งถัดไปครับ
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setHasSearched(false);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    ล้างการค้นหา
                  </button>
                  <a
                    href="https://www.facebook.com/profile.php?id=61593625937584"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-purple-700 hover:to-pink-600 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>ติดต่อแอดมินทาง Facebook</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial Guide & Recent Shipping Rounds */}
        {!hasSearched && (
          <div className="space-y-8">
            {/* Guide Card */}
            <div className="rounded-3xl border border-purple-100/90 bg-gradient-to-br from-purple-50/40 via-pink-50/30 to-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ขั้นตอนการตรวจสอบเลขพัสดุ
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                    1. พิมพ์ชื่อหรือนามสกุลที่คุณใช้แจ้งในออเดอร์ลงในช่องค้นหาด้านบน<br />
                    2. กดปุ่ม &ldquo;ค้นหาพัสดุ&rdquo; ระบบจะแสดงหมายเลขพัสดุและบริษัทขนส่ง<br />
                    3. สามารถกดปุ่ม &ldquo;คัดลอกเลข&rdquo; หรือคลิก &ldquo;เช็คสถานะขนส่ง&rdquo; เพื่อดูไทม์ไลน์การนำส่งได้ทันที
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Shipments Preview */}
            {recentShipments.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-purple-500" />
                    <span>ตัวอย่างรอบส่งล่าสุดของทางร้าน</span>
                  </h3>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
                  {recentShipments.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-slate-900 block">
                            {s.customer_name}
                          </span>
                          <span className="text-xs text-slate-400">
                            รอบส่ง {formatThaiDate(s.shipping_date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`rounded-md px-2 py-0.5 font-medium border ${getCarrierBadgeColor(
                            s.carrier
                          )}`}
                        >
                          {s.carrier}
                        </span>
                        <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {s.tracking_number}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
