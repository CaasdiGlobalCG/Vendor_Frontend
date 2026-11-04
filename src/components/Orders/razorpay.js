// Loads the payment window's script once, only when someone is about to pay.
let loading = null;

export const loadRazorpay = () => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => { loading = null; resolve(false); };
    document.body.appendChild(script);
  });
  return loading;
};
