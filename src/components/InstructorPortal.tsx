import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Trash2,
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
  User,
} from '../types.ts';

type InstructorTab = 'overview' | 'programs' | 'questions' | 'exams' | 'reviews' | 'performance';

interface ManageWorkspacePayload {
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
  announcements: Announcement[];
  platformStats: {
    totalStudents: number;
    totalPrograms: number;
    totalExams: number;
    totalResults: number;
    pendingEvaluations: number;
    averagePlatformScore: number;
  };
}

interface InstructorPortalProps {
  user: User;
  onGoHome: () => void;
  onLogout: () => void;
}

export function InstructorPortal({ user, onGoHome, onLogout }: InstructorPortalProps) {
  const [tab, setTab] = useState<InstructorTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<ManageWorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Course & Lesson creation
  const [courseProgId, setCourseProgId] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');

  const [lessonCourseId, setLessonCourseId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonDuration, setLessonDuration] = useState(20);

  // Question creation
  const [qCatId, setQCatId] = useState('');
  const [qType, setQType] = useState<'mcq' | 'written'>('mcq');
  const [qPrompt, setQPrompt] = useState('');
  const [qOpt1, setQOpt1] = useState('');
  const [qOpt2, setQOpt2] = useState('');
  const [qOpt3, setQOpt3] = useState('');
  const [qOpt4, setQOpt4] = useState('');
  const [qCorrect, setQCorrect] = useState('o1');
  const [qExplanation, setQExplanation] = useState('');
  const [qMarks, setQMarks] = useState(5);
  const [qDifficulty, setQDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  // Exam creation
  const [exTitle, setExTitle] = useState('');
  const [exCatId, setExCatId] = useState('');
  const [exProgId, setExProgId] = useState('');
  const [exMode, setExMode] = useState<'practice' | 'scheduled'>('scheduled');
  const [exDesc, setExDesc] = useState('');
  const [exDuration, setExDuration] = useState(20);
  const [exPassMarks, setExPassMarks] = useState(10);
  const [exNeg, setExNeg] = useState(0);
  const [exQuestionIds, setExQuestionIds] = useState<string[]>([]);

  // Written Answer Evaluation state: answerId -> { marks, feedback }
  const [evalDrafts, setEvalDrafts] = useState<
    Record<string, { marks: number; feedback: string }>
  >({});

  const loadWorkspace = useCallback(async () => {
    try {
      const payload = await apiFetch<ManageWorkspacePayload>('/api/manage/workspace');
      setData(payload);
      if (payload.programs.length > 0 && !courseProgId) {
        setCourseProgId(payload.programs[0].id);
      }
      if (payload.courses.length > 0 && !lessonCourseId) {
        setLessonCourseId(payload.courses[0].id);
      }
      if (payload.categories.length > 0 && !qCatId) {
        setQCatId(payload.categories[0].id);
        setExCatId(payload.categories[0].id);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [courseProgId, lessonCourseId, qCatId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const handleCreateCourse = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/manage/courses', {
        method: 'POST',
        body: JSON.stringify({
          programId: courseProgId,
          title: courseTitle,
          description: courseDesc,
        }),
      });
      setCourseTitle('');
      setCourseDesc('');
      setNotice('Course module added.');
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course.');
    }
  };

  const handleCreateLesson = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/manage/lessons', {
        method: 'POST',
        body: JSON.stringify({
          courseId: lessonCourseId,
          title: lessonTitle,
          summary: lessonSummary,
          content: lessonContent,
          durationMinutes: lessonDuration,
        }),
      });
      setLessonTitle('');
      setLessonSummary('');
      setLessonContent('');
      setNotice('Lesson published to course.');
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add lesson.');
    }
  };

  const handleCreateQuestion = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const options =
        qType === 'mcq'
          ? [
              { id: 'o1', text: qOpt1 },
              { id: 'o2', text: qOpt2 },
              { id: 'o3', text: qOpt3 },
              { id: 'o4', text: qOpt4 },
            ].filter((o) => o.text.trim())
          : [];
      await apiFetch('/api/manage/questions', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: qCatId,
          type: qType,
          prompt: qPrompt,
          options,
          correctOptionId: qType === 'mcq' ? qCorrect : undefined,
          explanation: qExplanation,
          marks: qMarks,
          difficulty: qDifficulty,
        }),
      });
      setQPrompt('');
      setQOpt1('');
      setQOpt2('');
      setQOpt3('');
      setQOpt4('');
      setQExplanation('');
      setNotice('Question saved to Question Bank.');
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create question.');
    }
  };

  const handleCreateExam = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/manage/exams', {
        method: 'POST',
        body: JSON.stringify({
          title: exTitle,
          categoryId: exCatId,
          programId: exProgId || null,
          mode: exMode,
          description: exDesc,
          durationMinutes: exDuration,
          passMarks: exPassMarks,
          negativeMarking: exNeg,
          questionIds: exQuestionIds,
        }),
      });
      setExTitle('');
      setExDesc('');
      setExQuestionIds([]);
      setNotice('Examination created and published.');
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exam.');
    }
  };

  const handleEvaluateWritten = async (item: PendingReviewItem) => {
    setError(null);
    setNotice(null);
    try {
      const evaluations = item.writtenItems.map(({ answer, question }) => {
        const draft = evalDrafts[answer.id] || {
          marks: Math.ceil(question.marks * 0.7),
          feedback: '',
        };
        return {
          answerId: answer.id,
          awardedMarks: draft.marks,
          feedback: draft.feedback,
        };
      });
      await apiFetch(`/api/manage/reviews/${item.attempt.id}`, {
        method: 'POST',
        body: JSON.stringify({ evaluations }),
      });
      setNotice(`Evaluated and published result for ${item.student.name}.`);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit evaluation.');
    }
  };

  const navItems: { id: InstructorTab; label: string; icon: typeof LayoutDashboard; count?: number }[] =
    [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'programs', label: 'Assigned Programs', icon: BookOpen },
      { id: 'questions', label: 'Question Bank', icon: FileQuestion },
      { id: 'exams', label: 'Examinations', icon: FileText },
      {
        id: 'reviews',
        label: 'Written Evaluations',
        icon: ClipboardCheck,
        count: data?.pendingReviews.length || 0,
      },
      { id: 'performance', label: 'Student Performance', icon: Users },
    ];

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
            <span className="text-xs text-slate-500">Instructor</span>
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
                <span className="font-bold text-blue-950">EduTrack Instructor</span>
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
              Instructor Workspace / <span className="font-semibold text-slate-900">{user.name}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTab('reviews')}
            className="px-4 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium whitespace-nowrap"
          >
            Review Queue ({data?.pendingReviews.length || 0})
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
              Loading instructor workspace...
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Instructor Overview</h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Manage your assigned programs, course lessons, examinations, and written answer evaluations.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs text-slate-500">Assigned Programs</p>
                      <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-1">
                        {data.programs.length}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs text-slate-500">Pending Written Reviews</p>
                      <p className="text-2xl font-bold font-mono-tabular text-amber-700 mt-1">
                        {data.pendingReviews.length}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs text-slate-500">Active Examinations</p>
                      <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-1">
                        {data.exams.length}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs text-slate-500">Avg Student Score</p>
                      <p className="text-2xl font-bold font-mono-tabular text-blue-950 mt-1">
                        {data.platformStats.averagePlatformScore}%
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-slate-900 mb-3">
                        Assigned Programs
                      </h2>
                      <div className="divide-y divide-slate-200">
                        {data.programs.map((p) => (
                          <div key={p.id} className="py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{p.title}</p>
                              <p className="text-xs text-slate-500">
                                {p.level} · {p.durationLabel}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTab('programs')}
                              className="text-xs font-medium text-blue-950 hover:underline"
                            >
                              Manage Content
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-slate-900 mb-3">
                        Faculty Announcements
                      </h2>
                      <div className="divide-y divide-slate-200">
                        {data.announcements.map((a) => (
                          <div key={a.id} className="py-3">
                            <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                            <p className="text-xs text-slate-600 mt-1">{a.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ASSIGNED PROGRAMS, COURSES & LESSONS */}
              {tab === 'programs' && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      Assigned Programs, Modules & Lessons
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Build course modules and publish study materials inside your assigned programs.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <form
                      onSubmit={handleCreateCourse}
                      className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                    >
                      <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Course Module
                      </h2>
                      <select
                        value={courseProgId}
                        onChange={(e) => setCourseProgId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        {data.programs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        required
                        placeholder="Module title (e.g., Module 3: REST Security)"
                        value={courseTitle}
                        onChange={(e) => setCourseTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Short module description"
                        value={courseDesc}
                        onChange={(e) => setCourseDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium"
                      >
                        Add Module
                      </button>
                    </form>

                    <form
                      onSubmit={handleCreateLesson}
                      className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                    >
                      <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Publish Learning Lesson
                      </h2>
                      <select
                        value={lessonCourseId}
                        onChange={(e) => setLessonCourseId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        {data.courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Lesson title"
                          value={lessonTitle}
                          onChange={(e) => setLessonTitle(e.target.value)}
                          className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                        <input
                          type="number"
                          min={5}
                          value={lessonDuration}
                          onChange={(e) => setLessonDuration(Number(e.target.value))}
                          className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Lesson summary"
                        value={lessonSummary}
                        onChange={(e) => setLessonSummary(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <textarea
                        rows={3}
                        required
                        placeholder="Full study material text..."
                        value={lessonContent}
                        onChange={(e) => setLessonContent(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium"
                      >
                        Publish Lesson
                      </button>
                    </form>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h2 className="text-base font-semibold text-slate-900 mb-4">
                      Current Curriculum Structure
                    </h2>
                    <div className="space-y-4">
                      {data.courses.map((c) => {
                        const cLessons = data.lessons.filter((l) => l.courseId === c.id);
                        return (
                          <div key={c.id} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                              <button
                                type="button"
                                onClick={async () => {
                                  await apiFetch(`/api/manage/courses/${c.id}`, {
                                    method: 'DELETE',
                                  });
                                  await loadWorkspace();
                                }}
                                className="text-xs text-red-700 hover:underline inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>
                            <ul className="mt-2 divide-y divide-slate-100">
                              {cLessons.map((l) => (
                                <li
                                  key={l.id}
                                  className="py-2 flex items-center justify-between text-xs text-slate-700"
                                >
                                  <span>
                                    {l.title} ({l.durationMinutes} min)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await apiFetch(`/api/manage/lessons/${l.id}`, {
                                        method: 'DELETE',
                                      });
                                      await loadWorkspace();
                                    }}
                                    className="text-red-700 hover:underline"
                                  >
                                    Delete
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* QUESTION BANK */}
              {tab === 'questions' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>

                  <form
                    onSubmit={handleCreateQuestion}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                  >
                    <h2 className="text-base font-semibold text-slate-900">
                      Create New Question (MCQ or Written)
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <select
                        value={qCatId}
                        onChange={(e) => setQCatId(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        {data.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={qType}
                        onChange={(e) => setQType(e.target.value as 'mcq' | 'written')}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        <option value="mcq">Multiple Choice (MCQ)</option>
                        <option value="written">Written Answer</option>
                      </select>
                      <select
                        value={qDifficulty}
                        onChange={(e) =>
                          setQDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')
                        }
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={qMarks}
                        onChange={(e) => setQMarks(Number(e.target.value))}
                        placeholder="Marks"
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>

                    <textarea
                      rows={2}
                      required
                      placeholder="Enter question prompt..."
                      value={qPrompt}
                      onChange={(e) => setQPrompt(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />

                    {qType === 'mcq' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Option A"
                            value={qOpt1}
                            onChange={(e) => setQOpt1(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Option B"
                            value={qOpt2}
                            onChange={(e) => setQOpt2(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Option C"
                            value={qOpt3}
                            onChange={(e) => setQOpt3(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Option D"
                            value={qOpt4}
                            onChange={(e) => setQOpt4(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <select
                            value={qCorrect}
                            onChange={(e) => setQCorrect(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          >
                            <option value="o1">Correct Answer: Option A</option>
                            <option value="o2">Correct Answer: Option B</option>
                            <option value="o3">Correct Answer: Option C</option>
                            <option value="o4">Correct Answer: Option D</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Optional post-exam explanation"
                            value={qExplanation}
                            onChange={(e) => setQExplanation(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium"
                    >
                      Save Question
                    </button>
                  </form>

                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                    {data.questions.map((q) => (
                      <div key={q.id} className="p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-500">
                            {q.type === 'mcq' ? 'MCQ' : 'Written'} · {q.difficulty} ·{' '}
                            <span className="font-mono-tabular">{q.marks} Marks</span>
                          </p>
                          <p className="text-sm font-medium text-slate-900 mt-1">{q.prompt}</p>
                        </div>
                        {q.createdBy === user.id && (
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/manage/questions/${q.id}`, {
                                method: 'DELETE',
                              });
                              await loadWorkspace();
                            }}
                            className="text-xs text-red-700 hover:underline shrink-0"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EXAM BUILDER */}
              {tab === 'exams' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-slate-900">
                    Quizzes & Examinations Manager
                  </h1>

                  <form
                    onSubmit={handleCreateExam}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                  >
                    <h2 className="text-base font-semibold text-slate-900">
                      Create Examination or Practice Quiz
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Examination Title"
                        value={exTitle}
                        onChange={(e) => setExTitle(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <select
                        value={exCatId}
                        onChange={(e) => setExCatId(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        {data.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={exProgId}
                        onChange={(e) => setExProgId(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        <option value="">Standalone (No Program)</option>
                        {data.programs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <select
                        value={exMode}
                        onChange={(e) => setExMode(e.target.value as 'practice' | 'scheduled')}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        <option value="scheduled">Scheduled Exam</option>
                        <option value="practice">Practice Quiz</option>
                      </select>
                      <input
                        type="number"
                        min={5}
                        value={exDuration}
                        onChange={(e) => setExDuration(Number(e.target.value))}
                        placeholder="Duration (min)"
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <input
                        type="number"
                        min={1}
                        value={exPassMarks}
                        onChange={(e) => setExPassMarks(Number(e.target.value))}
                        placeholder="Pass Marks"
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.25"
                        value={exNeg}
                        onChange={(e) => setExNeg(Number(e.target.value))}
                        placeholder="Negative marking"
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Examination instructions / description"
                      value={exDesc}
                      onChange={(e) => setExDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />

                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-2">
                        Select Questions ({exQuestionIds.length} selected):
                      </p>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                        {data.questions.map((q) => {
                          const checked = exQuestionIds.includes(q.id);
                          return (
                            <label
                              key={q.id}
                              className="flex items-center gap-3 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setExQuestionIds((prev) =>
                                    checked ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                                  )
                                }
                              />
                              <span className="font-mono-tabular text-slate-500">
                                [{q.type.toUpperCase()} · {q.marks}m]
                              </span>
                              <span className="truncate text-slate-800">{q.prompt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-blue-950 text-white text-xs font-medium"
                    >
                      Publish Examination
                    </button>
                  </form>

                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                    {data.exams.map((ex) => (
                      <div key={ex.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{ex.title}</p>
                          <p className="text-xs text-slate-500 font-mono-tabular">
                            {ex.mode} · {ex.durationMinutes} min · {ex.questionIds.length} questions ·{' '}
                            {ex.totalMarks} marks
                          </p>
                        </div>
                        {ex.createdBy === user.id && (
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/manage/exams/${ex.id}`, { method: 'DELETE' });
                              await loadWorkspace();
                            }}
                            className="text-xs text-red-700 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WRITTEN ANSWER EVALUATION QUEUE */}
              {tab === 'reviews' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      Written Answer Evaluation Queue
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      Review student written responses, award marks, and publish final examination results.
                    </p>
                  </div>

                  {data.pendingReviews.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      <span>All submitted written answers have been evaluated.</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {data.pendingReviews.map((item) => (
                        <div
                          key={item.attempt.id}
                          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
                            <div>
                              <h2 className="text-base font-bold text-slate-900">
                                {item.exam.title}
                              </h2>
                              <p className="text-xs text-slate-600 mt-0.5">
                                Student: <span className="font-semibold">{item.student.name}</span> (
                                {item.student.email}) · Current MCQ Score:{' '}
                                <span className="font-mono-tabular">
                                  {item.result.obtainedMarks} / {item.result.totalMarks}
                                </span>
                              </p>
                            </div>
                          </div>

                          {item.writtenItems.map(({ answer, question }) => {
                            const draft = evalDrafts[answer.id] || {
                              marks: Math.ceil(question.marks * 0.7),
                              feedback: '',
                            };
                            return (
                              <div key={answer.id} className="space-y-3">
                                <div className="flex justify-between gap-4">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {question.prompt}
                                  </p>
                                  <span className="text-xs font-mono-tabular text-slate-500 shrink-0">
                                    Max {question.marks} marks
                                  </span>
                                </div>
                                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap">
                                  {answer.writtenText || 'Empty submission'}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                      Awarded Marks (0–{question.marks})
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={question.marks}
                                      step="0.5"
                                      value={draft.marks}
                                      onChange={(e) =>
                                        setEvalDrafts((prev) => ({
                                          ...prev,
                                          [answer.id]: {
                                            ...draft,
                                            marks: Number(e.target.value),
                                          },
                                        }))
                                      }
                                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular"
                                    />
                                  </div>
                                  <div className="sm:col-span-3">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                      Instructor Feedback
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Explain strengths, accuracy, and areas to refine..."
                                      value={draft.feedback}
                                      onChange={(e) =>
                                        setEvalDrafts((prev) => ({
                                          ...prev,
                                          [answer.id]: {
                                            ...draft,
                                            feedback: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => handleEvaluateWritten(item)}
                              className="px-5 py-2.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-xs font-medium"
                            >
                              Save Marks & Publish Final Result
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STUDENT PERFORMANCE */}
              {tab === 'performance' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-slate-900">Student Performance</h1>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                          <th className="py-3 px-4 font-medium">Student</th>
                          <th className="py-3 px-4 font-medium">Examination</th>
                          <th className="py-3 px-4 font-medium text-right">Score</th>
                          <th className="py-3 px-4 font-medium text-right">Percentage</th>
                          <th className="py-3 px-4 font-medium">Outcome</th>
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
                                {r.obtainedMarks} / {r.totalMarks}
                              </td>
                              <td className="py-3 px-4 text-right font-mono-tabular font-semibold">
                                {r.percentage}%
                              </td>
                              <td className="py-3 px-4 text-xs">
                                {r.pendingWrittenCount > 0 ? (
                                  <span className="text-amber-700 font-medium">Pending Review</span>
                                ) : r.passed ? (
                                  <span className="text-emerald-700 font-medium">Passed</span>
                                ) : (
                                  <span className="text-red-700 font-medium">Below Pass Mark</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
