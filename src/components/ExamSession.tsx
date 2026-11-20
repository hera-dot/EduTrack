import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flag,
  HelpCircle,
  Save,
  Send,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import type { Exam, ExamAttempt, Question, Result, StudentAnswer } from '../types.ts';

interface ExamSessionProps {
  exam: Exam;
  onExit: () => void;
  onCompleted: () => void;
}

interface StartResponse {
  exam: Exam;
  attempt: ExamAttempt;
  questions: Question[];
  savedAnswers: StudentAnswer[];
  serverNow: string;
}

interface SubmitResponse {
  attempt: ExamAttempt;
  result: Result;
}

interface ReviewResponse {
  exam: Exam;
  attempt: ExamAttempt;
  result: Result;
  items: {
    question: Question;
    answer: StudentAnswer | null;
  }[];
}

export function ExamSession({ exam, onExit, onCompleted }: ExamSessionProps) {
  const [phase, setPhase] = useState<'instructions' | 'active' | 'submitted'>('instructions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, { selectedOptionId?: string | null; writtenText?: string | null }>
  >({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(exam.durationMinutes * 60);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewResponse | null>(null);

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const buildAnswerPayload = useCallback(() => {
    return Object.entries(answersRef.current).map(([questionId, val]) => ({
      questionId,
      selectedOptionId: val.selectedOptionId ?? null,
      writtenText: val.writtenText ?? null,
    }));
  }, []);

  const handleStartExam = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<StartResponse>(`/api/exams/${exam.id}/start`, {
        method: 'POST',
      });
      setAttempt(data.attempt);
      setQuestions(data.questions);

      const initialMap: Record<
        string,
        { selectedOptionId?: string | null; writtenText?: string | null }
      > = {};
      for (const sa of data.savedAnswers) {
        initialMap[sa.questionId] = {
          selectedOptionId: sa.selectedOptionId,
          writtenText: sa.writtenText,
        };
      }
      setAnswers(initialMap);

      const serverOffset = Date.now() - new Date(data.serverNow).getTime();
      const secs = Math.max(
        0,
        Math.floor((new Date(data.attempt.expiresAt).getTime() + serverOffset - Date.now()) / 1000)
      );
      setRemainingSeconds(secs);
      setPhase('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start examination.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnswers = useCallback(
    async (silent = false) => {
      if (!attempt) return;
      try {
        const res = await apiFetch<{ ok: boolean; savedAt: string }>(
          `/api/attempts/${attempt.id}/answers`,
          {
            method: 'PATCH',
            body: JSON.stringify({ answers: buildAnswerPayload() }),
          }
        );
        setLastSavedAt(new Date(res.savedAt).toLocaleTimeString());
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Could not save progress.');
        }
      }
    },
    [attempt, buildAnswerPayload]
  );

  const handleFinalSubmit = useCallback(async () => {
    if (!attempt) return;
    setLoading(true);
    setConfirmSubmitOpen(false);
    setError(null);
    try {
      await apiFetch<SubmitResponse>(`/api/attempts/${attempt.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: buildAnswerPayload() }),
      });
      const rev = await apiFetch<ReviewResponse>(`/api/attempts/${attempt.id}/review`);
      setReviewData(rev);
      setPhase('submitted');
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission error.');
    } finally {
      setLoading(false);
    }
  }, [attempt, buildAnswerPayload, onCompleted]);

  // Countdown timer synced to server expiresAt + auto-submit on 0
  useEffect(() => {
    if (phase !== 'active' || !attempt) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          void handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, attempt, handleFinalSubmit]);

  // Periodic autosave every 15s
  useEffect(() => {
    if (phase !== 'active' || !attempt) return;
    const saver = window.setInterval(() => {
      void handleSaveAnswers(true);
    }, 15000);
    return () => window.clearInterval(saver);
  }, [phase, attempt, handleSaveAnswers]);

  const formatClock = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const answeredCount = useMemo(() => {
    return questions.filter((q) => {
      const a = answers[q.id];
      if (!a) return false;
      return q.type === 'mcq' ? Boolean(a.selectedOptionId) : Boolean(a.writtenText?.trim());
    }).length;
  }, [questions, answers]);

  if (phase === 'instructions') {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Examinations
          </button>

          <p className="text-xs font-medium text-indigo-800 mb-2">
            {exam.mode === 'practice' ? 'Practice Quiz' : 'Scheduled Examination'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {exam.title}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed">
            {exam.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 py-5 border-y border-slate-200">
            <div>
              <p className="text-xs text-slate-500">Duration</p>
              <p className="text-lg font-bold font-mono-tabular text-slate-900 mt-0.5">
                {exam.durationMinutes} min
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Questions</p>
              <p className="text-lg font-bold font-mono-tabular text-slate-900 mt-0.5">
                {exam.questionIds.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Marks</p>
              <p className="text-lg font-bold font-mono-tabular text-slate-900 mt-0.5">
                {exam.totalMarks}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Pass Threshold</p>
              <p className="text-lg font-bold font-mono-tabular text-slate-900 mt-0.5">
                {exam.passMarks} marks
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-slate-700">
            <h2 className="font-semibold text-slate-900">Examination Rules & Evaluation Policy</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>The countdown timer is enforced by the server from the moment you start.</li>
              <li>Your answers auto-save every 15 seconds; you may also save manually anytime.</li>
              <li>
                {exam.negativeMarking > 0
                  ? `Negative marking applies: ${exam.negativeMarking} mark(s) deducted per incorrect MCQ selection.`
                  : 'No negative marking is applied on unanswered or incorrect MCQ selections.'}
              </li>
              <li>
                MCQ questions are graded automatically upon submission. Written responses remain pending until reviewed by your instructor.
              </li>
              <li>When the timer reaches 00:00, your attempt submits automatically.</li>
            </ul>
          </div>

          {error && (
            <div className="mt-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleStartExam}
              className="px-6 py-2.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-sm font-medium transition-colors"
            >
              {loading ? 'Starting Examination...' : 'Begin Examination'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'submitted' && reviewData) {
    const { result, items } = reviewData;
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Submission Recorded · {new Date(reviewData.attempt.submittedAt || '').toLocaleString()}
                </p>
                <h1 className="text-2xl font-bold text-slate-900 mt-1">{reviewData.exam.title}</h1>
              </div>

              {result.pendingWrittenCount > 0 ? (
                <div className="px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Pending Instructor Review ({result.pendingWrittenCount} written)</span>
                </div>
              ) : result.passed ? (
                <div className="px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Passed Assessment</span>
                </div>
              ) : (
                <div className="px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  <span>Below Pass Mark</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-xs text-slate-500">Obtained Score</p>
                <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-0.5">
                  {result.obtainedMarks} / {result.totalMarks}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Percentage</p>
                <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-0.5">
                  {result.percentage}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Pass Marks</p>
                <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-0.5">
                  {reviewData.exam.passMarks}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Evaluation Status</p>
                <p className="text-sm font-semibold text-slate-900 mt-2">
                  {result.pendingWrittenCount > 0 ? 'Partial (MCQ Scored)' : 'Finalized'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Question-by-Question Review</h2>
            {items.map(({ question, answer }, index) => (
              <div key={question.id} className="pt-5 border-t border-slate-200 first:border-t-0 first:pt-0">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Q{index + 1}. {question.prompt}
                  </p>
                  <span className="text-xs font-mono-tabular text-slate-600 shrink-0">
                    {answer?.awardedMarks !== null && answer?.awardedMarks !== undefined
                      ? `${answer.awardedMarks} / ${question.marks} marks`
                      : `Pending / ${question.marks} marks`}
                  </span>
                </div>

                {question.type === 'mcq' ? (
                  <div className="mt-3 space-y-2">
                    {question.options.map((opt) => {
                      const isChosen = answer?.selectedOptionId === opt.id;
                      const isCorrect = question.correctOptionId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`px-3.5 py-2 rounded-lg border text-sm flex items-center justify-between ${
                            isCorrect
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-950 font-medium'
                              : isChosen
                              ? 'border-red-300 bg-red-50 text-red-900'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          <span>{opt.text}</span>
                          <span className="text-xs">
                            {isCorrect ? 'Correct Answer' : isChosen ? 'Your Selection' : ''}
                          </span>
                        </div>
                      );
                    })}
                    {question.explanation && (
                      <p className="text-xs text-slate-600 mt-2">
                        Explanation: {question.explanation}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap">
                      {answer?.writtenText?.trim() || 'No written response submitted.'}
                    </div>
                    {answer?.feedback && (
                      <p className="text-xs text-indigo-900">
                        Instructor Feedback: {answer.feedback}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={onExit}
                className="px-5 py-2.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-sm font-medium"
              >
                Return to Portal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE EXAMINATION INTERFACE
  const currentQ = questions[currentIdx];
  const currentAns = currentQ ? answers[currentQ.id] || {} : {};
  const isUrgent = remainingSeconds <= 120;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Examination Bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {exam.title}
            </h1>
            <p className="text-xs text-slate-500">
              Answered {answeredCount} of {questions.length}
              {lastSavedAt ? ` · Saved at ${lastSavedAt}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`px-3.5 py-2 rounded-lg border font-mono-tabular text-sm font-semibold flex items-center gap-2 ${
                isUrgent
                  ? 'border-red-300 bg-red-50 text-red-800'
                  : 'border-slate-200 bg-slate-50 text-slate-900'
              }`}
              aria-live="polite"
            >
              <Clock className="w-4 h-4" />
              <span>{formatClock(remainingSeconds)}</span>
            </div>

            <button
              type="button"
              onClick={() => handleSaveAnswers(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>

            <button
              type="button"
              onClick={() => setConfirmSubmitOpen(true)}
              className="px-4 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Exam
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-6xl w-full mx-auto mt-4 px-4 sm:px-6">
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        </div>
      )}

      {/* Main Two-Zone Examination Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Question Area */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          {currentQ && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="font-semibold text-slate-900 font-mono-tabular">
                    Question {currentIdx + 1} / {questions.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{currentQ.type === 'mcq' ? 'Multiple Choice' : 'Written Response'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{currentQ.marks} Marks</span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFlagged((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))
                  }
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    flagged[currentQ.id]
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : 'border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {flagged[currentQ.id] ? 'Flagged' : 'Flag Question'}
                </button>
              </div>

              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mt-5 leading-relaxed">
                {currentQ.prompt}
              </h2>

              {currentQ.type === 'mcq' ? (
                <div className="mt-6 space-y-3">
                  {currentQ.options.map((opt, idx) => {
                    const selected = currentAns.selectedOptionId === opt.id;
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQ.id]: { ...prev[currentQ.id], selectedOptionId: opt.id },
                          }))
                        }
                        className={`w-full text-left px-4 py-3.5 rounded-lg border text-sm transition-colors flex items-center gap-3 ${
                          selected
                            ? 'border-indigo-700 bg-indigo-50/70 text-slate-900 font-medium'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono-tabular shrink-0 ${
                            selected
                              ? 'bg-indigo-800 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6">
                  <label
                    htmlFor={`written-${currentQ.id}`}
                    className="block text-xs font-medium text-slate-600 mb-2"
                  >
                    Written Answer (Evaluated manually by your instructor)
                  </label>
                  <textarea
                    id={`written-${currentQ.id}`}
                    rows={8}
                    value={currentAns.writtenText || ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQ.id]: { ...prev[currentQ.id], writtenText: e.target.value },
                      }))
                    }
                    placeholder="Write a clear, structured explanation addressing all parts of the prompt..."
                    className="w-full p-4 rounded-lg border border-slate-300 text-sm text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-700"
                  />
                  <p className="text-xs text-slate-500 mt-1.5 font-mono-tabular">
                    Word count:{' '}
                    {(currentAns.writtenText || '')
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean).length}
                  </p>
                </div>
              )}

              <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50"
                >
                  Previous Question
                </button>
                {currentIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                    className="px-5 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-sm font-medium"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmSubmitOpen(true)}
                    className="px-5 py-2 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white text-sm font-medium"
                  >
                    Review & Submit
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Navigator Sidebar */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900">Question Navigator</h3>
          <p className="text-xs text-slate-500 mt-1">
            Jump to any question. Flag items you want to revisit before submitting.
          </p>

          <div className="grid grid-cols-5 gap-2 mt-4">
            {questions.map((q, idx) => {
              const a = answers[q.id];
              const isAnswered =
                q.type === 'mcq' ? Boolean(a?.selectedOptionId) : Boolean(a?.writtenText?.trim());
              const isFlagged = Boolean(flagged[q.id]);
              const isCurrent = idx === currentIdx;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-10 rounded-lg border text-xs font-mono-tabular font-semibold transition-colors ${
                    isCurrent
                      ? 'border-blue-950 bg-blue-950 text-white'
                      : isFlagged
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : isAnswered
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>Answered</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                {answeredCount} / {questions.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Flagged for review</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                {Object.values(flagged).filter(Boolean).length}
              </span>
            </div>
          </div>
        </aside>
      </main>

      {/* Submit Confirmation Modal */}
      {confirmSubmitOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center gap-3 text-slate-900">
              {answeredCount < questions.length ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              ) : (
                <HelpCircle className="w-5 h-5 text-blue-900 shrink-0" />
              )}
              <h2 className="text-lg font-semibold">Confirm Final Submission</h2>
            </div>

            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              You have answered{' '}
              <span className="font-mono-tabular font-semibold text-slate-900">
                {answeredCount} of {questions.length}
              </span>{' '}
              questions. Once submitted, answers cannot be edited.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Continue Editing
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleFinalSubmit}
                className="px-5 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-sm font-medium"
              >
                {loading ? 'Submitting...' : 'Submit Final Answers'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
