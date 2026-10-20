import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useAuth();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '420px',
      width: 'calc(100vw - 48px)',
      pointerEvents: 'none'
    }}>
      {toasts.map((toast) => {
        let borderCol = 'rgba(99, 102, 241, 0.4)';
        let bgGrad = 'linear-gradient(135deg, #131b2e 0%, #0d1527 100%)';
        let icon = <Info size={18} style={{ color: '#818cf8', flexShrink: 0 }} />;

        if (toast.type === 'success') {
          borderCol = 'rgba(16, 185, 129, 0.5)';
          icon = <CheckCircle2 size={18} style={{ color: '#34d399', flexShrink: 0 }} />;
        } else if (toast.type === 'error') {
          borderCol = 'rgba(239, 68, 68, 0.5)';
          icon = <AlertCircle size={18} style={{ color: '#f87171', flexShrink: 0 }} />;
        }

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: bgGrad,
              border: `1px solid ${borderCol}`,
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 10px 25px -3px rgba(0,0,0,0.6)',
              animation: 'fadeIn 200ms ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {icon}
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#f1f5f9', lineHeight: 1.4 }}>
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
