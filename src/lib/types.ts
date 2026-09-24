export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  condition?: string | null; // 'มือ 1' | 'มือ 2'
  size_category?: string | null; // 'Adults' | 'Children' | 'Baby' | 'Newborn'
  is_active: boolean;
  is_sold_out?: boolean;
  created_at: string;
  updated_at: string;
}

export const PRODUCT_CATEGORIES = [
  'ของจิ๋ว',
  'ชุดเซ็ต',
  'ตัวเปล่า',
  'บ้าน',
  'เสื้อผ้า',
  'ซองสุ่ม',
  'ยกบ็อกซ์',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CONDITIONS = [
  'มือ 1',
  'มือ 2',
] as const;

export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export const PRODUCT_SIZES = [
  'Adults',
  'Children',
  'Baby',
  'Newborn',
] as const;

export type ProductSize = (typeof PRODUCT_SIZES)[number];

export interface ProductFormData {
  name: string;
  description: string;
  price: number | string;
  category: string;
  condition: string;
  size_category: string;
  is_active: boolean;
  is_sold_out?: boolean;
  image_url?: string | null;
}

export const CARRIERS = [
  'Flash Express',
  'Kerry Express (KEX)',
  'ไปรษณีย์ไทย (EMS/ลงทะเบียน)',
  'J&T Express',
  'Shopee Xpress (SPX)',
  'อื่น ๆ',
] as const;

export type CarrierName = (typeof CARRIERS)[number];

export interface Shipment {
  id: string;
  customer_name: string;
  shipping_date: string; // YYYY-MM-DD
  carrier: string;
  tracking_number: string;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ShipmentFormData {
  customer_name: string;
  shipping_date: string;
  carrier: string;
  tracking_number: string;
  note?: string;
}

export function getCarrierTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const cleanTrack = trackingNumber.trim();
  if (!cleanTrack) return null;

  if (carrier.includes('Flash')) {
    return `https://www.flashexpress.co.th/tracking/?se=${encodeURIComponent(cleanTrack)}`;
  }
  if (carrier.includes('Kerry') || carrier.includes('KEX')) {
    return `https://th.kerryexpress.com/th/track/?track=${encodeURIComponent(cleanTrack)}`;
  }
  if (carrier.includes('ไปรษณีย์ไทย') || carrier.includes('Thailand Post') || carrier.includes('EMS')) {
    return `https://track.thailandpost.co.th/?trackNumber=${encodeURIComponent(cleanTrack)}`;
  }
  if (carrier.includes('J&T')) {
    return `https://www.jtexpress.co.th/service/track?bills=${encodeURIComponent(cleanTrack)}`;
  }
  if (carrier.includes('Shopee') || carrier.includes('SPX')) {
    return 'https://spx.co.th/';
  }
  return null;
}

/**
 * ฟังก์ชันช่วยเบลอ/ซ่อนชื่อลูกค้า ให้เห็นเฉพาะ 3 พยัญชนะแรก (เช่น ชลธิชา มั่นคง -> ชลธิ***)
 * เพื่อความเป็นส่วนตัวและความปลอดภัยตามหลัก PDPA
 */
export function maskCustomerName(name: string): string {
  if (!name) return '';
  let trimmed = name.trim();
  let prefix = '';
  if (trimmed.startsWith('คุณ')) {
    prefix = 'คุณ ';
    trimmed = trimmed.replace(/^คุณ\s*/, '');
  }

  let consonantCount = 0;
  let cutoff = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    // ตรวจสอบพยัญชนะไทย (ก-ฮ) หรือตัวอักษรภาษาอังกฤษ (A-Z)
    if (/[ก-ฮa-zA-Z]/.test(char)) {
      consonantCount++;
    }
    cutoff = i + 1;

    // เมื่อครบ 3 พยัญชนะ ให้เก็บสระ/วรรณยุกต์ด้านบนหรือด้านล่างที่ติดอยู่กับพยัญชนะตัวที่ 3 ด้วย
    if (consonantCount === 3) {
      while (
        cutoff < trimmed.length &&
        /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(trimmed[cutoff])
      ) {
        cutoff++;
      }
      break;
    }
  }

  const visiblePart = trimmed.slice(0, cutoff);
  return `${prefix}${visiblePart}***`;
}

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}
