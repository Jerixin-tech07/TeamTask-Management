import React, { useState, useEffect } from 'react';
import { Cpu, Zap, ShieldCheck, Terminal, ArrowRight, Activity, Wifi, CheckCircle2 } from 'lucide-react';
import websiteLogo from '../assets/Website Logo.png';

export default function LaunchScreen({ user, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const steps = [
    { text: 'ENERGIZING QUANTUM LOGIC BUS', sub: 'Voltage: 3.3V • 120MHz Crystal Sync' },
    { text: 'VERIFYING BIOMETRICS & SECURITY CLEARANCE', sub: `Identity: ${user?.name || 'Authorized Member'} • Role: ${(user?.role || 'user').toUpperCase()}` },
    { text: 'CONNECTING SECURE DATABASE MESH', sub: 'End-to-End Encrypted Tunnel Active' },
    { text: 'SYNCHRONIZING REAL-TIME WEBSOCKET CHANNELS', sub: 'Activity Feed & Private Notification Bus Connected' },
    { text: 'SYSTEM HARDWARE NOMINAL & SECURE', sub: 'Entering Workspace Environment...' }
  ];

  useEffect(() => {
    // 5-second total duration: 100 ticks of 50ms = 5000ms
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = Math.min(100, prev + 1.0);
        if (next >= 80) setActiveStep(4);
        else if (next >= 60) setActiveStep(3);
        else if (next >= 40) setActiveStep(2);
        else if (next >= 20) setActiveStep(1);
        else setActiveStep(0);
        return next;
      });
    }, 50);

    // Auto complete after exactly 5.0 seconds (5000ms)
    const exitTimer = setTimeout(() => {
      handleFinish();
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(exitTimer);
    };
  }, []);

  const handleFinish = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 400);
  };

  const roleText = user?.role === 'admin' ? 'SYSTEM ADMINISTRATOR' : 'VERIFIED TEAM MEMBER';
  const roleColor = user?.role === 'admin' ? '#c084fc' : '#34d399';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        background: 'radial-gradient(ellipse at 50% 40%, #0d1527 0%, #060913 70%, #030408 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        color: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none'
      }}
    >
      {/* 1. PCB BACKGROUND GRID & CIRCUIT TRACES (SVG) */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.65
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle PCB Grid Pattern */}
          <pattern id="pcb-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(99, 102, 241, 0.07)" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.5" fill="rgba(6, 182, 212, 0.2)" />
            <circle cx="40" cy="40" r="1.5" fill="rgba(6, 182, 212, 0.2)" />
          </pattern>

          {/* Neon Glow Filters */}
          <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#pcb-grid)" />

        {/* Dynamic PCB Circuit Traces Radiating from Center */}
        {/* Top-Left Circuit Branches */}
        <path
          d="M 50% 50% L 35% 50% L 20% 35% L 5% 35%"
          fill="none"
          stroke="#00f2fe"
          strokeWidth="2.5"
          filter="url(#cyan-glow)"
          strokeDasharray="8 4"
          style={{ animation: 'circuitPulse 12s linear infinite' }}
        />
        <circle cx="20%" cy="35%" r="4" fill="#00f2fe" filter="url(#cyan-glow)" />
        <circle cx="5%" cy="35%" r="3" fill="#10b981" />

        {/* Top-Right Circuit Branches */}
        <path
          d="M 50% 50% L 65% 50% L 78% 30% L 95% 30%"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2.5"
          strokeDasharray="6 4"
        />
        <circle cx="78%" cy="30%" r="4" fill="#a78bfa" />
        <circle cx="95%" cy="30%" r="3" fill="#00f2fe" />

        {/* Bottom-Left Circuit Branches */}
        <path
          d="M 50% 50% L 40% 65% L 25% 65% L 10% 80%"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeDasharray="10 5"
        />
        <circle cx="25%" cy="65%" r="4" fill="#10b981" />
        <circle cx="10%" cy="80%" r="3" fill="#f59e0b" />

        {/* Bottom-Right Circuit Branches */}
        <path
          d="M 50% 50% L 60% 60% L 75% 75% L 90% 75%"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          filter="url(#gold-glow)"
          strokeDasharray="7 3"
        />
        <circle cx="75%" cy="75%" r="4" fill="#fbbf24" filter="url(#gold-glow)" />
        <circle cx="90%" cy="75%" r="3" fill="#00f2fe" />

        {/* Vertical Bus Bars */}
        <path d="M 50% 20% L 50% 40%" stroke="#06b6d4" strokeWidth="3" strokeDasharray="4 4" />
        <path d="M 50% 60% L 50% 80%" stroke="#8b5cf6" strokeWidth="3" strokeDasharray="4 4" />
      </svg>

      {/* 2. CENTRAL ELECTRONICS CHIP PACKAGE & HUD */}
      <div
        style={{
          position: 'relative',
          maxWidth: '560px',
          width: '92%',
          background: 'linear-gradient(170deg, rgba(17, 24, 39, 0.92) 0%, rgba(9, 14, 26, 0.96) 100%)',
          borderRadius: '28px',
          border: '1.5px solid rgba(6, 182, 212, 0.4)',
          boxShadow: '0 30px 80px -15px rgba(0, 0, 0, 0.9), 0 0 50px -10px rgba(6, 182, 212, 0.35)',
          padding: '36px 32px 30px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'scaleUp 300ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Decorative IC Corner Pins / Mounts */}
        <div style={{ position: 'absolute', top: '12px', left: '16px', display: 'flex', gap: '4px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ width: '6px', height: '3px', background: '#eab308', borderRadius: '1px' }} />
          ))}
        </div>
        <div style={{ position: 'absolute', top: '12px', right: '16px', display: 'flex', gap: '4px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ width: '6px', height: '3px', background: '#06b6d4', borderRadius: '1px' }} />
          ))}
        </div>

        {/* Central Core Processor Unit with Website Logo */}
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          {/* Animated Glowing Ring */}
          <div
            style={{
              position: 'absolute',
              inset: '-8px',
              borderRadius: '26px',
              background: 'conic-gradient(from 0deg, #00f2fe, #8b5cf6, #10b981, #f59e0b, #00f2fe)',
              filter: 'blur(10px)',
              opacity: 0.75,
              animation: 'spin 6s linear infinite'
            }}
          />

          {/* Processor Die Frame */}
          <div
            style={{
              position: 'relative',
              width: '96px',
              height: '96px',
              borderRadius: '22px',
              background: 'linear-gradient(145deg, #182234 0%, #0b111e 100%)',
              border: '2px solid rgba(0, 242, 254, 0.6)',
              boxShadow: 'inset 0 0 16px rgba(0, 242, 254, 0.35), 0 8px 24px rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <img
              src={websiteLogo || "/Website Logo.png"}
              onError={(e) => { e.currentTarget.src = websiteLogo; }}
              alt="Team Task Core"
              style={{
                width: '82px',
                height: '82px',
                borderRadius: '16px',
                objectFit: 'cover'
              }}
            />
          </div>

          {/* Microchip Badge Status */}
          <div
            style={{
              position: 'absolute',
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#090e1a',
              border: '1px solid #00f2fe',
              borderRadius: '10px',
              padding: '2px 8px',
              fontSize: '9px',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: '#00f2fe',
              letterSpacing: '1px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0, 242, 254, 0.4)'
            }}
          >
            CORE ONLINE
          </div>
        </div>

        {/* Cyber Welcome Heading */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '9999px',
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            marginBottom: '8px'
          }}>
            <Zap size={12} style={{ color: '#00f2fe' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.8px', fontFamily: 'monospace' }}>
              ELECTRONICS LAUNCH PROTOCOL v4.2
            </span>
          </div>

          <h2 style={{
            fontSize: '24px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            margin: '0 0 6px',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Welcome, {user?.name || 'Workspace Member'}!
          </h2>

          {/* User Role & Dept Badges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${roleColor}`,
              color: roleColor,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <ShieldCheck size={12} />
              {roleText}
            </span>

            {user?.department && (
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#a5b4fc'
              }}>
                Sector: {user.department}
              </span>
            )}
          </div>
        </div>

        {/* Diagnostic Terminal Status Box */}
        <div style={{
          width: '100%',
          background: 'rgba(5, 9, 18, 0.85)',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '14px 16px',
          margin: '12px 0 20px',
          textAlign: 'left',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
              <Terminal size={12} style={{ color: '#00f2fe' }} />
              <span style={{ fontWeight: 700 }}>HARDWARE DIAGNOSTIC BUS (5s DURATION)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00f2fe' }}>
              <Activity size={11} />
              <span style={{ fontSize: '10px', fontWeight: 700 }}>{Math.max(1, Math.ceil(5 - (progress / 20)))}s REMAINING</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
              &gt; {steps[activeStep]?.text}
            </span>
            <span style={{ color: '#00f2fe', fontWeight: 800 }}>
              {Math.min(100, Math.round(progress))}%
            </span>
          </div>
          <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
            {steps[activeStep]?.sub}
          </div>
        </div>

        {/* Cyber Neon Progress Bar */}
        <div style={{ width: '100%', marginBottom: '22px' }}>
          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '9999px',
            overflow: 'hidden',
            padding: '1px',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)'
          }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                borderRadius: '9999px',
                background: 'linear-gradient(90deg, #06b6d4 0%, #00f2fe 50%, #10b981 100%)',
                boxShadow: '0 0 14px #00f2fe',
                transition: 'width 80ms linear'
              }}
            />
          </div>
        </div>

        {/* Enter Workspace Direct Button */}
        <button
          type="button"
          onClick={handleFinish}
          className="btn btn-primary"
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 50%, #8b5cf6 100%)',
            border: '1px solid rgba(255,255,255,0.2)',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.3px',
            boxShadow: '0 4px 18px rgba(2, 132, 199, 0.45), 0 0 20px rgba(99, 102, 241, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>Enter Workspace Immediately</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Cyber Technical Watermark Footer */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '11px',
        color: '#64748b',
        fontFamily: 'monospace'
      }}>
        <span>CIRCUIT-ID: TT-PCB-990</span>
        <span>&bull;</span>
        <span>SUPPORT: jerisonge0@gmail.com</span>
        <span>&bull;</span>
        <span>STATUS: 100% OPERATIONAL</span>
      </div>
    </div>
  );
}
