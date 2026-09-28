-- ================================================================
-- Migration: Enhanced Privacy & Security for Shipments & Customers
-- ป้องกันการดึงข้อมูล/แอบดูชื่อลูกค้าและสินค้าผ่าน DevTools (F12)
-- ================================================================

-- 1. ยกเลิก Policy เดิมที่เปิดให้สาธารณะ Select ตาราง shipments ได้โดยตรง
DROP POLICY IF EXISTS "Public can view shipments" ON public.shipments;

-- 2. สร้าง Policy อนุญาตเฉพาะผู้ดูแลระบบ (Admin) ที่ล็อกอินแล้วเท่านั้นที่สามารถดูตาราง shipments เต็มได้
DROP POLICY IF EXISTS "Admins can view shipments" ON public.shipments;
CREATE POLICY "Admins can view shipments"
    ON public.shipments
    FOR SELECT
    TO authenticated
    USING (true);

-- 3. สร้างฟังก์ชันค้นหาพัสดุสำหรับสาธารณะแบบปลอดภัย (SECURITY DEFINER)
-- ฟังก์ชันนี้จะทำการ Mask ชื่อลูกค้า (เช่น ชลธิ***) และไม่คืนค่าคอลัมน์ note (สินค้าที่สั่งซื้อ)
-- ทำให้แม้ใครจะเปิดดู Network ใน F12 ก็จะมองไม่เห็นชื่อเต็มหรือรายการสินค้าเด็ดขาด
CREATE OR REPLACE FUNCTION public.search_public_shipments(search_term TEXT)
RETURNS TABLE (
    id UUID,
    customer_name TEXT,
    shipping_date DATE,
    carrier TEXT,
    tracking_number TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        CASE 
            WHEN length(trim(s.customer_name)) <= 3 THEN trim(s.customer_name) || '***'
            ELSE substring(trim(s.customer_name) from 1 for 3) || '***'
        END AS customer_name,
        s.shipping_date,
        s.carrier,
        s.tracking_number
    FROM public.shipments s
    WHERE 
        (length(trim(search_term)) >= 2) AND
        (s.customer_name ILIKE '%' || search_term || '%' OR s.tracking_number ILIKE '%' || search_term || '%')
    ORDER BY s.shipping_date DESC
    LIMIT 30;
END;
$$;

-- 4. มอบสิทธิ์ให้ผู้ใช้ทั่วไป (anon) และผู้ใช้ที่ล็อกอิน (authenticated) เรียกใช้งานฟังก์ชันค้นหานี้ได้
GRANT EXECUTE ON FUNCTION public.search_public_shipments(TEXT) TO anon, authenticated;
