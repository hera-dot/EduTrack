import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { EDUTRACK_MYSQL_SCHEMA } from './server/dbSchemaSql.ts';
import {
  hashPassword,
  makeId,
  sanitizeUser,
  store,
  verifyPassword,
  type StoredUser,
} from './server/store.ts';
import type {
  Exam,
  PendingReviewItem,
  Question,
  StudentAnalytics,
  UserRole,
} from './src/types.ts';

interface AuthedRequest extends Request {
  authUser?: StoredUser;
  authToken?: string;
}

function getBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  const user = store.getUserByToken(token);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  req.authUser = user;
  req.authToken = token;
  next();
}

function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'Access denied for your account role.' });
      return;
    }
    next();
  };
}

function stripQuestionKeys(q: Question): Question {
  const { correctOptionId: _c, explanation: _e, ...safe } = q;
  return safe;
}

function computeStudentAnalytics(studentId: string): StudentAnalytics {
  const db = store.db;
  const enrollments = db.enrollments.filter((e) => e.studentId === studentId);
  const enrolledProgramIds = new Set(enrollments.map((e) => e.programId));
  const completedPrograms = enrollments.filter((e) => e.completedAt !== null).length;

  const enrolledCourses = db.courses.filter((c) => enrolledProgramIds.has(c.programId));
  const enrolledCourseIds = new Set(enrolledCourses.map((c) => c.id));
  const assignedLessons = db.lessons.filter((l) => enrolledCourseIds.has(l.courseId));
  const completedLessonIds = new Set(
    db.lessonProgress.filter((lp) => lp.studentId === studentId).map((lp) => lp.lessonId)
  );
  const completedAssignedCount = assignedLessons.filter((l) =>
    completedLessonIds.has(l.id)
  ).length;

  const studentResults = db.results
    .filter((r) => r.studentId === studentId)
    .sort((a, b) => a.evaluatedAt.localeCompare(b.evaluatedAt));

  const evaluatedResults = studentResults.filter((r) => r.pendingWrittenCount === 0);
  const averageScore =
    evaluatedResults.length > 0
      ? Math.round(
          (evaluatedResults.reduce((acc, r) => acc + r.percentage, 0) /
            evaluatedResults.length) *
            10
        ) / 10
      : 0;

  // MCQ accuracy across all submitted attempts by student
  const studentAttemptIds = new Set(
    db.examAttempts
      .filter((a) => a.studentId === studentId && a.status !== 'in_progress')
      .map((a) => a.id)
  );
  const mcqAnswers = db.studentAnswers.filter((sa) => {
    if (!studentAttemptIds.has(sa.attemptId)) return false;
    const q = db.questions.find((qq) => qq.id === sa.questionId);
    return q?.type === 'mcq';
  });
  const correctMcqCount = mcqAnswers.filter((sa) => sa.isCorrect === true).length;
  const mcqAccuracy =
    mcqAnswers.length > 0
      ? Math.round((correctMcqCount / mcqAnswers.length) * 1000) / 10
      : 0;

  const totalLearningActivities = completedLessonIds.size + studentAttemptIds.size;

  // Overall learning progress combines lesson completion (70%) + exam participation on enrolled/available (30%)
  const lessonRatio =
    assignedLessons.length > 0 ? completedAssignedCount / assignedLessons.length : 0;
  const examRatio =
    db.exams.length > 0
      ? Math.min(1, studentAttemptIds.size / Math.min(4, db.exams.length))
      : 0;
  const overallLearningProgress = Math.round((lessonRatio * 0.75 + examRatio * 0.25) * 100);

  const performanceOverTime = evaluatedResults.map((r) => {
    const exam = db.exams.find((e) => e.id === r.examId);
    const dt = new Date(r.evaluatedAt);
    const dateLabel = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      dateLabel,
      examTitle: exam?.title || 'Assessment',
      percentage: r.percentage,
    };
  });

  // Subject-wise performance
  const catBuckets = new Map<string, { sum: number; count: number }>();
  for (const r of evaluatedResults) {
    const exam = db.exams.find((e) => e.id === r.examId);
    if (!exam) continue;
    const prev = catBuckets.get(exam.categoryId) || { sum: 0, count: 0 };
    prev.sum += r.percentage;
    prev.count += 1;
    catBuckets.set(exam.categoryId, prev);
  }

  const subjectPerformance = Array.from(catBuckets.entries()).map(([catId, agg]) => {
    const cat = db.categories.find((c) => c.id === catId);
    const avg = Math.round((agg.sum / agg.count) * 10) / 10;
    const classification: 'Strength' | 'Developing' | 'Needs Practice' =
      avg >= 75 ? 'Strength' : avg >= 55 ? 'Developing' : 'Needs Practice';
    return {
      categoryId: catId,
      categoryName: cat?.name || 'General',
      averagePercentage: avg,
      attemptsCount: agg.count,
      classification,
    };
  });

  // Recommend exams in weak subjects or untaken exams
  const weakCategoryIds = new Set(
    subjectPerformance
      .filter((s) => s.classification !== 'Strength')
      .map((s) => s.categoryId)
  );
  const takenExamIds = new Set(studentResults.map((r) => r.examId));
  const recommendedExams = db.exams
    .filter((e) => weakCategoryIds.has(e.categoryId) || !takenExamIds.has(e.id))
    .slice(0, 3);

  return {
    totalEnrolledPrograms: enrollments.length,
    completedPrograms,
    totalExams: db.exams.length,
    completedExams: studentAttemptIds.size,
    averageScore,
    mcqAccuracy,
    totalLearningActivities,
    completedLessonsCount: completedAssignedCount,
    totalAssignedLessonsCount: assignedLessons.length,
    overallLearningProgress,
    performanceOverTime,
    subjectPerformance,
    recommendedExams,
  };
}

function buildPendingReviews(filterExamIds?: Set<string>): PendingReviewItem[] {
  const db = store.db;
  const items: PendingReviewItem[] = [];
  for (const res of db.results) {
    if (res.pendingWrittenCount <= 0) continue;
    if (filterExamIds && !filterExamIds.has(res.examId)) continue;
    const attempt = db.examAttempts.find((a) => a.id === res.attemptId);
    const exam = db.exams.find((e) => e.id === res.examId);
    const student = db.users.find((u) => u.id === res.studentId);
    if (!attempt || !exam || !student) continue;

    const writtenItems = db.studentAnswers
      .filter((sa) => sa.attemptId === attempt.id)
      .map((answer) => {
        const question = db.questions.find((q) => q.id === answer.questionId);
        return question && question.type === 'written' ? { answer, question } : null;
      })
      .filter((x): x is { answer: typeof db.studentAnswers[number]; question: Question } => Boolean(x));

    if (writtenItems.length > 0) {
      items.push({
        attempt,
        exam,
        student: { id: student.id, name: student.name, email: student.email },
        result: res,
        writtenItems,
      });
    }
  }
  return items;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // =========================================================================
  // PUBLIC ROUTES
  // =========================================================================
  app.get('/api/public/overview', (_req, res) => {
    const db = store.db;
    const instructorsMap = new Map(
      db.users.filter((u) => u.role === 'instructor').map((u) => [u.id, u.name])
    );

    const programs = db.programs
      .filter((p) => p.published)
      .map((p) => {
        const progCourses = db.courses.filter((c) => c.programId === p.id);
        const cIds = new Set(progCourses.map((c) => c.id));
        const lessonCount = db.lessons.filter((l) => cIds.has(l.courseId)).length;
        const enrolledCount = db.enrollments.filter((e) => e.programId === p.id).length;
        return {
          ...p,
          instructorName: instructorsMap.get(p.instructorId) || 'Academic Faculty',
          courseCount: progCourses.length,
          lessonCount,
          enrolledCount,
        };
      });

    const exams = db.exams.map((e) => ({
      ...e,
      questionCount: e.questionIds.length,
    }));

    res.json({
      settings: db.settings,
      categories: db.categories,
      programs,
      exams,
      stats: {
        totalStudents: db.users.filter((u) => u.role === 'student').length,
        totalPrograms: programs.length,
        totalExams: exams.length,
        totalAttemptsCompleted: db.examAttempts.filter((a) => a.status !== 'in_progress').length,
      },
    });
  });

  app.get('/api/public/programs/:id', (req, res) => {
    const db = store.db;
    const program = db.programs.find((p) => p.id === req.params.id || p.slug === req.params.id);
    if (!program) {
      res.status(404).json({ error: 'Program not found.' });
      return;
    }
    const instructor = db.users.find((u) => u.id === program.instructorId);
    const category = db.categories.find((c) => c.id === program.categoryId);
    const courses = db.courses
      .filter((c) => c.programId === program.id)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((c) => ({
        ...c,
        lessons: db.lessons
          .filter((l) => l.courseId === c.id)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map(({ content: _content, ...preview }) => preview),
      }));
    const linkedExams = db.exams.filter((e) => e.programId === program.id);
    const enrolledCount = db.enrollments.filter((e) => e.programId === program.id).length;

    res.json({
      program,
      category,
      instructor: instructor
        ? { id: instructor.id, name: instructor.name, institution: instructor.institution, bio: instructor.bio }
        : null,
      courses,
      linkedExams,
      enrolledCount,
    });
  });

  app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      res.status(400).json({ error: 'Please complete all contact fields.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    store.db.contactSubmissions.unshift({
      id: makeId('msg'),
      name: String(name).trim(),
      email: String(email).trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
      createdAt: new Date().toISOString(),
    });
    store.save();
    res.json({ ok: true, message: 'Thank you. Your inquiry has been received by the EduTrack team.' });
  });

  app.get('/api/schema-sql', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(EDUTRACK_MYSQL_SCHEMA);
  });

  // =========================================================================
  // AUTH ROUTES
  // =========================================================================
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, institution, phone } = req.body || {};
    if (!store.db.settings.allowSelfRegistration) {
      res.status(403).json({ error: 'Self-registration is currently disabled by the administrator.' });
      return;
    }
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Full name, email, and password are required.' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Invalid email address format.' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }
    if (store.db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const user: StoredUser = {
      id: makeId('usr'),
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash: hashPassword(String(password)),
      role: 'student',
      phone: phone ? String(phone).trim() : '',
      institution: institution ? String(institution).trim() : 'Independent Learner',
      bio: 'Student learner on EduTrack.',
      active: true,
      createdAt: new Date().toISOString(),
    };
    store.db.users.push(user);
    store.notify(
      user.id,
      'Welcome to EduTrack',
      'Your student account is active. Browse free educational programs or start a practice quiz anytime.',
      'programs'
    );
    const token = store.createSession(user.id);
    res.status(201).json({ token, user: sanitizeUser(user) });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const user = store.db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (!user.active) {
      res.status(403).json({ error: 'This account has been deactivated. Contact an administrator.' });
      return;
    }
    const token = store.createSession(user.id);
    res.json({ token, user: sanitizeUser(user) });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { email, newPassword } = req.body || {};
    if (!email || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'Provide your registered email and a new password (min 6 characters).' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const user = store.db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      res.status(404).json({ error: 'No account found matching that email address.' });
      return;
    }
    user.passwordHash = hashPassword(String(newPassword));
    store.save();
    res.json({ ok: true, message: 'Password updated successfully. You may now sign in.' });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthedRequest, res) => {
    if (req.authToken) store.deleteSession(req.authToken);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: sanitizeUser(req.authUser!) });
  });

  app.patch('/api/auth/profile', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { name, phone, institution, bio, currentPassword, newPassword } = req.body || {};

    if (newPassword) {
      if (!currentPassword || !verifyPassword(String(currentPassword), user.passwordHash)) {
        res.status(400).json({ error: 'Current password is incorrect.' });
        return;
      }
      if (String(newPassword).length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters.' });
        return;
      }
      user.passwordHash = hashPassword(String(newPassword));
    }

    if (name && String(name).trim()) user.name = String(name).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (institution !== undefined) user.institution = String(institution).trim();
    if (bio !== undefined) user.bio = String(bio).trim();

    store.save();
    res.json({ user: sanitizeUser(user) });
  });

  // =========================================================================
  // STUDENT PORTAL ROUTES
  // =========================================================================
  app.get('/api/student/dashboard', requireAuth, (req: AuthedRequest, res) => {
    const db = store.db;
    const studentId = req.authUser!.id;
    const enrollments = db.enrollments.filter((e) => e.studentId === studentId);
    const enrolledProgramIds = new Set(enrollments.map((e) => e.programId));

    const instructorsMap = new Map(
      db.users.filter((u) => u.role === 'instructor').map((u) => [u.id, u.name])
    );

    const programs = db.programs
      .filter((p) => p.published || enrolledProgramIds.has(p.id))
      .map((p) => ({
        ...p,
        instructorName: instructorsMap.get(p.instructorId) || 'Faculty',
      }));

    const courses = db.courses.filter((c) => enrolledProgramIds.has(c.programId));
    const courseIds = new Set(courses.map((c) => c.id));
    const lessons = db.lessons.filter((l) => courseIds.has(l.courseId));

    const lessonProgress = db.lessonProgress.filter((lp) => lp.studentId === studentId);
    const attempts = db.examAttempts.filter((a) => a.studentId === studentId);
    const results = db.results.filter((r) => r.studentId === studentId);
    const notifications = db.notifications
      .filter((n) => n.userId === studentId)
      .slice(0, 30);
    const announcements = db.announcements.filter(
      (a) => a.targetRole === 'all' || a.targetRole === 'student'
    );
    const certificates = db.certificates
      .filter((c) => c.studentId === studentId)
      .map((c) => ({
        ...c,
        programTitle: db.programs.find((p) => p.id === c.programId)?.title || 'Program',
        studentName: req.authUser!.name,
      }));
    const earnedLinks = db.studentAchievements.filter((sa) => sa.studentId === studentId);
    const achievements = db.achievements.map((a) => {
      const link = earnedLinks.find((l) => l.achievementId === a.id);
      return { ...a, earnedAt: link?.earnedAt };
    });

    const analytics = computeStudentAnalytics(studentId);

    res.json({
      categories: db.categories,
      programs,
      courses,
      lessons,
      enrollments,
      lessonProgress,
      exams: db.exams,
      attempts,
      results,
      notifications,
      announcements,
      certificates,
      achievements,
      analytics,
    });
  });

  app.post('/api/student/enroll', requireAuth, (req: AuthedRequest, res) => {
    const { programId } = req.body || {};
    const db = store.db;
    const studentId = req.authUser!.id;
    const program = db.programs.find((p) => p.id === programId && p.published);
    if (!program) {
      res.status(404).json({ error: 'Program not found.' });
      return;
    }
    const existing = db.enrollments.find(
      (e) => e.studentId === studentId && e.programId === programId
    );
    if (existing) {
      res.json({ enrollment: existing });
      return;
    }
    const enrollment = {
      id: makeId('enr'),
      studentId,
      programId: program.id,
      enrolledAt: new Date().toISOString(),
      completedAt: null,
    };
    db.enrollments.push(enrollment);
    store.grantAchievement(studentId, 'FIRST_ENROLL');
    store.notify(
      studentId,
      `Enrolled in ${program.title}`,
      'You now have full access to all modules, lessons, and assessments in this program.',
      'my-programs'
    );
    store.save();
    res.status(201).json({ enrollment });
  });

  app.post('/api/student/lessons/:lessonId/complete', requireAuth, (req: AuthedRequest, res) => {
    const db = store.db;
    const studentId = req.authUser!.id;
    const lesson = db.lessons.find((l) => l.id === req.params.lessonId);
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }
    const course = db.courses.find((c) => c.id === lesson.courseId);
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }
    const enrolled = db.enrollments.some(
      (e) => e.studentId === studentId && e.programId === course.programId
    );
    if (!enrolled) {
      res.status(403).json({ error: 'Please enroll in this program first.' });
      return;
    }
    const existing = db.lessonProgress.find(
      (lp) => lp.studentId === studentId && lp.lessonId === lesson.id
    );
    if (!existing) {
      db.lessonProgress.push({
        id: makeId('lp'),
        studentId,
        lessonId: lesson.id,
        completedAt: new Date().toISOString(),
      });
    }
    store.checkProgramCompletion(studentId, course.programId);
    store.save();
    res.json({ ok: true });
  });

  app.post('/api/student/notifications/read', requireAuth, (req: AuthedRequest, res) => {
    const studentId = req.authUser!.id;
    const { notificationId } = req.body || {};
    for (const n of store.db.notifications) {
      if (n.userId === studentId && (!notificationId || n.id === notificationId)) {
        n.read = true;
      }
    }
    store.save();
    res.json({ ok: true });
  });

  // =========================================================================
  // ONLINE EXAMINATION ENGINE (SERVER-ENFORCED TIMER & ANSWER KEYS)
  // =========================================================================
  app.post('/api/exams/:examId/start', requireAuth, (req: AuthedRequest, res) => {
    const db = store.db;
    const user = req.authUser!;
    const exam = db.exams.find((e) => e.id === req.params.examId);
    if (!exam) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

    const nowMs = Date.now();
    if (exam.mode === 'scheduled') {
      if (nowMs < new Date(exam.startTime).getTime()) {
        res.status(403).json({ error: 'This scheduled examination has not opened yet.' });
        return;
      }
      if (nowMs > new Date(exam.endTime).getTime()) {
        res.status(403).json({ error: 'This scheduled examination window has closed.' });
        return;
      }
    }

    // Resume existing in_progress attempt if not expired
    let attempt = db.examAttempts.find(
      (a) => a.examId === exam.id && a.studentId === user.id && a.status === 'in_progress'
    );
    if (attempt && Date.now() >= new Date(attempt.expiresAt).getTime()) {
      store.finalizeExamAttempt(attempt.id);
      attempt = undefined;
    }

    if (!attempt) {
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + exam.durationMinutes * 60_000);
      attempt = {
        id: makeId('att'),
        examId: exam.id,
        studentId: user.id,
        startedAt: startedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        submittedAt: null,
        status: 'in_progress',
      };
      db.examAttempts.push(attempt);
      store.save();
    }

    const questions = exam.questionIds
      .map((qid) => db.questions.find((q) => q.id === qid))
      .filter((q): q is Question => Boolean(q))
      .map(stripQuestionKeys);

    const savedAnswers = db.studentAnswers.filter((sa) => sa.attemptId === attempt!.id);

    res.json({
      exam,
      attempt,
      questions,
      savedAnswers,
      serverNow: new Date().toISOString(),
    });
  });

  app.patch('/api/attempts/:attemptId/answers', requireAuth, (req: AuthedRequest, res) => {
    const db = store.db;
    const attempt = db.examAttempts.find((a) => a.id === req.params.attemptId);
    if (!attempt || attempt.studentId !== req.authUser!.id) {
      res.status(404).json({ error: 'Examination attempt not found.' });
      return;
    }
    if (attempt.status !== 'in_progress') {
      res.status(409).json({ error: 'Examination has already been submitted and cannot be modified.' });
      return;
    }
    if (Date.now() > new Date(attempt.expiresAt).getTime() + 5000) {
      const finalized = store.finalizeExamAttempt(attempt.id);
      res.status(410).json({ error: 'Time expired. Examination was automatically submitted.', ...finalized });
      return;
    }

    const answersPayload = Array.isArray(req.body?.answers) ? req.body.answers : [];
    for (const item of answersPayload) {
      if (!item.questionId) continue;
      const q = db.questions.find((qq) => qq.id === item.questionId);
      if (!q) continue;
      let record = db.studentAnswers.find(
        (sa) => sa.attemptId === attempt.id && sa.questionId === q.id
      );
      if (!record) {
        record = {
          id: makeId('ans'),
          attemptId: attempt.id,
          questionId: q.id,
          selectedOptionId: null,
          writtenText: null,
          isCorrect: null,
          awardedMarks: null,
          feedback: null,
          reviewedBy: null,
          reviewedAt: null,
        };
        db.studentAnswers.push(record);
      }
      if (q.type === 'mcq' && item.selectedOptionId !== undefined) {
        record.selectedOptionId = item.selectedOptionId || null;
      }
      if (q.type === 'written' && item.writtenText !== undefined) {
        record.writtenText = item.writtenText !== null ? String(item.writtenText) : null;
      }
    }

    store.save();
    res.json({ ok: true, savedAt: new Date().toISOString() });
  });

  app.post('/api/attempts/:attemptId/submit', requireAuth, (req: AuthedRequest, res) => {
    const db = store.db;
    const attempt = db.examAttempts.find((a) => a.id === req.params.attemptId);
    if (!attempt || attempt.studentId !== req.authUser!.id) {
      res.status(404).json({ error: 'Examination attempt not found.' });
      return;
    }

    if (attempt.status === 'in_progress' && Array.isArray(req.body?.answers)) {
      for (const item of req.body.answers) {
        if (!item.questionId) continue;
        const q = db.questions.find((qq) => qq.id === item.questionId);
        if (!q) continue;
        let record = db.studentAnswers.find(
          (sa) => sa.attemptId === attempt.id && sa.questionId === q.id
        );
        if (!record) {
          record = {
            id: makeId('ans'),
            attemptId: attempt.id,
            questionId: q.id,
            selectedOptionId: null,
            writtenText: null,
            isCorrect: null,
            awardedMarks: null,
            feedback: null,
            reviewedBy: null,
            reviewedAt: null,
          };
          db.studentAnswers.push(record);
        }
        if (q.type === 'mcq' && item.selectedOptionId !== undefined) {
          record.selectedOptionId = item.selectedOptionId || null;
        }
        if (q.type === 'written' && item.writtenText !== undefined) {
          record.writtenText = item.writtenText !== null ? String(item.writtenText) : null;
        }
      }
    }

    const finalized = store.finalizeExamAttempt(attempt.id);
    res.json(finalized);
  });

  app.get('/api/attempts/:attemptId/review', requireAuth, (req: AuthedRequest, res) => {
    const db = store.db;
    const attempt = db.examAttempts.find((a) => a.id === req.params.attemptId);
    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found.' });
      return;
    }
    const isStaff = req.authUser!.role === 'admin' || req.authUser!.role === 'instructor';
    if (!isStaff && attempt.studentId !== req.authUser!.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    if (attempt.status === 'in_progress') {
      res.status(403).json({ error: 'Answer keys are protected until examination submission.' });
      return;
    }

    const exam = db.exams.find((e) => e.id === attempt.examId);
    const result = db.results.find((r) => r.attemptId === attempt.id);
    if (!exam || !result) {
      res.status(404).json({ error: 'Result record not found.' });
      return;
    }

    const items = exam.questionIds
      .map((qid) => {
        const question = db.questions.find((q) => q.id === qid);
        if (!question) return null;
        const answer = db.studentAnswers.find(
          (sa) => sa.attemptId === attempt.id && sa.questionId === qid
        );
        return {
          question: result.published || isStaff ? question : stripQuestionKeys(question),
          answer: answer || null,
        };
      })
      .filter(Boolean);

    res.json({ exam, attempt, result, items });
  });

  // =========================================================================
  // INSTRUCTOR & ADMIN WORKSPACE ROUTES
  // =========================================================================
  app.get(
    '/api/manage/workspace',
    requireAuth,
    requireRole('instructor', 'admin'),
    (req: AuthedRequest, res) => {
      const db = store.db;
      const user = req.authUser!;
      const isAdmin = user.role === 'admin';

      const scopedPrograms = isAdmin
        ? db.programs
        : db.programs.filter((p) => p.instructorId === user.id);
      const scopedProgramIds = new Set(scopedPrograms.map((p) => p.id));

      const scopedCourses = isAdmin
        ? db.courses
        : db.courses.filter((c) => scopedProgramIds.has(c.programId));
      const scopedCourseIds = new Set(scopedCourses.map((c) => c.id));

      const scopedLessons = isAdmin
        ? db.lessons
        : db.lessons.filter((l) => scopedCourseIds.has(l.courseId));

      const scopedExams = isAdmin
        ? db.exams
        : db.exams.filter(
            (e) =>
              e.createdBy === user.id || (e.programId !== null && scopedProgramIds.has(e.programId))
          );
      const scopedExamIds = new Set(scopedExams.map((e) => e.id));

      const scopedQuestions = isAdmin
        ? db.questions
        : db.questions.filter((q) => q.createdBy === user.id || scopedExams.some((e) => e.questionIds.includes(q.id)));

      const scopedEnrollments = isAdmin
        ? db.enrollments
        : db.enrollments.filter((e) => scopedProgramIds.has(e.programId));

      const scopedResults = isAdmin
        ? db.results
        : db.results.filter((r) => scopedExamIds.has(r.examId));

      const pendingReviews = buildPendingReviews(isAdmin ? undefined : scopedExamIds);

      const safeUsers = db.users.map(sanitizeUser);
      const students = safeUsers.filter((u) => u.role === 'student');
      const instructors = safeUsers.filter((u) => u.role === 'instructor');

      const announcements = db.announcements.filter((a) =>
        isAdmin ? true : a.targetRole === 'all' || a.targetRole === 'instructor'
      );

      res.json({
        categories: db.categories,
        programs: scopedPrograms,
        courses: scopedCourses,
        lessons: scopedLessons,
        questions: scopedQuestions,
        exams: scopedExams,
        enrollments: scopedEnrollments,
        results: scopedResults,
        pendingReviews,
        students,
        instructors,
        users: isAdmin ? safeUsers : undefined,
        announcements,
        notifications: db.notifications.filter((n) => n.userId === user.id),
        settings: db.settings,
        contactSubmissions: isAdmin ? db.contactSubmissions : undefined,
        platformStats: {
          totalStudents: students.length,
          totalInstructors: instructors.length,
          totalPrograms: scopedPrograms.length,
          totalExams: scopedExams.length,
          totalResults: scopedResults.length,
          pendingEvaluations: pendingReviews.length,
          averagePlatformScore:
            scopedResults.length > 0
              ? Math.round(
                  (scopedResults.reduce((acc, r) => acc + r.percentage, 0) /
                    scopedResults.length) *
                    10
                ) / 10
              : 0,
        },
      });
    }
  );

  // Courses & Lessons (Instructor for assigned programs, or Admin)
  app.post(
    '/api/manage/courses',
    requireAuth,
    requireRole('instructor', 'admin'),
    (req: AuthedRequest, res) => {
      const { programId, title, description } = req.body || {};
      const prog = store.db.programs.find((p) => p.id === programId);
      if (!prog) {
        res.status(404).json({ error: 'Program not found.' });
        return;
      }
      if (req.authUser!.role === 'instructor' && prog.instructorId !== req.authUser!.id) {
        res.status(403).json({ error: 'You can only manage courses inside your assigned programs.' });
        return;
      }
      if (!title) {
        res.status(400).json({ error: 'Course title is required.' });
        return;
      }
      const orderIndex =
        store.db.courses.filter((c) => c.programId === prog.id).length + 1;
      const course = {
        id: makeId('crs'),
        programId: prog.id,
        title: String(title).trim(),
        description: String(description || '').trim(),
        orderIndex,
      };
      store.db.courses.push(course);
      store.save();
      res.status(201).json({ course });
    }
  );

  app.delete(
    '/api/manage/courses/:id',
    requireAuth,
    requireRole('instructor', 'admin'),
    (req: AuthedRequest, res) => {
      const db = store.db;
      const course = db.courses.find((c) => c.id === req.params.id);
      if (!course) {
        res.status(404).json({ error: 'Course not found.' });
        return;
      }
      const prog = db.programs.find((p) => p.id === course.programId);
      if (req.authUser!.role === 'instructor' && prog?.instructorId !== req.authUser!.id) {
        res.status(403).json({ error: 'Forbidden.' });
        return;
      }
      db.courses = db.courses.filter((c) => c.id !== course.id);
      db.lessons = db.lessons.filter((l) => l.courseId !== course.id);
      store.save();
      res.json({ ok: true });
    }
  );

  app.post(
    '/api/manage/lessons',
    requireAuth,
    requireRole('instructor', 'admin'),
    (req: AuthedRequest, res) => {
      const { courseId, title, summary, content, durationMinutes, resourceType } = req.body || {};
      const course = store.db.courses.find((c) => c.id === courseId);
      if (!course) {
        res.status(404).json({ error: 'Course not found.' });
        return;
      }
      const prog = store.db.programs.find((p) => p.id === course.programId);
      if (req.authUser!.role === 'instructor' && prog?.instructorId !== req.authUser!.id) {
        res.status(403).json({ error: 'You can only add lessons to your assigned programs.' });
        return;
      }
      if (!title || !content) {
        res.status(400).json({ error: 'Lesson title and content are required.' });
        return;
      }
      const orderIndex =
        store.db.lessons.filter((l) => l.courseId === course.id).length + 1;
      const lesson = {
        id: makeId('les'),
        courseId: course.id,
        title: String(title).trim(),
        summary: String(summary || '').trim(),
        content: String(content).trim(),
        durationMinutes: Math.max(5, Number(durationMinutes) || 15),
        resourceType: (['Reading', 'Lab Guide', 'Reference'].includes(resourceType)
          ? resourceType
          : 'Reading') as 'Reading' | 'Lab Guide' | 'Reference',
        orderIndex,
      };
      store.db.lessons.push(lesson);
      store.save();
      res.status(201).json({ lesson });
    }
  );

  app.delete(
    '/api/manage/lessons/:id',
    requireAuth,
    requireRole('instructor', 'admin'),
    (req: AuthedRequest, res) => {
      const db = store.db;
      const lesson = db.lessons.find((l) => l.id === req.params.id);
      if (!lesson) {
        res.status(404).json({ error: 'Lesson not found.' });
        return;
      }
      const course = db.courses.find((c) => c.id === lesson.courseId);
      const prog = course ? db.programs.find((p) => p.id === course.programId) : undefined;
      if (req.authUser!.role === 'instructor' && prog?.instructorId !== req.authUser!.id) {
        res.status(403).json({ error: 'Forbidden.' });
        return;
      }
      db.lessons = db.lessons.filter((l) => l.id !== lesson.id);
      store.save();
      res.json({ ok: true });
    }
  );

  // Questions CRUD
  app.post(
    '/api/manage/questions',
    requireAuth,
    requireRole('instructor', 'admin'),
    (req: AuthedRequest, res) => {
      const { categoryId, type, prompt, options, correctOptionId, explanation, marks, difficulty } =
        req.body || {};
      if (!categoryId || !prompt || !['mcq', 'written'].includes(type)) {
        res.status(400).json({ error: 'Category, valid question type, and prompt are required.' });
        return;
      }
      if (type === 'mcq' && (!Array.isArray(options) || options.length < 2 || !correctOptionId)) {
        res.status(400).json({ error: 'MCQ questions require at least 2 options and a selected correct answer.' });
        return;
      }
      const question: Question = {
        id: makeId('q'),
        categoryId: String(categoryId),
        createdBy: req.authUser!.id,
        type,
        prompt: String(prompt).trim(),
        options:
          type === 'mcq'
            ? options.map((opt: { id?: string; text: string }, idx: number) => ({
                id: opt.id || `o${idx + 1}`,
                text: String(opt.text).trim(),
              }))
            : [],
        correctOptionId: type === 'mcq' ? String(correctOptionId) : undefined,
        explanation: explanation ? String(explanation).trim() : undefined,
        marks: Math.max(1, Number(marks) || 5),
        difficulty: ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium',
      };
      store.db.questions.push(question);
      store.save();
      res.status(201).json({ question });
    }
  );

  app.delete(
    '/api/manage/questions/:id',
    requireAuth,
    requireRole('instructor', 'admin'),
    (req: AuthedRequest, res) => {
      const db = store.db;
      const q = db.questions.find((qq) => qq.id === req.params.id);
      if (!q) {
        res.status(404).json({ error: 'Question not found.' });
        return;
      }
      if (req.authUser!.role === 'instructor' && q.createdBy !== req.authUser!.id) {
        res.status(403).json({ error: 'You can only delete questions you created.' });
        return;
      }
      db.questions = db.questions.filter((qq) => qq.id !== q.id);
      for (const exam of db.exams) {
        exam.questionIds = exam.questionIds.filter((qid) => qid !== q.id);
      }
      store.save();
      res.json({ ok: true });
    }
  );

  // Exams CRUD
  app.post(
    '/api/manage/exams',
    requireAuth,
    requireRole('instructor', 'admin'),
    (req: AuthedRequest, res) => {
      const {
        title,
        categoryId,
        programId,
        mode,
        description,
        durationMinutes,
        passMarks,
        negativeMarking,
        startTime,
        endTime,
        resultPublished,
        questionIds,
      } = req.body || {};

      if (!title || !categoryId || !Array.isArray(questionIds) || questionIds.length === 0) {
        res.status(400).json({ error: 'Title, category, and at least one selected question are required.' });
        return;
      }

      if (programId && req.authUser!.role === 'instructor') {
        const prog = store.db.programs.find((p) => p.id === programId);
        if (!prog || prog.instructorId !== req.authUser!.id) {
          res.status(403).json({ error: 'You can only attach exams to your assigned programs.' });
          return;
        }
      }

      const selectedQuestions = questionIds
        .map((qid: string) => store.db.questions.find((q) => q.id === qid))
        .filter((q): q is Question => Boolean(q));
      const totalMarks = selectedQuestions.reduce((acc, q) => acc + q.marks, 0);

      const exam: Exam = {
        id: makeId('exam'),
        title: String(title).trim(),
        categoryId: String(categoryId),
        programId: programId || null,
        createdBy: req.authUser!.id,
        mode: mode === 'practice' ? 'practice' : 'scheduled',
        description: String(description || '').trim(),
        durationMinutes: Math.max(5, Number(durationMinutes) || 20),
        totalMarks,
        passMarks: Math.min(totalMarks, Math.max(1, Number(passMarks) || Math.ceil(totalMarks * 0.6))),
        negativeMarking: Math.max(0, Number(negativeMarking) || 0),
        startTime: startTime || new Date().toISOString(),
        endTime: endTime || new Date(Date.now() + 60 * 86400_000).toISOString(),
        resultPublished: resultPublished !== false,
        questionIds: selectedQuestions.map((q) => q.id),
        createdAt: new Date().toISOString(),
      };
      store.db.exams.push(exam);
      store.save();
      res.status(201).json({ exam });
    }
  );

  app.delete(
    '/api/manage/exams/:id',
    requireAuth,
    requireRole('instructor', 'admin'),
    (req: AuthedRequest, res) => {
      const db = store.db;
      const exam = db.exams.find((e) => e.id === req.params.id);
      if (!exam) {
        res.status(404).json({ error: 'Exam not found.' });
        return;
      }
      if (req.authUser!.role === 'instructor' && exam.createdBy !== req.authUser!.id) {
        res.status(403).json({ error: 'You can only delete exams you created.' });
        return;
      }
      db.exams = db.exams.filter((e) => e.id !== exam.id);
      store.save();
      res.json({ ok: true });
    }
  );

  // Written Answer Evaluation (Instructor or Admin)
  app.post(
    '/api/manage/reviews/:attemptId',
    requireAuth,
    requireRole('instructor', 'admin'),
    (req: AuthedRequest, res) => {
      const db = store.db;
      const attempt = db.examAttempts.find((a) => a.id === req.params.attemptId);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found.' });
        return;
      }
      const exam = db.exams.find((e) => e.id === attempt.examId);
      if (!exam) {
        res.status(404).json({ error: 'Exam not found.' });
        return;
      }
      if (req.authUser!.role === 'instructor') {
        const prog = exam.programId ? db.programs.find((p) => p.id === exam.programId) : null;
        if (exam.createdBy !== req.authUser!.id && prog?.instructorId !== req.authUser!.id) {
          res.status(403).json({ error: 'Not authorized to evaluate this examination.' });
          return;
        }
      }

      const evaluations: { answerId: string; awardedMarks: number; feedback: string }[] =
        Array.isArray(req.body?.evaluations) ? req.body.evaluations : [];

      for (const ev of evaluations) {
        const ans = db.studentAnswers.find(
          (sa) => sa.id === ev.answerId && sa.attemptId === attempt.id
        );
        if (!ans) continue;
        const q = db.questions.find((qq) => qq.id === ans.questionId);
        if (!q || q.type !== 'written') continue;
        const clampedMarks = Math.max(0, Math.min(q.marks, Number(ev.awardedMarks) || 0));
        ans.awardedMarks = Math.round(clampedMarks * 100) / 100;
        ans.feedback = String(ev.feedback || '').trim();
        ans.reviewedBy = req.authUser!.id;
        ans.reviewedAt = new Date().toISOString();
      }

      // Recalculate Result atomically
      const questions = exam.questionIds
        .map((qid) => db.questions.find((q) => q.id === qid))
        .filter((q): q is Question => Boolean(q));

      let totalMarks = 0;
      let obtainedMarks = 0;
      let pendingWrittenCount = 0;

      for (const q of questions) {
        totalMarks += q.marks;
        const ans = db.studentAnswers.find(
          (sa) => sa.attemptId === attempt.id && sa.questionId === q.id
        );
        if (q.type === 'mcq') {
          obtainedMarks += ans?.awardedMarks || 0;
        } else {
          if (ans && ans.awardedMarks !== null && ans.awardedMarks !== undefined) {
            obtainedMarks += ans.awardedMarks;
          } else {
            pendingWrittenCount += 1;
          }
        }
      }

      obtainedMarks = Math.max(0, Math.round(obtainedMarks * 100) / 100);
      const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 1000) / 10 : 0;
      const passed = pendingWrittenCount === 0 && obtainedMarks >= exam.passMarks;

      const result = db.results.find((r) => r.attemptId === attempt.id);
      if (result) {
        result.totalMarks = totalMarks;
        result.obtainedMarks = obtainedMarks;
        result.percentage = percentage;
        result.passed = passed;
        result.pendingWrittenCount = pendingWrittenCount;
        result.published = pendingWrittenCount === 0;
        result.evaluatedAt = new Date().toISOString();
      }

      if (pendingWrittenCount === 0) {
        attempt.status = 'evaluated';
        if (percentage === 100) {
          store.grantAchievement(attempt.studentId, 'PERFECT_SCORE');
        }
        store.notify(
          attempt.studentId,
          `Written Evaluation Published: ${exam.title}`,
          `Your written answers have been graded. Final score: ${obtainedMarks}/${totalMarks} (${percentage}%).`,
          'results'
        );
      }

      store.save();
      res.json({ ok: true, result, attempt });
    }
  );

  // =========================================================================
  // ADMIN-ONLY ROUTES
  // =========================================================================
  app.post('/api/admin/users', requireAuth, requireRole('admin'), (req, res) => {
    const { name, email, password, role, institution, phone } = req.body || {};
    if (!name || !email || !password || !['student', 'instructor', 'admin'].includes(role)) {
      res.status(400).json({ error: 'Name, email, password, and valid role are required.' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    if (store.db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'Email already exists.' });
      return;
    }
    const user: StoredUser = {
      id: makeId('usr'),
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash: hashPassword(String(password)),
      role,
      phone: phone ? String(phone).trim() : '',
      institution: institution ? String(institution).trim() : 'EduTrack Faculty',
      bio: '',
      active: true,
      createdAt: new Date().toISOString(),
    };
    store.db.users.push(user);
    store.save();
    res.status(201).json({ user: sanitizeUser(user) });
  });

  app.patch('/api/admin/users/:id', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const user = store.db.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (user.id === req.authUser!.id && req.body?.active === false) {
      res.status(400).json({ error: 'You cannot deactivate your own active admin account.' });
      return;
    }
    if (req.body?.active !== undefined) user.active = Boolean(req.body.active);
    if (req.body?.role && ['student', 'instructor', 'admin'].includes(req.body.role)) {
      user.role = req.body.role;
    }
    if (req.body?.name) user.name = String(req.body.name).trim();
    store.save();
    res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/admin/categories', requireAuth, requireRole('admin'), (req, res) => {
    const { name, description } = req.body || {};
    if (!name) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const slug = String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    const category = {
      id: makeId('cat'),
      name: String(name).trim(),
      slug,
      description: String(description || '').trim(),
    };
    store.db.categories.push(category);
    store.save();
    res.status(201).json({ category });
  });

  app.delete('/api/admin/categories/:id', requireAuth, requireRole('admin'), (req, res) => {
    store.db.categories = store.db.categories.filter((c) => c.id !== req.params.id);
    store.save();
    res.json({ ok: true });
  });

  app.post('/api/admin/programs', requireAuth, requireRole('admin'), (req, res) => {
    const { title, categoryId, instructorId, description, objectives, level, durationLabel, coverKey } =
      req.body || {};
    if (!title || !categoryId || !instructorId || !description) {
      res.status(400).json({ error: 'Title, category, instructor, and description are required.' });
      return;
    }
    const slug = String(title)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    const program = {
      id: makeId('prog'),
      title: String(title).trim(),
      slug,
      categoryId: String(categoryId),
      instructorId: String(instructorId),
      description: String(description).trim(),
      objectives: Array.isArray(objectives)
        ? objectives.filter(Boolean).map(String)
        : ['Master core domain concepts and complete assessments'],
      level: (['Beginner', 'Intermediate', 'Advanced'].includes(level) ? level : 'Beginner') as
        | 'Beginner'
        | 'Intermediate'
        | 'Advanced',
      durationLabel: String(durationLabel || '4 Weeks').trim(),
      coverKey: (['web', 'python', 'database', 'math', 'english', 'ict'].includes(coverKey)
        ? coverKey
        : 'web') as 'web' | 'python' | 'database' | 'math' | 'english' | 'ict',
      published: true,
      createdAt: new Date().toISOString(),
    };
    store.db.programs.push(program);
    store.save();
    res.status(201).json({ program });
  });

  app.patch('/api/admin/programs/:id', requireAuth, requireRole('admin'), (req, res) => {
    const prog = store.db.programs.find((p) => p.id === req.params.id);
    if (!prog) {
      res.status(404).json({ error: 'Program not found.' });
      return;
    }
    if (req.body?.instructorId) prog.instructorId = String(req.body.instructorId);
    if (req.body?.published !== undefined) prog.published = Boolean(req.body.published);
    if (req.body?.title) prog.title = String(req.body.title).trim();
    store.save();
    res.json({ program: prog });
  });

  app.delete('/api/admin/programs/:id', requireAuth, requireRole('admin'), (req, res) => {
    const db = store.db;
    db.programs = db.programs.filter((p) => p.id !== req.params.id);
    const removedCourses = db.courses.filter((c) => c.programId === req.params.id).map((c) => c.id);
    db.courses = db.courses.filter((c) => c.programId !== req.params.id);
    db.lessons = db.lessons.filter((l) => !removedCourses.includes(l.courseId));
    store.save();
    res.json({ ok: true });
  });

  app.post('/api/admin/enrollments', requireAuth, requireRole('admin'), (req, res) => {
    const { studentId, programId } = req.body || {};
    const existing = store.db.enrollments.find(
      (e) => e.studentId === studentId && e.programId === programId
    );
    if (existing) {
      res.json({ enrollment: existing });
      return;
    }
    const enrollment = {
      id: makeId('enr'),
      studentId: String(studentId),
      programId: String(programId),
      enrolledAt: new Date().toISOString(),
      completedAt: null,
    };
    store.db.enrollments.push(enrollment);
    store.save();
    res.status(201).json({ enrollment });
  });

  app.delete('/api/admin/enrollments/:id', requireAuth, requireRole('admin'), (req, res) => {
    store.db.enrollments = store.db.enrollments.filter((e) => e.id !== req.params.id);
    store.save();
    res.json({ ok: true });
  });

  app.patch('/api/admin/results/:id/publish', requireAuth, requireRole('admin'), (req, res) => {
    const result = store.db.results.find((r) => r.id === req.params.id);
    if (!result) {
      res.status(404).json({ error: 'Result not found.' });
      return;
    }
    result.published = Boolean(req.body?.published);
    store.save();
    res.json({ result });
  });

  app.post(
    '/api/admin/announcements',
    requireAuth,
    requireRole('admin'),
    (req: AuthedRequest, res) => {
      const { title, body, targetRole } = req.body || {};
      if (!title || !body) {
        res.status(400).json({ error: 'Announcement title and body are required.' });
        return;
      }
      const ann = {
        id: makeId('ann'),
        title: String(title).trim(),
        body: String(body).trim(),
        authorId: req.authUser!.id,
        targetRole: (['all', 'student', 'instructor'].includes(targetRole) ? targetRole : 'all') as
          | 'all'
          | 'student'
          | 'instructor',
        createdAt: new Date().toISOString(),
      };
      store.db.announcements.unshift(ann);
      store.save();
      res.status(201).json({ announcement: ann });
    }
  );

  app.delete('/api/admin/announcements/:id', requireAuth, requireRole('admin'), (req, res) => {
    store.db.announcements = store.db.announcements.filter((a) => a.id !== req.params.id);
    store.save();
    res.json({ ok: true });
  });

  app.patch('/api/admin/settings', requireAuth, requireRole('admin'), (req, res) => {
    const s = store.db.settings;
    if (req.body?.platformName) s.platformName = String(req.body.platformName).trim();
    if (req.body?.tagline) s.tagline = String(req.body.tagline).trim();
    if (req.body?.allowSelfRegistration !== undefined) {
      s.allowSelfRegistration = Boolean(req.body.allowSelfRegistration);
    }
    if (req.body?.defaultPassPercentage !== undefined) {
      s.defaultPassPercentage = Math.max(10, Math.min(95, Number(req.body.defaultPassPercentage) || 60));
    }
    if (req.body?.maintenanceNotice !== undefined) {
      s.maintenanceNotice = String(req.body.maintenanceNotice).trim();
    }
    store.save();
    res.json({ settings: s });
  });

  // =========================================================================
  // VITE / STATIC SERVING
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found.' });
        return;
      }
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduTrack server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
