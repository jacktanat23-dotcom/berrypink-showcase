'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Boxes,
  Users,
  Plus,
  Upload,
  Search,
  Calendar,
  Edit2,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  X,
  AlertCircle,
  Truck,
  CheckCircle2,
  FileSpreadsheet,
  UploadCloud,
  FileText,
  FileImage,
  AlertTriangle,
  Loader2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Shipment, ShipmentFormData, CARRIERS, CarrierName, getCarrierTrackingUrl } from '@/lib/types';
import { MOCK_SHIPMENTS } from '@/lib/mock-data';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  extractTextFromPdf,
  extractTextFromImage,
  parseReceiptText,
  formatItemsToBulkText,
  TRACKING_REGEX,
} from '@/lib/receipt-parser';

export default function AdminTrackingPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [dbError, setDbError] = useState<string | null>(null);

  // Modal States
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Single Form State
  const [formData, setFormData] = useState<ShipmentFormData>({
    customer_name: '',
    shipping_date: new Date().toISOString().split('T')[0],
    carrier: CARRIERS[0],
    tracking_number: '',
    note: '',
  });

  // Bulk Import Form State
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkCarrier, setBulkCarrier] = useState<string>(CARRIERS[0]);
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkParsed, setBulkParsed] = useState<Array<{ name: string; tracking: string; isWarning?: boolean }>>([]);

  // File Upload & Extraction States
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [extractionAlert, setExtractionAlert] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fetchShipments = async () => {
    setLoading(true);
    setDbError(null);

    if (!isSupabaseConfigured()) {
      setShipments(MOCK_SHIPMENTS);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('shipping_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not fetch shipments:', error.message);
        setDbError(error.message);
        setShipments(MOCK_SHIPMENTS);
      } else if (data) {
        setShipments(data);
      }
    } catch (err: any) {
      console.error('Error:', err);
      setDbError(err.message);
      setShipments(MOCK_SHIPMENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  // เมื่อเปิด Modal แก้ไข ให้เติมข้อมูลเดิม
  const handleOpenEdit = (s: Shipment) => {
    setEditingShipment(s);
    setFormData({
      customer_name: s.customer_name,
      shipping_date: s.shipping_date,
      carrier: s.carrier,
      tracking_number: s.tracking_number,
      note: s.note || '',
    });
    setIsSingleModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingShipment(null);
    setFormData({
      customer_name: '',
      shipping_date: new Date().toISOString().split('T')[0],
      carrier: CARRIERS[0],
      tracking_number: '',
      note: '',
    });
    setIsSingleModalOpen(true);
  };

  // จัดการ Submit บันทึกทีละรายการ (Create/Update)
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim() || !formData.tracking_number.trim()) {
      alert('กรุณากรอกชื่อลูกค้าและเลขพัสดุ');
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    const payload = {
      customer_name: formData.customer_name.trim(),
      shipping_date: formData.shipping_date,
      carrier: formData.carrier,
      tracking_number: formData.tracking_number.trim(),
      note: formData.note?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingShipment) {
        const { error } = await supabase
          .from('shipments')
          .update(payload)
          .eq('id', editingShipment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shipments').insert([payload]);
        if (error) throw error;
      }

      setIsSingleModalOpen(false);
      await fetchShipments();
    } catch (err: any) {
      alert(`บันทึกไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // จัดการลบรายการพัสดุ
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบข้อมูลพัสดุของ "${name}" ใช่หรือไม่?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('shipments').delete().eq('id', id);
      if (error) throw error;
      await fetchShipments();
    } catch (err: any) {
      alert(`ลบไม่สำเร็จ: ${err.message}`);
    }
  };

  // แปลงข้อความที่วางในโหมด Bulk Import แบบ Real-time
  useEffect(() => {
    if (!bulkRawText.trim()) {
      setBulkParsed([]);
      return;
    }

    const lines = bulkRawText.split('\n');
    const parsed: Array<{ name: string; tracking: string; isWarning?: boolean }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let name = '';
      let tracking = '';

      // คั่นด้วย Tab หรือ Comma
      let parts: string[] = [];
      if (trimmed.includes('\t')) {
        parts = trimmed.split('\t');
      } else if (trimmed.includes(',')) {
        parts = trimmed.split(',');
      }

      if (parts.length >= 2) {
        const p0 = parts[0].trim();
        const p1 = parts[1].trim();
        if (TRACKING_REGEX.test(p0) && !TRACKING_REGEX.test(p1)) {
          tracking = p0;
          name = p1;
        } else {
          name = p0;
          tracking = p1;
        }
      } else {
        // แยกด้วยช่องว่าง หรือตรวจจับ tracking pattern
        const trackMatch = trimmed.match(TRACKING_REGEX);
        if (trackMatch) {
          tracking = trackMatch[1].toUpperCase();
          const remainder = trimmed.replace(trackMatch[0], '').trim();
          name = remainder;
        } else {
          const lastSpaceIdx = trimmed.lastIndexOf(' ');
          if (lastSpaceIdx !== -1) {
            name = trimmed.slice(0, lastSpaceIdx).trim();
            tracking = trimmed.slice(lastSpaceIdx + 1).trim();
          } else {
            tracking = trimmed;
          }
        }
      }

      if (tracking) {
        const isWarning =
          !name ||
          name === 'ไม่ระบุชื่อ' ||
          name === '(ยังไม่ระบุชื่อ)' ||
          name.includes('กรุณาระบุ');
        parsed.push({
          name: name || '(ยังไม่ระบุชื่อ)',
          tracking,
          isWarning,
        });
      } else if (name) {
        parsed.push({
          name,
          tracking: '(ยังไม่ระบุเลข)',
          isWarning: true,
        });
      }
    }

    setBulkParsed(parsed);
  }, [bulkRawText]);

  // จัดการอัปโหลดไฟล์ใบเสร็จ (PDF หรือ รูปภาพ) เพื่อสกัดข้อมูล
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const isPdf = fileType === 'application/pdf' || fileName.endsWith('.pdf');
    const isImage =
      fileType.startsWith('image/') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.webp');

    if (!isPdf && !isImage) {
      setExtractionAlert({
        type: 'error',
        message: 'รองรับเฉพาะไฟล์ PDF หรือไฟล์ภาพ (.png, .jpg, .jpeg, .webp) เท่านั้น',
      });
      return;
    }

    setIsProcessingFile(true);
    setProcessingProgress(10);
    setProcessingMessage('กำลังเริ่มต้นอ่านไฟล์...');
    setUploadedFileName(file.name);
    setExtractionAlert(null);

    try {
      let extractedRawText = '';

      if (isPdf) {
        extractedRawText = await extractTextFromPdf(file, (pct, msg) => {
          setProcessingProgress(pct);
          setProcessingMessage(msg);
        });
      } else {
        extractedRawText = await extractTextFromImage(file, (pct, msg) => {
          setProcessingProgress(pct);
          setProcessingMessage(msg);
        });
      }

      setProcessingProgress(98);
      setProcessingMessage('กำลังวิเคราะห์และจับคู่ชื่อกับเลขพัสดุ...');

      const result = parseReceiptText(extractedRawText);

      if (result.items.length === 0) {
        setExtractionAlert({
          type: 'warning',
          message:
            'ไม่พบหมายเลขพัสดุในไฟล์นี้ กรุณาตรวจสอบว่าเป็นใบเสร็จขนส่ง (เช่น Flash Express) หรือคุณสามารถคัดลอกข้อความมาวางด้วยตนเองได้',
        });
      } else {
        const formattedText = formatItemsToBulkText(result.items);
        setBulkRawText((prev) => (prev.trim() ? `${prev.trim()}\n${formattedText}` : formattedText));

        if (result.incompleteCount > 0) {
          setExtractionAlert({
            type: 'warning',
            message: `ดึงข้อมูลได้ ${result.totalDetected} รายการ (พบ ${result.incompleteCount} รายการที่ไม่พบชื่อลูกค้าชัดเจน ดูแถวไฮไลต์สีส้มในตารางด้านล่างเพื่อตรวจสอบก่อนบันทึก)`,
          });
        } else {
          setExtractionAlert({
            type: 'success',
            message: `ดึงข้อมูลพัสดุสำเร็จครบถ้วนทั้ง ${result.totalDetected} รายการ พร้อมนำเข้า! 🎉`,
          });
        }
      }
    } catch (err: any) {
      console.error('File extraction error:', err);
      setExtractionAlert({
        type: 'error',
        message: `เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message || 'โปรดลองใหม่อีกครั้ง หรือพิมพ์ข้อความด้วยตนเอง'}`,
      });
    } finally {
      setIsProcessingFile(false);
      setProcessingProgress(100);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleCloseBulkModal = () => {
    setIsBulkModalOpen(false);
    setUploadedFileName(null);
    setExtractionAlert(null);
    setIsProcessingFile(false);
    setProcessingProgress(0);
  };

  // บันทึก Bulk Import เข้าฐานข้อมูลทั้งหมด
  const handleBulkSubmit = async () => {
    if (bulkParsed.length === 0) {
      alert('ไม่พบข้อมูลที่จะนำเข้า กรุณาวางข้อความหรืออัปโหลดไฟล์ใบเสร็จ');
      return;
    }

    const invalidItems = bulkParsed.filter(
      (item) =>
        !item.name ||
        item.name === '(ยังไม่ระบุชื่อ)' ||
        item.name === 'ไม่ระบุชื่อ' ||
        item.tracking === '(ยังไม่ระบุเลข)'
    );

    if (invalidItems.length > 0) {
      if (
        !confirm(
          `มี ${invalidItems.length} รายการที่ชื่อหรือเลขพัสดุยังไม่สมบูรณ์ คุณต้องการบันทึกข้อมูลต่อไปหรือไม่?`
        )
      ) {
        return;
      }
    }

    setIsSubmitting(true);
    const supabase = createClient();

    const payloads = bulkParsed.map((item) => ({
      customer_name: item.name,
      shipping_date: bulkDate,
      carrier: bulkCarrier,
      tracking_number: item.tracking,
      note: null,
    }));

    try {
      const { error } = await supabase.from('shipments').insert(payloads);
      if (error) throw error;

      setIsBulkModalOpen(false);
      setBulkRawText('');
      setBulkParsed([]);
      setUploadedFileName(null);
      setExtractionAlert(null);
      await fetchShipments();
      alert(`นำเข้าสำเร็จเรียบร้อยแล้วทั้งหมด ${payloads.length} รายการ! 🎉`);
    } catch (err: any) {
      alert(`นำเข้าไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ดึงรายการวันที่ที่ไม่ซ้ำกันเพื่อทำ Filter
  const uniqueDates = useMemo(() => {
    const dates = Array.from(new Set(shipments.map((s) => s.shipping_date)));
    return dates.sort((a, b) => b.localeCompare(a));
  }, [shipments]);

  // กรองรายการตามคำค้นหาและวันที่
  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const matchesSearch =
        s.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.note && s.note.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDate = selectedDate === 'all' || s.shipping_date === selectedDate;

      return matchesSearch && matchesDate;
    });
  }, [shipments, searchQuery, selectedDate]);

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

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Top Admin Subheader with Tabs */}
      <div className="border-b border-slate-200 bg-white shadow-2xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 mb-1">
                <span>📦 Berrypink Store Management</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                ระบบจัดการเลขพัสดุ (Tracking Manager)
              </h1>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-purple-700 hover:bg-purple-100 transition-colors shadow-2xs"
              >
                <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                <span>นำเข้าแบบชุด (Bulk)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:from-purple-700 hover:to-pink-600 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>เพิ่มเลขพัสดุ</span>
              </button>
            </div>
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
              className="flex items-center gap-2 border-b-2 border-purple-600 px-3 py-2.5 text-xs sm:text-sm font-bold text-purple-600 transition-all"
            >
              <Package className="h-4 w-4 text-purple-600" />
              <span>จัดการเลขพัสดุ ({shipments.length})</span>
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-all"
            >
              <Users className="h-4 w-4" />
              <span>จัดการผู้ใช้งาน</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {/* Database Notice if table doesn't exist yet */}
        {dbError && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm text-amber-800 flex items-start gap-3 shadow-2xs">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">คำแนะนำสำหรับแอดมิน:</span> หากยังไม่ได้สร้างตาราง{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">shipments</code> ใน
              Supabase ให้รันคำสั่งในไฟล์{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">supabase/tracking_migration.sql</code> ใน Supabase SQL Editor
              เพื่อเปิดใช้งานการบันทึกจริงครับ (ตอนนี้กำลังแสดงข้อมูลจำลอง)
            </div>
          </div>
        )}

        {/* Search & Date Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อลูกค้า, เลขพัสดุ, หรือหมายเหตุ..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-50 bg-white"
            >
              <option value="all">ทุกรอบจัดส่ง ({shipments.length})</option>
              {uniqueDates.map((date) => (
                <option key={date} value={date}>
                  รอบส่ง: {formatThaiDate(date)}
                </option>
              ))}
            </select>

            <button
              onClick={fetchShipments}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Shipments Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">รอบวันที่จัดส่ง</th>
                  <th className="px-6 py-3.5">ชื่อ-นามสกุล ลูกค้า</th>
                  <th className="px-6 py-3.5">บริษัทขนส่ง</th>
                  <th className="px-6 py-3.5">หมายเลขพัสดุ</th>
                  <th className="px-6 py-3.5">หมายเหตุ</th>
                  <th className="px-6 py-3.5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      กำลังโหลดข้อมูลพัสดุ...
                    </td>
                  </tr>
                ) : filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      ไม่พบข้อมูลพัสดุตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((s) => {
                    const trackingUrl = getCarrierTrackingUrl(s.carrier, s.tracking_number);
                    const isCopied = copiedId === s.id;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-700">
                          {formatThaiDate(s.shipping_date)}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                          {s.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200/60">
                            {s.carrier}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              {s.tracking_number}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(s.id, s.tracking_number)}
                              title="คัดลอกเลขพัสดุ"
                              className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
                            >
                              {isCopied ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            {trackingUrl && (
                              <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="เปิดดูสถานะในเว็บขนส่ง"
                                className="text-slate-400 hover:text-purple-600 p-1 rounded transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate">
                          {s.note || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(s)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(s.id, s.customer_name)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="ลบข้อมูล"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 1. Modal: เพิ่ม/แก้ไขพัสดุทีละรายการ */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                <span>{editingShipment ? 'แก้ไขข้อมูลพัสดุ' : 'เพิ่มเลขพัสดุใหม่'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsSingleModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    รอบวันที่จัดส่ง <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.shipping_date}
                    onChange={(e) =>
                      setFormData({ ...formData, shipping_date: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    บริษัทขนส่ง <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.carrier}
                    onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-50 bg-white"
                  >
                    {CARRIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อ-นามสกุล ลูกค้า (ผู้รับ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value })
                  }
                  placeholder="เช่น ชลธิชา มั่นคง"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  หมายเลขพัสดุ (Tracking Number) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.tracking_number}
                  onChange={(e) =>
                    setFormData({ ...formData, tracking_number: e.target.value })
                  }
                  placeholder="เช่น TH01495829482A"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  หมายเหตุ (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="เช่น รายการซิลวาเนียน หรือช่องทางสั่งซื้อ"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-purple-700 hover:to-pink-600 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: นำเข้าข้อมูลแบบชุด (Bulk Import) */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                  <span>นำเข้าข้อมูลพัสดุแบบชุด (Bulk Import)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  อัปโหลดไฟล์ PDF/รูปภาพใบเสร็จ หรือวางข้อความเพื่อนำเข้ารายชื่อและเลขพัสดุหลายคนพร้อมกัน
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseBulkModal}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Common Date & Carrier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    รอบวันที่จัดส่ง
                  </label>
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    บริษัทขนส่ง
                  </label>
                  <select
                    value={bulkCarrier}
                    onChange={(e) => setBulkCarrier(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-600 bg-white"
                  >
                    {CARRIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File Upload Dropzone (PDF / Images) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    <span>สกัดข้อมูลอัตโนมัติจากไฟล์ใบเสร็จ (PDF / รูปภาพ)</span>
                  </label>
                  {uploadedFileName && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFileName(null);
                        setExtractionAlert(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      <span>ล้างไฟล์</span>
                    </button>
                  )}
                </div>

                {/* Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative rounded-2xl border-2 border-dashed p-4 sm:p-5 text-center transition-all ${
                    isDragging
                      ? 'border-purple-500 bg-purple-50/80 scale-[1.01]'
                      : 'border-purple-200/80 bg-gradient-to-b from-purple-50/30 to-pink-50/20 hover:border-purple-300 hover:bg-purple-50/40'
                  }`}
                >
                  <input
                    type="file"
                    id="receipt-file-input"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={isProcessingFile}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                  />

                  {isProcessingFile ? (
                    <div className="py-2 flex flex-col items-center justify-center space-y-2.5">
                      <div className="flex items-center gap-2 text-purple-600 font-semibold text-xs sm:text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-purple-600 shrink-0" />
                        <span>{processingMessage || 'กำลังอ่านข้อมูลจากไฟล์...'}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full max-w-xs bg-purple-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${processingProgress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400">{processingProgress}% เสร็จสิ้น</span>
                    </div>
                  ) : (
                    <label
                      htmlFor="receipt-file-input"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2 group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-purple-100 p-2 text-purple-600 group-hover:scale-110 transition-transform">
                          <UploadCloud className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] text-purple-700 font-semibold">
                            <FileText className="h-3 w-3" /> PDF
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] text-pink-700 font-semibold">
                            <FileImage className="h-3 w-3" /> PNG / JPG
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 font-medium">
                        ลากไฟล์ใบเสร็จมาวางที่นี่ หรือ{' '}
                        <span className="text-purple-600 font-bold group-hover:underline">คลิกเพื่อเลือกไฟล์</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        รองรับใบเสร็จขนส่ง Flash Express, Kerry, ไปรษณีย์ไทย ฯลฯ
                      </p>

                      {uploadedFileName && (
                        <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/80 border border-purple-200 text-xs font-semibold text-purple-800">
                          <Check className="h-3.5 w-3.5 text-purple-600" />
                          <span className="max-w-[260px] truncate">{uploadedFileName}</span>
                        </div>
                      )}
                    </label>
                  )}
                </div>

                {/* Extraction Notification Banner */}
                {extractionAlert && (
                  <div
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border text-xs leading-relaxed transition-all ${
                      extractionAlert.type === 'success'
                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                        : extractionAlert.type === 'warning'
                        ? 'bg-amber-50/90 border-amber-200 text-amber-800'
                        : 'bg-rose-50/90 border-rose-200 text-rose-800'
                    }`}
                  >
                    {extractionAlert.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : extractionAlert.type === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span>{extractionAlert.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExtractionAlert(null)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Paste Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    ข้อความรายชื่อและเลขพัสดุ (บรรทัดละ 1 คน)
                  </label>
                  {bulkRawText && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('คุณต้องการล้างข้อความทั้งหมดใช่หรือไม่?')) {
                          setBulkRawText('');
                        }
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>ล้างข้อความ</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mb-2">
                  ตัวอย่าง: <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700">สมชาย ใจดี TH0123456789</code> หรือคั่นด้วยลูกน้ำ / แท็บจาก Excel (สามารถแก้ไขข้อความตรงนี้ได้)
                </p>
                <textarea
                  rows={4}
                  value={bulkRawText}
                  onChange={(e) => setBulkRawText(e.target.value)}
                  placeholder="ชลธิชา มั่นคง TH01495829482A&#10;กนกวรรณ แสนสุข KEX503928194&#10;ธนภัทร วงศ์สวรรค์ ED839201948TH"
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm font-mono text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-50 leading-relaxed"
                />
              </div>

              {/* Live Preview of parsed rows */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      ตารางพรีวิวผลลัพธ์ ({bulkParsed.length} รายการ)
                    </span>
                    {bulkParsed.some((it) => it.isWarning) && (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        <span>มีรายการรอตรวจสอบ</span>
                      </span>
                    )}
                  </div>

                  {bulkParsed.length > 0 && !bulkParsed.some((it) => it.isWarning) && (
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      พร้อมนำเข้าข้อมูลครบถ้วน
                    </span>
                  )}
                </div>

                {bulkParsed.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 font-semibold text-slate-500 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 w-12 text-center">ลำดับ</th>
                          <th className="px-3 py-2">ชื่อลูกค้า</th>
                          <th className="px-3 py-2">เลขพัสดุ</th>
                          <th className="px-3 py-2 text-right">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bulkParsed.map((row, idx) => (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              row.isWarning
                                ? 'bg-amber-50/70 hover:bg-amber-50'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-3 py-1.5 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-1.5 font-medium text-slate-900">
                              {row.isWarning && (!row.name || row.name.includes('ไม่ระบุชื่อ')) ? (
                                <span className="text-amber-700 italic font-normal flex items-center gap-1">
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                                  {row.name}
                                </span>
                              ) : (
                                row.name
                              )}
                            </td>
                            <td className="px-3 py-1.5 font-mono text-purple-700 font-bold">
                              {row.tracking}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              {row.isWarning ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  รอตรวจชื่อ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="h-2.5 w-2.5" />
                                  พร้อมบันทึก
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    ยังไม่มีข้อมูลที่จะแสดง อัปโหลดไฟล์ใบเสร็จด้านบน หรือวางข้อความในช่อง
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0 mt-4">
              <button
                type="button"
                onClick={handleCloseBulkModal}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={isSubmitting || bulkParsed.length === 0 || isProcessingFile}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-purple-700 hover:to-pink-600 disabled:opacity-50"
              >
                {isSubmitting
                  ? 'กำลังนำเข้า...'
                  : `บันทึกทั้งหมด (${bulkParsed.length} คน)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
