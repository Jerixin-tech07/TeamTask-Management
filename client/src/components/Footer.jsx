import React, { useState } from 'react';
import { Mail, Check, Copy, Shield, Heart } from 'lucide-react';
import websiteLogo from '../assets/Website Logo.png';

export default function Footer({ onLogoClick }) {
  const [copied, setCopied] = useState(false);
  const supportEmail = 'jerisonge0@gmail.com';

  const handleCopyEmail = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <footer
      style={{
        marginTop: 'auto',
        width: '100%',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.4) 0%, rgba(9, 13, 22, 0.95) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border-light)',
        padding: '24px 32px',
        color: 'var(--text-muted)',
        fontSize: '13px',
        zIndex: 10
      }}
    >
      <div
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        {/* Brand & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onLogoClick}
            title="Click to view full-size logo"
            style={{
              padding: 0,
              background: 'none',
              border: 'none',
              cursor: onLogoClick ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <img
              src={websiteLogo || "/Website Logo.png"}
              onError={(e) => { e.currentTarget.src = websiteLogo; }}
              alt="Team Task Logo"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                objectFit: 'cover',
                border: '1.5px solid rgba(99, 102, 241, 0.35)',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                transition: 'transform 150ms ease'
              }}
              onMouseEnter={(e) => { if (onLogoClick) e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={(e) => { if (onLogoClick) e.currentTarget.style.transform = 'scale(1)'; }}
            />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#f8fafc', letterSpacing: '-0.3px' }}>
                Team Task
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '9999px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}>
                Enterprise
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-faint)' }}>
              Next-generation task management, workflow collaboration & team security
            </p>
          </div>
        </div>

        {/* Official Help & Support Contact */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.65)',
          padding: '8px 14px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Mail size={14} style={{ color: '#38bdf8' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Help & Support Contact
            </span>
            <a
              href={`mailto:${supportEmail}`}
              style={{
                color: '#38bdf8',
                fontWeight: 600,
                fontSize: '13px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'color 150ms'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#7dd3fc'; e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.textDecoration = 'none'; }}
            >
              {supportEmail}
            </a>
          </div>

          <button
            type="button"
            onClick={handleCopyEmail}
            title={copied ? "Copied!" : "Copy email address"}
            style={{
              background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.12)'}`,
              color: copied ? '#34d399' : '#cbd5e1',
              padding: '6px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              transition: 'all 150ms'
            }}
          >
            {copied ? (
              <>
                <Check size={12} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Security & Copyright info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontSize: '12px',
          color: 'var(--text-faint)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981'
            }} />
            <span>Systems Normal</span>
          </div>
          <span>&bull;</span>
          <span>&copy; {new Date().getFullYear()} Team Task</span>
        </div>
      </div>
    </footer>
  );
}
