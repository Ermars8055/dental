import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';
type FaceState = 'idle' | 'typing' | 'error' | 'success' | 'loading';

// ── Live Canvas Background ─────────────────────────────────────
const LiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    let raf: number;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener('mousemove', onMouse);

    // ── Particle types ──
    type Shape = 'circle' | 'plus' | 'tooth' | 'star' | 'ring';
    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      size: number;
      alpha: number; alphaDir: number;
      color: string;
      shape: Shape;
      rot: number; rotV: number;
      depth: number; // 0 (far) → 1 (close) for parallax
    }

    const COLORS = [
      '#0d9488cc', '#14b8a6bb', '#0891b2bb',
      '#06b6d4aa', '#5eead4aa', '#99f6e4aa',
      '#7dd3fc88', '#a5f3fc88',
    ];
    const SHAPES: Shape[] = ['circle', 'plus', 'tooth', 'star', 'ring'];

    const make = (): Particle => ({
      x:        Math.random() * window.innerWidth,
      y:        window.innerHeight + Math.random() * 120,
      vx:       (Math.random() - 0.5) * 0.4,
      vy:       -(0.3 + Math.random() * 0.7),
      size:     6 + Math.random() * 18,
      alpha:    0.15 + Math.random() * 0.55,
      alphaDir: Math.random() > 0.5 ? 1 : -1,
      color:    COLORS[Math.floor(Math.random() * COLORS.length)],
      shape:    SHAPES[Math.floor(Math.random() * SHAPES.length)],
      rot:      Math.random() * Math.PI * 2,
      rotV:     (Math.random() - 0.5) * 0.02,
      depth:    0.2 + Math.random() * 0.8,
    });

    const particles: Particle[] = Array.from({ length: 55 }, make);

    // Draw helpers
    const drawTooth = (ctx: CanvasRenderingContext2D, s: number) => {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo( s * 0.6, -s,  s * 0.8, -s * 0.3,  s * 0.7,  s * 0.2);
      ctx.bezierCurveTo( s * 0.5,  s,  s * 0.1,  s * 0.8,  0,         s * 0.5);
      ctx.bezierCurveTo(-s * 0.1,  s * 0.8, -s * 0.5, s, -s * 0.7,  s * 0.2);
      ctx.bezierCurveTo(-s * 0.8, -s * 0.3, -s * 0.6, -s,  0,         -s);
      ctx.closePath();
      ctx.fill();
    };

    const drawPlus = (ctx: CanvasRenderingContext2D, s: number) => {
      const t = s * 0.32;
      ctx.beginPath();
      ctx.rect(-t, -s, t * 2, s * 2);
      ctx.rect(-s, -t, s * 2, t * 2);
      ctx.fill();
    };

    const drawStar = (ctx: CanvasRenderingContext2D, s: number) => {
      const pts = 4, inner = s * 0.45;
      ctx.beginPath();
      for (let i = 0; i < pts * 2; i++) {
        const r   = i % 2 === 0 ? s : inner;
        const ang = (i * Math.PI) / pts - Math.PI / 2;
        i === 0 ? ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r)
                : ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fill();
    };

    const drawRing = (ctx: CanvasRenderingContext2D, s: number, color: string, alpha: number) => {
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth   = s * 0.22;
      ctx.globalAlpha = alpha * 0.6;
      ctx.stroke();
    };

    let t = 0;
    const draw = () => {
      t++;
      const W = canvas.width, H = canvas.height;

      // ── Background gradient ──
      const grad = ctx.createLinearGradient(0, 0, W, H);
      const hue  = (t * 0.04) % 360; // used below for future tint if needed
      void hue;
      grad.addColorStop(0, `hsl(${174 + Math.sin(t * 0.003) * 8}, 72%, ${94 + Math.sin(t * 0.005) * 3}%)`);
      grad.addColorStop(0.5, `hsl(${196 + Math.cos(t * 0.004) * 10}, 68%, 92%)`);
      grad.addColorStop(1, `hsl(${210 + Math.sin(t * 0.002) * 6}, 65%, ${90 + Math.cos(t * 0.006) * 3}%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // ── Soft glowing orbs in background ──
      const orbs = [
        { x: 0.15, y: 0.25, r: 0.22, h: 174 },
        { x: 0.82, y: 0.15, r: 0.18, h: 196 },
        { x: 0.70, y: 0.80, r: 0.25, h: 210 },
        { x: 0.10, y: 0.75, r: 0.16, h: 185 },
      ];
      orbs.forEach((o, i) => {
        const ox = o.x * W + Math.sin(t * 0.008 + i) * W * 0.04;
        const oy = o.y * H + Math.cos(t * 0.006 + i) * H * 0.04;
        // mouse parallax on orbs
        const mx = (mouseRef.current.x - 0.5) * W * 0.03 * (i % 2 === 0 ? 1 : -1);
        const my = (mouseRef.current.y - 0.5) * H * 0.03 * (i % 2 === 0 ? 1 : -1);
        const g  = ctx.createRadialGradient(ox + mx, oy + my, 0, ox + mx, oy + my, o.r * W);
        g.addColorStop(0, `hsla(${o.h}, 80%, 75%, 0.18)`);
        g.addColorStop(1, `hsla(${o.h}, 80%, 75%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox + mx, oy + my, o.r * W, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── Particles ──
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      particles.forEach((p) => {
        // parallax offset based on depth + mouse
        const px = p.x + (mx - 0.5) * 30 * p.depth;
        const py = p.y + (my - 0.5) * 20 * p.depth;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.fillStyle   = p.color;

        if (p.shape === 'circle')  { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
        else if (p.shape === 'plus')  drawPlus(ctx, p.size / 2);
        else if (p.shape === 'tooth') drawTooth(ctx, p.size / 2);
        else if (p.shape === 'star')  drawStar(ctx, p.size / 2);
        else if (p.shape === 'ring')  drawRing(ctx, p.size / 2, p.color, p.alpha);

        ctx.restore();

        // Update
        p.x   += p.vx;
        p.y   += p.vy;
        p.rot += p.rotV;
        p.alpha += 0.003 * p.alphaDir;
        if (p.alpha > 0.7 || p.alpha < 0.1) p.alphaDir *= -1;

        // Recycle when off top
        if (p.y < -p.size * 2) {
          p.y     = window.innerHeight + p.size * 2;
          p.x     = Math.random() * window.innerWidth;
          p.alpha = 0.15 + Math.random() * 0.4;
        }
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  );
};

// ── Animated Face ──────────────────────────────────────────────
const AnimatedFace: React.FC<{ state: FaceState }> = ({ state }) => {
  const [blink, setBlink] = useState(false);
  const [shake, setShake] = useState(false);
  const [pupilOffset, setPupilOffset] = useState({ lx: 0, ly: 0, rx: 0, ry: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const blinkRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mouse tracking → move pupils
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();

      const computePupil = (eyeCxSvg: number, eyeCySvg: number) => {
        // Convert SVG eye-centre to screen coords
        const scaleX = rect.width  / 48;
        const scaleY = rect.height / 48;
        const eyeScreenX = rect.left + eyeCxSvg * scaleX;
        const eyeScreenY = rect.top  + eyeCySvg * scaleY;

        const dx = e.clientX - eyeScreenX;
        const dy = e.clientY - eyeScreenY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const maxTravel = 1.6;
        const travel = Math.min(dist / 60, 1);
        return { x: (dx / dist) * travel * maxTravel, y: (dy / dist) * travel * maxTravel };
      };

      const l = computePupil(15, 20);
      const r = computePupil(33, 20);
      setPupilOffset({ lx: l.x, ly: l.y, rx: r.x, ry: r.y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Slow idle blink
  useEffect(() => {
    if (state !== 'idle' && state !== 'typing') return;
    const schedule = () => {
      blinkRef.current = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
        schedule();
      }, 2800 + Math.random() * 1500);
    };
    schedule();
    return () => { if (blinkRef.current) clearTimeout(blinkRef.current); };
  }, [state]);

  // Shake on error
  useEffect(() => {
    if (state === 'error') {
      setShake(true);
      shakeRef.current = setTimeout(() => setShake(false), 600);
    }
    return () => { if (shakeRef.current) clearTimeout(shakeRef.current); };
  }, [state]);

  const faceColor = {
    idle:    '#0d9488',
    typing:  '#0891b2',
    error:   '#ef4444',
    success: '#10b981',
    loading: '#8b5cf6',
  }[state];

  const bgColor = {
    idle:    '#f0fdfa',
    typing:  '#e0f2fe',
    error:   '#fef2f2',
    success: '#ecfdf5',
    loading: '#f5f3ff',
  }[state];

  // Eye socket centres (in SVG units)
  const LEX = 15, LEY = 20;
  const REX = 33, REY = 20;
  const eyeR = 5; // white of eye radius

  // Build one eye (white + iris + pupil that follows mouse, or special states)
  const buildEye = (cx: number, cy: number, px: number, py: number) => {
    if (blink || state === 'success') {
      // Squint line
      return <line x1={cx - 3.5} y1={cy} x2={cx + 3.5} y2={cy} stroke={faceColor} strokeWidth="2.2" strokeLinecap="round" />;
    }
    if (state === 'loading') {
      return (
        <g>
          <circle cx={cx} cy={cy} r={eyeR} fill="white" stroke={faceColor} strokeWidth="1.2" />
          <ellipse cx={cx} cy={cy} rx="2" ry="3" fill={faceColor}>
            <animateTransform attributeName="transform" type="rotate"
              from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="1s" repeatCount="indefinite" />
          </ellipse>
        </g>
      );
    }
    return (
      <g>
        {/* White of eye */}
        <circle cx={cx} cy={cy} r={eyeR} fill="white" stroke={faceColor} strokeWidth="1.2" />
        {/* Iris */}
        <circle cx={cx + px} cy={cy + py} r="2.8" fill={faceColor} />
        {/* Pupil */}
        <circle cx={cx + px * 1.1} cy={cy + py * 1.1} r="1.4" fill="#0f172a" />
        {/* Glint */}
        <circle cx={cx + px + 0.8} cy={cy + py - 0.8} r="0.6" fill="white" opacity="0.9" />
      </g>
    );
  };

  // Mouth path
  const mouthPath = {
    idle:    'M 14 33 Q 24 40 34 33',
    typing:  'M 16 34 Q 24 38 32 34',
    error:   'M 14 38 Q 24 30 34 38',
    success: 'M 12 31 Q 24 44 36 31',
    loading: 'M 16 34 Q 24 34 32 34',
  }[state];

  // Eyebrows
  const leftBrow = state === 'error'
    ? <path d="M 9 13 Q 15 10 19 13" stroke={faceColor} strokeWidth="2" fill="none" strokeLinecap="round" />
    : state === 'typing'
    ? <path d="M 9 12 Q 15 9 19 12" stroke={faceColor} strokeWidth="2" fill="none" strokeLinecap="round" />
    : state === 'success'
    ? <path d="M 9 11 Q 15 8 19 11" stroke={faceColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    : null;

  const rightBrow = state === 'error'
    ? <path d="M 29 13 Q 33 10 39 13" stroke={faceColor} strokeWidth="2" fill="none" strokeLinecap="round" />
    : state === 'typing'
    ? <path d="M 29 10 Q 33 8 39 12" stroke={faceColor} strokeWidth="2" fill="none" strokeLinecap="round" />
    : state === 'success'
    ? <path d="M 29 11 Q 33 8 39 11" stroke={faceColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    : null;

  // Cheek blush for success
  const blush = state === 'success' ? (
    <>
      <ellipse cx="11" cy="30" rx="5" ry="3" fill="#fb7185" opacity="0.35" />
      <ellipse cx="37" cy="30" rx="5" ry="3" fill="#fb7185" opacity="0.35" />
    </>
  ) : null;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 72, height: 72, borderRadius: '50%',
        background: bgColor,
        animation: shake ? 'faceShake 0.6s ease' : undefined,
        transition: 'background 0.4s ease',
        boxShadow: `0 0 0 3px ${faceColor}22`,
      }}
    >
      <style>{`
        @keyframes faceShake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-6px) rotate(-4deg); }
          30%      { transform: translateX(6px)  rotate(4deg); }
          45%      { transform: translateX(-5px) rotate(-3deg); }
          60%      { transform: translateX(5px)  rotate(3deg); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
      `}</style>
      <svg
        ref={svgRef}
        viewBox="0 0 48 48"
        width={54} height={54}
        style={{ overflow: 'visible' }}
      >
        {/* Face circle */}
        <circle cx="24" cy="24" r="23" fill={bgColor} stroke={faceColor} strokeWidth="1.8" />
        {blush}
        {leftBrow}
        {rightBrow}
        {/* Eyes with tracking pupils */}
        {buildEye(LEX, LEY, pupilOffset.lx, pupilOffset.ly)}
        {buildEye(REX, REY, pupilOffset.rx, pupilOffset.ry)}
        {/* Mouth */}
        <path
          d={mouthPath}
          stroke={faceColor} strokeWidth="2.5" fill="none" strokeLinecap="round"
        />
        {/* Teeth for success */}
        {state === 'success' && (
          <path d="M 15 34 Q 24 42 33 34 L 33 37 Q 24 44 15 37 Z" fill="white" opacity="0.8" />
        )}
      </svg>
    </div>
  );
};


export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, isLoading, error, clearError } = useAuth();

  const verified = searchParams.get('verified');
  const resetToken = searchParams.get('token');
  const initialMode: Mode = resetToken ? 'reset' : searchParams.get('signup') === '1' ? 'signup' : 'login';

  const [mode, setMode] = useState<Mode>(initialMode);

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Signup-only fields
  const [name, setName] = useState('');
  const [role, setRole] = useState<'doctor' | 'receptionist'>('doctor');

  // Reset-only
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // UI state
  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setLocalError('');
    setSuccessMsg('');
    setUnverifiedEmail('');
    setResendStatus('idle');
    clearError();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');
    setUnverifiedEmail('');
    clearError();

    if (!email || !password) { setLocalError('Email and password are required'); return; }

    try {
      await login(email, password);
      navigate('/appointments');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.toLowerCase().includes('verify your email') || msg.toLowerCase().includes('verify')) {
        setUnverifiedEmail(email);
      } else {
        setLocalError(msg);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');
    clearError();

    if (!name.trim()) { setLocalError('Full name is required'); return; }
    if (!email) { setLocalError('Email is required'); return; }
    if (password.length < 8) { setLocalError('Password must be at least 8 characters'); return; }

    try {
      await register(email, password, name.trim(), role);
      setSuccessMsg(
        `Account created! A verification email has been sent to ${email}. ` +
        `Please check your inbox (and spam folder) and click the link to activate your account.`
      );
      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');
    if (!email) { setLocalError('Email is required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setSuccessMsg(data.message || 'If that email is registered, you will receive a reset link shortly.');
    } catch {
      setLocalError('Failed to send reset email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');
    if (password.length < 6) { setLocalError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setLocalError('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Password reset successfully! You can now sign in with your new password.');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          navigate('/login');
          setMode('login');
          setSuccessMsg('');
        }, 2500);
      } else {
        setLocalError(data.message || 'Failed to reset password');
      }
    } catch {
      setLocalError('Failed to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendStatus !== 'idle') return;
    setResendStatus('sending');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const data = await res.json();
      if (data.success) { setResendStatus('sent'); }
      else { setResendStatus('idle'); setLocalError(data.message || 'Failed to resend verification email'); }
    } catch {
      setResendStatus('idle');
      setLocalError('Failed to resend verification email');
    }
  };

  const displayError = localError || error;
  const isSubmitting = isLoading || submitting;

  // ── Derive face state from UI state ──
  const faceState: FaceState = (() => {
    if (isSubmitting) return 'loading';
    if (successMsg) return 'success';
    if (displayError || unverifiedEmail) return 'error';
    if (email.length > 0 || password.length > 0 || name.length > 0) return 'typing';
    return 'idle';
  })();

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ position: 'relative' }}>
      <LiveBackground />
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-8" style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <AnimatedFace state={faceState} />
          </div>
          <h1 className="text-2xl font-bold text-teal-600 mb-1">Dental Clinic</h1>
          <p className="text-sm text-gray-500">Staff Portal — Clinic Management System</p>
        </div>

        {/* ── Forgot / Reset mode — no tabs ── */}
        {(mode === 'forgot' || mode === 'reset') ? (
          <>
            <button
              onClick={() => switchMode('login')}
              className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 mb-5"
            >
              <ArrowLeft size={15} /> Back to Sign In
            </button>

            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              {mode === 'forgot' ? 'Reset your password' : 'Choose a new password'}
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              {mode === 'forgot'
                ? "Enter your email and we'll send you a reset link."
                : 'Enter your new password below.'}
            </p>
          </>
        ) : (
          /* Mode Tabs */
          <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                mode === 'login' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              New Staff
            </button>
          </div>
        )}

        {/* ── Email verified banner ── */}
        {verified === 'true' && (
          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle size={18} className="text-green-600 mt-0.5 shrink-0" />
            <p className="text-green-700 text-sm font-medium">Email verified! You can now sign in.</p>
          </div>
        )}
        {verified === 'already' && (
          <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <CheckCircle size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <p className="text-blue-700 text-sm font-medium">Your email is already verified. Please sign in.</p>
          </div>
        )}

        {/* ── Unverified email warning ── */}
        {unverifiedEmail && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <Mail size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-amber-800 text-sm font-medium">
                Your email hasn't been verified yet.<br />
                <span className="font-normal">Check your inbox for the link sent to <strong>{unverifiedEmail}</strong>.</span>
              </p>
            </div>
            {resendStatus === 'sent' ? (
              <p className="text-sm text-green-700 font-medium text-center">✓ Verification email resent!</p>
            ) : (
              <button
                onClick={handleResendVerification}
                disabled={resendStatus === 'sending'}
                className="w-full text-sm text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
              >
                {resendStatus === 'sending' ? 'Sending…' : 'Resend verification email'}
              </button>
            )}
          </div>
        )}

        {/* ── Success message ── */}
        {successMsg && (
          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle size={18} className="text-green-600 mt-0.5 shrink-0" />
            <p className="text-green-700 text-sm">{successMsg}</p>
          </div>
        )}

        {/* ── Generic error ── */}
        {displayError && !unverifiedEmail && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm font-medium">{displayError}</p>
          </div>
        )}

        {/* ══ LOGIN FORM ══ */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinic.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                disabled={isSubmitting} autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs text-teal-600 hover:text-teal-800 underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm pr-10"
                  disabled={isSubmitting} autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ══ SIGNUP FORM ══ */}
        {mode === 'signup' && !successMsg && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="s-name" className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                id="s-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Ramya"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                disabled={isSubmitting} autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="s-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinic.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                disabled={isSubmitting} autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="s-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-gray-400 font-normal">(min 8 characters)</span>
              </label>
              <div className="relative">
                <input
                  id="s-password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm pr-10"
                  disabled={isSubmitting} autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="s-role" className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select
                id="s-role" value={role} onChange={(e) => setRole(e.target.value as 'doctor' | 'receptionist')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
                disabled={isSubmitting}
              >
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
              </select>
            </div>
            <button type="submit" disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}

        {/* ══ FORGOT PASSWORD FORM ══ */}
        {mode === 'forgot' && !successMsg && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label htmlFor="fp-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinic.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                disabled={isSubmitting} autoComplete="email"
              />
            </div>
            <button type="submit" disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              {isSubmitting ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {/* ══ RESET PASSWORD FORM ══ */}
        {mode === 'reset' && !successMsg && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="rp-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password <span className="text-gray-400 font-normal">(min 6 characters)</span>
              </label>
              <div className="relative">
                <input
                  id="rp-password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm pr-10"
                  disabled={isSubmitting} autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="rp-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  id="rp-confirm" type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm pr-10"
                  disabled={isSubmitting} autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              {isSubmitting ? 'Resetting…' : 'Set New Password'}
            </button>
          </form>
        )}

        {mode !== 'forgot' && mode !== 'reset' && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 text-center">Private system — authorised staff only.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

