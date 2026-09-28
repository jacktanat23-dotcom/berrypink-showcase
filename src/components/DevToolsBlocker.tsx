'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * DevTools & Inspector Guard Component
 * ป้องกันการเปิด DevTools (F12, Ctrl+Shift+I/J/C, Ctrl+U) และการคลิกขวาตรวจสอบองค์ประกอบ
 * บนหน้าร้านสาธารณะ เพื่อเพิ่มความปลอดภัยและความเป็นส่วนตัวของข้อมูลลูกค้าและสินค้า
 * (ยกเว้นหน้า /admin เพื่อให้ผู้ดูแลระบบยังคงสามารถตรวจสอบระบบได้)
 */
export default function DevToolsBlocker() {
  const pathname = usePathname();

  useEffect(() => {
    // หากเป็นหน้า Admin ให้ข้ามการป้องกัน เพื่อให้ผู้ดูแลระบบตรวจสอบและพัฒนาได้ตามปกติ
    if (pathname && pathname.startsWith('/admin')) {
      return;
    }

    // 1. ป้องกันปุ่มลัดคีย์บอร์ดที่ใช้เปิด Developer Tools และ View Source
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 Key
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Ctrl + Shift + I (Inspect Element / DevTools)
      // Ctrl + Shift + J (Developer Console)
      // Ctrl + Shift + C (Element Inspector)
      if (
        isCtrlOrMeta &&
        e.shiftKey &&
        (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + U (View Page Source)
      if (isCtrlOrMeta && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + S (Save Page As)
      if (isCtrlOrMeta && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 2. ป้องกันการคลิกขวา (Context Menu) เพื่อป้องกัน Inspect Element บนหน้าร้าน
    // อนุญาตเฉพาะกรณีคลิกขวาใน input หรือ textarea เพื่อให้ลูกค้ายังสามารถวางข้อความ/คัดลอกเลขพัสดุได้
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      return false;
    };

    // 3. ป้องกันการลากรูปภาพสินค้า (Image Dragging)
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'IMG') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('dragstart', handleDragStart, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('dragstart', handleDragStart, true);
    };
  }, [pathname]);

  return null;
}
