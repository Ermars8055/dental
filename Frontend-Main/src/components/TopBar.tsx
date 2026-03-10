import { LogOut, Sun, Moon, Stethoscope } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

export function TopBar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clinicName, setClinicName] = useState<string>(() => {
    return localStorage.getItem('clinicName') || 'Dental Clinic';
  });
  const { user, logout } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiClient.get('/settings')
      .then((res) => {
        if (cancelled) return;
        const name = res?.data?.settings?.clinic_name;
        if (name) {
          setClinicName(name);
          localStorage.setItem('clinicName', name);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const isMorning = currentTime.getHours() < 14;

  // Derive initials from user name
  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className="bg-white border-b border-[var(--color-border)] relative">
      {/* Teal accent line at very top */}
      <div className="h-0.5 bg-gradient-to-r from-[var(--color-accent-teal)] via-teal-400 to-transparent" />

      <div className="flex items-center justify-between px-5 py-3">
        {/* Left — Logo + Clinic name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-teal)] flex items-center justify-center shadow-sm">
            <Stethoscope size={18} strokeWidth={2} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-text-dark)] leading-tight">
              {clinicName}
            </h1>
            <p className="text-xs text-[var(--color-text-dark)]/45 tracking-wide">Staff Portal</p>
          </div>
        </div>

        {/* Right — Date / Time / Shift / User */}
        <div className="flex items-center gap-4 text-sm">
          {/* Date + Time */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-medium text-[var(--color-text-dark)]/70">
              {formatDate(currentTime)}
            </span>
            <span className="font-mono text-tabular text-xs text-[var(--color-text-dark)]/45">
              {formatTime(currentTime)}
            </span>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-8 w-px bg-[var(--color-border)]" />

          {/* Shift badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
            ${isMorning
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}
          >
            {isMorning ? <Sun size={12} strokeWidth={2} /> : <Moon size={12} strokeWidth={2} />}
            {isMorning ? 'Morning' : 'Evening'}
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-[var(--color-border)]" />

          {/* User avatar + name + logout */}
          {user && (
            <div className="flex items-center gap-2.5">
              {/* Avatar circle */}
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent-teal)]/15 border border-[var(--color-accent-teal)]/25 flex items-center justify-center">
                <span className="text-xs font-bold text-[var(--color-accent-teal)]">{initials}</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-[var(--color-text-dark)] leading-tight">{user.name}</div>
                <div className="text-xs text-[var(--color-text-dark)]/45 capitalize">{user.role}</div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="ml-1 p-1.5 rounded-lg text-[var(--color-text-dark)]/40 hover:text-[var(--color-red-critical)] hover:bg-red-50 transition-all duration-150"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
