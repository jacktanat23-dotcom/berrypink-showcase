-- ================================================================
-- Migration: Add is_sold_out column to products table
-- ================================================================

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN public.products.is_sold_out IS 'Status indicating whether product is sold out (true) or available (false)';
