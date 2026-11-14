import { NextResponse, type NextRequest } from 'next/server';
import { maskCustomerName, Shipment } from '@/lib/types';
import { MOCK_SHIPMENTS } from '@/lib/mock-data';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
};

const TITLE_REGEX =
  /^(นางสาว|เด็กหญิง|เด็กชาย|น\.ส\.|น\.ส|นส\.|ด\.ช\.|ด\.ช|ดช\.|ด\.ญ\.|ด\.ญ|ดญ\.|นาย|นาง|คุณ|น้อง|พี่)\s*/i;

/**
 * สร้างตัวแปรอักขระไทย (Thai Character Variants)
 * 1. สระอำ: รองรับทั้ง Composed (\u0E33) และ Decomposed (\u0E4D\u0E32 นิคหิต + สระอา จากฟอนต์ PDF)
 * 2. ตัวอักษร ฎ (U+0E0E) และ ฏ (U+0E0F) ที่ลูกค้ามักพิมพ์สลับกัน
 */
function getThaiVariants(text: string): string[] {
  const set = new Set<string>();
  const t = text.trim();
  if (!t) return [];
  set.add(t);

  // สลับสระอำ ผสม (\u0E33) <-> แยก (\u0E4D\u0E32)
  const composed = t.replace(/\u0E4D\u0E32/g, '\u0E33');
  const decomposed = t.replace(/\u0E33/g, '\u0E4D\u0E32');

  [composed, decomposed].forEach((s) => {
    set.add(s);
    if (s.includes('ฎ')) set.add(s.replace(/ฎ/g, 'ฏ'));
    if (s.includes('ฏ')) set.add(s.replace(/ฏ/g, 'ฎ'));
  });

  return Array.from(set);
}

/**
 * สร้างคำค้นหาสำหรับยิงค้นหาพัสดุ
 * - กรณีค้นหาด้วยหมายเลขพัสดุ: ค้นหาด้วยรหัสพัสดุตรงๆ
 * - กรณีค้นหาด้วยชื่อ-นามสกุล หรือมีคำนำหน้า (เช่น "น.ส.นันธภัค สุขสำราญ"):
 *   1. ค้นหาด้วยข้อความเดิมที่มีคำนำหน้า (พร้อมตัวแปรสระอำ/ตัวสะกด)
 *   2. ค้นหาด้วยชื่อตัดคำนำหน้าออก (เช่น "นันธภัค สุขสำราญ") เพื่อรองรับกรณีที่ในระบบไม่มีคำนำหน้า หรือบันทึกคนละแบบ
 *   3. รองรับรูปแบบจุดที่มี/ไม่มีเว้นวรรค เช่น "น.ส. " กับ "น.ส."
 *   4. ไม่แยกคำนามสกุลทำ OR เดี่ยว เพื่อป้องกันการค้นหานามสกุลผิดแล้วหลุดไปเจอ
 */
function generateSearchTerms(rawQuery: string): {
  terms: string[];
  isTrackingNumber: boolean;
  cleanQuery: string;
} {
  const q = rawQuery.trim();
  if (!q || q.length < 2) {
    return { terms: [], isTrackingNumber: false, cleanQuery: '' };
  }

  // 1. ตรวจสอบรูปแบบหมายเลขพัสดุ
  const compact = q.replace(/\s+/g, '').toUpperCase();
  const isTracking =
    /^[A-Z0-9]{8,25}$/i.test(compact) ||
    /^(TH|KEX|ED|J&T|SPX|SHP)/i.test(compact);

  if (isTracking) {
    return {
      terms: compact !== q.toUpperCase() ? [compact, q] : [compact],
      isTrackingNumber: true,
      cleanQuery: compact,
    };
  }

  // 2. ทำความสะอาดช่องว่างและสร้างตัวแปร
  const terms = new Set<string>();
  const normSpaces = q.normalize('NFC').replace(/\s+/g, ' ');

  // 2.1 เพิ่มตัวแปรของข้อความที่ลูกค้าพิมพ์
  getThaiVariants(normSpaces).forEach((v) => terms.add(v));

  // 2.2 ตัดคำนำหน้าชื่อออก (เช่น "น.ส.นันธภัค สุขสำราญ" -> "นันธภัค สุขสำราญ")
  if (TITLE_REGEX.test(normSpaces)) {
    const stripped = normSpaces.replace(TITLE_REGEX, '').trim();
    if (stripped.length >= 2) {
      getThaiVariants(stripped).forEach((v) => terms.add(v));
    }
  }

  // 2.3 กรณีมีจุดย่อคำนำหน้า เช่น "น.ส." ให้รองรับทั้งแบบติดกันและแบบมีเว้นวรรค
  if (normSpaces.includes('.')) {
    const compactDot = normSpaces.replace(/\.\s+/g, '.');
    getThaiVariants(compactDot).forEach((v) => terms.add(v));

    const spacedDot = normSpaces.replace(/\.([^\s])/g, (_, c) => '. ' + c);
    getThaiVariants(spacedDot).forEach((v) => terms.add(v));
  }

  return {
    terms: Array.from(terms),
    isTrackingNumber: false,
    cleanQuery: normSpaces,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = (searchParams.get('q') || '').trim();

  // ป้องกันการค้นหาคำสั้นเกินไป เพื่อความปลอดภัยของข้อมูล
  if (!rawQuery || rawQuery.length < 2) {
    return NextResponse.json([], { headers: NO_CACHE_HEADERS });
  }

  const { terms, isTrackingNumber, cleanQuery } = generateSearchTerms(rawQuery);
  if (terms.length === 0) {
    return NextResponse.json([], { headers: NO_CACHE_HEADERS });
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

  // 1. กรณีจำลอง (Mock Data)
  if (!isConfigured) {
    const normalizeThai = (str: string) =>
      str
        .toLowerCase()
        .replace(/\u0E4D\u0E32/g, '\u0E33')
        .replace(/ฎ/g, 'ฏ');

    const qNorm = normalizeThai(cleanQuery);
    const compactQ = qNorm.replace(/\s+/g, '');
    const qWithoutTitle = qNorm.replace(TITLE_REGEX, '').trim();
    const words = qWithoutTitle.split(/\s+/).filter((w) => w.length >= 2);

    const matched = MOCK_SHIPMENTS.filter((s) => {
      const name = normalizeThai(s.customer_name);
      const track = s.tracking_number.toLowerCase().replace(/\s+/g, '');

      if (track.includes(compactQ) || compactQ.includes(track)) return true;
      if (name.includes(qNorm) || (qWithoutTitle.length >= 2 && name.includes(qWithoutTitle))) return true;

      if (words.length > 0) {
        return words.every((w) => name.includes(w));
      }
      return false;
    }).map((s) => ({
      id: s.id,
      customer_name: maskCustomerName(s.customer_name),
      shipping_date: s.shipping_date,
      carrier: s.carrier,
      tracking_number: s.tracking_number,
    }));

    return NextResponse.json(matched, { headers: NO_CACHE_HEADERS });
  }

  try {
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    const supabase = createSupabaseClient(supabaseUrl, keyToUse, {
      auth: { persistSession: false },
      global: {
        fetch: (url, options = {}) =>
          fetch(url, {
            ...options,
            cache: 'no-store',
          }),
      },
    });

    // 2. ค้นหาผ่าน PostgreSQL RPC Function (SECURITY DEFINER)
    // ค้นหาด้วยตัวแปรของประโยคเต็มทั้งหมด (สระอำ ผสม/แยก, ฎ/ฏ, ตัดคำนำหน้า น.ส./นางสาว/คุณ)
    const rpcPromises = terms.map(async (term) => {
      try {
        const { data, error } = await supabase.rpc('search_public_shipments', {
          search_term: term,
        });
        return { term, data: error ? [] : (data || []), error };
      } catch (err) {
        return { term, data: [], error: err };
      }
    });

    const rpcResults = await Promise.all(rpcPromises);
    const hasAnyRpcSuccess = rpcResults.some((r) => !r.error);

    if (hasAnyRpcSuccess) {
      const itemMap = new Map<string, any>();

      rpcResults.forEach(({ data }) => {
        data.forEach((row: any) => {
          if (!itemMap.has(row.id)) {
            itemMap.set(row.id, {
              id: row.id,
              customer_name: maskCustomerName(row.customer_name || row.masked_customer_name),
              shipping_date: row.shipping_date,
              carrier: row.carrier,
              tracking_number: row.tracking_number,
            });
          }
        });
      });

      const sortedResults = Array.from(itemMap.values())
        .sort((a, b) => (b.shipping_date || '').localeCompare(a.shipping_date || ''))
        .slice(0, 30);

      return NextResponse.json(sortedResults, { headers: NO_CACHE_HEADERS });
    }

    // 3. Fallback: ค้นหาจากตาราง shipments โดยตรง
    const orClauses = terms
      .map((t) => `customer_name.ilike.%${t}%,tracking_number.ilike.%${t}%`)
      .join(',');

    const { data: tableData, error: tableError } = await supabase
      .from('shipments')
      .select('id, customer_name, shipping_date, carrier, tracking_number')
      .or(orClauses)
      .order('shipping_date', { ascending: false })
      .limit(30);

    if (tableError) {
      console.warn('Server Supabase search fallback to mock:', tableError.message);
      return NextResponse.json([], { headers: NO_CACHE_HEADERS });
    }

    const sanitized = (tableData || []).map((row) => ({
      id: row.id,
      customer_name: maskCustomerName(row.customer_name),
      shipping_date: row.shipping_date,
      carrier: row.carrier,
      tracking_number: row.tracking_number,
    }));

    return NextResponse.json(sanitized, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('API Tracking Search exception:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
