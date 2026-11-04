import { useCallback, useState } from 'react';
import { createOrderPayment, verifyOrderPayment } from '../../utils/workspaceOrdersApi';
import { loadRazorpay } from './razorpay';

/**
 * Pays what is due on an order. The amount, the payment window's order and the
 * signature check all come from the server; this only runs the window and
 * hands the result back.
 * @param {(order: object) => void} onPaid called with the updated order
 */
export default function useOrderPayment(onPaid) {
  const [state, setState] = useState({ busy: false, error: '' });

  const pay = useCallback(async (orderId, label = '') => {
    if (!orderId) return;
    setState({ busy: true, error: '' });
    try {
      const { data } = await createOrderPayment(orderId);
      if (!(await loadRazorpay())) throw new Error('Could not open the payment window. Check your connection and try again.');
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          order_id: data.orderId,
          name: 'Operon',
          description: `${data.kind === 'balance' ? 'Balance' : 'Advance'} for ${label || orderId}`,
          theme: { color: '#0f172a' },
          handler: async (response) => {
            try {
              const body = await verifyOrderPayment(orderId, response);
              onPaid?.(body.order);
              resolve();
            } catch (err) { reject(err); }
          },
          modal: { ondismiss: () => resolve() },
        });
        rzp.open();
      });
      setState({ busy: false, error: '' });
    } catch (err) {
      setState({ busy: false, error: err.message || 'The payment did not go through.' });
    }
  }, [onPaid]);

  return { pay, ...state };
}
