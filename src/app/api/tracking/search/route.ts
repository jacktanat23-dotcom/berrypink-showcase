import { NextResponse, type NextRequest } from 'next/server';
import { maskCustomerName, Shipment } from '@/lib/types';
import { MOCK_SHIPMENTS } from '@/lib/mock-data';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * แตกคำค้นหาและสร้างตัวแปรคำค้นหา (Search Terms & Variants)
 * รองรับทั้ง:
 * 1. ลูกค้าค้นหาชื่อเต็ม (ชื่อ-นามสกุล) แต่ฐานข้อมูลมีเฉพาะชื่อจริง หรือนามสกุล
 * 2. ลูกค้าพิมพ์คำนำหน้า เช่น คุณ, น้อง, พี่, นางสาว
 * 3. ลูกค้าพิมพ์สลับตัวอักษร ฎ (U+0E0E) และ ฏ (U+0E0F)
 * 4. ค้นหาด้วยหมายเลขพัสดุ (ทั้งแบบเว้นวรรคและไม่เว้นวรรค)
 */
function generateSearchTerms(rawQuery: string): {
  terms: string[];
  isTrackingNumber: boolean;
  tokens: string[];
  firstWord: string;
} {
  const q = rawQuery.trim();
  if (!q || q.length < 2) {
    return { terms: [], isTrackingNumber: false, tokens: [], firstWord: '' };
  }

  const terms = new Set<string>();

  // 1. ตรวจสอบรูปแบบหมายเลขพัสดุ
  const compact = q.replace(/\s+/g, '').toUpperCase();
  const isTracking =
    /^[A-Z0-9]{8,25}$/i.test(compact) ||
    /^(TH|KEX|ED|J&T|SPX|SHP)/i.test(compact);

  if (isTracking) {
    terms.add(compact);
    if (compact !== q.toUpperCase()) {
      terms.add(q);
    }
  }

  // 2. ล้างอักขระพิเศษ สัญลักษณ์ และวงเล็บ
  const cleaned = q
    .replace(/[()\-–—_.,/\\#[\]{}*~^]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  terms.add(q);
  if (cleaned.length >= 2) {
    terms.add(cleaned);
  }

  // 3. คำนำหน้าชื่อ (Thai Titles & Honorifics)
  const TITLE_PREFIXES = [
    'นางสาว',
    'เด็กหญิง',
    'เด็กชาย',
    'คุณ',
    'น้อง',
    'พี่',
    'นาง',
    'นาย',
    'ด.ญ.',
    'ด.ช.',
    'น.ส.',
  ];

  const addVariants = (word: string) => {
    if (!word || word.length < 2) return;
    terms.add(word);

    // ตัดคำนำหน้า
    for (const prefix of TITLE_PREFIXES) {
      if (word.startsWith(prefix) && word.length - prefix.length >= 2) {
        const stripped = word.slice(prefix.length).trim();
        if (stripped.length >= 2) {
          terms.add(stripped);
          addVariants(stripped);
        }
      }
    }

    // สลับตัวอักษร ฎ (U+0E0E) และ ฏ (U+0E0F)
    if (word.includes('ฎ')) {
      terms.add(word.replace(/ฎ/g, 'ฏ'));
    }
    if (word.includes('ฏ')) {
      terms.add(word.replace(/ฏ/g, 'ฎ'));
    }
  };

  // 4. แตกคำตามช่องว่าง (Tokens) สำหรับกรณีค้นหาชื่อ นามสกุล หรือชื่อเล่น
  const words = cleaned.split(/\s+/).filter((w) => w.length >= 2);
  for (const w of words) {
    addVariants(w);
  }

  // ตัวแปรของข้อความเต็ม
  if (cleaned.includes('ฎ')) terms.add(cleaned.replace(/ฎ/g, 'ฏ'));
  if (cleaned.includes('ฏ')) terms.add(cleaned.replace(/ฏ/g, 'ฎ'));

  return {
    terms: Array.from(terms),
    isTrackingNumber: isTracking,
    tokens: words,
    firstWord: words[0] || '',
  };
}

/**
 * คำนวณคะแนนความตรงกันของผลลัพธ์ (Relevance Scoring)
 */
function scoreShipmentMatch(
  customerName: string,
  trackingNumber: string,
  rawQuery: string,
  tokens: string[],
  firstWord: string
): number {
  const qLower = rawQuery.toLowerCase();
  const trackLower = (trackingNumber || '').toLowerCase().replace(/\s+/g, '');
  const qCompact = qLower.replace(/\s+/g, '');
  const nameLower = (customerName || '').toLowerCase();

  // 1. หมายเลขพัสดุตรงกัน
  if (trackLower === qCompact || trackLower.includes(qCompact)) {
    return 100;
  }

  // 2. ชื่อตรงกับคำค้นหาเต็มๆ
  if (nameLower === qLower || nameLower.includes(qLower)) {
    return 90;
  }

  // 3. คำค้นหามีชื่อใน DB อยู่ (เช่น ลูกค้าค้นหาชื่อเต็ม แต่ใน DB บันทึกแค่ชื่อจริง)
  if (nameLower.length >= 2 && qLower.includes(nameLower)) {
    return 85;
  }

  // 4. ชื่อตรงกับคำแรก (ชื่อจริง)
  if (firstWord && nameLower.includes(firstWord.toLowerCase())) {
    return 80;
  }

  // 5. ชื่อตรงกับคำอื่นๆ ในคำค้นหา (นามสกุล หรือชื่อเล่น)
  for (const token of tokens) {
    if (nameLower.includes(token.toLowerCase())) {
      return 70;
    }
  }

  // 6. ตรงกันหลังสลับ ฎ <-> ฏ
  const normName = nameLower.replace(/ฎ/g, 'ฏ');
  const normQ = qLower.replace(/ฎ/g, 'ฏ');
  if (normName.includes(normQ) || (normName.length >= 2 && normQ.includes(normName))) {
    return 65;
  }

  return 50;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = (searchParams.get('q') || '').trim();

  // ป้องกันการยิงค้นหาว่างๆ หรือสั้นเกินไป เพื่อป้องกันการกวาดข้อมูล (Data Scraping)
  if (!rawQuery || rawQuery.length < 2) {
    return NextResponse.json([]);
  }

  const { terms, isTrackingNumber, tokens, firstWord } = generateSearchTerms(rawQuery);
  if (terms.length === 0) {
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

  // 1. กรณีไม่ได้ตั้งค่า Supabase ให้ค้นหาจาก Mock Data
  if (!isConfigured) {
    const qLower = rawQuery.toLowerCase();
    const matched = MOCK_SHIPMENTS.filter((s) => {
      const name = s.customer_name.toLowerCase();
      const track = s.tracking_number.toLowerCase().replace(/\s+/g, '');

      if (name.includes(qLower) || (name.length >= 2 && qLower.includes(name))) return true;
      if (track.includes(qLower.replace(/\s+/g, ''))) return true;

      return terms.some((t) => {
        const tLower = t.toLowerCase();
        return name.includes(tLower) || track.includes(tLower.replace(/\s+/g, ''));
      });
    })
      .map((s) => ({
        id: s.id,
        customer_name: maskCustomerName(s.customer_name),
        shipping_date: s.shipping_date,
        carrier: s.carrier,
        tracking_number: s.tracking_number,
        _score: scoreShipmentMatch(s.customer_name, s.tracking_number, rawQuery, tokens, firstWord),
      }))
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        return (b.shipping_date || '').localeCompare(a.shipping_date || '');
      })
      .map(({ _score, ...rest }) => rest);

    return NextResponse.json(matched);
  }

  try {
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    const supabase = createSupabaseClient(supabaseUrl, keyToUse, {
      auth: { persistSession: false },
    });

    // 2. ค้นหาผ่าน PostgreSQL RPC Function (SECURITY DEFINER)
    // ยิงค้นหาควบคู่กับ Term ต่างๆ เพื่อให้ค้นเจอทั้งชื่อจริง นามสกุล และชื่อเต็ม
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

      rpcResults.forEach(({ term, data }) => {
        data.forEach((row: any) => {
          const track = row.tracking_number || '';
          const name = row.customer_name || row.masked_customer_name || '';
          const score = scoreShipmentMatch(name, track, rawQuery, tokens, firstWord);

          const existing = itemMap.get(row.id);
          if (!existing || score > existing._score) {
            itemMap.set(row.id, {
              id: row.id,
              customer_name: maskCustomerName(name),
              shipping_date: row.shipping_date,
              carrier: row.carrier,
              tracking_number: row.tracking_number,
              _score: score,
            });
          }
        });
      });

      const sortedResults = Array.from(itemMap.values())
        .sort((a, b) => {
          if (b._score !== a._score) return b._score - a._score;
          return (b.shipping_date || '').localeCompare(a.shipping_date || '');
        })
        .slice(0, 30)
        .map(({ _score, ...rest }) => rest);

      return NextResponse.json(sortedResults);
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
      .limit(50);

    if (tableError) {
      console.warn('Server Supabase search fallback to mock:', tableError.message);
      const qLower = rawQuery.toLowerCase();
      const matched = MOCK_SHIPMENTS.filter((s) => {
        const name = s.customer_name.toLowerCase();
        const track = s.tracking_number.toLowerCase().replace(/\s+/g, '');
        if (name.includes(qLower) || (name.length >= 2 && qLower.includes(name))) return true;
        if (track.includes(qLower.replace(/\s+/g, ''))) return true;
        return terms.some((t) => name.includes(t.toLowerCase()) || track.includes(t.toLowerCase()));
      }).map((s) => ({
        id: s.id,
        customer_name: maskCustomerName(s.customer_name),
        shipping_date: s.shipping_date,
        carrier: s.carrier,
        tracking_number: s.tracking_number,
      }));
      return NextResponse.json(matched);
    }

    const sanitized = (tableData || [])
      .map((row) => ({
        id: row.id,
        customer_name: maskCustomerName(row.customer_name),
        shipping_date: row.shipping_date,
        carrier: row.carrier,
        tracking_number: row.tracking_number,
        _score: scoreShipmentMatch(
          row.customer_name,
          row.tracking_number,
          rawQuery,
          tokens,
          firstWord
        ),
      }))
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        return (b.shipping_date || '').localeCompare(a.shipping_date || '');
      })
      .slice(0, 30)
      .map(({ _score, ...rest }) => rest);

    return NextResponse.json(sanitized);
  } catch (error: any) {
    console.error('API Tracking Search exception:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
