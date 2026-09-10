export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
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

export interface ProductFormData {
  name: string;
  description: string;
  price: number | string;
  category: string;
  is_active: boolean;
  image_url?: string | null;
}
