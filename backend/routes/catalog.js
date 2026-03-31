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

module.exports = router;
