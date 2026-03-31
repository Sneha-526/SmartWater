-- ============================================================
-- SmartAqua V2 - Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ──────────────────────────────────────────────────────────
-- PROFILES TABLE (extends auth.users - for customers)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'vendor')),
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- VENDORS TABLE (vendors have extra fields beyond profile)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT DEFAULT '',
  is_available BOOLEAN DEFAULT TRUE,
  lat DOUBLE PRECISION DEFAULT 0,
  lng DOUBLE PRECISION DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 4.5,
  total_orders INT DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'vendor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- WATER PRODUCTS CATALOG
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('regular', 'sparkling', 'black', 'mineral', 'flavored', 'hydrogen', 'alkaline')),
  size TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT DEFAULT '',
  health_benefits TEXT DEFAULT '',
  icon TEXT DEFAULT '💧',
  badge TEXT DEFAULT '',
  in_stock BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- ORDERS TABLE
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delivery_address TEXT NOT NULL,
  delivery_lat DOUBLE PRECISION NOT NULL,
  delivery_lng DOUBLE PRECISION NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'cod' CHECK (payment_mode IN ('cod', 'online')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  razorpay_order_id TEXT DEFAULT '',
  razorpay_payment_id TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'on_the_way', 'delivered', 'rejected', 'cancelled')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- ORDER ITEMS (jar breakdown per order)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES water_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price_per_unit DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- ORDER STATUS HISTORY
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- PAYMENTS TABLE
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT DEFAULT '',
  razorpay_signature TEXT DEFAULT '',
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

-- ──────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_products ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Vendors: public read (for customer to see vendor info), self-update
CREATE POLICY "vendors_select_all" ON vendors FOR SELECT USING (true);
CREATE POLICY "vendors_insert_own" ON vendors FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "vendors_update_own" ON vendors FOR UPDATE USING (auth.uid() = id);

-- Orders: users see their orders; vendors see pending + their assigned orders
CREATE POLICY "orders_user_select" ON orders FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = vendor_id OR status = 'pending');
CREATE POLICY "orders_user_insert" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_update_vendor" ON orders FOR UPDATE USING (
  auth.uid() = vendor_id OR (status = 'pending' AND vendor_id IS NULL)
);

-- Order items: same as orders
CREATE POLICY "order_items_select" ON order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR o.vendor_id = auth.uid() OR o.status = 'pending')));
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- Status history
CREATE POLICY "status_history_select" ON order_status_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR o.vendor_id = auth.uid())));
CREATE POLICY "status_history_insert" ON order_status_history FOR INSERT WITH CHECK (true);

-- Payments: user sees own
CREATE POLICY "payments_select_own" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payments_insert_own" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Water products: public read
CREATE POLICY "water_products_select" ON water_products FOR SELECT USING (true);

-- ──────────────────────────────────────────────────────────
-- SEED WATER PRODUCTS CATALOG
-- ──────────────────────────────────────────────────────────
INSERT INTO water_products (name, category, size, price, description, health_benefits, icon, badge, sort_order) VALUES
-- Regular
('Regular Water', 'regular', '250ml', 5, 'Pure purified drinking water', 'Stay hydrated throughout the day', '🥤', '', 1),
('Regular Water', 'regular', '500ml', 8, 'Pure purified drinking water', 'Stay hydrated throughout the day', '🥤', '', 2),
('Regular Water', 'regular', '1L', 15, 'Pure purified drinking water', 'Perfect for home use', '💧', '', 3),
('Regular Water', 'regular', '2L', 25, 'Pure purified drinking water', 'Great for families', '💧', '', 4),
('Regular Water', 'regular', '5L', 45, 'Pure purified drinking water', 'Bulk home supply', '🫙', '', 5),
('Regular Water', 'regular', '10L', 75, 'Pure purified drinking water', 'Office and home use', '🫙', 'Popular', 6),
('Regular Water', 'regular', '20L', 120, 'Pure purified drinking water', 'Best value bulk jar', '🛢️', 'Best Value', 7),
('Regular Water', 'regular', '25L', 150, 'Pure purified drinking water', 'Maximum bulk supply', '🛢️', '', 8),
-- Sparkling
('Sparkling Water', 'sparkling', '250ml', 30, 'Naturally carbonated mineral water', 'Aids digestion, refreshing taste', '🫧', 'New', 10),
('Sparkling Water', 'sparkling', '500ml', 55, 'Naturally carbonated mineral water', 'Great with meals', '🫧', 'New', 11),
('Sparkling Water', 'sparkling', '1L', 90, 'Naturally carbonated mineral water', 'Perfect for parties', '🫧', '', 12),
('Sparkling Water', 'sparkling', '2L', 160, 'Naturally carbonated mineral water', 'Bulk sparkling supply', '🫧', '', 13),
-- Black/Alkaline Water
('Black Water', 'black', '500ml', 80, 'Fulvic mineral water, naturally black', 'Detox, 72+ minerals, anti-aging', '🖤', 'Premium', 20),
('Black Water', 'black', '1L', 150, 'Fulvic mineral alkaline water pH 8+', 'Advanced hydration, mineral-rich', '🖤', 'Premium', 21),
('Black Water', 'black', '2L', 280, 'Fulvic mineral water, premium grade', 'Maximum mineral absorption', '🖤', 'Luxury', 22),
-- Mineral Spring Water
('Mineral Water', 'mineral', '250ml', 20, 'Natural spring water with minerals', 'Natural calcium & magnesium', '⛰️', '', 30),
('Mineral Water', 'mineral', '500ml', 35, 'Natural spring water with minerals', 'Supports bone health', '⛰️', '', 31),
('Mineral Water', 'mineral', '1L', 60, 'Natural spring water with minerals', 'Pure mountain source', '⛰️', '', 32),
('Mineral Water', 'mineral', '2L', 100, 'Natural spring water with minerals', 'Family mineral pack', '⛰️', '', 33),
-- Flavored Water
('Lemon Flavored Water', 'flavored', '250ml', 25, 'Water infused with natural lemon', 'Vitamin C boost, refreshing', '🍋', 'Zesty', 40),
('Mango Flavored Water', 'flavored', '250ml', 25, 'Water infused with natural mango', 'Tropical refreshment', '🥭', 'Tropical', 41),
('Berry Flavored Water', 'flavored', '250ml', 28, 'Water infused with mixed berries', 'Antioxidant rich', '🫐', 'Antioxidant', 42),
('Lemon Flavored Water', 'flavored', '500ml', 45, 'Water infused with natural lemon', 'Vitamin C boost', '🍋', '', 43),
('Mango Flavored Water', 'flavored', '500ml', 45, 'Water infused with natural mango', 'Tropical refreshment', '🥭', '', 44),
-- Hydrogen Water
('Hydrogen Water', 'hydrogen', '250ml', 60, 'Hydrogen-enriched molecular water', 'Anti-inflammatory, energy boost', '⚗️', 'Science', 50),
('Hydrogen Water', 'hydrogen', '500ml', 110, 'H2-enriched water for athletes', 'Reduces oxidative stress', '⚗️', 'Science', 51),
('Hydrogen Water', 'hydrogen', '1L', 200, 'Premium hydrogen water therapy', 'Performance & recovery', '⚗️', 'Pro', 52),
-- Alkaline
('Alkaline Water', 'alkaline', '500ml', 40, 'pH 9.5+ ionized alkaline water', 'Balances body pH, boosts immunity', '💎', '', 60),
('Alkaline Water', 'alkaline', '1L', 70, 'Premium alkaline ionized water', 'Superior hydration absorption', '💎', '', 61),
('Alkaline Water', 'alkaline', '2L', 130, 'Alkaline water pH 9.5+', 'Daily wellness routine', '💎', 'Wellness', 62),
('Alkaline Water', 'alkaline', '5L', 280, 'Bulk alkaline water supply', 'Family wellness pack', '💎', '', 63)
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- FUNCTIONS
-- ──────────────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
