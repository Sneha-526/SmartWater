// Razorpay utility — load script + open checkout
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const openRazorpayCheckout = ({
  keyId,
  razorpayOrderId,
  amount,
  currency = 'INR',
  orderId,
  user,
  onSuccess,
  onFailure,
}) => {
  const options = {
    key: keyId,
    amount,
    currency,
    name: 'SmartAqua',
    description: `Order #${orderId?.slice(-8)?.toUpperCase() || ''}`,
    order_id: razorpayOrderId,
    prefill: {
      name: user?.name || '',
      email: user?.email || '',
      contact: user?.phone || '',
    },
    theme: { color: '#00d2ff' },
    handler: (response) => {
      onSuccess({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        orderId,
      });
    },
    modal: {
      ondismiss: () => {
        if (onFailure) onFailure('Payment cancelled by user.');
      },
    },
  };
  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', (resp) => {
    if (onFailure) onFailure(resp.error?.description || 'Payment failed.');
  });
  rzp.open();
};
