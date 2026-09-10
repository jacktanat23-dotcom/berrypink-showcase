import { createClient } from './client';

export const BUCKET_NAME = 'products';

/**
 * อัปโหลดรูปภาพสินค้าไปยัง Supabase Storage Bucket 'products'
 * คืนค่าเป็น Public URL ของไฟล์ที่อัปโหลดสำเร็จ
 */
export async function uploadProductImage(file: File): Promise<string> {
  const supabase = createClient();
  
  // สร้างชื่อไฟล์แบบ Unique เพื่อป้องกันการชนกันของชื่อไฟล์
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `items/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ${uploadError.message}`);
  }

  // ดึง Public URL ของรูปภาพ
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * ลบรูปภาพสินค้าออกจาก Supabase Storage Bucket
 */
export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  if (!imageUrl || !imageUrl.includes(BUCKET_NAME)) {
    return false;
  }

  const supabase = createClient();

  try {
    // แยก Path ของไฟล์ออกจาก URL
    const urlParts = imageUrl.split(`${BUCKET_NAME}/`);
    if (urlParts.length < 2) return false;
    
    const filePath = urlParts[1];
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    
    if (error) {
      console.warn('Could not delete file from storage:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting image:', err);
    return false;
  }
}
