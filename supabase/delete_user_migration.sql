-- ================================================================
-- Supabase Migration: Admin Delete User Capability
-- อนุญาตให้ผู้ดูแลระบบ (Admin) สามารถลบสมาชิกออกจากระบบได้
-- ================================================================

-- 1. สร้าง Policy อนุญาตให้แอดมินลบโปรไฟล์ในตาราง public.profiles ได้
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 2. สร้างฟังก์ชัน SECURITY DEFINER สำหรับลบบัญชีผู้ใช้แบบสมบูรณ์
-- ลบทั้งใน auth.users (ระบบล็อกอิน) และ public.profiles (โปรไฟล์)
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- 1. ตรวจสอบว่าผู้ที่เรียกใช้งานเป็นแอดมินจริงหรือไม่
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'สิทธิ์ไม่เพียงพอ: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถลบสมาชิกได้';
    END IF;

    -- 2. ป้องกันไม่ให้แอดมินลบบัญชีของตัวเอง
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'ไม่สามารถลบบัญชีของตนเองได้ เพื่อป้องกันการถูกล็อคออกจากระบบ';
    END IF;

    -- 3. ลบผู้ใช้ออกจาก auth.users (จะ cascade ลบใน public.profiles อัตโนมัติ)
    DELETE FROM auth.users WHERE id = target_user_id;

    -- 4. ลบออกจาก public.profiles ซ้ำอีกครั้งเผื่อกรณี cascade ไม่ทำงาน
    DELETE FROM public.profiles WHERE id = target_user_id;

    RETURN TRUE;
END;
$$;

-- 3. มอบสิทธิ์ให้ authenticated users เรียกใช้ฟังก์ชันนี้ได้ (ภายในฟังก์ชันมีเงื่อนไขตรวจ is_admin() กำกับ)
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID) TO authenticated;
