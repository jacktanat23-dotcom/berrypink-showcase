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
  created_at: string;
  updated_at: string;
}

export const PRODUCT_CATEGORIES = [
  'ของจิ๋ว',
  'ชุดเซ็ต',
  'ตัวเปล่า',
  'บ้าน',
  'เสื้อผ้า',
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
  image_url?: string | null;
}
