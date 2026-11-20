import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Database,
  Download,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import type {
  Announcement,
  Category,
  Course,
  Enrollment,
  Exam,
  Lesson,
  PendingReviewItem,
  Program,
  Question,
  Result,
  SystemSettings,
  User,
  UserRole,
} from '../types.ts';
import { SubjectBarChart } from './AnalyticsChart.tsx';

type AdminTab =
  | 'overview'
  | 'users'
  | 'programs'
  | 'assessments'
  | 'results'
  | 'announcements'
  | 'reports'
  | 'settings';

interface AdminWorkspacePayload {
  categories: Category[];
  programs: Program[];
  courses: Course[];
  lessons: Lesson[];
  questions: Question[];
  exams: Exam[];
  enrollments: Enrollment[];
  results: Result[];
  pendingReviews: PendingReviewItem[];
  students: User[];
  instructors: User[];
  users: User[];
  announcements: Announcement[];
  settings: SystemSettings;
  contactSubmissions: {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    createdAt: string;
  }[];
  platformStats: {
    totalStudents: number;
    totalInstructors: number;
    totalPrograms: number;
    totalExams: number;
    totalResults: number;
    pendingEvaluations: number;
    averagePlatformScore: number;
  };
}

interface AdminPortalProps {
  user: User;
  onGoHome: () => void;
  onLogout: () => void;
}

export function AdminPortal({ user, onGoHome, onLogout }: AdminPortalProps) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<AdminWorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [schemaSql, setSchemaSql] = useState<string>('');

  // Create User form
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPass, setUPass] = useState('');
  const [uRole, setURole] = useState<UserRole>('instructor');
  const [uInst, setUInst] = useState('');

  // Create Category & Program forms
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [pTitle, setPTitle] = useState('');
  const [pCatId, setPCatId] = useState('');
  const [pInstId, setPInstId] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pLevel, setPLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [pDur, setPDur] = useState('6 Weeks');

  // Enrollment form
  const [enrStudentId, setEnrStudentId] = useState('');
  const [enrProgramId, setEnrProgramId] = useState('');

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annTarget, setAnnTarget] = useState<'all' | 'student' | 'instructor'>('all');

  // Written Evaluation drafts
  const [evalDrafts, setEvalDrafts] = useState<
    Record<string, { marks: number; feedback: string }>
  >({});

  // Settings form
  const [setName, setSetName] = useState('');
  const [setTagline, setSetTagline] = useState('');
  const [setAllowReg, setSetAllowReg] = useState(true);
  const [setPassPct, setSetPassPct] = useState(60);

  const loadWorkspace = useCallback(async () => {
    try {
      const payload = await apiFetch<AdminWorkspacePayload>('/api/manage/workspace');
      setData(payload);
      setSetName(payload.settings.platformName);
      setSetTagline(payload.settings.tagline);
      setSetAllowReg(payload.settings.allowSelfRegistration);
      setSetPassPct(payload.settings.defaultPassPercentage);

      if (payload.categories.length > 0 && !pCatId) setPCatId(payload.categories[0].id);
      if (payload.instructors.length > 0 && !pInstId) setPInstId(payload.instructors[0].id);
      if (payload.students.length > 0 && !enrStudentId) setEnrStudentId(payload.students[0].id);
      if (payload.programs.length > 0 && !enrProgramId) setEnrProgramId(payload.programs[0].id);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [pCatId, pInstId, enrStudentId, enrProgramId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const loadSchema = async () => {
    if (schemaSql) return;
    const text = await apiFetch<string>('/api/schema-sql');
    setSchemaSql(text);
  };

  useEffect(() => {
    if (tab === 'reports') {
      void loadSchema();
    }
  }, [tab, loadSchema]);

  const runAction = async (fn: () => Promise<void>, successMessage: string) => {
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(successMessage);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.');
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: uName,
          email: uEmail,
          password: uPass,
          role: uRole,
          institution: uInst,
        }),
      });
      setUName('');
      setUEmail('');
      setUPass('');
      setUInst('');
    }, 'User account created.');
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: catName, description: catDesc }),
      });
      setCatName('');
      setCatDesc('');
    }, 'Category created.');
  };

  const handleCreateProgram = async (e: FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      await apiFetch('/api/admin/programs', {
        method: 'POST',
        body: JSON.stringify({
          title: pTitle,
          categoryId: pCatId,
          instructorId: pInstId,
          description: pDesc,
          level: pLevel,
          durationLabel: pDur,
        }),
      });
      setPTitle('');
      setPDesc('');
    }, 'Program created.');
  };

  const handleCreateEnrollment = async (e: FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      await apiFetch('/api/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify({ studentId: enrStudentId, programId: enrProgramId }),
      });
    }, 'Student enrolled in program.');
  };

  const handleCreateAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      await apiFetch('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ title: annTitle, body: annBody, targetRole: annTarget }),
      });
      setAnnTitle('');
      setAnnBody('');
    }, 'Announcement published.');
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          platformName: setName,
          tagline: setTagline,
          allowSelfRegistration: setAllowReg,
          defaultPassPercentage: setPassPct,
        }),
      });
    }, 'System settings updated.');
  };

  const exportResultsCsv = () => {
    if (!data) return;
    const rows = [
      ['Student Name', 'Student Email', 'Exam Title', 'Obtained Marks', 'Total Marks', 'Percentage', 'Status', 'Evaluated At'],
      ...data.results.map((r) => {
        const stu = data.users.find((u) => u.id === r.studentId);
        const ex = data.exams.find((e) => e.id === r.examId);
        return [
          stu?.name || r.studentId,
          stu?.email || '',
          ex?.title || r.examId,
          String(r.obtainedMarks),
          String(r.totalMarks),
          `${r.percentage}%`,
          r.pendingWrittenCount > 0 ? 'Pending Review' : r.passed ? 'Passed' : 'Failed',
          r.evaluatedAt,
        ];
      }),
    ];
    const csv = rows.map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edutrack-results-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSqlSchema = () => {
    if (!schemaSql) return;
    const blob = new Blob([schemaSql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edutrack.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard; count?: number }[] = [
    { id: 'overview', label: 'Admin Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Students & Instructors', icon: Users },
    { id: 'programs', label: 'Categories & Programs', icon: BookOpen },
    { id: 'assessments', label: 'Questions & Exams', icon: FileText },
    {
      id: 'results',
      label: 'Results & Reviews',
      icon: ClipboardCheck,
      count: data?.pendingReviews.length || 0,
    },
    { id: 'announcements', label: 'Announcements & Inbox', icon: Megaphone },
    { id: 'reports', label: 'Reports & SQL Schema', icon: BarChart3 },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  // Platform category score chart
  const categoryChartData =
    data?.categories.map((cat) => {
      const catExams = new Set(data.exams.filter((e) => e.categoryId === cat.id).map((e) => e.id));
      const catResults = data.results.filter((r) => catExams.has(r.examId) && r.pendingWrittenCount === 0);
      const avg =
        catResults.length > 0
          ? Math.round((catResults.reduce((s, r) => s + r.percentage, 0) / catResults.length) * 10) / 10
          : 0;
      return { label: cat.name, value: avg };
    }) || [];

  return (
    <div className="min-h-screen bg-slate-50 flex">
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
            <span className="text-xs text-slate-500">Admin</span>
          </div>
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setNotice(null);
                    setError(null);
                  }}
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
                        active ? 'bg-indigo-800 text-white' : 'bg-amber-100 text-amber-900'
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

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-64 bg-white h-full border-r border-slate-200 p-4 z-10 flex flex-col justify-between">
            <div>
              <div className="flex justify-between pb-4 border-b border-slate-200">
                <span className="font-bold text-blue-950">EduTrack Admin</span>
                <button type="button" onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                      tab === item.id ? 'bg-blue-950 text-white' : 'text-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-700 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm text-slate-500">
              Administration / <span className="font-semibold text-slate-900">{user.name}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTab('reports')}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            Reports & Schema
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {notice && (
            <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
              {notice}
            </div>
          )}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-900">
              {error}
            </div>
          )}

          {loading || !data ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500">
              Loading administration console...
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Platform Administration</h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Complete governance across student accounts, faculty assignments, examinations, and analytics.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs text-slate-500">Students / Instructors</p>
                      <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-1">
                        {data.platformStats.totalStudents} / {data.platformStats.totalInstructors}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs text-slate-500">Programs / Exams</p>
                      <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-1">
                        {data.platformStats.totalPrograms} / {data.platformStats.totalExams}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs text-slate-500">Recorded Submissions</p>
                      <p className="text-2xl font-bold font-mono-tabular text-blue-950 mt-1">
                        {data.platformStats.totalResults}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs text-slate-500">Pending Written Reviews</p>
                      <p className="text-2xl font-bold font-mono-tabular text-amber-700 mt-1">
                        {data.platformStats.pendingEvaluations}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h2 className="text-base font-semibold text-slate-900 mb-4">
                      Average Examination Score by Category
                    </h2>
                    <SubjectBarChart data={categoryChartData.filter((d) => d.value > 0)} />
                  </div>
                </div>
              )}

              {/* USERS MANAGEMENT */}
              {tab === 'users' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-slate-900">
                    Students & Instructors Management
                  </h1>

                  <form
                    onSubmit={handleCreateUser}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                  >
                    <h2 className="text-base font-semibold text-slate-900">Add New Account</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Full Name"
                        value={uName}
                        onChange={(e) => setUName(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <input
                        type="email"
                        required
                        placeholder="Email"
                        value={uEmail}
                        onChange={(e) => setUEmail(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Initial Password"
                        value={uPass}
                        onChange={(e) => setUPass(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <select
                        value={uRole}
                        onChange={(e) => setURole(e.target.value as UserRole)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        <option value="instructor">Instructor</option>
                        <option value="student">Student</option>
                        <option value="admin">Administrator</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Department / Institution"
                        value={uInst}
                        onChange={(e) => setUInst(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium"
                    >
                      Create User Account
                    </button>
                  </form>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                          <th className="py-3 px-4 font-medium">Name</th>
                          <th className="py-3 px-4 font-medium">Email</th>
                          <th className="py-3 px-4 font-medium">Role</th>
                          <th className="py-3 px-4 font-medium">Status</th>
                          <th className="py-3 px-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {data.users.map((u) => (
                          <tr key={u.id}>
                            <td className="py-3 px-4 font-medium text-slate-900">{u.name}</td>
                            <td className="py-3 px-4 text-slate-600">{u.email}</td>
                            <td className="py-3 px-4 capitalize text-slate-700">{u.role}</td>
                            <td className="py-3 px-4 text-xs">
                              {u.active ? (
                                <span className="text-emerald-700 font-medium">Active</span>
                              ) : (
                                <span className="text-red-700 font-medium">Suspended</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {u.id !== user.id && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    runAction(
                                      () =>
                                        apiFetch(`/api/admin/users/${u.id}`, {
                                          method: 'PATCH',
                                          body: JSON.stringify({ active: !u.active }),
                                        }),
                                      `Updated status for ${u.name}.`
                                    )
                                  }
                                  className="text-xs font-medium text-blue-950 hover:underline"
                                >
                                  {u.active ? 'Suspend' : 'Activate'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CATEGORIES & PROGRAMS */}
              {tab === 'programs' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-slate-900">Categories & Programs</h1>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <form
                      onSubmit={handleCreateCategory}
                      className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                    >
                      <h2 className="text-base font-semibold text-slate-900">Create Category</h2>
                      <input
                        type="text"
                        required
                        placeholder="Category Name"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={catDesc}
                        onChange={(e) => setCatDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium"
                      >
                        Add Category
                      </button>
                    </form>

                    <form
                      onSubmit={handleCreateProgram}
                      className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                    >
                      <h2 className="text-base font-semibold text-slate-900">Create Program</h2>
                      <input
                        type="text"
                        required
                        placeholder="Program Title"
                        value={pTitle}
                        onChange={(e) => setPTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={pCatId}
                          onChange={(e) => setPCatId(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        >
                          {data.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={pInstId}
                          onChange={(e) => setPInstId(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        >
                          {data.instructors.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={pLevel}
                          onChange={(e) =>
                            setPLevel(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')
                          }
                          className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                        <input
                          type="text"
                          value={pDur}
                          onChange={(e) => setPDur(e.target.value)}
                          placeholder="Duration (e.g., 6 Weeks)"
                          className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <textarea
                        rows={2}
                        required
                        placeholder="Program description..."
                        value={pDesc}
                        onChange={(e) => setPDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium"
                      >
                        Create Program
                      </button>
                    </form>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                    {data.programs.map((p) => {
                      const inst = data.instructors.find((i) => i.id === p.instructorId);
                      return (
                        <div key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{p.title}</p>
                            <p className="text-xs text-slate-500">
                              Instructor: {inst?.name || 'Unassigned'} · {p.level} · {p.durationLabel}{' '}
                              · {p.published ? 'Published' : 'Draft'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                runAction(
                                  () =>
                                    apiFetch(`/api/admin/programs/${p.id}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ published: !p.published }),
                                    }),
                                  'Updated program visibility.'
                                )
                              }
                              className="text-xs font-medium text-blue-950 hover:underline"
                            >
                              {p.published ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                runAction(
                                  () => apiFetch(`/api/admin/programs/${p.id}`, { method: 'DELETE' }),
                                  'Program removed.'
                                )
                              }
                              className="text-xs text-red-700 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ASSESSMENTS */}
              {tab === 'assessments' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-slate-900">
                    Question Bank & Examinations Overview
                  </h1>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-slate-900 mb-3">
                        All Examinations ({data.exams.length})
                      </h2>
                      <div className="divide-y divide-slate-200">
                        {data.exams.map((ex) => (
                          <div key={ex.id} className="py-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{ex.title}</p>
                              <p className="text-xs text-slate-500 font-mono-tabular">
                                {ex.mode} · {ex.durationMinutes} min · {ex.totalMarks} marks
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                runAction(
                                  () => apiFetch(`/api/manage/exams/${ex.id}`, { method: 'DELETE' }),
                                  'Exam removed.'
                                )
                              }
                              className="text-xs text-red-700 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-slate-900 mb-3">
                        Question Bank ({data.questions.length})
                      </h2>
                      <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
                        {data.questions.map((q) => (
                          <div key={q.id} className="py-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs text-slate-500">
                                {q.type.toUpperCase()} · {q.difficulty} · {q.marks}m
                              </p>
                              <p className="text-sm text-slate-900 mt-0.5">{q.prompt}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                runAction(
                                  () =>
                                    apiFetch(`/api/manage/questions/${q.id}`, { method: 'DELETE' }),
                                  'Question deleted.'
                                )
                              }
                              className="text-xs text-red-700 hover:underline shrink-0"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ENROLLMENTS, RESULTS & WRITTEN REVIEWS */}
              {tab === 'results' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-slate-900">
                    Enrollments, Results & Written Evaluations
                  </h1>

                  <form
                    onSubmit={handleCreateEnrollment}
                    className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-end gap-3"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Student
                      </label>
                      <select
                        value={enrStudentId}
                        onChange={(e) => setEnrStudentId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        {data.students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Program
                      </label>
                      <select
                        value={enrProgramId}
                        onChange={(e) => setEnrProgramId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        {data.programs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-lg bg-blue-950 text-white text-xs font-medium"
                    >
                      Enroll Student
                    </button>
                  </form>

                  {data.pendingReviews.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-base font-semibold text-slate-900">
                        Pending Written Answer Evaluations
                      </h2>
                      {data.pendingReviews.map((item) => (
                        <div
                          key={item.attempt.id}
                          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {item.exam.title} — {item.student.name}
                          </p>
                          {item.writtenItems.map(({ answer, question }) => {
                            const draft = evalDrafts[answer.id] || {
                              marks: Math.ceil(question.marks * 0.7),
                              feedback: '',
                            };
                            return (
                              <div key={answer.id} className="space-y-2">
                                <p className="text-xs font-medium text-slate-700">{question.prompt}</p>
                                <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-800">
                                  {answer.writtenText}
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  <input
                                    type="number"
                                    min={0}
                                    max={question.marks}
                                    value={draft.marks}
                                    onChange={(e) =>
                                      setEvalDrafts((prev) => ({
                                        ...prev,
                                        [answer.id]: { ...draft, marks: Number(e.target.value) },
                                      }))
                                    }
                                    className="w-28 px-3 py-1.5 rounded border border-slate-300 text-xs font-mono-tabular"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Feedback"
                                    value={draft.feedback}
                                    onChange={(e) =>
                                      setEvalDrafts((prev) => ({
                                        ...prev,
                                        [answer.id]: { ...draft, feedback: e.target.value },
                                      }))
                                    }
                                    className="flex-1 px-3 py-1.5 rounded border border-slate-300 text-xs"
                                  />
                                </div>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() =>
                              runAction(
                                () =>
                                  apiFetch(`/api/manage/reviews/${item.attempt.id}`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                      evaluations: item.writtenItems.map(({ answer, question }) => ({
                                        answerId: answer.id,
                                        awardedMarks:
                                          evalDrafts[answer.id]?.marks ??
                                          Math.ceil(question.marks * 0.7),
                                        feedback: evalDrafts[answer.id]?.feedback ?? '',
                                      })),
                                    }),
                                  }),
                                `Published evaluated result for ${item.student.name}.`
                              )
                            }
                            className="px-4 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium"
                          >
                            Save & Publish Final Result
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                          <th className="py-3 px-4 font-medium">Student</th>
                          <th className="py-3 px-4 font-medium">Exam</th>
                          <th className="py-3 px-4 font-medium text-right">Score</th>
                          <th className="py-3 px-4 font-medium">Publication</th>
                          <th className="py-3 px-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {data.results.map((r) => {
                          const stu = data.students.find((s) => s.id === r.studentId);
                          const ex = data.exams.find((e) => e.id === r.examId);
                          return (
                            <tr key={r.id}>
                              <td className="py-3 px-4 font-medium text-slate-900">
                                {stu?.name || r.studentId}
                              </td>
                              <td className="py-3 px-4 text-slate-600">{ex?.title || r.examId}</td>
                              <td className="py-3 px-4 text-right font-mono-tabular">
                                {r.obtainedMarks}/{r.totalMarks} ({r.percentage}%)
                              </td>
                              <td className="py-3 px-4 text-xs">
                                {r.published ? 'Published' : 'Unpublished'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    runAction(
                                      () =>
                                        apiFetch(`/api/admin/results/${r.id}/publish`, {
                                          method: 'PATCH',
                                          body: JSON.stringify({ published: !r.published }),
                                        }),
                                      'Updated result publication status.'
                                    )
                                  }
                                  className="text-xs font-medium text-blue-950 hover:underline"
                                >
                                  {r.published ? 'Unpublish' : 'Publish'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ANNOUNCEMENTS & CONTACT INBOX */}
              {tab === 'announcements' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-slate-900">
                    Announcements & Contact Inquiries
                  </h1>

                  <form
                    onSubmit={handleCreateAnnouncement}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                  >
                    <h2 className="text-base font-semibold text-slate-900">
                      Publish Platform Announcement
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Announcement Title"
                        value={annTitle}
                        onChange={(e) => setAnnTitle(e.target.value)}
                        className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <select
                        value={annTarget}
                        onChange={(e) =>
                          setAnnTarget(e.target.value as 'all' | 'student' | 'instructor')
                        }
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        <option value="all">All Users</option>
                        <option value="student">Students Only</option>
                        <option value="instructor">Instructors Only</option>
                      </select>
                    </div>
                    <textarea
                      rows={3}
                      required
                      placeholder="Announcement message..."
                      value={annBody}
                      onChange={(e) => setAnnBody(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium"
                    >
                      Publish Announcement
                    </button>
                  </form>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-slate-900 mb-3">
                        Active Announcements
                      </h2>
                      <div className="divide-y divide-slate-200">
                        {data.announcements.map((a) => (
                          <div key={a.id} className="py-3 flex justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                              <p className="text-xs text-slate-500">Target: {a.targetRole}</p>
                              <p className="text-xs text-slate-600 mt-1">{a.body}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                runAction(
                                  () =>
                                    apiFetch(`/api/admin/announcements/${a.id}`, {
                                      method: 'DELETE',
                                    }),
                                  'Announcement deleted.'
                                )
                              }
                              className="text-xs text-red-700 hover:underline shrink-0"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-slate-900 mb-3">
                        Public Contact Inquiries ({data.contactSubmissions.length})
                      </h2>
                      {data.contactSubmissions.length === 0 ? (
                        <p className="text-xs text-slate-500">No contact submissions yet.</p>
                      ) : (
                        <div className="divide-y divide-slate-200">
                          {data.contactSubmissions.map((c) => (
                            <div key={c.id} className="py-3">
                              <p className="text-sm font-semibold text-slate-900">{c.subject}</p>
                              <p className="text-xs text-slate-500">
                                {c.name} ({c.email})
                              </p>
                              <p className="text-xs text-slate-600 mt-1">{c.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* REPORTS & SQL SCHEMA */}
              {tab === 'reports' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">
                        Reports & Relational Schema (edutrack.sql)
                      </h1>
                      <p className="text-sm text-slate-600 mt-1">
                        Export examination performance records or download the full 24-table MySQL schema.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={exportResultsCsv}
                        className="px-4 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium inline-flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export Results CSV
                      </button>
                      <button
                        type="button"
                        onClick={downloadSqlSchema}
                        className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-medium inline-flex items-center gap-2"
                      >
                        <Database className="w-4 h-4" />
                        Download edutrack.sql
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h2 className="text-base font-semibold text-slate-900 mb-3">
                      MySQL Relational Database DDL (edutrack_db)
                    </h2>
                    <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono-tabular overflow-x-auto max-h-[460px]">
                      {schemaSql || 'Loading edutrack.sql...'}
                    </pre>
                  </div>
                </div>
              )}

              {/* SYSTEM SETTINGS */}
              {tab === 'settings' && (
                <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                  <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
                  <form onSubmit={handleSaveSettings} className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        required
                        value={setName}
                        onChange={(e) => setSetName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Tagline
                      </label>
                      <input
                        type="text"
                        required
                        value={setTagline}
                        onChange={(e) => setSetTagline(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Default Pass Percentage (%)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={95}
                        value={setPassPct}
                        onChange={(e) => setSetPassPct(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono-tabular"
                      />
                    </div>
                    <label className="flex items-center gap-2.5 text-sm text-slate-700 pt-2">
                      <input
                        type="checkbox"
                        checked={setAllowReg}
                        onChange={(e) => setSetAllowReg(e.target.checked)}
                      />
                      Allow open student self-registration
                    </label>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-lg bg-blue-950 text-white text-sm font-medium"
                    >
                      Save Settings
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
