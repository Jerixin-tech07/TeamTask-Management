import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Gamepad2, ChevronsUp, X, Activity, Gauge, Zap } from 'lucide-react';

export default function OonjalIdBadge({ user, onClose, onOpenProfile }) {
  if (!user) return null;

  // Viewport-relative base suspension strut height
  const [baseHeight, setBaseHeight] = useState(() => Math.max(150, Math.round(window.innerHeight * 0.24)));
  const [angle, setAngle] = useState(0); // Lateral chassis roll angle (degrees)
  const [stretchY, setStretchY] = useState(0); // Vertical suspension travel (px)
  const [yaw, setYaw] = useState(0); // 3D Yaw tilt (degrees)
  const [pitch, setPitch] = useState(0); // 3D Pitch tilt (degrees)
  const [isDragging, setIsDragging] = useState(false);
  const [suspensionState, setSuspensionState] = useState('EQUILIBRIUM'); // 'COMPRESSION' | 'REBOUND' | 'EQUILIBRIUM'

  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const animFrameRef = useRef(null);

  // Dynamic automotive coilover suspension physics simulation
  const simRef = useRef({
    angle: 0,
    angleVel: 0,
    y: -75, // Starts in compressed jounce on mount, firing real suspension rebound drop!
    yVel: 0,
    yaw: 0,
    yawVel: 0,
    pitch: 0,
    pitchVel: 0,
    targetHoverYaw: 0,
    targetHoverPitch: 0,
    isDragging: false,
    isResting: false,
    idleTime: 0,
    lastTime: performance.now(),
    baseHeight: 150,
    dragStartX: 0,
    dragStartY: 0,
    initialAngle: 0,
    initialY: 0,
    recentMoves: []
  });

  // Track window resizing for responsive strut geometry
  useEffect(() => {
    const handleResize = () => {
      const computed = Math.max(150, Math.round(window.innerHeight * 0.24));
      setBaseHeight(computed);
      simRef.current.baseHeight = computed;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Format user role / department
  const getFormattedRole = (role, department) => {
    if (role === 'admin') return 'ADMINISTRATOR';
    const dept = (department || '').toUpperCase();
    if (dept.includes('STUDENT')) return 'STUDENT';
    if (dept.includes('WORKING') || dept.includes('PROFESSION')) return 'WORKING PROFESSION';
    if (dept.includes('JOB') || dept.includes('SEEKER')) return 'JOB SEEKER';
    if (dept.includes('VIP')) return 'VIP MEMBER';
    return dept || 'GAME DESIGNER';
  };

  const formattedRole = getFormattedRole(user.role, user.department);
  const userNameUpper = (user.name || 'USER').toUpperCase();

  // Automotive Coilover Physics Engine (Hooke's Law + Asymmetric Hydraulic Shock Damping + Progressive Bump Stop)
  const startPhysicsLoop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const step = (time) => {
      const sim = simRef.current;
      if (sim.isDragging) return;

      const totalDt = Math.min((time - sim.lastTime) / 1000, 0.033);
      sim.lastTime = time;

      // Numerical sub-stepping for smooth, high-precision shock absorber integration
      const subSteps = 8;
      const dt = totalDt / subSteps;

      // 1. Vehicle Suspension Strut Parameters (Automotive Coilover)
      // High spring rate k = 230 produces realistic stiff automotive coil response
      const kSpring = 230.0;
      // Stiff anti-roll sway bar damping
      const kAngle = 55.0;
      const dampingAngle = 7.5;
      // 3D face deflection springs
      const kRot = 45.0;
      const dampingRot = 8.0;

      for (let s = 0; s < subSteps; s++) {
        // --- A. Vertical Suspension Travel (F = -k*y - c*v) ---
        let springForce = -kSpring * sim.y;

        // Progressive Polyurethane Bump Stop (absorbs severe compression jounce below -35px)
        if (sim.y < -35) {
          const bumpPenetration = -35 - sim.y;
          springForce += 950.0 * bumpPenetration + 120.0 * Math.pow(bumpPenetration, 1.8);
        }

        // Rebound Extension Limit Stop (prevents over-extension past +130px)
        if (sim.y > 130) {
          const reboundLimit = sim.y - 130;
          springForce -= 800.0 * reboundLimit;
        }

        // Asymmetric Hydraulic Damper Valving:
        // Rebound stroke (yVel > 0 moving down) has stiffer hydraulic resistance than compression stroke (yVel < 0)
        const damperC = sim.yVel > 0 ? 10.4 : 6.2;
        const dampingForce = -damperC * sim.yVel;

        const accY = springForce + dampingForce;
        sim.yVel += accY * dt;
        sim.y += sim.yVel * dt;

        // --- B. Lateral Chassis Roll / Sway Bar (Restores vertical alignment) ---
        const accAngle = -kAngle * sim.angle - dampingAngle * sim.angleVel;
        sim.angleVel += accAngle * dt;
        sim.angle += sim.angleVel * dt;

        // --- C. 3D Tilt Integration (Yaw & Pitch) ---
        const inertiaYaw = sim.angle * 0.45;
        const inertiaPitch = -Math.abs(sim.angle) * 0.1 - (sim.yVel * 0.025);

        const destYaw = sim.targetHoverYaw + inertiaYaw;
        const destPitch = sim.targetHoverPitch + inertiaPitch;

        const accYaw = -kRot * (sim.yaw - destYaw) - dampingRot * sim.yawVel;
        sim.yawVel += accYaw * dt;
        sim.yaw += sim.yawVel * dt;

        const accPitch = -kRot * (sim.pitch - destPitch) - dampingRot * sim.pitchVel;
        sim.pitchVel += accPitch * dt;
        sim.pitch += sim.pitchVel * dt;
      }

      // Live Telemetry Classification
      if (sim.y < -8) {
        setSuspensionState('COMPRESSION');
      } else if (sim.y > 8) {
        setSuspensionState('REBOUND');
      } else {
        setSuspensionState('EQUILIBRIUM');
      }

      // Check whether suspension has settled into resting equilibrium
      const isSettled =
        Math.abs(sim.angle) < 0.1 &&
        Math.abs(sim.angleVel) < 0.25 &&
        Math.abs(sim.y) < 0.2 &&
        Math.abs(sim.yVel) < 0.4 &&
        Math.abs(sim.targetHoverYaw) < 0.1 &&
        Math.abs(sim.targetHoverPitch) < 0.1;

      if (isSettled) {
        sim.isResting = true;
        sim.idleTime = (sim.idleTime || 0) + totalDt;

        // Subtle vehicle idling engine harmonic vibration when at rest
        const ambientY = Math.sin(sim.idleTime * 4.5) * 0.45;
        const ambientAngle = Math.sin(sim.idleTime * 2.2) * 0.15;

        setAngle(ambientAngle);
        setStretchY(ambientY);
        setYaw(0);
        setPitch(0);
        setSuspensionState('EQUILIBRIUM');

        animFrameRef.current = requestAnimationFrame(step);
        return;
      }

      sim.isResting = false;
      sim.idleTime = 0;

      setAngle(sim.angle);
      setStretchY(sim.y);
      setYaw(sim.yaw);
      setPitch(sim.pitch);

      animFrameRef.current = requestAnimationFrame(step);
    };

    simRef.current.lastTime = performance.now();
    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  // Hover 3D Deflection
  const handleCardMouseMove = (e) => {
    const sim = simRef.current;
    if (sim.isDragging) return;
    const cardEl = cardRef.current;
    if (!cardEl) return;

    const rect = cardEl.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;

    sim.targetHoverYaw = nx * 16.0;
    sim.targetHoverPitch = -ny * 14.0;

    if (sim.isResting) {
      sim.isResting = false;
      startPhysicsLoop();
    }
  };

  const handleCardMouseLeave = () => {
    const sim = simRef.current;
    sim.targetHoverYaw = 0;
    sim.targetHoverPitch = 0;
    if (sim.isResting) {
      sim.isResting = false;
      startPhysicsLoop();
    }
  };

  // Pointer drag interaction (simulates pulling down against the vehicle suspension spring)
  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const clientX = e.clientX;
    const clientY = e.clientY;

    const sim = simRef.current;
    sim.isDragging = true;
    sim.dragStartX = clientX;
    sim.dragStartY = clientY;
    sim.initialAngle = sim.angle;
    sim.initialY = sim.y;
    sim.angleVel = 0;
    sim.yVel = 0;
    sim.recentMoves = [{ x: clientX, y: clientY, time: performance.now() }];

    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e) => {
    const sim = simRef.current;
    if (!sim.isDragging) return;
    e.preventDefault();

    const curX = e.clientX;
    const curY = e.clientY;
    const now = performance.now();

    sim.recentMoves.push({ x: curX, y: curY, time: now });
    if (sim.recentMoves.length > 5) sim.recentMoves.shift();

    const deltaX = curX - sim.dragStartX;
    const deltaY = curY - sim.dragStartY;
    const effectiveLen = sim.baseHeight + 180;

    // Lateral chassis roll angle (limited to realistic suspension camber)
    let targetAngle = Math.atan2(deltaX, effectiveLen) * (180 / Math.PI) * 0.65;
    targetAngle = Math.max(-25, Math.min(25, targetAngle));

    // Vehicle suspension spring compression/extension curve
    let targetY = sim.initialY + (deltaY > 0 ? deltaY * 0.65 : deltaY * 0.45);
    targetY = Math.max(-55, Math.min(140, targetY));

    const targetYaw = targetAngle * 0.45;
    const targetPitch = -Math.abs(targetAngle) * 0.1 - (targetY * 0.05);

    sim.angle = targetAngle;
    sim.y = targetY;
    sim.yaw = targetYaw;
    sim.pitch = targetPitch;

    setAngle(targetAngle);
    setStretchY(targetY);
    setYaw(targetYaw);
    setPitch(targetPitch);

    if (targetY < -10) setSuspensionState('COMPRESSION');
    else if (targetY > 10) setSuspensionState('REBOUND');
    else setSuspensionState('EQUILIBRIUM');
  };

  const handlePointerUp = (e) => {
    const sim = simRef.current;
    if (!sim.isDragging) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const now = performance.now();
    sim.isDragging = false;
    setIsDragging(false);

    // Release velocity calculations for authentic automotive rebound recoil
    const moves = sim.recentMoves;
    if (moves.length >= 2) {
      const oldest = moves[0];
      const latest = moves[moves.length - 1];
      const dtMove = Math.max(0.012, (latest.time - oldest.time) / 1000);

      if (now - latest.time < 80) {
        const velX = (latest.x - oldest.x) / dtMove;
        const velY = (latest.y - oldest.y) / dtMove;

        sim.angleVel = Math.max(-140, Math.min(140, (velX / 8.0) * 0.7));
        sim.yVel = Math.max(-500, Math.min(500, velY * 0.9));
      } else {
        sim.angleVel = 0;
        sim.yVel = 0;
      }
    }

    startPhysicsLoop();
  };

  // Trigger Road Bump / Pothole Impulse (simulates hitting a speed bump at 50 km/h)
  const triggerSpeedBumpImpulse = (e) => {
    if (e) e.stopPropagation();
    const sim = simRef.current;
    // Sudden upward bump compression impulse into bump stop, followed by immediate recoil
    sim.yVel = -320;
    sim.angleVel = (Math.random() - 0.5) * 40;
    sim.isResting = false;
    startPhysicsLoop();
  };

  // Click bounce
  const handleCardClick = (e) => {
    const moves = simRef.current.recentMoves;
    if (moves && moves.length >= 2) {
      const first = moves[0];
      const last = moves[moves.length - 1];
      const dist = Math.hypot(last.x - first.x, last.y - first.y);
      if (dist > 8) return; // was drag
    }
    triggerSpeedBumpImpulse(e);
  };

  // Mount animation: Drops from compressed state into realistic automotive suspension oscillation
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      simRef.current.angle = 0;
      simRef.current.angleVel = 0;
      simRef.current.y = 0;
      simRef.current.yVel = 0;
      setAngle(0);
      setStretchY(0);
      setYaw(0);
      setPitch(0);
      return;
    }

    // Initial suspension drop from compression with rebound
    simRef.current.angle = 0;
    simRef.current.angleVel = 0;
    simRef.current.y = -65.0; // Dropping down from compressed strut
    simRef.current.yVel = 0;

    setAngle(0);
    setStretchY(-65.0);

    startPhysicsLoop();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [startPhysicsLoop]);

  // Geometry calculations for dynamic vehicle suspension coilover strut
  // Total strut span from top chassis bracket to lower eyelet
  const currentStrutHeight = Math.max(85, baseHeight + stretchY);
  // Damper body cylinder fixed height at bottom
  const damperBodyHeight = 55;
  // Dynamic piston shaft exposed length
  const pistonShaftLength = Math.max(25, currentStrutHeight - damperBodyHeight);

  // Dynamic Coilover Helical Spring Parameters
  const springTopY = 22; // Just below upper mounting plate
  const springBottomY = Math.max(springTopY + 35, currentStrutHeight - 20);
  const springHeight = springBottomY - springTopY;
  const numCoils = 7;
  const coilPitch = springHeight / numCoils;
  const coilRadius = 14; // Horizontal radius of coil

  // Build SVG path segments for 3D coil spring:
  // Back coils (pass behind chrome shaft) and Front coils (pass in front with metallic highlights)
  const backCoilPaths = [];
  const frontCoilPaths = [];

  for (let i = 0; i < numCoils; i++) {
    const yStart = springTopY + i * coilPitch;
    const yMid = yStart + coilPitch * 0.5;
    const yEnd = yStart + coilPitch;

    // Back half: from right to left passing behind damper piston
    backCoilPaths.push(
      `M ${30 + coilRadius} ${yStart} C ${30 + coilRadius} ${yStart + coilPitch * 0.25}, ${30 - coilRadius} ${yMid - coilPitch * 0.25}, ${30 - coilRadius} ${yMid}`
    );

    // Front half: from left to right passing in front of damper piston with gleaming gloss
    frontCoilPaths.push(
      `M ${30 - coilRadius} ${yMid} C ${30 - coilRadius} ${yMid + coilPitch * 0.25}, ${30 + coilRadius} ${yEnd - coilPitch * 0.25}, ${30 + coilRadius} ${yEnd}`
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        right: '68px',
        zIndex: 99999,
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        perspective: '1400px'
      }}
    >
      {/* 1. VEHICLE CHASSIS STRUT TOWER MOUNT (Ceiling Anchor Bracket) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '74px',
          height: '16px',
          background: 'linear-gradient(180deg, #3f3f46 0%, #18181b 80%, #09090b 100%)',
          borderRadius: '0 0 10px 10px',
          border: '1.5px solid #71717a',
          borderTop: 'none',
          boxShadow: '0 6px 16px rgba(0,0,0,0.9), inset 0 1px 2px rgba(255,255,255,0.2)',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 8px',
          pointerEvents: 'auto',
          cursor: 'pointer'
        }}
        onClick={triggerSpeedBumpImpulse}
        title="Automotive Strut Tower Mount • Click to trigger Speed Bump road impulse"
      >
        {/* Chassis Mounting Studs / Retaining Bolts */}
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a1a1aa', border: '1px solid #18181b', boxShadow: 'inset 0 1px 1px #fff' }} />
        {/* Center Damper Piston Rod Nut with Polyurethane Bushing */}
        <div style={{ width: '12px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', border: '1px solid #713f12', boxShadow: '0 0 6px rgba(234,179,8,0.5)' }} />
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a1a1aa', border: '1px solid #18181b', boxShadow: 'inset 0 1px 1px #fff' }} />
      </div>

      {/* 2. VEHICLE SUSPENSION STRUT ASSEMBLY (Swings and telescopes with authentic shock physics) */}
      <div
        style={{
          transformOrigin: 'top center',
          transformStyle: 'preserve-3d',
          transform: `rotate(${angle}deg)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
          willChange: 'transform'
        }}
      >
        {/* Real-World Coilover Suspension SVG Structure */}
        <div
          style={{
            position: 'relative',
            width: '60px',
            height: `${currentStrutHeight}px`,
            pointerEvents: 'none',
            marginTop: '8px'
          }}
        >
          <svg
            width="60"
            height={currentStrutHeight}
            style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0 }}
          >
            <defs>
              {/* Chrome Damper Piston Rod Metallic Gradient */}
              <linearGradient id="chromePistonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="35%" stopColor="#ffffff" />
                <stop offset="70%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>

              {/* Tempered Racing Gold Suspension Spring Coil Gradient */}
              <linearGradient id="goldCoilGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ca8a04" />
                <stop offset="30%" stopColor="#fef08a" />
                <stop offset="60%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#854d0e" />
              </linearGradient>

              {/* Dark Spring Shadow for 3D Depth */}
              <linearGradient id="coilShadowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#713f12" />
                <stop offset="50%" stopColor="#a16207" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>

              {/* Damper Body Anodized Cylinder */}
              <linearGradient id="damperBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#18181b" />
                <stop offset="25%" stopColor="#3f3f46" />
                <stop offset="60%" stopColor="#27272a" />
                <stop offset="100%" stopColor="#09090b" />
              </linearGradient>

              {/* External Piggyback Nitrogen Canister */}
              <linearGradient id="piggybackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0369a1" />
                <stop offset="40%" stopColor="#38bdf8" />
                <stop offset="80%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0c4a6e" />
              </linearGradient>
            </defs>

            {/* A. REAR COIL SEGMENTS (Pass behind the chrome damper shaft) */}
            {backCoilPaths.map((pathStr, idx) => (
              <path
                key={`back-coil-${idx}`}
                d={pathStr}
                fill="none"
                stroke="url(#coilShadowGrad)"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.85"
              />
            ))}

            {/* B. TELESCOPING CHROME HYDRAULIC PISTON ROD */}
            <rect
              x="26"
              y="14"
              width="8"
              height={pistonShaftLength}
              fill="url(#chromePistonGrad)"
              stroke="#475569"
              strokeWidth="0.8"
              rx="1.5"
            />

            {/* C. POLYURETHANE BUMP STOP (Conical elastomer cushion beneath top perch) */}
            <path
              d="M 23 20 L 37 20 L 35 34 L 25 34 Z"
              fill="linear-gradient(180deg, #f97316 0%, #ea580c 100%)"
              stroke="#9a3412"
              strokeWidth="0.75"
            />
            {/* Bump Stop Ribs */}
            <line x1="24" y1="25" x2="36" y2="25" stroke="#ffedd5" strokeWidth="0.8" opacity="0.6" />
            <line x1="24.5" y1="29.5" x2="35.5" y2="29.5" stroke="#ffedd5" strokeWidth="0.8" opacity="0.6" />

            {/* D. FRONT COIL SEGMENTS (Pass IN FRONT of chrome damper shaft with gleaming gloss) */}
            {frontCoilPaths.map((pathStr, idx) => (
              <path
                key={`front-coil-${idx}`}
                d={pathStr}
                fill="none"
                stroke="url(#goldCoilGrad)"
                strokeWidth="5"
                strokeLinecap="round"
                filter="drop-shadow(0 2px 3px rgba(0,0,0,0.75))"
              />
            ))}

            {/* E. UPPER SPRING PERCH PLATE */}
            <rect
              x="13"
              y="15"
              width="34"
              height="6"
              rx="2"
              fill="linear-gradient(180deg, #71717a 0%, #27272a 100%)"
              stroke="#a1a1aa"
              strokeWidth="0.8"
            />

            {/* F. LOWER DAMPER BODY CYLINDER (Threaded shock absorber housing) */}
            <g transform={`translate(0, ${currentStrutHeight - damperBodyHeight})`}>
              {/* Main Shock Body */}
              <rect
                x="21"
                y="0"
                width="18"
                height={damperBodyHeight - 12}
                rx="3"
                fill="url(#damperBodyGrad)"
                stroke="#52525b"
                strokeWidth="1"
              />

              {/* Machined Preload Thread Rings */}
              {[...Array(6)].map((_, i) => (
                <line
                  key={`thread-${i}`}
                  x1="21"
                  y1={4 + i * 4.5}
                  x2="39"
                  y2={4 + i * 4.5}
                  stroke="#a1a1aa"
                  strokeWidth="0.75"
                  opacity="0.45"
                />
              ))}

              {/* Anodized Gold Lower Preload Locking Collar */}
              <rect
                x="18"
                y="0"
                width="24"
                height="6"
                rx="1.5"
                fill="linear-gradient(180deg, #fbbf24 0%, #d97706 100%)"
                stroke="#78350f"
                strokeWidth="0.75"
              />

              {/* External Piggyback Nitrogen Sub-Reservoir Canister */}
              <rect
                x="43"
                y="6"
                width="11"
                height="28"
                rx="3"
                fill="url(#piggybackGrad)"
                stroke="#0284c7"
                strokeWidth="0.8"
                boxShadow="0 2px 6px rgba(0,0,0,0.6)"
              />
              <rect x="44.5" y="4" width="8" height="3" rx="1" fill="#cbd5e1" />
              {/* Connecting Oil Feed Hose */}
              <path d="M 39 12 Q 43 12 43 16" fill="none" stroke="#64748b" strokeWidth="2.5" />

              {/* Lower Spherical Bearing / Eyelet Mount */}
              <circle
                cx="30"
                cy={damperBodyHeight - 6}
                r="7"
                fill="#27272a"
                stroke="#71717a"
                strokeWidth="2"
              />
              <circle
                cx="30"
                cy={damperBodyHeight - 6}
                r="3.5"
                fill="#09090b"
                stroke="#fbbf24"
                strokeWidth="1"
              />
            </g>
          </svg>
        </div>

        {/* Small Speed Bump Test Trigger Button on Suspension Strut */}
        <button
          type="button"
          onClick={triggerSpeedBumpImpulse}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(234, 179, 8, 0.45)',
            borderRadius: '9999px',
            padding: '2px 8px',
            color: '#facc15',
            fontSize: '9px',
            fontFamily: 'monospace',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
            marginBottom: '4px',
            transform: 'translateY(-2px)',
            transition: 'all 120ms'
          }}
          title="Click to test vehicle suspension with an authentic Road Bump impulse"
        >
          <Zap size={10} style={{ color: '#fbbf24' }} />
          <span>SPEED BUMP TEST</span>
        </button>

        {/* Punched Top Slot Ring on the Card */}
        <div
          style={{
            width: '24px',
            height: '6px',
            borderRadius: '3px',
            background: '#09090b',
            border: '1.5px solid #52525b',
            marginTop: '-1px',
            marginBottom: '-3px',
            zIndex: 7,
            pointerEvents: 'none'
          }}
        />

        {/* 3. 3D ROTATING & VEHICLE SUSPENSION-BOUNCING ID CARD CONTAINER */}
        <div
          ref={cardRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
          onClick={handleCardClick}
          onDoubleClick={triggerSpeedBumpImpulse}
          style={{
            position: 'relative',
            width: '280px',
            cursor: isDragging ? 'grabbing' : 'grab',
            pointerEvents: 'auto', // Card is interactive
            transformStyle: 'preserve-3d',
            transformOrigin: 'top center',
            transform: `rotateY(${yaw}deg) rotateX(${pitch}deg)`,
            filter: isDragging
              ? 'drop-shadow(0 30px 45px rgba(0,0,0,0.95))'
              : 'drop-shadow(0 18px 32px rgba(0,0,0,0.8))',
            touchAction: 'none',
            userSelect: 'none',
            willChange: 'transform'
          }}
          title="⚡ Vehicle Coilover Suspension ID Card: Pull down to stretch spring • Double-click or click Speed Bump for road impact • Hover for 3D tilt"
        >
          {/* ========================================================================= */}
          {/* EXACT ORIGINAL ID CARD DESIGN (100% PRESERVED WITHOUT ANY ALTERATIONS)     */}
          {/* ========================================================================= */}
          <div
            style={{
              position: 'relative',
              borderRadius: '24px',
              background: 'linear-gradient(165deg, #1c1d22 0%, #111216 40%, #0c0d10 100%)',
              border: '2.5px solid #272932',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 20px 40px rgba(0,0,0,0.85)',
              overflow: 'hidden',
              padding: '16px 16px 14px'
            }}
          >
            {/* Top Close Button */}
            {onClose && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: '#d4d4d8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 25,
                  transition: 'background 0.15s'
                }}
                title="Close ID Card"
              >
                <X size={13} />
              </button>
            )}

            {/* Inner Cyber Technical Frame Border */}
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                right: '8px',
                bottom: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '18px',
                pointerEvents: 'none'
              }}
            />

            {/* Top Slot */}
            <div
              style={{
                width: '36px',
                height: '6px',
                borderRadius: '3px',
                background: '#000000',
                border: '1.5px solid #3f3f46',
                margin: '0 auto 10px',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)'
              }}
            />

            {/* Top Header Row: GAME. DESIGN. CREATE. & LEVEL UP */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 6px',
                marginBottom: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '8px',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    letterSpacing: '0.8px',
                    color: '#eab308'
                  }}
                >
                  GAME. DESIGN. <span style={{ color: '#facc15' }}>CREATE.</span>
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  marginRight: onClose ? '26px' : '0'
                }}
              >
                <span
                  style={{
                    fontSize: '8px',
                    fontFamily: "'Arial Black', sans-serif",
                    fontWeight: 900,
                    color: '#eab308',
                    letterSpacing: '0.5px'
                  }}
                >
                  LEVEL UP
                </span>
                <ChevronsUp size={12} style={{ color: '#eab308' }} />
              </div>
            </div>

            {/* Central Main Portrait Graphic Frame */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '240px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #18191f 0%, #0d0e12 100%)',
                border: '1.5px solid #2d3039',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.85)'
              }}
            >
              {/* Vertical Stencil Text on Left: GAME DEV */}
              <div
                style={{
                  position: 'absolute',
                  left: '6px',
                  top: '50%',
                  transform: 'translateY(-50%) rotate(-90deg)',
                  color: '#eab308',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  letterSpacing: '4px',
                  opacity: 0.85,
                  zIndex: 6,
                  whiteSpace: 'nowrap'
                }}
              >
                GAME DEV
              </div>

              {/* Diagonal Golden Energy Slash / Light Ray behind person */}
              <div
                style={{
                  position: 'absolute',
                  width: '160%',
                  height: '52px',
                  background:
                    'linear-gradient(90deg, rgba(234, 179, 8, 0) 0%, rgba(234, 179, 8, 0.45) 30%, #eab308 50%, rgba(250, 204, 21, 0.45) 70%, rgba(234, 179, 8, 0) 100%)',
                  transform: 'rotate(-32deg)',
                  filter: 'blur(3px)',
                  zIndex: 1,
                  boxShadow: '0 0 35px #eab308'
                }}
              />

              {/* Secondary Diagonal Gold Accents */}
              <div
                style={{
                  position: 'absolute',
                  width: '140%',
                  height: '16px',
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(234, 179, 8, 0.6) 50%, transparent 100%)',
                  transform: 'rotate(-32deg) translateY(45px)',
                  zIndex: 1
                }}
              />

              {/* Golden Dust Embers */}
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '18px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: '#fde047',
                  boxShadow: '0 0 6px #facc15',
                  zIndex: 4
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  left: '26px',
                  width: '3px',
                  height: '3px',
                  borderRadius: '50%',
                  background: '#fde047',
                  boxShadow: '0 0 6px #facc15',
                  zIndex: 4
                }}
              />

              {/* Person Portrait Image */}
              <img
                src={
                  user.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || 'User')}`
                }
                alt={user.name}
                style={{
                  position: 'relative',
                  width: '190px',
                  height: '230px',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  zIndex: 3,
                  filter: 'contrast(1.08) brightness(1.02)'
                }}
              />

              {/* Outer Golden Corner Accents */}
              <div
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '18px',
                  height: '18px',
                  borderRight: '2px solid #eab308',
                  borderTop: '2px solid #eab308',
                  zIndex: 5
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  width: '18px',
                  height: '18px',
                  borderLeft: '2px solid #eab308',
                  borderBottom: '2px solid #eab308',
                  zIndex: 5
                }}
              />
            </div>

            {/* Lower Identity Text Section */}
            <div style={{ textAlign: 'center', marginTop: '14px', padding: '0 4px' }}>
              <h2
                style={{
                  margin: '0',
                  fontFamily: "'Impact', 'Arial Black', sans-serif",
                  fontSize: '26px',
                  fontWeight: 900,
                  letterSpacing: '1.5px',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                  textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 2px #000'
                }}
              >
                {userNameUpper}
              </h2>

              {/* Role with Gold Hazard Slashes */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '6px'
                }}
              >
                <span style={{ color: '#eab308', fontWeight: 900, fontSize: '11px', letterSpacing: '1px' }}>
                  ///
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: "'Arial Black', sans-serif",
                    fontWeight: 900,
                    letterSpacing: '1.8px',
                    color: '#eab308',
                    textTransform: 'uppercase'
                  }}
                >
                  {formattedRole}
                </span>
                <span style={{ color: '#eab308', fontWeight: 900, fontSize: '11px', letterSpacing: '1px' }}>
                  ///
                </span>
              </div>

              {/* Bottom Row: Gamepad Icon + Hazard Stripes */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '24px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#eab308'
                  }}
                >
                  <Gamepad2 size={24} style={{ color: '#eab308' }} />
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '3px',
                      marginBottom: '3px'
                    }}
                  >
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '8px',
                          height: '4px',
                          background: '#eab308',
                          transform: 'skewX(-30deg)',
                          borderRadius: '1px'
                        }}
                      />
                    ))}
                  </div>

                  <span
                    style={{
                      fontSize: '8px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      color: '#a1a1aa',
                      letterSpacing: '1px'
                    }}
                  >
                    PLAY &bull; DESIGN &bull; INSPIRE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-World Vehicle Suspension Telemetry HUD Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '10px',
              padding: '5px 12px',
              borderRadius: '9999px',
              background: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
              pointerEvents: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: suspensionState === 'COMPRESSION' ? '#ef4444' : suspensionState === 'REBOUND' ? '#38bdf8' : '#eab308',
                  boxShadow: `0 0 8px ${suspensionState === 'COMPRESSION' ? '#ef4444' : suspensionState === 'REBOUND' ? '#38bdf8' : '#eab308'}`
                }}
              />
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#fef08a', letterSpacing: '0.8px', fontFamily: 'monospace' }}>
                SUSPENSION: {suspensionState}
              </span>
            </div>

            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>
              TRAVEL: {Math.round(stretchY)}mm
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
