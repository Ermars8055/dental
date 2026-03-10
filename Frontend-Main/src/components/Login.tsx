import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Smile, CheckCircle, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-12 flex items-center justify-center bg-teal-50 rounded-full">
              <Smile size={32} className="text-teal-600" strokeWidth={1.5} />
            </div>
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

