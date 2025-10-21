-- Migration: Add platform_fee, gst_items, gst_fees to orders table
ALTER TABLE orders
ADD COLUMN platform_fee numeric DEFAULT 0,
ADD COLUMN gst_items numeric DEFAULT 0,
ADD COLUMN gst_fees numeric DEFAULT 0;
