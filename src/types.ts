export type UserRole = 'student' | 'instructor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  institution: string;
  bio: string;
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface Program {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  instructorId: string;
  description: string;
  objectives: string[];
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  durationLabel: string;
  coverKey: 'web' | 'python' | 'database' | 'math' | 'english' | 'ict';
  published: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  programId: string;
  title: string;
  description: string;
  orderIndex: number;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  summary: string;
  content: string;
  durationMinutes: number;
  resourceType: 'Reading' | 'Lab Guide' | 'Reference';
  orderIndex: number;
}

export interface Enrollment {
  id: string;
  studentId: string;
  programId: string;
  enrolledAt: string;
  completedAt: string | null;
}

export interface LessonProgress {
  id: string;
  studentId: string;
  lessonId: string;
  completedAt: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  categoryId: string;
  createdBy: string;
  type: 'mcq' | 'written';
  prompt: string;
  options: QuestionOption[];
  correctOptionId?: string;
  explanation?: string;
  marks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface Exam {
  id: string;
  title: string;
  categoryId: string;
  programId: string | null;
  createdBy: string;
  mode: 'practice' | 'scheduled';
  description: string;
  durationMinutes: number;
  totalMarks: number;
  passMarks: number;
  negativeMarking: number;
  startTime: string;
  endTime: string;
  resultPublished: boolean;
  questionIds: string[];
  createdAt: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  status: 'in_progress' | 'submitted' | 'evaluated';
}

export interface StudentAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  writtenText: string | null;
  isCorrect: boolean | null;
  awardedMarks: number | null;
  feedback: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface Result {
  id: string;
  attemptId: string;
  examId: string;
  studentId: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  passed: boolean;
  pendingWrittenCount: number;
  published: boolean;
  evaluatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName?: string;
  targetRole: 'all' | 'student' | 'instructor';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  linkTab?: string;
}

export interface Certificate {
  id: string;
  studentId: string;
  programId: string;
  programTitle?: string;
  studentName?: string;
  issuedAt: string;
  certificateCode: string;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  earnedAt?: string;
}

export interface SystemSettings {
  platformName: string;
  tagline: string;
  allowSelfRegistration: boolean;
  defaultPassPercentage: number;
  maintenanceNotice: string;
}

export interface StudentAnalytics {
  totalEnrolledPrograms: number;
  completedPrograms: number;
  totalExams: number;
  completedExams: number;
  averageScore: number;
  mcqAccuracy: number;
  totalLearningActivities: number;
  completedLessonsCount: number;
  totalAssignedLessonsCount: number;
  overallLearningProgress: number;
  performanceOverTime: {
    dateLabel: string;
    examTitle: string;
    percentage: number;
  }[];
  subjectPerformance: {
    categoryId: string;
    categoryName: string;
    averagePercentage: number;
    attemptsCount: number;
    classification: 'Strength' | 'Developing' | 'Needs Practice';
  }[];
  recommendedExams: Exam[];
}

export interface PendingReviewItem {
  attempt: ExamAttempt;
  exam: Exam;
  student: Pick<User, 'id' | 'name' | 'email'>;
  result: Result;
  writtenItems: {
    answer: StudentAnswer;
    question: Question;
  }[];
}
