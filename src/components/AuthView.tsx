import { useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, ShieldCheck, UserPlus } from 'lucide-react';
import { apiFetch, setStoredToken } from '../lib/api.ts';
import type { User } from '../types.ts';

interface AuthViewProps {
  initialMode?: 'login' | 'register' | 'forgot';
  onSuccess: (user: User) => void;
  onBackHome: () => void;
}

export function AuthView({
  initialMode = 'login',
  onSuccess,
  onBackHome,
}: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setMode('login');
    setError(null);
    setInfoMessage(null);
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setStoredToken(res.token);
        onSuccess(res.user);
      } else if (mode === 'register') {
        const res = await apiFetch<{ token: string; user: User }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password, institution, phone }),
        });
        setStoredToken(res.token);
        onSuccess(res.user);
      } else {
        const res = await apiFetch<{ ok: boolean; message: string }>(
          '/api/auth/forgot-password',
          {
            method: 'POST',
            body: JSON.stringify({ email, newPassword }),
          }
        );
        setInfoMessage(res.message);
        setMode('login');
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to EduTrack Home
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Form Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {mode === 'login' && 'Sign in to EduTrack'}
                  {mode === 'register' && 'Create a Student Account'}
                  {mode === 'forgot' && 'Reset Account Password'}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  {mode === 'login' && 'Access your enrolled programs, examinations, and analytics.'}
                  {mode === 'register' && 'Free lifetime access to all learning programs and exams.'}
                  {mode === 'forgot' && 'Enter your registered email to set a new password.'}
                </p>
              </div>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mt-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Student Registration
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setError(null);
                }}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'forgot'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reset Password
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="mt-5 px-4 py-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="auth-name">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Nadia Karim"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:border-indigo-700"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="auth-email">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@institution.edu"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:border-indigo-700"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="auth-password">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (min 6 characters)"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:border-indigo-700"
                  />
                </div>
              )}

              {mode === 'forgot' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="auth-new-pass">
                    New Password
                  </label>
                  <input
                    id="auth-new-pass"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Choose a new password (min 6 characters)"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:border-indigo-700"
                  />
                </div>
              )}

              {mode === 'register' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="auth-inst">
                      School / University
                    </label>
                    <input
                      id="auth-inst"
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:border-indigo-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="auth-phone">
                      Phone Number
                    </label>
                    <input
                      id="auth-phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:border-indigo-700"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-5 rounded-lg bg-blue-950 hover:bg-blue-900 disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {mode === 'login' && <KeyRound className="w-4 h-4" />}
                {mode === 'register' && <UserPlus className="w-4 h-4" />}
                {mode === 'forgot' && <ShieldCheck className="w-4 h-4" />}
                <span>
                  {loading
                    ? 'Please wait...'
                    : mode === 'login'
                    ? 'Sign In to Dashboard'
                    : mode === 'register'
                    ? 'Create Free Student Account'
                    : 'Update Password'}
                </span>
              </button>
            </form>
          </div>

          {/* Right Demo Credentials Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Demonstration Accounts
              </h2>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Select any seeded academic role below to inspect the Student, Instructor, or Administrator workspace immediately, or register your own new student account.
              </p>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => fillDemo('student@edutrack.edu', 'Student123!')}
                  className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-indigo-700 hover:bg-indigo-50/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Student Portal</span>
                    <span className="text-xs font-mono-tabular text-indigo-800">Fill Credentials</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Nadia Karim · student@edutrack.edu · Student123!
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemo('instructor@edutrack.edu', 'Instructor123!')}
                  className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-indigo-700 hover:bg-indigo-50/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Instructor Portal</span>
                    <span className="text-xs font-mono-tabular text-indigo-800">Fill Credentials</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Prof. Elena Rostova · instructor@edutrack.edu · Instructor123!
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemo('admin@edutrack.edu', 'Admin123!')}
                  className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-indigo-700 hover:bg-indigo-50/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Administrator Portal</span>
                    <span className="text-xs font-mono-tabular text-indigo-800">Fill Credentials</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Dr. Marcus Vance · admin@edutrack.edu · Admin123!
                  </p>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-200 text-xs text-slate-500">
              Passwords are salted and hashed server-side using scrypt. Examination answer keys remain protected until final submission.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
