import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, X, Copy, Check, Clock, ExternalLink } from 'lucide-react';

export default function DevMailboxModal({ isOpen, onClose, onSelectOtp }) {
  const [emails, setEmails] = useState([]);
  const [mailerStatus, setMailerStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const [emailsRes, statusRes] = await Promise.all([
        fetch('/api/auth/dev-emails'),
        fetch('/api/auth/mailer-status')
      ]);
      const emailsData = await emailsRes.json();
      const statusData = await statusRes.json();

      if (emailsData.success) {
        setEmails(emailsData.emails || []);
      }
      if (statusData.success) {
        setMailerStatus(statusData.mailer);
      }
    } catch (err) {
      console.error('Error fetching dev emails:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEmails();
      const interval = setInterval(fetchEmails, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const extractOtp = (subject, text) => {
    const match = (subject + ' ' + text).match(/\b\d{6}\b/);
    return match ? match[0] : null;
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>System Mailbox & Email Service</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Live dispatch log of all system emails, verification OTPs, and welcome messages
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={fetchEmails}
              disabled={isLoading}
              className="btn btn-secondary btn-sm"
              title="Refresh inbox"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button onClick={onClose} className="btn btn-secondary btn-icon btn-sm">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Live SMTP Service Status Bar */}
        <div style={{
          padding: '10px 22px',
          borderBottom: '1px solid var(--border-light)',
          background: mailerStatus?.isConfigured ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`status-dot ${mailerStatus?.isConfigured ? 'status-dot-active' : 'status-dot-busy'}`} />
            <span style={{ color: mailerStatus?.isConfigured ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
              {mailerStatus?.isConfigured
                ? `Real SMTP Connected (${mailerStatus.user} via ${mailerStatus.host}:${mailerStatus.port})`
                : 'External SMTP Not Configured in .env (Emails & OTPs safely inspected below)'}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
            {mailerStatus?.isConfigured ? 'Live Delivery Active' : 'Setup in .env to send live'}
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          {emails.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Mail size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>No emails dispatched yet</p>
              <p style={{ fontSize: '12px', maxWidth: '340px', margin: '6px auto 0' }}>
                When you request a registration OTP or assign a task, outgoing emails will appear here instantly.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {emails.map((email) => {
                const otp = extractOtp(email.subject, email.text);

                return (
                  <div
                    key={email.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      transition: 'border-color 150ms'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#818cf8',
                          background: 'rgba(99, 102, 241, 0.12)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          marginBottom: '4px'
                        }}>
                          TO: {email.to}
                        </span>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', margin: '2px 0 0' }}>
                          {email.subject}
                        </h4>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {new Date(email.sentAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '8px 0 12px' }}>
                      {email.text.length > 200 ? email.text.substring(0, 200) + '...' : email.text}
                    </p>

                    {/* Detected OTP pill */}
                    {otp && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px dashed var(--accent-primary)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        marginTop: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Detected OTP:</span>
                          <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '2px', color: '#a5b4fc', fontFamily: 'monospace' }}>
                            {otp}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => copyToClipboard(otp, email.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            {copiedId === email.id ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                            <span>{copiedId === email.id ? 'Copied' : 'Copy'}</span>
                          </button>
                          {onSelectOtp && (
                            <button
                              onClick={() => {
                                onSelectOtp(otp);
                                onClose();
                              }}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                            >
                              Auto-Fill Code
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div style={{
          padding: '12px 22px',
          borderTop: '1px solid var(--border-light)',
          background: 'var(--bg-main)',
          fontSize: '11px',
          color: 'var(--text-faint)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Real SMTP can be activated by configuring <code>SMTP_USER</code> and <code>SMTP_PASS</code> in .env</span>
          <button onClick={onClose} className="btn btn-secondary btn-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
