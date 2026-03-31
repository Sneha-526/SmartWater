import React from 'react';
import { STATUS_CONFIG, formatCurrency, formatDate, truncateAddress } from '../utils/helpers';

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, icon: '●', class: 'badge-pending' };
  return (
    <span className={`badge ${cfg.class}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const OrderCard = ({ order, expanded = false, onToggle, children }) => {
  // Supabase returns snake_case — support both for safety
  const id = order.id || order._id;
  const createdAt = order.created_at || order.createdAt;
  const deliveryAddress = order.delivery_address || order.deliveryAddress;
  const totalAmount = order.total_amount ?? order.totalAmount ?? 0;
  const paymentMode = order.payment_mode || order.paymentMode;
  const items = order.order_items || order.jars || [];

  return (
    <div
      className={`order-card status-${order.status}`}
      style={{ cursor: onToggle ? 'pointer' : 'default' }}
      onClick={onToggle}
    >
      <div className="order-header">
        <div>
          <div className="order-id">#{id?.toString().slice(-8).toUpperCase()}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
            {formatDate(createdAt)}
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div style={{
        fontSize: '0.88rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.35rem',
        marginBottom: '0.6rem',
      }}>
        <span>📍</span>
        <span>{truncateAddress(deliveryAddress, 60)}</span>
      </div>

      <div className="order-jars">
        {items.map((item, i) => (
          <span key={item.id || i} className="jar-tag">
            {item.quantity}× {item.size || item.product_name}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <span className="order-amount">{formatCurrency(totalAmount)}</span>
        <span style={{
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          padding: '0.2rem 0.6rem',
          background: paymentMode === 'cod'
            ? 'rgba(245, 158, 11, 0.1)'
            : 'rgba(0, 210, 255, 0.1)',
          borderRadius: 'var(--radius-full)',
        }}>
          {paymentMode?.toUpperCase()}
        </span>
      </div>

      {expanded && children && (
        <div
          style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export { StatusBadge };
export default OrderCard;