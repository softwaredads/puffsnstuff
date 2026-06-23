-- Bilingual product and category names (Danish + English)
-- Run in Supabase SQL Editor after schema.sql

ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_da text;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE products   ADD COLUMN IF NOT EXISTS name_da text;
ALTER TABLE products   ADD COLUMN IF NOT EXISTS name_en text;

-- Copy existing data into both columns
UPDATE categories SET name_da = name, name_en = name WHERE name_da IS NULL;
UPDATE products   SET name_da = name, name_en = name WHERE name_da IS NULL;
