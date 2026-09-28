import { NextResponse, type NextRequest } from 'next/server';
import { maskCustomerName, Shipment } from '@/lib/types';
import { MOCK_SHIPMENTS } from '@/lib/mock-data';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();

  // ป้องกันการยิงค้นหาว่างๆ หรือสั้นเกินไป เพื่อป้องกันการกวาดข้อมูล (Data Scraping)
  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project-ref.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key-here'
  );

  // 1. กรณีไม่ได้ตั้งค่า Supabase ให้ค้นหาจาก Mock Data โดย Mask ชื่อและตัดข้อมูลสินค้า (note) ออกทั้งหมด
  if (!isConfigured) {
    const q = query.toLowerCase();
    const matched = MOCK_SHIPMENTS.filter(
      (s) =>
        s.customer_name.toLowerCase().includes(q) ||
        s.tracking_number.toLowerCase().includes(q)
    ).map((s) => ({
      id: s.id,
      customer_name: maskCustomerName(s.customer_name),
      shipping_date: s.shipping_date,
      carrier: s.carrier,
      tracking_number: s.tracking_number,
      // ตัด note ออก ไม่ส่งรายละเอียดสินค้าให้ Browser เห็นใน F12 หรือ Network
    }));

    return NextResponse.json(matched);
  }

  try {
    // ใช้ Service Role Key หากมี หรือใช้ Anon Key
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    const supabase = createSupabaseClient(supabaseUrl, keyToUse, {
      auth: { persistSession: false },
    });

    // ลองค้นหาผ่าน PostgreSQL RPC Function (SECURITY DEFINER) ที่ Mask ข้อมูลมาจากฐานข้อมูลโดยตรง
    const { data: rpcData, error: rpcError } = await supabase.rpc('search_public_shipments', {
      search_term: query,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      // ได้รับข้อมูลที่ Mask มาจาก RPC แล้ว ให้กรองความปลอดภัยฝั่ง Server อีกชั้น
      const sanitized = rpcData.map((row: any) => ({
        id: row.id,
        customer_name: maskCustomerName(row.customer_name || row.masked_customer_name),
        shipping_date: row.shipping_date,
        carrier: row.carrier,
        tracking_number: row.tracking_number,
      }));
      return NextResponse.json(sanitized);
    }

    // กรณีที่ยังไม่ได้รัน Migration สร้าง RPC ให้ค้นหาจาก Table ตรงๆ ที่ฝั่ง Server
    const { data: tableData, error: tableError } = await supabase
      .from('shipments')
      .select('id, customer_name, shipping_date, carrier, tracking_number')
      .or(`customer_name.ilike.%${query}%,tracking_number.ilike.%${query}%`)
      .order('shipping_date', { ascending: false })
      .limit(30);

    if (tableError) {
      console.warn('Server Supabase search fallback to mock:', tableError.message);
      const q = query.toLowerCase();
      const matched = MOCK_SHIPMENTS.filter(
        (s) =>
          s.customer_name.toLowerCase().includes(q) ||
          s.tracking_number.toLowerCase().includes(q)
      ).map((s) => ({
        id: s.id,
        customer_name: maskCustomerName(s.customer_name),
        shipping_date: s.shipping_date,
        carrier: s.carrier,
        tracking_number: s.tracking_number,
      }));
      return NextResponse.json(matched);
    }

    // Sanitization อย่างเข้มงวด: Mask ชื่อลูกค้า และไม่ส่งฟิลด์ note หรือสินค้าออกไปเด็ดขาด
    const sanitized = (tableData || []).map((row) => ({
      id: row.id,
      customer_name: maskCustomerName(row.customer_name),
      shipping_date: row.shipping_date,
      carrier: row.carrier,
      tracking_number: row.tracking_number,
    }));

    return NextResponse.json(sanitized);
  } catch (error: any) {
    console.error('API Tracking Search exception:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
