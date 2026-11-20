/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AuthView } from './components/AuthView.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { ExamSession } from './components/ExamSession.tsx';
import { InstructorPortal } from './components/InstructorPortal.tsx';
import { PublicSite } from './components/PublicSite.tsx';
import { StudentPortal } from './components/StudentPortal.tsx';
import { apiFetch, getStoredToken, setStoredToken } from './lib/api.ts';
import type { Exam, User } from './types.ts';

type AppView = 'public' | 'auth' | 'portal' | 'exam';

export default function App() {
  const [view, setView] = useState<AppView>('public');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [booting, setBooting] = useState(true);
  const [portalRefreshKey, setPortalRefreshKey] = useState(0);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setBooting(false);
      return;
    }
    void apiFetch<{ user: User }>('/api/auth/me')
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    setActiveExam(null);
    setView('public');
  };

  const handleStartExam = (exam: Exam) => {
    if (!user) {
      setAuthMode('login');
      setView('auth');
      return;
    }
    setActiveExam(exam);
    setView('exam');
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Loading EduTrack...
      </div>
    );
  }

  if (view === 'exam' && activeExam && user) {
    return (
      <ExamSession
        exam={activeExam}
        onExit={() => {
          setActiveExam(null);
          setView('portal');
        }}
        onCompleted={() => {
          setPortalRefreshKey((k) => k + 1);
        }}
      />
    );
  }

  if (view === 'auth') {
    return (
      <AuthView
        initialMode={authMode}
        onSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setView('portal');
        }}
        onBackHome={() => setView('public')}
      />
    );
  }

  if (view === 'portal' && user) {
    if (user.role === 'admin') {
      return (
        <AdminPortal
          key={portalRefreshKey}
          user={user}
          onGoHome={() => setView('public')}
          onLogout={handleLogout}
        />
      );
    }
    if (user.role === 'instructor') {
      return (
        <InstructorPortal
          key={portalRefreshKey}
          user={user}
          onGoHome={() => setView('public')}
          onLogout={handleLogout}
        />
      );
    }
    return (
      <StudentPortal
        key={portalRefreshKey}
        user={user}
        onUserUpdated={setUser}
        onGoHome={() => setView('public')}
        onLogout={handleLogout}
        onStartExam={handleStartExam}
      />
    );
  }

  return (
    <PublicSite
      currentUser={user}
      onOpenAuth={(mode = 'login') => {
        setAuthMode(mode);
        setView('auth');
      }}
      onOpenPortal={() => {
        if (user) setView('portal');
      }}
      onStartExam={handleStartExam}
    />
  );
}
