const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { protect } = require('../middleware/auth');

let genAI = null;
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (e) { /* Gemini optional */ }

// GET /api/predict/demand — AI demand prediction
router.get('/demand', protect, async (req, res) => {
  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, created_at, total_amount, status, delivery_lat, delivery_lng, order_items(*)')
      .gte('created_at', last30Days)
      .eq('status', 'delivered');

    if (!orders || orders.length === 0) {
      return res.json({ success: true, prediction: getDefaultPrediction() });
    }

    // ── Analytics ──
    const hourCounts = Array(24).fill(0);
    const dayOfWeekCounts = Array(7).fill(0);
    const categoryCounts = {};
    const sizeCounts = {};
    let totalRevenue = 0;

    orders.forEach((order) => {
      const d = new Date(order.created_at);
      hourCounts[d.getHours()]++;
      dayOfWeekCounts[d.getDay()]++;
      totalRevenue += parseFloat(order.total_amount);
      order.order_items?.forEach((item) => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + item.quantity;
        sizeCounts[item.size] = (sizeCounts[item.size] || 0) + item.quantity;
      });
    });

    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((h) => ({
        hour: h.hour, label: formatHour(h.hour), orders: h.count,
        confidence: Math.min(100, Math.round((h.count / orders.length) * 100 * 3)),
      }));

    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    const topSizes = Object.entries(sizeCounts)
      .sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([size, count]) => ({ size, count }));

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
    const currentHour = now.getHours();
    const isCurrentHourPeak = peakHours.some((h) => Math.abs(h.hour - currentHour) <= 1);

    const next24HoursDemand = Array.from({ length: 24 }, (_, i) => ({
      hour: (currentHour + i) % 24,
      label: formatHour((currentHour + i) % 24),
      relativeScore: Math.round((hourCounts[(currentHour + i) % 24] / Math.max(...hourCounts)) * 100),
    }));

    const last7 = orders.filter((o) => new Date(o.created_at) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const prev7 = orders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) && d < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    });
    const trend = prev7.length ? Math.round(((last7.length - prev7.length) / prev7.length) * 100) : 0;

    // ── Gemini AI Insight ──
    let aiInsight = null;
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are a water delivery demand analyst. Analyze this data and give 3 short bullet-point insights (max 25 words each) and 1 recommendation (max 30 words).

Data:
- ${orders.length} orders in 30 days, avg value ₹${Math.round(totalRevenue / orders.length)}
- Peak hours: ${peakHours.map(h => h.label).join(', ')}
- Peak day: ${dayNames[peakDay]}
- Top categories: ${topCategories.map(c => c.category).join(', ')}
- Top sizes: ${topSizes.map(s => s.size).join(', ')}
- Week trend: ${trend >= 0 ? 'up' : 'down'} ${Math.abs(trend)}%

Respond in JSON: { "insights": ["...","...","..."], "recommendation": "..." }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) aiInsight = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('[Predict] Gemini error:', e.message);
      }
    }

    res.json({
      success: true,
      prediction: {
        summary: {
          totalOrdersAnalyzed: orders.length,
          avgOrderValue: Math.round(totalRevenue / orders.length),
          trend: trend >= 0 ? `↑ ${trend}% this week` : `↓ ${Math.abs(trend)}% this week`,
          trendPositive: trend >= 0,
        },
        peakHours, peakDay: { day: dayNames[peakDay], index: peakDay, orders: dayOfWeekCounts[peakDay] },
        topCategories, topSizes, next24HoursDemand,
        recommendation: {
          shouldOrderNow: isCurrentHourPeak,
          message: isCurrentHourPeak ? '🔥 High demand right now!' : `📅 Best time: ${peakHours[0]?.label || 'morning'}`,
          nextPeakHour: peakHours.find((h) => h.hour > currentHour) || peakHours[0],
        },
        aiInsight,
        generatedAt: now.toISOString(),
      },
    });
  } catch (err) {
    console.error('[Predict] Error:', err.message);
    res.status(500).json({ success: false, message: 'Prediction unavailable.' });
  }
});

function formatHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function getDefaultPrediction() {
  return {
    summary: { totalOrdersAnalyzed: 0, avgOrderValue: 0, trend: 'No data yet', trendPositive: true },
    peakHours: [
      { hour: 8, label: '8 AM', orders: 0, confidence: 85 },
      { hour: 13, label: '1 PM', orders: 0, confidence: 70 },
      { hour: 19, label: '7 PM', orders: 0, confidence: 75 },
    ],
    peakDay: { day: 'Saturday', index: 6, orders: 0 },
    topCategories: [{ category: 'regular', count: 0 }],
    topSizes: [{ size: '20L', count: 0 }],
    next24HoursDemand: [],
    recommendation: {
      shouldOrderNow: true,
      message: '💧 Start ordering to see personalized insights!',
      nextPeakHour: { hour: 8, label: '8 AM' },
    },
    aiInsight: null,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = router;
