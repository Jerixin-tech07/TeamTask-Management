import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import fallbackLogo from '../assets/Website Logo.png';

export default function LogoLightboxModal({ isOpen, onClose, logoSrc = '/Website Logo.png' }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actualSrc = logoSrc || fallbackLogo;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Website Logo Preview"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000000,
        background: 'rgba(3, 7, 18, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 180ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Lightbox Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '520px',
          width: '100%',
          background: 'linear-gradient(165deg, #131b2e 0%, #0b1120 100%)',
          borderRadius: '24px',
          border: '1.5px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.85), 0 0 35px -5px rgba(99, 102, 241, 0.35)',
          overflow: 'hidden',
          animation: 'scaleUp 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Top Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ZoomIn size={15} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.2px' }}>
                Team Task Brand Logo
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                Official Public Asset • High Resolution
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Preview"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 150ms'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Central Logo Image Display */}
        <div style={{
          padding: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          position: 'relative'
        }}>
          <div style={{
            position: 'relative',
            borderRadius: '24px',
            padding: '8px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.35)'
          }}>
            <img
              src={logoSrc}
              alt="Team Task Official Logo Full Size"
              style={{
                width: '100%',
                maxWidth: '340px',
                height: 'auto',
                aspectRatio: '1 / 1',
                borderRadius: '18px',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div style={{
          padding: '14px 20px',
          background: 'rgba(15, 23, 42, 0.7)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
              Verified Brand Identity &bull; TeamTask Workspace
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href={logoSrc}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 150ms'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <ExternalLink size={13} />
              Open Raw
            </a>
            <a
              href={logoSrc}
              download="TeamTask_Website_Logo.png"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                transition: 'all 150ms'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <Download size={13} />
              Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
