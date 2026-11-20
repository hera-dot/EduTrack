import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Trophy,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import type {
  Achievement,
  Announcement,
  Category,
  Certificate,
  Course,
  Enrollment,
  Exam,
  ExamAttempt,
  Lesson,
  LessonProgress,
  NotificationItem,
  Program,
  Question,
  Result,
  StudentAnalytics,
  StudentAnswer,
  User,
} from '../types.ts';
import { PerformanceLineChart, SubjectBarChart } from './AnalyticsChart.tsx';
import { ProgramCoverArt } from './BrandVisuals.tsx';

type StudentTab =
  | 'overview'
  | 'programs'
  | 'my-programs'
  | 'lesson-viewer'
  | 'exams'
  | 'results'
  | 'analytics'
  | 'achievements'
  | 'certificates'
  | 'notifications'
  | 'profile';

interface EnrichedProgram extends Program {
  instructorName: string;
}

interface StudentDashboardData {
  categories: Category[];
  programs: EnrichedProgram[];
  courses: Course[];
  lessons: Lesson[];
  enrollments: Enrollment[];
  lessonProgress: LessonProgress[];
  exams: Exam[];
  attempts: ExamAttempt[];
  results: Result[];
  notifications: NotificationItem[];
  announcements: Announcement[];
  certificates: Certificate[];
  achievements: Achievement[];
  analytics: StudentAnalytics;
}

interface ReviewPayload {
  exam: Exam;
  attempt: ExamAttempt;
  result: Result;
  items: {
    question: Question;
    answer: StudentAnswer | null;
  }[];
}

interface StudentPortalProps {
  user: User;
  onUserUpdated: (user: User) => void;
  onGoHome: () => void;
  onLogout: () => void;
  onStartExam: (exam: Exam) => void;
}

export function StudentPortal({
  user,
  onUserUpdated,
  onGoHome,
  onLogout,
  onStartExam,
}: StudentPortalProps) {
  const [tab, setTab] = useState<StudentTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);

  // Course / Lesson Viewer state
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  // Exam filters
  const [examModeFilter, setExamModeFilter] = useState<'all' | 'practice' | 'scheduled'>('all');
  const [examCatFilter, setExamCatFilter] = useState<string>('all');

  // Result Detail Modal
  const [reviewDetail, setReviewDetail] = useState<ReviewPayload | null>(null);

  // Certificate Modal
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  // Profile Form
  const [pName, setPName] = useState(user.name);
  const [pPhone, setPPhone] = useState(user.phone);
  const [pInstitution, setPInstitution] = useState(user.institution);
  const [pBio, setPBio] = useState(user.bio);
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const payload = await apiFetch<StudentDashboardData>('/api/student/dashboard');
      setData(payload);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const enrolledIds = useMemo(
    () => new Set((data?.enrollments || []).map((e) => e.programId)),
    [data]
  );
  const completedLessonIds = useMemo(
    () => new Set((data?.lessonProgress || []).map((lp) => lp.lessonId)),
    [data]
  );
  const unreadNotifCount = useMemo(
    () => (data?.notifications || []).filter((n) => !n.read).length,
    [data]
  );

  const getCategoryName = (catId: string) =>
    data?.categories.find((c) => c.id === catId)?.name || 'General';

  const handleEnroll = async (programId: string) => {
    setBanner(null);
    try {
      await apiFetch('/api/student/enroll', {
        method: 'POST',
        body: JSON.stringify({ programId }),
      });
      await loadDashboard();
      setBanner('Enrolled in program. You can now open its modules and lessons.');
    } catch (err) {
      setBanner(err instanceof Error ? err.message : 'Unable to enroll.');
    }
  };

  const openProgramReader = (programId: string) => {
    setActiveProgramId(programId);
    const progCourses = (data?.courses || [])
      .filter((c) => c.programId === programId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const firstCourse = progCourses[0];
    const firstLesson = firstCourse
      ? (data?.lessons || [])
          .filter((l) => l.courseId === firstCourse.id)
          .sort((a, b) => a.orderIndex - b.orderIndex)[0]
      : undefined;
    setActiveLessonId(firstLesson?.id || null);
    setTab('lesson-viewer');
  };

  const handleCompleteLesson = async (lessonId: string) => {
    try {
      await apiFetch(`/api/student/lessons/${lessonId}/complete`, { method: 'POST' });
      await loadDashboard();
      setBanner('Lesson marked completed. Learning progress updated.');
    } catch (err) {
      setBanner(err instanceof Error ? err.message : 'Could not record completion.');
    }
  };

  const openAttemptReview = async (attemptId: string) => {
    try {
      const rev = await apiFetch<ReviewPayload>(`/api/attempts/${attemptId}/review`);
      setReviewDetail(rev);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : 'Review is not available yet.');
    }
  };

  const markNotificationsRead = async (notificationId?: string) => {
    await apiFetch('/api/student/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notificationId }),
    });
    await loadDashboard();
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      const res = await apiFetch<{ user: User }>('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: pName,
          phone: pPhone,
          institution: pInstitution,
          bio: pBio,
          currentPassword: curPass || undefined,
          newPassword: newPass || undefined,
        }),
      });
      onUserUpdated(res.user);
      setCurPass('');
      setNewPass('');
      setProfileMsg({ type: 'ok', text: 'Profile and account settings updated.' });
    } catch (err) {
      setProfileMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Could not update profile.',
      });
    }
  };

  const navItems: { id: StudentTab; label: string; icon: typeof LayoutDashboard; count?: number }[] =
    [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'my-programs', label: 'My Courses', icon: BookOpen },
      { id: 'programs', label: 'Browse Programs', icon: ClipboardList },
      { id: 'exams', label: 'Examinations', icon: FileCheck },
      { id: 'results', label: 'Results & History', icon: Award },
      { id: 'analytics', label: 'Learning Analytics', icon: BarChart3 },
      { id: 'achievements', label: 'Achievements', icon: Trophy },
      { id: 'certificates', label: 'Certificates', icon: Award },
      { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadNotifCount },
      { id: 'profile', label: 'Profile & Settings', icon: Settings },
    ];

  const selectTab = (next: StudentTab) => {
    setTab(next);
    setMobileMenuOpen(false);
    setBanner(null);
  };

  const activeProgram = data?.programs.find((p) => p.id === activeProgramId) || null;
  const activeProgramCourses = (data?.courses || [])
    .filter((c) => c.programId === activeProgramId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const activeLesson = (data?.lessons || []).find((l) => l.id === activeLessonId) || null;
  const activeProgramExams = (data?.exams || []).filter((e) => e.programId === activeProgramId);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-slate-200 flex-col justify-between">
        <div>
          <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onGoHome}
              className="text-lg font-extrabold tracking-tight text-blue-950 font-display"
            >
              EduTrack
            </button>
            <span className="text-xs text-slate-500">Student</span>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id || (tab === 'lesson-viewer' && item.id === 'my-programs');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-950 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`text-xs font-mono-tabular px-1.5 py-0.5 rounded ${
                        active ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={onGoHome}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            <Home className="w-4 h-4" />
            Public Website
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-full bg-white h-full border-r border-slate-200 flex flex-col justify-between p-4 z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <span className="text-lg font-bold text-blue-950">EduTrack</span>
                <button type="button" onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                        tab === item.id ? 'bg-blue-950 text-white' : 'text-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-700"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-slate-500 truncate">
              Student Workspace / <span className="text-slate-900 font-semibold">{user.name}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => selectTab('exams')}
            className="px-4 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-xs font-medium whitespace-nowrap shrink-0"
          >
            Take an Exam
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {banner && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center justify-between gap-4">
              <span>{banner}</span>
              <button
                type="button"
                onClick={() => setBanner(null)}
                className="text-xs font-semibold underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {loading || !data ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500">
              Loading your academic workspace...
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {tab === 'overview' && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      Welcome back, {user.name}
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Learning progress and examination performance are tracked independently below.
                    </p>
                  </div>

                  {/* 4-column primary KPIs */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs text-slate-500">Enrolled Programs</p>
                      <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-1">
                        {data.analytics.totalEnrolledPrograms}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {data.analytics.completedPrograms} completed
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs text-slate-500">Learning Progress</p>
                      <p className="text-2xl font-bold font-mono-tabular text-indigo-800 mt-1">
                        {data.analytics.overallLearningProgress}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {data.analytics.completedLessonsCount} /{' '}
                        {data.analytics.totalAssignedLessonsCount} lessons
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs text-slate-500">Average Exam Score</p>
                      <p className="text-2xl font-bold font-mono-tabular text-blue-950 mt-1">
                        {data.analytics.averageScore}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {data.analytics.completedExams} exam(s) completed
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs text-slate-500">MCQ Accuracy</p>
                      <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-1">
                        {data.analytics.mcqAccuracy}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {data.analytics.totalLearningActivities} total activities
                      </p>
                    </div>
                  </div>

                  {/* Active Courses + Announcements */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-slate-900">
                          Continue Studying
                        </h2>
                        <button
                          type="button"
                          onClick={() => selectTab('my-programs')}
                          className="text-xs font-medium text-blue-950 hover:underline"
                        >
                          View all courses
                        </button>
                      </div>

                      {data.enrollments.length === 0 ? (
                        <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg">
                          <p className="text-sm text-slate-600">
                            You have not enrolled in any program yet.
                          </p>
                          <button
                            type="button"
                            onClick={() => selectTab('programs')}
                            className="mt-3 px-4 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium"
                          >
                            Browse Free Programs
                          </button>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200">
                          {data.enrollments.map((enr) => {
                            const prog = data.programs.find((p) => p.id === enr.programId);
                            if (!prog) return null;
                            const progCourses = data.courses.filter((c) => c.programId === prog.id);
                            const cIds = new Set(progCourses.map((c) => c.id));
                            const progLessons = data.lessons.filter((l) => cIds.has(l.courseId));
                            const doneCount = progLessons.filter((l) =>
                              completedLessonIds.has(l.id)
                            ).length;
                            const pct =
                              progLessons.length > 0
                                ? Math.round((doneCount / progLessons.length) * 100)
                                : 0;

                            return (
                              <div
                                key={enr.id}
                                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {prog.title}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <div className="w-36 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-indigo-700"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-mono-tabular text-slate-600">
                                      {doneCount}/{progLessons.length} lessons ({pct}%)
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openProgramReader(prog.id)}
                                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 shrink-0"
                                >
                                  Open Lessons
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-slate-900 mb-4">
                        Platform Announcements
                      </h2>
                      <div className="divide-y divide-slate-200">
                        {data.announcements.map((ann) => (
                          <div key={ann.id} className="py-3.5 first:pt-0 last:pb-0">
                            <p className="text-xs text-slate-500">
                              {new Date(ann.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-sm font-semibold text-slate-900 mt-0.5">
                              {ann.title}
                            </p>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              {ann.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MY ENROLLED PROGRAMS */}
              {tab === 'my-programs' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">My Enrolled Courses</h1>
                      <p className="text-sm text-slate-600 mt-1">
                        Open any enrolled program to study its lessons and take the final examination.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectTab('programs')}
                      className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Browse Catalog
                    </button>
                  </div>

                  {data.enrollments.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                      <p className="text-slate-600 text-sm">No enrollments yet.</p>
                      <button
                        type="button"
                        onClick={() => selectTab('programs')}
                        className="mt-4 px-5 py-2.5 rounded-lg bg-blue-950 text-white text-sm font-medium"
                      >
                        Explore Free Programs
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {data.enrollments.map((enr) => {
                        const prog = data.programs.find((p) => p.id === enr.programId);
                        if (!prog) return null;
                        const progCourses = data.courses.filter((c) => c.programId === prog.id);
                        const cIds = new Set(progCourses.map((c) => c.id));
                        const progLessons = data.lessons.filter((l) => cIds.has(l.courseId));
                        const doneCount = progLessons.filter((l) =>
                          completedLessonIds.has(l.id)
                        ).length;
                        return (
                          <div
                            key={enr.id}
                            className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
                          >
                            <div>
                              <ProgramCoverArt coverKey={prog.coverKey} title={prog.title} />
                              <div className="p-5">
                                <p className="text-xs text-slate-500">
                                  {getCategoryName(prog.categoryId)} ·{' '}
                                  {enr.completedAt ? 'Completed' : 'In Progress'}
                                </p>
                                <h2 className="text-lg font-semibold text-slate-900 mt-1">
                                  {prog.title}
                                </h2>
                                <p className="text-sm text-slate-600 mt-1.5">
                                  {doneCount} of {progLessons.length} lessons completed
                                </p>
                              </div>
                            </div>
                            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-xs text-slate-500">
                                Instructor: {prog.instructorName}
                              </span>
                              <button
                                type="button"
                                onClick={() => openProgramReader(prog.id)}
                                className="px-4 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-xs font-medium"
                              >
                                Study Lessons
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* LESSON READER VIEW */}
              {tab === 'lesson-viewer' && activeProgram && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <button
                        type="button"
                        onClick={() => selectTab('my-programs')}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900 mb-1"
                      >
                        ← Back to My Courses
                      </button>
                      <h1 className="text-2xl font-bold text-slate-900">{activeProgram.title}</h1>
                    </div>

                    {activeProgramExams.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onStartExam(activeProgramExams[0])}
                        className="px-4 py-2 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white text-xs font-medium"
                      >
                        Attempt Program Assessment
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Syllabus Sidebar */}
                    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                      {activeProgramCourses.map((course) => {
                        const courseLessons = data.lessons
                          .filter((l) => l.courseId === course.id)
                          .sort((a, b) => a.orderIndex - b.orderIndex);
                        return (
                          <div key={course.id}>
                            <h2 className="text-xs font-semibold text-slate-900 px-2 pb-1.5">
                              {course.title}
                            </h2>
                            <div className="space-y-1">
                              {courseLessons.map((les) => {
                                const done = completedLessonIds.has(les.id);
                                const isActive = les.id === activeLessonId;
                                return (
                                  <button
                                    key={les.id}
                                    type="button"
                                    onClick={() => setActiveLessonId(les.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${
                                      isActive
                                        ? 'bg-blue-950 text-white font-medium'
                                        : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span className="truncate">{les.title}</span>
                                    {done && (
                                      <CheckCircle2
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          isActive ? 'text-emerald-300' : 'text-emerald-600'
                                        }`}
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Right Lesson Content */}
                    <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                      {activeLesson ? (
                        <div>
                          <p className="text-xs text-slate-500">
                            {activeLesson.resourceType} · {activeLesson.durationMinutes} min read
                          </p>
                          <h2 className="text-xl font-bold text-slate-900 mt-1">
                            {activeLesson.title}
                          </h2>
                          {activeLesson.summary && (
                            <p className="text-sm text-slate-600 mt-2 pb-4 border-b border-slate-200">
                              {activeLesson.summary}
                            </p>
                          )}

                          <div className="mt-5 text-sm sm:text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
                            {activeLesson.content}
                          </div>

                          <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between">
                            {completedLessonIds.has(activeLesson.id) ? (
                              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                                <CheckCircle2 className="w-4 h-4" />
                                Lesson Completed
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCompleteLesson(activeLesson.id)}
                                className="px-5 py-2.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-sm font-medium"
                              >
                                Mark Lesson as Completed
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Select a lesson from the module list to begin reading.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BROWSE PROGRAMS */}
              {tab === 'programs' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Browse Free Programs</h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Enroll in any program to unlock structured lessons and earn a completion certificate.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.programs.map((prog) => {
                      const isEnrolled = enrolledIds.has(prog.id);
                      return (
                        <div
                          key={prog.id}
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
                        >
                          <div>
                            <ProgramCoverArt coverKey={prog.coverKey} title={prog.title} />
                            <div className="p-5">
                              <p className="text-xs text-slate-500">
                                {getCategoryName(prog.categoryId)} · {prog.level} ·{' '}
                                {prog.durationLabel}
                              </p>
                              <h2 className="text-base font-semibold text-slate-900 mt-1">
                                {prog.title}
                              </h2>
                              <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                                {prog.description}
                              </p>
                            </div>
                          </div>
                          <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">{prog.instructorName}</span>
                            {isEnrolled ? (
                              <button
                                type="button"
                                onClick={() => openProgramReader(prog.id)}
                                className="px-3.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-900 text-xs font-medium"
                              >
                                Open Course
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleEnroll(prog.id)}
                                className="px-4 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-xs font-medium"
                              >
                                Enroll Free
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EXAMINATIONS & PRACTICE QUIZZES */}
              {tab === 'exams' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">
                        Online Examinations & Practice Quizzes
                      </h1>
                      <p className="text-sm text-slate-600 mt-1">
                        Participate in standalone quizzes or scheduled program assessments.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={examCatFilter}
                        onChange={(e) => setExamCatFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                      >
                        <option value="all">All Subjects</option>
                        {data.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex p-1 bg-slate-100 rounded-lg">
                        {(['all', 'practice', 'scheduled'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setExamModeFilter(m)}
                            className={`px-3 py-1 text-xs font-medium rounded-md ${
                              examModeFilter === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                            }`}
                          >
                            {m === 'all' ? 'All' : m === 'practice' ? 'Practice' : 'Scheduled'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-xl">
                    {data.exams
                      .filter((e) => examCatFilter === 'all' || e.categoryId === examCatFilter)
                      .filter((e) => examModeFilter === 'all' || e.mode === examModeFilter)
                      .map((exam) => {
                        const myResults = data.results.filter((r) => r.examId === exam.id);
                        const latest = myResults[myResults.length - 1];
                        return (
                          <div
                            key={exam.id}
                            className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div>
                              <p className="text-xs text-slate-500">
                                {getCategoryName(exam.categoryId)} ·{' '}
                                {exam.mode === 'practice' ? 'Practice Quiz' : 'Scheduled Exam'} ·{' '}
                                {exam.durationMinutes} min · {exam.totalMarks} Marks
                                {exam.negativeMarking > 0
                                  ? ` · -${exam.negativeMarking} negative`
                                  : ''}
                              </p>
                              <h2 className="text-base font-semibold text-slate-900 mt-1">
                                {exam.title}
                              </h2>
                              <p className="text-sm text-slate-600 mt-1">{exam.description}</p>
                              {latest && (
                                <p className="text-xs font-mono-tabular text-indigo-800 mt-1.5">
                                  Previous attempt: {latest.obtainedMarks}/{latest.totalMarks} (
                                  {latest.percentage}%)
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => onStartExam(exam)}
                              className="px-5 py-2.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-xs font-medium whitespace-nowrap shrink-0"
                            >
                              Start Examination
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* RESULTS & HISTORY */}
              {tab === 'results' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      My Results & Examination History
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Inspect final scores, pass/fail outcomes, and detailed instructor feedback.
                    </p>
                  </div>

                  {data.results.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                      You have not submitted any examinations yet.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                            <th className="py-3 px-4 font-medium">Examination</th>
                            <th className="py-3 px-4 font-medium">Date</th>
                            <th className="py-3 px-4 font-medium text-right">Marks</th>
                            <th className="py-3 px-4 font-medium text-right">Percentage</th>
                            <th className="py-3 px-4 font-medium">Status</th>
                            <th className="py-3 px-4 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                          {data.results
                            .slice()
                            .reverse()
                            .map((r) => {
                              const exam = data.exams.find((e) => e.id === r.examId);
                              return (
                                <tr key={r.id} className="hover:bg-slate-50">
                                  <td className="py-3.5 px-4 font-medium text-slate-900">
                                    {exam?.title || 'Examination'}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-600 font-mono-tabular text-xs">
                                    {new Date(r.evaluatedAt).toLocaleDateString()}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono-tabular text-slate-900">
                                    {r.obtainedMarks} / {r.totalMarks}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-slate-900">
                                    {r.percentage}%
                                  </td>
                                  <td className="py-3.5 px-4 text-xs">
                                    {r.pendingWrittenCount > 0 ? (
                                      <span className="text-amber-700 font-medium">
                                        Pending Review ({r.pendingWrittenCount})
                                      </span>
                                    ) : r.passed ? (
                                      <span className="text-emerald-700 font-medium">Passed</span>
                                    ) : (
                                      <span className="text-red-700 font-medium">Did Not Pass</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() => openAttemptReview(r.attemptId)}
                                      className="text-xs font-semibold text-blue-950 hover:underline"
                                    >
                                      Review Answers
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* LEARNING ANALYTICS */}
              {tab === 'analytics' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      Performance & Learning Analytics
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Separate tracking of lesson completion progress, MCQ accuracy, and subject-level mastery.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-slate-900 mb-4">
                        Performance Over Time
                      </h2>
                      <PerformanceLineChart data={data.analytics.performanceOverTime} />
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-slate-900 mb-4">
                        Subject-wise Average Score
                      </h2>
                      <SubjectBarChart
                        data={data.analytics.subjectPerformance.map((s) => ({
                          label: s.categoryName,
                          value: s.averagePercentage,
                        }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-slate-900 mb-4">
                        Strength & Weakness Analysis
                      </h2>
                      {data.analytics.subjectPerformance.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Complete graded examinations across subjects to classify strengths and gaps.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-200">
                          {data.analytics.subjectPerformance.map((s) => (
                            <div
                              key={s.categoryId}
                              className="py-3.5 flex items-center justify-between gap-4"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {s.categoryName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {s.attemptsCount} evaluated assessment(s)
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-mono-tabular font-bold text-slate-900">
                                  {s.averagePercentage}%
                                </p>
                                <p
                                  className={`text-xs font-medium ${
                                    s.classification === 'Strength'
                                      ? 'text-emerald-700'
                                      : s.classification === 'Developing'
                                      ? 'text-indigo-700'
                                      : 'text-amber-700'
                                  }`}
                                >
                                  {s.classification}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-slate-900 mb-4">
                        Recommended Practice
                      </h2>
                      <div className="space-y-3">
                        {data.analytics.recommendedExams.map((exam) => (
                          <div
                            key={exam.id}
                            className="p-4 rounded-lg border border-slate-200 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs text-slate-500">
                                {getCategoryName(exam.categoryId)}
                              </p>
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {exam.title}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onStartExam(exam)}
                              className="px-3 py-1.5 rounded-lg bg-blue-950 text-white text-xs font-medium shrink-0"
                            >
                              Practice
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ACHIEVEMENTS */}
              {tab === 'achievements' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Academic Achievements</h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Milestones earned automatically from program enrollments, lessons, and exam performance.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.achievements.map((ach) => (
                      <div
                        key={ach.id}
                        className={`p-5 rounded-xl border ${
                          ach.earnedAt
                            ? 'bg-white border-indigo-200'
                            : 'bg-slate-50 border-slate-200 opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h2 className="text-base font-semibold text-slate-900">{ach.title}</h2>
                          <span
                            className={`text-xs font-medium ${
                              ach.earnedAt ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                          >
                            {ach.earnedAt
                              ? `Earned ${new Date(ach.earnedAt).toLocaleDateString()}`
                              : 'Locked'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1.5">{ach.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CERTIFICATES */}
              {tab === 'certificates' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Certificates</h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Issued automatically once you complete every lesson in an enrolled program.
                    </p>
                  </div>

                  {data.certificates.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                      Complete all lessons in any enrolled program to unlock your certificate.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {data.certificates.map((cert) => (
                        <div
                          key={cert.id}
                          className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
                        >
                          <div>
                            <p className="text-xs font-mono-tabular text-indigo-800">
                              Verification Code: {cert.certificateCode}
                            </p>
                            <h2 className="text-lg font-bold text-slate-900 mt-2">
                              {cert.programTitle}
                            </h2>
                            <p className="text-sm text-slate-600 mt-1">
                              Awarded to {cert.studentName} on{' '}
                              {new Date(cert.issuedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewCert(cert)}
                            className="mt-5 px-4 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium self-start"
                          >
                            View Certificate
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* NOTIFICATIONS */}
              {tab === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
                    {unreadNotifCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markNotificationsRead()}
                        className="text-xs font-medium text-blue-950 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                    {data.notifications.length === 0 ? (
                      <p className="p-6 text-sm text-slate-500">No notifications yet.</p>
                    ) : (
                      data.notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-5 flex items-start justify-between gap-4 ${
                            n.read ? 'bg-white' : 'bg-indigo-50/40'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                            <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                            <p className="text-xs text-slate-400 mt-1.5">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {!n.read && (
                            <button
                              type="button"
                              onClick={() => markNotificationsRead(n.id)}
                              className="text-xs font-medium text-indigo-800 hover:underline shrink-0"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* PROFILE & SETTINGS */}
              {tab === 'profile' && (
                <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                  <h1 className="text-2xl font-bold text-slate-900">Profile & Account Settings</h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Update your academic profile details or change your password.
                  </p>

                  {profileMsg && (
                    <div
                      className={`mt-5 px-4 py-3 rounded-lg border text-sm ${
                        profileMsg.type === 'ok'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-red-50 border-red-200 text-red-900'
                      }`}
                    >
                      {profileMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleProfileSave} className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={pPhone}
                          onChange={(e) => setPPhone(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Institution
                        </label>
                        <input
                          type="text"
                          value={pInstitution}
                          onChange={(e) => setPInstitution(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                      <textarea
                        rows={3}
                        value={pBio}
                        onChange={(e) => setPBio(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <h2 className="text-sm font-semibold text-slate-900 mb-3">
                        Change Password (Optional)
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          type="password"
                          placeholder="Current password"
                          value={curPass}
                          onChange={(e) => setCurPass(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                        />
                        <input
                          type="password"
                          placeholder="New password (min 6 chars)"
                          value={newPass}
                          onChange={(e) => setNewPass(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-sm font-medium"
                    >
                      Save Changes
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Review Modal */}
      {reviewDetail && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{reviewDetail.exam.title}</h2>
                <p className="text-xs font-mono-tabular text-slate-600 mt-1">
                  Score: {reviewDetail.result.obtainedMarks} / {reviewDetail.result.totalMarks} (
                  {reviewDetail.result.percentage}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewDetail(null)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {reviewDetail.items.map(({ question, answer }, i) => (
                <div key={question.id} className="pb-5 border-b border-slate-100 last:border-b-0">
                  <div className="flex justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Q{i + 1}. {question.prompt}
                    </p>
                    <span className="text-xs font-mono-tabular text-slate-600 shrink-0">
                      {answer?.awardedMarks ?? 'Pending'} / {question.marks}
                    </span>
                  </div>
                  {question.type === 'mcq' ? (
                    <div className="mt-2 space-y-1.5 text-xs">
                      {question.options.map((o) => {
                        const chosen = answer?.selectedOptionId === o.id;
                        const correct = question.correctOptionId === o.id;
                        return (
                          <div
                            key={o.id}
                            className={`px-3 py-1.5 rounded border ${
                              correct
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                : chosen
                                ? 'border-red-300 bg-red-50 text-red-900'
                                : 'border-slate-200 text-slate-600'
                            }`}
                          >
                            {o.text} {correct ? '(Correct)' : chosen ? '(Your choice)' : ''}
                          </div>
                        );
                      })}
                      {question.explanation && (
                        <p className="text-slate-600 pt-1">Note: {question.explanation}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2 text-xs">
                      <div className="p-3 rounded bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap">
                        {answer?.writtenText || 'No response submitted.'}
                      </div>
                      {answer?.feedback && (
                        <p className="text-indigo-900 font-medium">
                          Instructor Feedback: {answer.feedback}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {previewCert && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-8 text-center">
            <div className="border-2 border-blue-950 rounded-lg p-8">
              <p className="text-xs font-semibold tracking-widest uppercase text-indigo-800">
                EduTrack Certificate of Completion
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-4">
                {previewCert.studentName}
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                has successfully completed all prescribed learning modules in
              </p>
              <p className="text-xl font-bold text-blue-950 mt-3">{previewCert.programTitle}</p>
              <div className="mt-8 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                <span>Issued: {new Date(previewCert.issuedAt).toLocaleDateString()}</span>
                <span className="font-mono-tabular">Code: {previewCert.certificateCode}</span>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700"
              >
                Print Certificate
              </button>
              <button
                type="button"
                onClick={() => setPreviewCert(null)}
                className="px-4 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
