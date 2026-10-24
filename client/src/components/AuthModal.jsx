import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Briefcase, ArrowRight, CheckCircle2, ShieldCheck, KeyRound, Sparkles, Calendar, RotateCcw, ZoomIn, Shield, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import websiteLogo from '../assets/Website Logo.png';
import LogoLightboxModal from './LogoLightboxModal';
import Footer from './Footer';

export default function AuthModal({ onOpenDevMailbox }) {
  const { login, sendOtp, checkNameAvailability, verifyOtp, register, forgotPasswordSendOtp, forgotPasswordVerifyOtp, forgotPasswordReset } = useAuth();
  const [tab, setTab] = useState('user-login'); // 'user-login' | 'admin-login' | 'register' | 'forgot'
  const [isLogoLightboxOpen, setIsLogoLightboxOpen] = useState(false);

  // User Sign In Form State
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userLoginError, setUserLoginError] = useState(null);

  // Admin Sign In Form State (Default designated admin email)
  const [adminEmail, setAdminEmail] = useState('jerison1539@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState(null);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register Form State (Stepper: 1 = Details & Send OTP, 2 = Enter OTP, 3 = Password & Register)
  const [regStep, setRegStep] = useState(1);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regDepartment, setRegDepartment] = useState('Student');
  const [regOtp, setRegOtp] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [nameError, setNameError] = useState(null);

  // Forgot Password State
  const [fpStep, setFpStep] = useState(1); // 1=enter email, 2=enter OTP, 3=new password
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpPassword, setFpPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [isFpSending, setIsFpSending] = useState(false);
  const [isFpVerifying, setIsFpVerifying] = useState(false);
  const [isFpResetting, setIsFpResetting] = useState(false);
  const [fpOtpVerified, setFpOtpVerified] = useState(false);

  // User Login Submit
  const handleUserLoginSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const cleanPassword = (userPassword || '').trim();
    if (!cleanEmail || !cleanPassword) return;
    setUserLoginError(null);
    setIsLoggingIn(true);
    try {
      await login(cleanEmail, cleanPassword, 'user');
    } catch (err) {
      setUserLoginError(err.message || 'Login failed. Only verified registered accounts are permitted.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Admin Login Submit
  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = (adminEmail || 'jerison1539@gmail.com').trim().toLowerCase();
    const cleanPassword = (adminPassword || '').trim();
    if (!cleanEmail || !cleanPassword) return;
    setAdminLoginError(null);
    setIsLoggingIn(true);
    try {
      await login(cleanEmail, cleanPassword, 'admin');
    } catch (err) {
      setAdminLoginError(err.message || 'Administrator authentication failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCheckNameBlur = async () => {
    if (!regName.trim()) {
      setNameError(null);
      return;
    }
    const res = await checkNameAvailability(regName.trim());
    if (res && !res.available) {
      setNameError('This name already exist');
    } else {
      setNameError(null);
    }
  };

  const handleSendOtpSubmit = async (e) => {
    e.preventDefault();
    if (!regEmail || !regName) return;
    setNameError(null);

    // Check name availability before sending OTP
    const nameCheck = await checkNameAvailability(regName.trim());
    if (nameCheck && !nameCheck.available) {
      setNameError('This name already exist');
      return;
    }

    setIsSendingOtp(true);
    try {
      await sendOtp(regEmail, regName.trim());
      setRegStep(2);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('name already exist')) {
        setNameError('This name already exist');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    if (!regOtp) return;
    setIsVerifyingOtp(true);
    try {
      await verifyOtp(regEmail, regOtp);
      setOtpVerified(true);
      setRegStep(3);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regPassword) return;
    setIsRegistering(true);
    try {
      await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        otp: regOtp,
        department: regDepartment,
        date_of_birth: regDob || null
      });
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch { /* ignore */ }
    } finally {
      setIsRegistering(false);
    }
  };

  // Forgot Password Handlers
  const handleFpSendOtp = async (e) => {
    e.preventDefault();
    if (!fpEmail) return;
    setIsFpSending(true);
    try {
      await forgotPasswordSendOtp(fpEmail);
      setFpStep(2);
    } finally {
      setIsFpSending(false);
    }
  };

  const handleFpVerifyOtp = async (e) => {
    e.preventDefault();
    if (!fpOtp) return;
    setIsFpVerifying(true);
    try {
      await forgotPasswordVerifyOtp(fpEmail, fpOtp);
      setFpOtpVerified(true);
      setFpStep(3);
    } finally {
      setIsFpVerifying(false);
    }
  };

  const handleFpReset = async (e) => {
    e.preventDefault();
    if (!fpPassword || fpPassword !== fpConfirmPassword) return;
    setIsFpResetting(true);
    try {
      await forgotPasswordReset(fpEmail, fpOtp, fpPassword);
      // Reset all state and go back to login
      setFpStep(1); setFpEmail(''); setFpOtp(''); setFpPassword(''); setFpConfirmPassword(''); setFpOtpVerified(false);
      setTab('user-login');
    } finally {
      setIsFpResetting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch',
        background: 'radial-gradient(circle at 15% 10%, rgba(99, 102, 241, 0.12) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(139, 92, 246, 0.1) 0%, transparent 45%), var(--bg-main)',
        padding: '32px 16px 0'
      }}
    >
      <div
        className="modal-dialog"
        style={{
          maxWidth: '490px',
          width: '100%',
          margin: 'auto 0 32px',
          overflow: 'visible',
          borderRadius: '24px',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.75), 0 0 30px rgba(99, 102, 241, 0.25)'
        }}
      >
        {/* Brand Banner with Interactive Click-to-View Logo */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.2) 100%)',
          padding: '28px 24px 20px',
          textAlign: 'center',
          borderBottom: '1px solid var(--border-light)',
          borderRadius: '24px 24px 0 0'
        }}>
          {/* Logo with Click-to-View Lightbox Preview */}
          <div style={{ margin: '0 auto 12px', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setIsLogoLightboxOpen(true)}
              title="Click to view full size logo"
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                borderRadius: '18px',
                outline: 'none',
                transition: 'transform 180ms ease, box-shadow 180ms ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <img
                src={websiteLogo || "/Website Logo.png"}
                onError={(e) => { e.currentTarget.src = logoImg; }}
                alt="TeamTask Official Logo"
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '18px',
                  objectFit: 'cover',
                  display: 'block',
                  boxShadow: '0 8px 28px rgba(99, 102, 241, 0.45)',
                  border: '2px solid rgba(99, 102, 241, 0.5)'
                }}
              />
              {/* Click to Zoom Badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #0f172a',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                }}
                title="Click to expand"
              >
                <ZoomIn size={12} />
              </div>
            </button>
          </div>
          <h2 style={{ fontSize: '21px', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px', color: '#f8fafc' }}>
            TeamTask Workspace
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Enterprise task management & collaboration platform
          </p>

          {/* 3-Way Dedicated Tab Switcher (User vs Admin vs Register) */}
          {tab !== 'forgot' && (
            <div style={{
              display: 'flex',
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              padding: '4px',
              marginTop: '16px',
              border: '1px solid var(--border-light)',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => { setTab('user-login'); setUserLoginError(null); setAdminLoginError(null); }}
                style={{
                  flex: 1, padding: '8px 10px', fontSize: '12px', fontWeight: 700,
                  borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                  background: tab === 'user-login' ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(16, 185, 129, 0.25) 100%)' : 'transparent',
                  color: tab === 'user-login' ? '#38bdf8' : 'var(--text-muted)',
                  border: tab === 'user-login' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  transition: 'all 150ms'
                }}
              >
                <User size={13} />
                <span>User Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => { setTab('admin-login'); setUserLoginError(null); setAdminLoginError(null); }}
                style={{
                  flex: 1, padding: '8px 10px', fontSize: '12px', fontWeight: 700,
                  borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                  background: tab === 'admin-login' ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(245, 158, 11, 0.2) 100%)' : 'transparent',
                  color: tab === 'admin-login' ? '#fbbf24' : 'var(--text-muted)',
                  border: tab === 'admin-login' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  transition: 'all 150ms'
                }}
              >
                <ShieldCheck size={13} />
                <span>Admin Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => { setTab('register'); setUserLoginError(null); setAdminLoginError(null); }}
                style={{
                  flex: 1, padding: '8px 10px', fontSize: '12px', fontWeight: 700,
                  borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                  background: tab === 'register' ? 'var(--bg-surface)' : 'transparent',
                  color: tab === 'register' ? '#ffffff' : 'var(--text-muted)',
                  border: tab === 'register' ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  transition: 'all 150ms'
                }}
              >
                <KeyRound size={13} />
                <span>Register with OTP</span>
              </button>
            </div>
          )}

          {tab === 'forgot' && (
            <div style={{ marginTop: '14px' }}>
              <span style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 700 }}>
                🔐 Password Reset
              </span>
              <button
                onClick={() => { setTab('user-login'); setFpStep(1); setFpOtpVerified(false); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '12px', marginLeft: '8px' }}
              >← Back to Sign In</button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <div style={{ padding: '22px 28px' }}>

          {/* ============== 1. USER SIGN IN PORTAL ============== */}
          {tab === 'user-login' && (
            <div>
              {/* User Portal Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={15} style={{ color: '#06b6d4' }} />
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.4px', display: 'block' }}>
                      TEAM MEMBER PORTAL
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Access assigned tasks, private chats & submit work
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Alert Banner for Unregistered Emails or Auth Failures */}
              {userLoginError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.15)'
                }}>
                  <Shield size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#fca5a5' }}>
                      Access Denied
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#fecaca', lineHeight: 1.45 }}>
                      {userLoginError}
                    </p>
                    {userLoginError.toLowerCase().includes('not registered') && (
                      <button
                        type="button"
                        onClick={() => { setTab('register'); setUserLoginError(null); }}
                        style={{
                          marginTop: '8px',
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                        }}
                      >
                        <span>Register Account with OTP</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleUserLoginSubmit}>
                <div className="form-group">
                  <label className="form-label">Member Work Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-faint)' }} />
                    <input
                      type="email" required placeholder="Enter your registered email"
                      className="form-input" style={{ paddingLeft: '38px' }}
                      value={userEmail}
                      onChange={(e) => { setUserEmail(e.target.value); if (userLoginError) setUserLoginError(null); }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Account Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-faint)' }} />
                    <input
                      type="password" required placeholder="Enter member password"
                      className="form-input" style={{ paddingLeft: '38px' }}
                      value={userPassword}
                      onChange={(e) => { setUserPassword(e.target.value); if (userLoginError) setUserLoginError(null); }}
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={isLoggingIn} className="btn btn-primary"
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    height: '42px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  {isLoggingIn ? 'Authenticating Member...' : 'Sign In as Team Member'}
                  <ArrowRight size={16} />
                </button>
              </form>

              {/* Forgot Password Link */}
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button
                  onClick={() => { setTab('forgot'); setFpStep(1); }}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textDecoration: 'underline' }}
                >
                  Forgot Password?
                </button>
              </div>

            </div>
          )}

          {/* ============== 2. ADMIN SIGN IN PORTAL ============== */}
          {tab === 'admin-login' && (
            <div>
              {/* Admin Portal Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} style={{ color: '#fbbf24' }} />
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.4px', display: 'block' }}>
                      ADMINISTRATOR CONTROL CENTER
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Restricted access: Task governance, user credentials & logs
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Alert Banner for Admin Auth Failures */}
              {adminLoginError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.15)'
                }}>
                  <Shield size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#fca5a5' }}>
                      Administrator Sign In Failed
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#fecaca', lineHeight: 1.45 }}>
                      {adminLoginError}
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleAdminLoginSubmit}>
                <div className="form-group">
                  <label className="form-label">Administrator Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#fbbf24' }} />
                    <input
                      type="email" required placeholder="jerison1539@gmail.com"
                      className="form-input" style={{ paddingLeft: '38px', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                      value={adminEmail}
                      onChange={(e) => { setAdminEmail(e.target.value); if (adminLoginError) setAdminLoginError(null); }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Admin Master Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#fbbf24' }} />
                    <input
                      type="password" required placeholder="Enter administrator password"
                      className="form-input" style={{ paddingLeft: '38px', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                      value={adminPassword}
                      onChange={(e) => { setAdminPassword(e.target.value); if (adminLoginError) setAdminLoginError(null); }}
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={isLoggingIn} className="btn btn-primary"
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    height: '42px',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #b45309 100%)',
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
                  }}
                >
                  {isLoggingIn ? 'Authenticating Administrator...' : 'Sign In as Administrator'}
                  <ShieldCheck size={16} />
                </button>
              </form>

              {/* Forgot Password Link */}
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button
                  onClick={() => { setTab('forgot'); setFpStep(1); }}
                  style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textDecoration: 'underline' }}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Switch to User helper */}
              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setTab('user-login')}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Are you a Team Member? <span style={{ textDecoration: 'underline', color: '#38bdf8' }}>Switch to User Sign In &rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* ============== 3. REGISTER TAB ============== */}
          {tab === 'register' && (
            <div>
              {/* Step Indicators */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                {[{ n: 1, label: 'Details' }, { n: 2, label: 'OTP' }, { n: 3, label: 'Password' }].map((s, i, arr) => (
                  <React.Fragment key={s.n}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: regStep >= s.n ? 'var(--accent-primary)' : 'var(--bg-surface)',
                        color: '#fff', fontSize: '12px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>{s.n}</div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: regStep === s.n ? '#fff' : 'var(--text-faint)' }}>{s.label}</span>
                    </div>
                    {i < arr.length - 1 && <div style={{ height: '1px', flex: 1, margin: '0 8px', background: regStep > s.n ? 'var(--accent-primary)' : 'var(--border-light)' }} />}
                  </React.Fragment>
                ))}
              </div>

              {/* Step 1 */}
              {regStep === 1 && (
                <form onSubmit={handleSendOtpSubmit}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: nameError ? '#ef4444' : 'var(--text-faint)' }} />
                      <input
                        type="text"
                        required
                        placeholder="Enter your full name"
                        className="form-input"
                        style={{
                          paddingLeft: '38px',
                          borderColor: nameError ? '#ef4444' : undefined
                        }}
                        value={regName}
                        onChange={(e) => {
                          setRegName(e.target.value);
                          if (nameError) setNameError(null);
                        }}
                        onBlur={handleCheckNameBlur}
                      />
                    </div>
                    {nameError && (
                      <p style={{
                        color: '#f87171',
                        fontSize: '11px',
                        fontWeight: 700,
                        margin: '4px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <AlertCircle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
                        <span>{nameError}</span>
                      </p>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Corporate / Personal Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-faint)' }} />
                      <input type="email" required placeholder="Enter your email address" className="form-input"
                        style={{ paddingLeft: '38px' }} value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-faint)' }} />
                      <input type="date" className="form-input" style={{ paddingLeft: '38px' }}
                        value={regDob} onChange={(e) => setRegDob(e.target.value)}
                        max={new Date().toISOString().split('T')[0]} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <div style={{ position: 'relative' }}>
                      <Briefcase size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-faint)' }} />
                      <select className="form-select" style={{ paddingLeft: '38px' }}
                        value={regDepartment} onChange={(e) => setRegDepartment(e.target.value)}>
                        <option value="Student">Student</option>
                        <option value="Working Profession">Working Profession</option>
                        <option value="Job Seeker">Job Seeker</option>
                        <option value="VIP">VIP</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={isSendingOtp || !!nameError} className="btn btn-primary"
                    style={{ width: '100%', marginTop: '10px', height: '42px' }}>
                    {isSendingOtp ? 'Sending OTP...' : 'Send 6-Digit Verification Code'}
                    <KeyRound size={16} />
                  </button>
                </form>
              )}

              {/* Step 2 */}
              {regStep === 2 && (
                <form onSubmit={handleVerifyOtpSubmit}>
                  <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>We sent a 6-digit verification code to:</p>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#a5b4fc', marginTop: '2px' }}>{regEmail}</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ textAlign: 'center' }}>Enter Verification OTP</label>
                    <input type="text" maxLength={6} required placeholder="• • • • • •" className="form-input"
                      style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 800, fontFamily: 'monospace', color: '#818cf8', padding: '12px' }}
                      value={regOtp} onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button type="button" onClick={() => setRegStep(1)} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>
                    <button type="submit" disabled={isVerifyingOtp || regOtp.length < 6} className="btn btn-primary" style={{ flex: 2 }}>
                      {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3 */}
              {regStep === 3 && (
                <form onSubmit={handleRegisterSubmit}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <CheckCircle2 size={20} style={{ color: '#34d399', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#6ee7b7', fontWeight: 600 }}>Email verified successfully! Set your secure password.</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Create Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-faint)' }} />
                      <input type="password" required minLength={6} placeholder="At least 6 characters" className="form-input"
                        style={{ paddingLeft: '38px' }} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                    </div>
                  </div>
                  <button type="submit" disabled={isRegistering || regPassword.length < 6} className="btn btn-primary"
                    style={{ width: '100%', marginTop: '12px', height: '42px' }}>
                    {isRegistering ? 'Creating Account...' : 'Complete Registration'}
                    <Sparkles size={16} />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ============== FORGOT PASSWORD TAB ============== */}
          {tab === 'forgot' && (
            <div>
              {/* Step Indicators */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                {[{ n: 1, label: 'Email' }, { n: 2, label: 'OTP' }, { n: 3, label: 'New Password' }].map((s, i, arr) => (
                  <React.Fragment key={s.n}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: fpStep >= s.n ? '#f59e0b' : 'var(--bg-surface)',
                        color: '#fff', fontSize: '12px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>{s.n}</div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: fpStep === s.n ? '#fff' : 'var(--text-faint)' }}>{s.label}</span>
                    </div>
                    {i < arr.length - 1 && <div style={{ height: '1px', flex: 1, margin: '0 8px', background: fpStep > s.n ? '#f59e0b' : 'var(--border-light)' }} />}
                  </React.Fragment>
                ))}
              </div>

              {/* FP Step 1: Email */}
              {fpStep === 1 && (
                <form onSubmit={handleFpSendOtp}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Enter your registered email address and we'll send a 6-digit verification code.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Registered Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-faint)' }} />
                      <input type="email" required placeholder="your@email.com" className="form-input"
                        style={{ paddingLeft: '38px' }} value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} />
                    </div>
                  </div>
                  <button type="submit" disabled={isFpSending} className="btn btn-primary"
                    style={{ width: '100%', marginTop: '10px', height: '42px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                    {isFpSending ? 'Sending Code...' : 'Send Reset Code'}
                    <KeyRound size={16} />
                  </button>
                </form>
              )}

              {/* FP Step 2: OTP */}
              {fpStep === 2 && (
                <form onSubmit={handleFpVerifyOtp}>
                  <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>6-digit reset code sent to:</p>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>{fpEmail}</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ textAlign: 'center' }}>Enter Reset OTP</label>
                    <input type="text" maxLength={6} required placeholder="• • • • • •" className="form-input"
                      style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 800, fontFamily: 'monospace', color: '#fbbf24', padding: '12px' }}
                      value={fpOtp} onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button type="button" onClick={() => setFpStep(1)} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>
                    <button type="submit" disabled={isFpVerifying || fpOtp.length < 6} className="btn btn-primary"
                      style={{ flex: 2, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                      {isFpVerifying ? 'Verifying...' : 'Verify Code'}
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                </form>
              )}

              {/* FP Step 3: New Password */}
              {fpStep === 3 && (
                <form onSubmit={handleFpReset}>
                  <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <CheckCircle2 size={20} style={{ color: '#fbbf24', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#fde68a', fontWeight: 600 }}>Identity verified! Set your new password below.</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-faint)' }} />
                      <input type="password" required minLength={6} placeholder="Min 6 characters" className="form-input"
                        style={{ paddingLeft: '38px' }} value={fpPassword} onChange={(e) => setFpPassword(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-faint)' }} />
                      <input type="password" required minLength={6} placeholder="Re-enter password" className="form-input"
                        style={{ paddingLeft: '38px', borderColor: fpConfirmPassword && fpPassword !== fpConfirmPassword ? '#ef4444' : undefined }}
                        value={fpConfirmPassword} onChange={(e) => setFpConfirmPassword(e.target.value)} />
                    </div>
                    {fpConfirmPassword && fpPassword !== fpConfirmPassword && (
                      <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>Passwords do not match</p>
                    )}
                  </div>
                  <button type="submit" disabled={isFpResetting || fpPassword.length < 6 || fpPassword !== fpConfirmPassword} className="btn btn-primary"
                    style={{ width: '100%', marginTop: '12px', height: '42px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                    {isFpResetting ? 'Resetting Password...' : 'Reset Password & Login'}
                    <RotateCcw size={16} />
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Global Footer at Bottom of Sign In / Register Page */}
      <Footer onLogoClick={() => setIsLogoLightboxOpen(true)} />

      {/* Full-Size Interactive Logo Lightbox Modal */}
      <LogoLightboxModal
        isOpen={isLogoLightboxOpen}
        onClose={() => setIsLogoLightboxOpen(false)}
        logoSrc="/Website Logo.png"
      />
    </div>
  );
}
