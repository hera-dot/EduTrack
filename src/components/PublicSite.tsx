import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import type { Category, Course, Exam, Lesson, Program, SystemSettings, User } from '../types.ts';
import { HeroAcademicPreview, ProgramCoverArt } from './BrandVisuals.tsx';

export type PublicPage =
  | 'home'
  | 'about'
  | 'programs'
  | 'program-detail'
  | 'exams'
  | 'exam-detail'
  | 'contact';

interface EnrichedProgram extends Program {
  instructorName: string;
  courseCount: number;
  lessonCount: number;
  enrolledCount: number;
}

interface EnrichedExam extends Exam {
  questionCount: number;
}

interface PublicOverviewPayload {
  settings: SystemSettings;
  categories: Category[];
  programs: EnrichedProgram[];
  exams: EnrichedExam[];
  stats: {
    totalStudents: number;
    totalPrograms: number;
    totalExams: number;
    totalAttemptsCompleted: number;
  };
}

interface ProgramDetailPayload {
  program: Program;
  category?: Category;
  instructor: { id: string; name: string; institution: string; bio: string } | null;
  courses: (Course & { lessons: Omit<Lesson, 'content'>[] })[];
  linkedExams: Exam[];
  enrolledCount: number;
}

interface PublicSiteProps {
  currentUser: User | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenPortal: () => void;
  onStartExam: (exam: Exam) => void;
}

export function PublicSite({
  currentUser,
  onOpenAuth,
  onOpenPortal,
  onStartExam,
}: PublicSiteProps) {
  const [page, setPage] = useState<PublicPage>('home');
  const [overview, setOverview] = useState<PublicOverviewPayload | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [programDetail, setProgramDetail] = useState<ProgramDetailPayload | null>(null);
  const [selectedExam, setSelectedExam] = useState<EnrichedExam | null>(null);

  const [programFilterCat, setProgramFilterCat] = useState<string>('all');
  const [examFilterCat, setExamFilterCat] = useState<string>('all');
  const [examFilterMode, setExamFilterMode] = useState<'all' | 'practice' | 'scheduled'>('all');

  const [enrollStatus, setEnrollStatus] = useState<string | null>(null);

  // Contact form
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cSubject, setCSubject] = useState('');
  const [cMessage, setCMessage] = useState('');
  const [contactFeedback, setContactFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    void apiFetch<PublicOverviewPayload>('/api/public/overview')
      .then(setOverview)
      .catch(() => {});
  }, []);

  const openProgramDetail = async (id: string) => {
    setSelectedProgramId(id);
    setEnrollStatus(null);
    setPage('program-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const detail = await apiFetch<ProgramDetailPayload>(`/api/public/programs/${id}`);
      setProgramDetail(detail);
    } catch {
      setProgramDetail(null);
    }
  };

  const openExamDetail = (exam: EnrichedExam) => {
    setSelectedExam(exam);
    setPage('exam-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigate = (next: PublicPage) => {
    setPage(next);
    setEnrollStatus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnrollAction = async (programId: string) => {
    if (!currentUser) {
      onOpenAuth('register');
      return;
    }
    try {
      await apiFetch('/api/student/enroll', {
        method: 'POST',
        body: JSON.stringify({ programId }),
      });
      setEnrollStatus('Enrolled successfully. Open your Student Dashboard to start studying.');
    } catch (err) {
      setEnrollStatus(err instanceof Error ? err.message : 'Could not enroll.');
    }
  };

  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    setContactFeedback(null);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: cName,
          email: cEmail,
          subject: cSubject,
          message: cMessage,
        }),
      });
      setContactFeedback({ type: 'ok', text: res.message });
      setCName('');
      setCEmail('');
      setCSubject('');
      setCMessage('');
    } catch (err) {
      setContactFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to send message.',
      });
    } finally {
      setContactLoading(false);
    }
  };

  const categories = overview?.categories || [];
  const programs = overview?.programs || [];
  const exams = overview?.exams || [];

  const getCategoryName = (catId: string) =>
    categories.find((c) => c.id === catId)?.name || 'General';

  const filteredPrograms = programs.filter(
    (p) => programFilterCat === 'all' || p.categoryId === programFilterCat
  );
  const filteredExams = exams.filter((e) => {
    if (examFilterCat !== 'all' && e.categoryId !== examFilterCat) return false;
    if (examFilterMode !== 'all' && e.mode !== examFilterMode) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => navigate('home')}
            className="text-xl font-extrabold tracking-tight text-blue-950 whitespace-nowrap shrink-0 font-display"
          >
            EduTrack
          </button>

          {/* Zone 2: 4 concise single-line text nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => navigate('programs')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                page === 'programs' || page === 'program-detail'
                  ? 'text-blue-950 underline underline-offset-8 decoration-2 decoration-indigo-700'
                  : ''
              }`}
            >
              Programs
            </button>
            <button
              type="button"
              onClick={() => navigate('exams')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                page === 'exams' || page === 'exam-detail'
                  ? 'text-blue-950 underline underline-offset-8 decoration-2 decoration-indigo-700'
                  : ''
              }`}
            >
              Examinations
            </button>
            <button
              type="button"
              onClick={() => navigate('about')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                page === 'about'
                  ? 'text-blue-950 underline underline-offset-8 decoration-2 decoration-indigo-700'
                  : ''
              }`}
            >
              About
            </button>
            <button
              type="button"
              onClick={() => navigate('contact')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                page === 'contact'
                  ? 'text-blue-950 underline underline-offset-8 decoration-2 decoration-indigo-700'
                  : ''
              }`}
            >
              Contact
            </button>
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="flex items-center shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={onOpenPortal}
                className="px-4 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Open Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav Strip */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-5 overflow-x-auto text-xs font-medium text-slate-600">
          <button type="button" onClick={() => navigate('programs')} className="whitespace-nowrap shrink-0">
            Programs
          </button>
          <button type="button" onClick={() => navigate('exams')} className="whitespace-nowrap shrink-0">
            Examinations
          </button>
          <button type="button" onClick={() => navigate('about')} className="whitespace-nowrap shrink-0">
            About
          </button>
          <button type="button" onClick={() => navigate('contact')} className="whitespace-nowrap shrink-0">
            Contact
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* HOME PAGE */}
        {page === 'home' && (
          <div>
            {/* Hero Section */}
            <section className="bg-white border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
                  <div className="lg:col-span-6 flex flex-col justify-center">
                    <p className="text-sm font-semibold text-indigo-800 mb-3">
                      Free Online Examination & Learning Platform
                    </p>
                    <h1
                      className="font-bold text-slate-900 tracking-tight leading-[1.1]"
                      style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}
                    >
                      Learn Better. Practice Smarter. Achieve More.
                    </h1>
                    <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                      Study structured courses, practice with automated MCQ and written examinations, and track measurable academic mastery across every subject at zero cost.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => (currentUser ? onOpenPortal() : onOpenAuth('register'))}
                        className="px-6 py-3 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-sm font-medium transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                      >
                        {currentUser ? 'Go to My Portal' : 'Create Free Student Account'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('exams')}
                        className="px-5 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        Browse Examinations
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <HeroAcademicPreview />
                  </div>
                </div>

                {/* 4-Column Platform Statistics Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12 pt-10 border-t border-slate-200">
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold font-mono-tabular text-blue-950">
                      {overview?.stats.totalPrograms ?? 6}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">Free Structured Programs</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold font-mono-tabular text-blue-950">
                      {overview?.stats.totalExams ?? 6}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">Active Quizzes & Exams</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold font-mono-tabular text-blue-950">
                      100% Free
                    </p>
                    <p className="text-sm text-slate-600 mt-1">Courses, Exams & Certificates</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold font-mono-tabular text-blue-950">
                      MCQ + Written
                    </p>
                    <p className="text-sm text-slate-600 mt-1">Dual Automated & Faculty Grading</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Featured Programs */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Featured Learning Programs
                  </h2>
                  <p className="text-slate-600 mt-1.5 text-sm sm:text-base">
                    Course-based programs combining guided lessons, practice quizzes, final exams, and completion certificates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('programs')}
                  className="text-sm font-medium text-blue-950 hover:text-indigo-800 inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  View all programs
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {programs.slice(0, 6).map((prog) => (
                  <article
                    key={prog.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <ProgramCoverArt coverKey={prog.coverKey} title={prog.title} />
                      <div className="p-5">
                        <p className="text-xs text-slate-500">
                          {getCategoryName(prog.categoryId)} · {prog.level} · {prog.durationLabel}
                        </p>
                        <h3 className="text-lg font-semibold text-slate-900 mt-1.5 leading-snug">
                          {prog.title}
                        </h3>
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                          {prog.description}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span>
                        {prog.courseCount} Modules · {prog.lessonCount} Lessons
                      </span>
                      <button
                        type="button"
                        onClick={() => openProgramDetail(prog.id)}
                        className="font-semibold text-blue-950 hover:text-indigo-800 inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        Program Details
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Standalone Quizzes & Upcoming Examinations */}
            <section className="bg-white border-y border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                      Online Examinations & Practice Quizzes
                    </h2>
                    <p className="text-slate-600 mt-1.5 text-sm sm:text-base">
                      Participate directly in standalone subject quizzes or scheduled program assessments.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('exams')}
                    className="text-sm font-medium text-blue-950 hover:text-indigo-800 inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    Explore all examinations
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white">
                  {exams.slice(0, 5).map((exam) => (
                    <div
                      key={exam.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                          {getCategoryName(exam.categoryId)} ·{' '}
                          {exam.mode === 'practice' ? 'Practice Quiz' : 'Scheduled Examination'} ·{' '}
                          {exam.durationMinutes} min · {exam.totalMarks} Marks
                        </p>
                        <h3 className="text-base font-semibold text-slate-900 mt-1">
                          {exam.title}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-1">
                          {exam.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => openExamDetail(exam)}
                          className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                        >
                          Instructions
                        </button>
                        <button
                          type="button"
                          onClick={() => (currentUser ? onStartExam(exam) : onOpenAuth('login'))}
                          className="px-4 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-xs font-medium whitespace-nowrap"
                        >
                          {currentUser ? 'Start Exam' : 'Sign In to Attempt'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* How It Works & Why Choose EduTrack (Editorial Numbering) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5">
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    How EduTrack Structures Your Academic Progress
                  </h2>
                  <p className="text-slate-600 mt-3 leading-relaxed text-sm sm:text-base">
                    Instead of isolated tests, EduTrack connects lesson completion, automated MCQ drills, and instructor-reviewed written responses into a unified performance record.
                  </p>
                </div>

                <div className="lg:col-span-7 divide-y divide-slate-200 border-t border-b border-slate-200">
                  {[
                    {
                      num: '01',
                      title: 'Enroll in Free Programs or Pick a Standalone Quiz',
                      desc: 'Choose a structured multi-module course or jump directly into subject-specific quizzes in Mathematics, Python, Web Engineering, SQL, English, or ICT.',
                    },
                    {
                      num: '02',
                      title: 'Take Server-Timed MCQ & Written Examinations',
                      desc: 'Answer multiple-choice and structured written prompts under a synchronized countdown timer with automatic 15-second progress saving.',
                    },
                    {
                      num: '03',
                      title: 'Review Automated Scores & Instructor Feedback',
                      desc: 'MCQs evaluate immediately upon submission while written answers receive detailed marks and comments from your course instructor.',
                    },
                    {
                      num: '04',
                      title: 'Pinpoint Subject Weaknesses & Earn Certificates',
                      desc: 'Inspect performance trends over time, strengthen lower-scoring topics, and download verifiable certificates upon program completion.',
                    },
                  ].map((step) => (
                    <div key={step.num} className="py-5 flex items-start gap-5">
                      <span className="text-sm font-mono-tabular font-semibold text-indigo-800 pt-0.5 shrink-0">
                        {step.num}.
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Student Testimonials & CTA */}
            <section className="bg-white border-t border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-8">
                  Student & Faculty Outcomes
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      quote:
                        'Tracking my SQL and Python quiz accuracy separately from lesson progress showed me I needed more practice in relational normalization before finals. My exam average rose from 64% to 88%.',
                      author: 'Nadia Karim',
                      role: 'Computer Science Undergraduate, Metropolitan Open University',
                    },
                    {
                      quote:
                        'Reviewing written responses alongside auto-graded MCQs in one queue saves hours every week and lets me give specific architectural feedback to every student.',
                      author: 'Prof. Elena Rostova',
                      role: 'Senior Computer Science Instructor',
                    },
                    {
                      quote:
                        'Having standalone mathematics practice quizzes open anytime without prerequisites helped me build speed under timed conditions.',
                      author: 'Liam Chen',
                      role: 'Undergraduate Learner, Pacific Technical College',
                    },
                  ].map((t) => (
                    <blockquote
                      key={t.author}
                      className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                    >
                      <p className="text-sm text-slate-700 leading-relaxed">“{t.quote}”</p>
                      <footer className="mt-5 pt-4 border-t border-slate-200">
                        <p className="text-sm font-semibold text-slate-900">{t.author}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t.role}</p>
                      </footer>
                    </blockquote>
                  ))}
                </div>

                <div className="mt-14 p-8 sm:p-10 rounded-xl bg-blue-950 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Ready to start learning and testing your skills?
                    </h2>
                    <p className="text-blue-100 text-sm sm:text-base mt-1.5">
                      Register in under a minute for free access to every program, lesson, and examination.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => (currentUser ? onOpenPortal() : onOpenAuth('register'))}
                    className="px-6 py-3 rounded-lg bg-white text-blue-950 hover:bg-blue-50 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    {currentUser ? 'Open My Portal' : 'Get Started Free'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ALL PROGRAMS PAGE */}
        {page === 'programs' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="pb-6 border-b border-slate-200 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Educational Programs
                </h1>
                <p className="text-slate-600 mt-1.5 text-sm sm:text-base">
                  All programs, learning modules, and completion certificates are free for registered students.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setProgramFilterCat('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    programFilterCat === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setProgramFilterCat(cat.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      programFilterCat === cat.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {filteredPrograms.map((prog) => (
                <article
                  key={prog.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <ProgramCoverArt coverKey={prog.coverKey} title={prog.title} />
                    <div className="p-5">
                      <p className="text-xs text-slate-500">
                        {getCategoryName(prog.categoryId)} · {prog.level} · {prog.durationLabel}
                      </p>
                      <h2 className="text-lg font-semibold text-slate-900 mt-1.5">
                        {prog.title}
                      </h2>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        {prog.description}
                      </p>
                      <p className="text-xs text-slate-500 mt-3">
                        Instructor: {prog.instructorName}
                      </p>
                    </div>
                  </div>
                  <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      {prog.courseCount} Modules · {prog.lessonCount} Lessons
                    </span>
                    <button
                      type="button"
                      onClick={() => openProgramDetail(prog.id)}
                      className="font-semibold text-blue-950 hover:text-indigo-800 inline-flex items-center gap-1"
                    >
                      View Syllabus
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* PROGRAM DETAIL PAGE */}
        {page === 'program-detail' && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <button
              type="button"
              onClick={() => navigate('programs')}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Programs
            </button>

            {!programDetail || programDetail.program.id !== selectedProgramId ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500">
                Loading program syllabus...
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                  <p className="text-xs text-slate-500">
                    {programDetail.category?.name || 'Program'} · {programDetail.program.level} ·{' '}
                    {programDetail.program.durationLabel} · Free Enrollment
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                    {programDetail.program.title}
                  </h1>
                  <p className="text-slate-600 mt-3 leading-relaxed">
                    {programDetail.program.description}
                  </p>

                  {enrollStatus && (
                    <div className="mt-5 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center justify-between gap-4">
                      <span>{enrollStatus}</span>
                      {currentUser && (
                        <button
                          type="button"
                          onClick={onOpenPortal}
                          className="font-semibold underline whitespace-nowrap"
                        >
                          Open Portal
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleEnrollAction(programDetail.program.id)}
                      className="px-6 py-2.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-sm font-medium"
                    >
                      {currentUser ? 'Enroll in Program (Free)' : 'Sign Up & Enroll Free'}
                    </button>
                    <span className="text-xs text-slate-500 font-mono-tabular">
                      {programDetail.enrolledCount} Enrolled Learner(s)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                      Course Modules & Lessons
                    </h2>
                    <div className="space-y-5">
                      {programDetail.courses.map((course) => (
                        <div key={course.id} className="border border-slate-200 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-slate-900">{course.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">{course.description}</p>
                          <ul className="mt-3 divide-y divide-slate-100">
                            {course.lessons.map((les) => (
                              <li
                                key={les.id}
                                className="py-2 flex items-center justify-between text-xs text-slate-700"
                              >
                                <span>{les.title}</span>
                                <span className="font-mono-tabular text-slate-500">
                                  {les.durationMinutes} min
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-5 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                      <h2 className="text-base font-semibold text-slate-900 mb-3">
                        Learning Objectives
                      </h2>
                      <ul className="space-y-2.5 text-sm text-slate-600">
                        {programDetail.program.objectives.map((obj, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {programDetail.instructor && (
                      <div className="bg-white border border-slate-200 rounded-xl p-6">
                        <h2 className="text-base font-semibold text-slate-900">Lead Instructor</h2>
                        <p className="text-sm font-semibold text-blue-950 mt-2">
                          {programDetail.instructor.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {programDetail.instructor.institution}
                        </p>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          {programDetail.instructor.bio}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ALL EXAMINATIONS PAGE */}
        {page === 'exams' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="pb-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Examinations & Practice Quizzes
                </h1>
                <p className="text-slate-600 mt-1.5 text-sm sm:text-base">
                  Attend standalone quizzes or scheduled program assessments.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="Filter by category"
                  value={examFilterCat}
                  onChange={(e) => setExamFilterCat(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {(['all', 'practice', 'scheduled'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExamFilterMode(m)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        examFilterMode === m
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {m === 'all' ? 'All Modes' : m === 'practice' ? 'Practice' : 'Scheduled'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {filteredExams.map((exam) => (
                <article
                  key={exam.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs text-slate-500">
                      {getCategoryName(exam.categoryId)} ·{' '}
                      {exam.mode === 'practice' ? 'Practice Quiz' : 'Scheduled Examination'}
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900 mt-1.5">{exam.title}</h2>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      {exam.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-mono-tabular text-slate-600">
                      {exam.durationMinutes} min · {exam.questionCount} Questions · {exam.totalMarks}{' '}
                      Marks
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openExamDetail(exam)}
                        className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => (currentUser ? onStartExam(exam) : onOpenAuth('login'))}
                        className="px-4 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-xs font-medium"
                      >
                        {currentUser ? 'Start Exam' : 'Sign In'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* EXAM DETAIL PAGE */}
        {page === 'exam-detail' && selectedExam && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
            <button
              type="button"
              onClick={() => navigate('exams')}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Examinations
            </button>

            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
              <p className="text-xs text-indigo-800 font-medium">
                {getCategoryName(selectedExam.categoryId)} ·{' '}
                {selectedExam.mode === 'practice' ? 'Practice Quiz' : 'Scheduled Examination'}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5">
                {selectedExam.title}
              </h1>
              <p className="text-slate-600 mt-3 leading-relaxed">{selectedExam.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 py-5 border-y border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Time Limit</p>
                  <p className="text-lg font-bold font-mono-tabular text-slate-900">
                    {selectedExam.durationMinutes} min
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Questions</p>
                  <p className="text-lg font-bold font-mono-tabular text-slate-900">
                    {selectedExam.questionCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Marks</p>
                  <p className="text-lg font-bold font-mono-tabular text-slate-900">
                    {selectedExam.totalMarks}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Pass Marks</p>
                  <p className="text-lg font-bold font-mono-tabular text-slate-900">
                    {selectedExam.passMarks}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    currentUser ? onStartExam(selectedExam) : onOpenAuth('login')
                  }
                  className="px-6 py-2.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-sm font-medium"
                >
                  {currentUser ? 'Proceed to Examination' : 'Sign In to Start'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ABOUT US PAGE */}
        {page === 'about' && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                About EduTrack
              </h1>
              <p className="text-slate-600 text-base sm:text-lg mt-3 leading-relaxed max-w-3xl">
                EduTrack was designed as a unified Online Examination and Learning Management Platform—giving students free access to structured courses, standalone assessments, and transparent progress analytics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: BookOpen,
                  title: 'Structured Programs',
                  desc: 'Multi-module courses organized into clear reading lessons, lab guides, and program assessments.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Assessment Integrity',
                  desc: 'Server-enforced timers, protected answer keys during attempts, and dual MCQ + written grading.',
                },
                {
                  icon: Target,
                  title: 'Diagnostic Analytics',
                  desc: 'Separate tracking of learning progress and examination scores to pinpoint strengths and gaps.',
                },
              ].map((card) => (
                <div key={card.title} className="bg-white border border-slate-200 rounded-xl p-6">
                  <card.icon className="w-5 h-5 text-blue-950 mb-3" />
                  <h2 className="text-base font-semibold text-slate-900">{card.title}</h2>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900">Three-Role Academic Architecture</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5 pt-5 border-t border-slate-200">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <GraduationCap className="w-4 h-4 text-indigo-700" />
                    Students
                  </div>
                  <p className="text-sm text-slate-600 mt-1.5">
                    Enroll freely, study lessons, attempt practice quizzes and scheduled exams, view feedback, and earn certificates.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FileText className="w-4 h-4 text-indigo-700" />
                    Instructors
                  </div>
                  <p className="text-sm text-slate-600 mt-1.5">
                    Build lessons and question banks for assigned programs, configure exams, and evaluate written responses.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Layers className="w-4 h-4 text-indigo-700" />
                    Administrators
                  </div>
                  <p className="text-sm text-slate-600 mt-1.5">
                    Govern accounts, categories, programs, enrollments, result publication, announcements, and platform settings.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CONTACT US PAGE */}
        {page === 'contact' && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Contact EduTrack Support
              </h1>
              <p className="text-sm text-slate-600 mt-1.5">
                Questions about examination schedules, program enrollment, or faculty onboarding? Send a message directly to our administrative team.
              </p>

              {contactFeedback && (
                <div
                  className={`mt-5 px-4 py-3 rounded-lg border text-sm ${
                    contactFeedback.type === 'ok'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {contactFeedback.text}
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="c-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="c-name"
                      type="text"
                      required
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="c-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="c-email"
                      type="email"
                      required
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="c-subj" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Subject
                  </label>
                  <input
                    id="c-subj"
                    type="text"
                    required
                    value={cSubject}
                    onChange={(e) => setCSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="c-msg" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="c-msg"
                    rows={5}
                    required
                    value={cMessage}
                    onChange={(e) => setCMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={contactLoading}
                  className="px-6 py-2.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-sm font-medium"
                >
                  {contactLoading ? 'Sending...' : 'Send Inquiry'}
                </button>
              </form>
            </div>
          </section>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-900">EduTrack</span> · Online Examination & Learning Management Platform
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button type="button" onClick={() => navigate('programs')} className="hover:text-slate-900">
              Programs
            </button>
            <button type="button" onClick={() => navigate('exams')} className="hover:text-slate-900">
              Examinations
            </button>
            <button type="button" onClick={() => navigate('about')} className="hover:text-slate-900">
              About
            </button>
            <button type="button" onClick={() => navigate('contact')} className="hover:text-slate-900">
              Contact
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
