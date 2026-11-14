/**
 * Client-side Image Compression Utility
 * บีบอัดและปรับขนาดรูปภาพในเบราว์เซอร์ของผู้ใช้ก่อนอัปโหลดขึ้น Supabase Storage
 * ช่วยลดขนาดไฟล์จากหลาย MB ให้เหลือประมาณ 100 - 250 KB
 * โดยยังคงความคมชัดสูง ทำให้หน้าเว็บโหลดไวมากและประหยัดพื้นที่ Storage
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg';
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
  width: number;
  height: number;
}

/**
 * ฟอร์แมตขนาดไฟล์เป็นข้อความอ่านง่าย เช่น "1.2 MB" หรือ "145 KB"
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * บีบอัดรูปภาพให้อยู่ในขนาดและคุณภาพที่เหมาะสม
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    format = 'image/webp',
  } = options;

  // หากไม่ใช่ไฟล์รูปภาพ ให้คืนค่าเดิมกลับไป
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      savedPercent: 0,
      width: 0,
      height: 0,
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // คำนวณอัตราส่วนการย่อขนาด (รักษา Aspect Ratio เดิม)
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // ถ้าเปิด Canvas Context ไม่ได้ ให้ใช้ไฟล์ต้นฉบับ
          return resolve({
            file,
            originalSize: file.size,
            compressedSize: file.size,
            savedPercent: 0,
            width: img.width,
            height: img.height,
          });
        }

        // วาดภาพลง Canvas ด้วยการปรับความเรียบเนียนสูงสุด
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // ตรวจสอบว่าเบราว์เซอร์รองรับ WebP หรือไม่
        const isWebpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        const targetFormat = isWebpSupported ? format : 'image/jpeg';
        const targetExt = targetFormat === 'image/webp' ? 'webp' : 'jpg';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({
                file,
                originalSize: file.size,
                compressedSize: file.size,
                savedPercent: 0,
                width,
                height,
              });
            }

            // ถ้าบีบอัดแล้วไฟล์ดันใหญ่กว่าเดิม (เช่นรูปเล็กอยู่แล้ว) ให้ใช้ไฟล์เดิม
            if (blob.size >= file.size && file.type === targetFormat) {
              return resolve({
                file,
                originalSize: file.size,
                compressedSize: file.size,
                savedPercent: 0,
                width: img.width,
                height: img.height,
              });
            }

            // สร้างชื่อไฟล์ใหม่พร้อมนามสกุลเป้าหมาย
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const newFileName = `${baseName}.${targetExt}`;
            const compressedFile = new File([blob], newFileName, {
              type: targetFormat,
              lastModified: Date.now(),
            });

            const savedPercent = Math.max(
              0,
              Math.round(((file.size - compressedFile.size) / file.size) * 100)
            );

            resolve({
              file: compressedFile,
              originalSize: file.size,
              compressedSize: compressedFile.size,
              savedPercent,
              width,
              height,
            });
          },
          targetFormat,
          quality
        );
      };

      img.onerror = () => {
        resolve({
          file,
          originalSize: file.size,
          compressedSize: file.size,
          savedPercent: 0,
          width: 0,
          height: 0,
        });
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      resolve({
        file,
        originalSize: file.size,
        compressedSize: file.size,
        savedPercent: 0,
        width: 0,
        height: 0,
      });
    };

    reader.readAsDataURL(file);
  });
}
