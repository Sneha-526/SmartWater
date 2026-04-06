export const JAR_SIZES = [
  { size: '1L', label: '1 Litre', icon: '🥤', price: 10 },
  { size: '2L', label: '2 Litres', icon: '💧', price: 18 },
  { size: '10L', label: '10 Litres', icon: '🫙', price: 60 },
  { size: '20L', label: '20 Litres', icon: '🛢️', price: 100 },
];

export const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#f59e0b', icon: '⏳', class: 'badge-pending' },
  accepted: { label: 'Accepted', color: '#3b82f6', icon: '✅', class: 'badge-accepted' },
  on_the_way: { label: 'On The Way', color: '#8b5cf6', icon: '🚚', class: 'badge-on_the_way' },
  delivered: { label: 'Delivered', color: '#10b981', icon: '📦', class: 'badge-delivered' },
  rejected: { label: 'Rejected', color: '#ef4444', icon: '❌', class: 'badge-rejected' },
  cancelled: { label: 'Cancelled', color: '#6b7280', icon: '🚫', class: 'badge-cancelled' },
};

export const STATUS_STEPS = ['pending', 'accepted', 'on_the_way', 'delivered'];

export const formatCurrency = (amount) => {
  return `₹${(amount || 0).toFixed(2)}`;
}

export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export const getOrderStatusStep = (status) => {
  if (status === 'rejected') return -1;
  return STATUS_STEPS.indexOf(status);
};

export const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Silent fail if AudioContext blocked
  }
};

export const truncateAddress = (address, maxLen = 40) => {
  if (!address) return '';
  return address.length > maxLen ? address.slice(0, maxLen) + '...' : address;
};
