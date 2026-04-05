import React from 'react';
import { STATUS_CONFIG, STATUS_STEPS, formatTime } from '../utils/helpers';

const OrderTimeline = ({ order }) => {
  const currentStep = order.status === 'rejected' ? -1 : STATUS_STEPS.indexOf(order.status);

  const getStepStatus = (stepStatus) => {
    if (order.status === 'rejected') {
      return stepStatus === 'pending' ? 'completed' : 'upcoming';
    }
    const stepIdx = STATUS_STEPS.indexOf(stepStatus);
    if (stepIdx < currentStep) return 'completed';
    if (stepIdx === currentStep) return 'active';
    return 'upcoming';
  };

  const getHistoryTime = (stepStatus) => {
    const history = order.order_status_history || order.statusHistory || [];
    const entry = history.find((h) => h.status === stepStatus);
    return entry ? formatTime(entry.created_at || entry.timestamp) : null;
  };

  const steps = [
    { status: 'pending', label: 'Order Placed', icon: '📋' },
    { status: 'accepted', label: 'Vendor Accepted', icon: '✅' },
    { status: 'on_the_way', label: 'On The Way', icon: '🚚' },
    { status: 'delivered', label: 'Delivered', icon: '📦' },
  ];

  return (
    <div className="timeline">
      {order.status === 'rejected' && (
        <div style={{
          padding: '0.5rem 0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--status-rejected)',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          ❌ This order was rejected
        </div>
      )}

      {steps.map((step) => {
        const status = getStepStatus(step.status);
        const time = getHistoryTime(step.status);
        return (
          <div key={step.status} className={`timeline-item ${status}`}>
            <div className="timeline-dot" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ opacity: status === 'upcoming' ? 0.4 : 1 }}>{step.icon}</span>
                <span className="timeline-label">{step.label}</span>
              </div>
              {time && <div className="timeline-time">{time}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderTimeline;
