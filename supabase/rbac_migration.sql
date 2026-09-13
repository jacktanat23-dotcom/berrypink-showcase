-- ================================================================
-- Supabase Migration: RBAC & Customer Profiles (ระบบแยกสิทธิ์ผู้ใช้และ Admin)
-- ================================================================

-- 1. สร้างตาราง profiles ผูกกับ auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. สร้าง Index สำหรับการค้นหาและตรวจสอบ Role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- 3. เปิดใช้งาน Trigger สำหรับ updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. ฟังก์ชันตรวจสอบสิทธิ์แอดมิน (SECURITY DEFINER เพื่อป้องกัน Infinite Recursion ใน RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 4. ตั้งค่านโยบายความปลอดภัย (Row Level Security - RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4.1 ผู้ใช้ดูโปรไฟล์ของตนเองได้ หรือ แอดมินดูได้ทุกคน
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Users and admins can view profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_admin());

-- 4.2 ผู้ใช้แก้ไขข้อมูลโปรไฟล์ของตนเองได้
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 4.3 แอดมินแก้ไขสิทธิ์และข้อมูลของโปรไฟล์ทุกคนได้
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());

-- 5. ฟังก์ชันและ Trigger: สร้าง Profile อัตโนมัติเมื่อมีผู้สมัครสมาชิกใหม่ (บังคับ role: 'user' เสมอ)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'user' -- สิทธิ์เริ่มต้นของผู้สมัครใหม่ทุกคนคือ 'user' เสมอ
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. นำเข้าข้อมูลผู้ใช้เดิมจาก auth.users มาใส่ใน public.profiles (Backfill)
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', ''),
    'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 7. ตั้งค่าผู้ใช้คนแรกให้เป็น admin อัตโนมัติ (หรือระบุอีเมลแอดมินที่ต้องการได้ที่นี่)
-- ตัวอย่าง: ปรับให้อีเมลแอดมินคนแรกเป็น admin ทันที
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
    SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1
);
