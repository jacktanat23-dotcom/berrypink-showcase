-- ================================================================
-- Supabase Migration: Shipments / Tracking System (ตารางเลขพัสดุ)
-- ================================================================

-- 1. Create shipments Table
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

-- 2. Create index on customer_name for fast search
CREATE INDEX IF NOT EXISTS idx_shipments_customer_name ON public.shipments (customer_name);
CREATE INDEX IF NOT EXISTS idx_shipments_shipping_date ON public.shipments (shipping_date DESC);

-- 3. Auto-update updated_at Trigger
DROP TRIGGER IF EXISTS set_shipments_updated_at ON public.shipments;
CREATE TRIGGER set_shipments_updated_at
    BEFORE UPDATE ON public.shipments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- 4.1 Policy: Anyone can view/search shipments (Public Tracking Page)
DROP POLICY IF EXISTS "Public can view shipments" ON public.shipments;
CREATE POLICY "Public can view shipments"
    ON public.shipments
    FOR SELECT
    USING (true);

-- 4.2 Policy: Authenticated admin users can insert shipments
DROP POLICY IF EXISTS "Admins can insert shipments" ON public.shipments;
CREATE POLICY "Admins can insert shipments"
    ON public.shipments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 4.3 Policy: Authenticated admin users can update shipments
DROP POLICY IF EXISTS "Admins can update shipments" ON public.shipments;
CREATE POLICY "Admins can update shipments"
    ON public.shipments
    FOR UPDATE
    TO authenticated
    USING (true);

-- 4.4 Policy: Authenticated admin users can delete shipments
DROP POLICY IF EXISTS "Admins can delete shipments" ON public.shipments;
CREATE POLICY "Admins can delete shipments"
    ON public.shipments
    FOR DELETE
    TO authenticated
    USING (true);
