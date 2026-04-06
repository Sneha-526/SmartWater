const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

// GET /api/catalog — Get all water products
router.get('/', async (req, res) => {
  try {
    const { category, in_stock } = req.query;

    let query = supabaseAdmin
      .from('water_products')
      .select('*')
      .order('sort_order');

    if (category) query = query.eq('category', category);
    if (in_stock !== undefined) query = query.eq('in_stock', in_stock === 'true');

    const { data: products, error } = await query;
    if (error) throw new Error(error.message);

    // Group by category
    const grouped = {};
    products.forEach((p) => {
      if (!grouped[p.category]) grouped[p.category] = { products: [], meta: getCategoryMeta(p.category) };
      grouped[p.category].products.push(p);
    });

    res.json({ success: true, products, grouped });
  } catch (err) {
    console.error('[Catalog] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load catalog.' });
  }
});

function getCategoryMeta(category) {
  const meta = {
    regular: { label: 'Regular Water', icon: '💧', description: 'Pure purified drinking water', color: '#00d2ff' },
    sparkling: { label: 'Sparkling Water', icon: '🫧', description: 'Naturally carbonated mineral water', color: '#7ee8fa' },
    black: { label: 'Black Water', icon: '🖤', description: 'Fulvic mineral alkaline water', color: '#1e1e2e' },
    mineral: { label: 'Mineral Water', icon: '⛰️', description: 'Natural spring water', color: '#4ade80' },
    flavored: { label: 'Flavored Water', icon: '🍹', description: 'Fruit-infused water varieties', color: '#f97316' },
    hydrogen: { label: 'Hydrogen Water', icon: '⚗️', description: 'H2-enriched molecular water', color: '#a78bfa' },
    alkaline: { label: 'Alkaline Water', icon: '💎', description: 'pH 9.5+ ionized water', color: '#38bdf8' },
  };
  return meta[category] || { label: category, icon: '💧', color: '#00d2ff' };
}

// POST /api/catalog/seed — Seed/update water products with correct pricing
router.post('/seed', async (req, res) => {
  try {
    const products = [
      // Regular Water
      { name: 'Regular Water 1L', category: 'regular', size: '1L', price: 25, icon: '💧', badge: null, health_benefits: 'Essential hydration', in_stock: true, sort_order: 1 },
      { name: 'Regular Water 2L', category: 'regular', size: '2L', price: 45, icon: '💧', badge: null, health_benefits: 'Essential hydration', in_stock: true, sort_order: 2 },
      { name: 'Regular Water 10L', category: 'regular', size: '10L', price: 180, icon: '💧', badge: null, health_benefits: 'Essential hydration', in_stock: true, sort_order: 3 },
      { name: 'Regular Water 20L', category: 'regular', size: '20L', price: 300, icon: '💧', badge: 'Best Value', health_benefits: 'Essential hydration', in_stock: true, sort_order: 4 },
      // Mineral Water
      { name: 'Mineral Water 1L', category: 'mineral', size: '1L', price: 40, icon: '⛰️', badge: null, health_benefits: 'Rich in natural minerals', in_stock: true, sort_order: 5 },
      { name: 'Mineral Water 2L', category: 'mineral', size: '2L', price: 75, icon: '⛰️', badge: null, health_benefits: 'Rich in natural minerals', in_stock: true, sort_order: 6 },
      { name: 'Mineral Water 10L', category: 'mineral', size: '10L', price: 350, icon: '⛰️', badge: null, health_benefits: 'Rich in natural minerals', in_stock: true, sort_order: 7 },
      { name: 'Mineral Water 20L', category: 'mineral', size: '20L', price: 600, icon: '⛰️', badge: 'Best Value', health_benefits: 'Rich in natural minerals', in_stock: true, sort_order: 8 },
      // Alkaline Water
      { name: 'Alkaline Water 1L', category: 'alkaline', size: '1L', price: 55, icon: '💎', badge: 'Premium', health_benefits: 'pH 9.5+ for better absorption', in_stock: true, sort_order: 9 },
      { name: 'Alkaline Water 2L', category: 'alkaline', size: '2L', price: 100, icon: '💎', badge: 'Premium', health_benefits: 'pH 9.5+ for better absorption', in_stock: true, sort_order: 10 },
      { name: 'Alkaline Water 10L', category: 'alkaline', size: '10L', price: 450, icon: '💎', badge: 'Premium', health_benefits: 'pH 9.5+ for better absorption', in_stock: true, sort_order: 11 },
      { name: 'Alkaline Water 20L', category: 'alkaline', size: '20L', price: 800, icon: '💎', badge: 'Premium', health_benefits: 'pH 9.5+ for better absorption', in_stock: true, sort_order: 12 },
      // Flavored Water
      { name: 'Flavored Water 1L', category: 'flavored', size: '1L', price: 50, icon: '🍹', badge: null, health_benefits: 'Fruit-infused refreshment', in_stock: true, sort_order: 13 },
      { name: 'Flavored Water 2L', category: 'flavored', size: '2L', price: 90, icon: '🍹', badge: null, health_benefits: 'Fruit-infused refreshment', in_stock: true, sort_order: 14 },
      { name: 'Flavored Water 10L', category: 'flavored', size: '10L', price: 400, icon: '🍹', badge: null, health_benefits: 'Fruit-infused refreshment', in_stock: true, sort_order: 15 },
      { name: 'Flavored Water 20L', category: 'flavored', size: '20L', price: 700, icon: '🍹', badge: null, health_benefits: 'Fruit-infused refreshment', in_stock: true, sort_order: 16 },
      // Sparkling Water
      { name: 'Sparkling Water 1L', category: 'sparkling', size: '1L', price: 60, icon: '🫧', badge: 'New', health_benefits: 'Naturally carbonated', in_stock: true, sort_order: 17 },
      { name: 'Sparkling Water 2L', category: 'sparkling', size: '2L', price: 110, icon: '🫧', badge: 'New', health_benefits: 'Naturally carbonated', in_stock: true, sort_order: 18 },
      { name: 'Sparkling Water 10L', category: 'sparkling', size: '10L', price: 500, icon: '🫧', badge: null, health_benefits: 'Naturally carbonated', in_stock: true, sort_order: 19 },
      { name: 'Sparkling Water 20L', category: 'sparkling', size: '20L', price: 900, icon: '🫧', badge: null, health_benefits: 'Naturally carbonated', in_stock: true, sort_order: 20 },
      // Hydrogen Water
      { name: 'Hydrogen Water 1L', category: 'hydrogen', size: '1L', price: 80, icon: '⚗️', badge: 'Luxury', health_benefits: 'H2-enriched antioxidant water', in_stock: true, sort_order: 21 },
      { name: 'Hydrogen Water 2L', category: 'hydrogen', size: '2L', price: 150, icon: '⚗️', badge: 'Luxury', health_benefits: 'H2-enriched antioxidant water', in_stock: true, sort_order: 22 },
      { name: 'Hydrogen Water 10L', category: 'hydrogen', size: '10L', price: 700, icon: '⚗️', badge: null, health_benefits: 'H2-enriched antioxidant water', in_stock: true, sort_order: 23 },
      { name: 'Hydrogen Water 20L', category: 'hydrogen', size: '20L', price: 1200, icon: '⚗️', badge: null, health_benefits: 'H2-enriched antioxidant water', in_stock: true, sort_order: 24 },
      // Black Water
      { name: 'Black Water 1L', category: 'black', size: '1L', price: 100, icon: '🖤', badge: 'Luxury', health_benefits: 'Fulvic mineral detoxification', in_stock: true, sort_order: 25 },
      { name: 'Black Water 2L', category: 'black', size: '2L', price: 180, icon: '🖤', badge: 'Luxury', health_benefits: 'Fulvic mineral detoxification', in_stock: true, sort_order: 26 },
      { name: 'Black Water 10L', category: 'black', size: '10L', price: 900, icon: '🖤', badge: null, health_benefits: 'Fulvic mineral detoxification', in_stock: true, sort_order: 27 },
      { name: 'Black Water 20L', category: 'black', size: '20L', price: 1500, icon: '🖤', badge: null, health_benefits: 'Fulvic mineral detoxification', in_stock: true, sort_order: 28 },
    ];

    // Delete existing products and re-insert
    await supabaseAdmin.from('water_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { data, error } = await supabaseAdmin.from('water_products').insert(products).select();
    if (error) throw new Error(error.message);

    res.json({ success: true, message: `Seeded ${data.length} products.`, products: data });
  } catch (err) {
    console.error('[Catalog] Seed error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to seed catalog.' });
  }
});

module.exports = router;

