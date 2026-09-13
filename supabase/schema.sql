-- ================================================================
-- Supabase Schema & Storage Configuration for Product Showcase
-- ================================================================

-- 1. Enable UUID Extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    image_url TEXT,
    category TEXT DEFAULT 'ของจิ๋ว',
    condition TEXT DEFAULT 'มือ 1',
    size_category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.1 Migration Script for Existing Tables (ALTER TABLE)
-- ถ้ามีตาราง products อยู่แล้ว ให้รันคำสั่ง 2 บรรทัดนี้ใน Supabase SQL Editor:
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'มือ 1',
ADD COLUMN IF NOT EXISTS size_category TEXT;

-- 3. Auto-update updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 4.1 Policy: Anyone can view active products (Public Showcase)
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
    ON public.products
    FOR SELECT
    USING (is_active = true OR auth.role() = 'authenticated');

-- 4.2 Policy: Authenticated admin users can insert products
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
    ON public.products
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 4.3 Policy: Authenticated admin users can update products
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
    ON public.products
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4.4 Policy: Authenticated admin users can delete products
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
    ON public.products
    FOR DELETE
    TO authenticated
    USING (true);

-- ================================================================
-- 5. Supabase Storage Setup (Bucket: 'products')
-- ================================================================

-- Create products bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'products',
    'products',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 5.1 Storage Policy: Anyone can view images from 'products' bucket
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'products');

-- 5.2 Storage Policy: Authenticated users can upload images
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'products');

-- 5.3 Storage Policy: Authenticated users can update/replace images
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
CREATE POLICY "Authenticated users can update product images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'products');

-- 5.4 Storage Policy: Authenticated users can delete images
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
CREATE POLICY "Authenticated users can delete product images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'products');

-- ================================================================
-- 6. Mock Data (ตัวอย่างสินค้า 5 รายการ ตรงตาม 5 หมวดหมู่)
-- ================================================================

DELETE FROM public.products WHERE name IN (
    'เซ็ตเบเกอรี่และของหวานจิ๋ว Miniature Bakery Set (มือ 1)',
    'Sylvanian Families - Chocolate Rabbit Family (มือ 1 กล่องสวย)',
    'ตุ๊กตาเบบี้ช็อกโกแลตแรบบิท ตัวเปล่า (มือ 2 สภาพนางฟ้า)',
    'บ้านหลังใหญ่ Red Roof Country Home (มือ 2 สภาพนางฟ้า)',
    'ชุดเดรสเจ้าหญิงคัสตอมพร้อมที่คาดผมดอกไม้ (มือ 1)'
);

INSERT INTO public.products (name, description, price, image_url, category, is_active)
VALUES
(
    'เซ็ตเบเกอรี่และของหวานจิ๋ว Miniature Bakery Set (มือ 1)',
    'อุปกรณ์ขนมปัง เค้ก ถาดอบ และเครื่องครัวของจิ๋วสเกล 1:12 ดีเทลสวยประณีต สำหรับแต่งบ้านตุ๊กตา Sylvanian ให้ดูอบอุ่นน่ารัก',
    490.00,
    'https://images.unsplash.com/photo-1581557991964-125469da3b8a?q=80&w=1000&auto=format&fit=crop',
    'ของจิ๋ว',
    true
),
(
    'Sylvanian Families - Chocolate Rabbit Family (มือ 1 กล่องสวย)',
    'ครอบครัวกระต่ายช็อกโกแลตตัวยอดนิยม ของแท้ 100% มือหนึ่งในกล่องซีล ประกอบด้วยคุณพ่อ คุณแม่ พี่สาว และเบบี้ ชุดเสื้อผ้าน่ารักตัดเย็บประณีต ขนนุ่มสภาพสมบูรณ์',
    1290.00,
    'https://images.unsplash.com/photo-1558877385-81a1c7e67d72?q=80&w=1000&auto=format&fit=crop',
    'ชุดเซ็ต',
    true
),
(
    'ตุ๊กตาเบบี้ช็อกโกแลตแรบบิท ตัวเปล่า (มือ 2 สภาพนางฟ้า)',
    'น้องเบบี้กระต่ายช็อกโกแลตตัวเปล่า ขนฟูนุ่ม ไม่มีรอยเปื้อน สภาพสะสม 98% ตัวจริงน่ารักมาก เหมาะสำหรับนำไปแต่งตัวคัสตอมหรือสะสม',
    290.00,
    'https://images.unsplash.com/photo-1560859251-d563a49c5e4a?q=80&w=1000&auto=format&fit=crop',
    'ตัวเปล่า',
    true
),
(
    'บ้านหลังใหญ่ Red Roof Country Home (มือ 2 สภาพนางฟ้า)',
    'บ้านหลังคาสีแดงเปิดไฟได้ สภาพสวยมาก 95%+ อุปกรณ์ครบ ไม่มีตำหนิหักพัง พับเปิด-ปิดปรับโครงสร้างห้องได้หลายแบบ พร้อมกล่องเดิม',
    2450.00,
    'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1000&auto=format&fit=crop',
    'บ้าน',
    true
),
(
    'ชุดเดรสเจ้าหญิงคัสตอมพร้อมที่คาดผมดอกไม้ (มือ 1)',
    'ชุดเสื้อผ้าสั่งตัดพิเศษสำหรับฟิกเกอร์ไซส์พี่สาว Sylvanian งานแฮนด์เมดตัดเย็บละเอียด ลายลูกไม้สีชมพูหวานละมุน สวมใส่ง่าย',
    350.00,
    'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=1000&auto=format&fit=crop',
    'เสื้อผ้า',
    true
);

-- ================================================================
-- 8. Shipments / Tracking System (ตารางข้อมูลเลขพัสดุ)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    shipping_date DATE NOT NULL DEFAULT CURRENT_DATE,
    carrier TEXT NOT NULL DEFAULT 'Flash Express',
    tracking_number TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shipments_customer_name ON public.shipments (customer_name);
CREATE INDEX IF NOT EXISTS idx_shipments_shipping_date ON public.shipments (shipping_date DESC);

DROP TRIGGER IF EXISTS set_shipments_updated_at ON public.shipments;
CREATE TRIGGER set_shipments_updated_at
    BEFORE UPDATE ON public.shipments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view shipments" ON public.shipments;
CREATE POLICY "Public can view shipments"
    ON public.shipments
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can insert shipments" ON public.shipments;
CREATE POLICY "Admins can insert shipments"
    ON public.shipments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update shipments" ON public.shipments;
CREATE POLICY "Admins can update shipments"
    ON public.shipments
    FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can delete shipments" ON public.shipments;
CREATE POLICY "Admins can delete shipments"
    ON public.shipments
    FOR DELETE
    TO authenticated
    USING (true);

