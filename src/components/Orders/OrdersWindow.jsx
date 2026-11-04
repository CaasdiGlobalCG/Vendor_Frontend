import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PackageCheck, X } from 'lucide-react';
import OrdersPanel from './OrdersPanel';

/**
 * Full-window view of every marketplace order the vendor has placed, across all
 * projects. Opened from the Orders button in the dashboard header.
 */
const OrdersWindow = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const openWorkspace = (order) => {
    if (!order?.workspaceId) return;
    onClose();
    navigate(`/VendorDashboard/workspace/${order.workspaceId}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-canvas text-ink"
          role="dialog"
          aria-modal="true"
          aria-label="Orders"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-line bg-surface px-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cta text-cta-foreground"><PackageCheck size={16} /></span>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold text-ink">Orders</h1>
              <p className="text-[11px] text-dim">What you bought from the marketplace, and where each order stands</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close orders" className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-dim hover:bg-surface-hover">
              <X size={16} />
            </button>
          </header>
          <div className="min-h-0 flex-1">
            <OrdersPanel onOpenWorkspace={openWorkspace} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrdersWindow;
