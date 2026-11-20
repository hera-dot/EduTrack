import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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
  StudentAnswer,
  SystemSettings,
  User,
  UserRole,
} from '../src/types.ts';

export interface StoredUser extends User {
  passwordHash: string;
}

export interface StudentAchievementLink {
  id: string;
  studentId: string;
  achievementId: string;
  earnedAt: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface DatabaseState {
  users: StoredUser[];
  sessions: Record<string, { userId: string; createdAt: string }>;
  categories: Category[];
  programs: Program[];
  courses: Course[];
  lessons: Lesson[];
  enrollments: Enrollment[];
  lessonProgress: LessonProgress[];
  questions: Question[];
  exams: Exam[];
  examAttempts: ExamAttempt[];
  studentAnswers: StudentAnswer[];
  results: Result[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  achievements: Achievement[];
  studentAchievements: StudentAchievementLink[];
  certificates: Certificate[];
  contactSubmissions: ContactSubmission[];
  settings: SystemSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'edutrack-db.json');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(5).toString('hex')}`;
}

export function sanitizeUser(user: StoredUser): User {
  const { passwordHash: _removed, ...safe } = user;
  return safe;
}

function seedDatabase(): DatabaseState {
  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 86400_000).toISOString();
  const daysAhead = (d: number) => new Date(now + d * 86400_000).toISOString();

  const users: StoredUser[] = [
    {
      id: 'usr_admin_1',
      name: 'Dr. Marcus Vance',
      email: 'admin@edutrack.edu',
      passwordHash: hashPassword('Admin123!'),
      role: 'admin',
      phone: '+1 (555) 230-4410',
      institution: 'EduTrack Academic Board',
      bio: 'Platform Director overseeing academic standards, examination integrity, and curriculum governance.',
      active: true,
      createdAt: daysAgo(120),
    },
    {
      id: 'usr_inst_1',
      name: 'Prof. Elena Rostova',
      email: 'instructor@edutrack.edu',
      passwordHash: hashPassword('Instructor123!'),
      role: 'instructor',
      phone: '+1 (555) 419-8821',
      institution: 'Department of Computer Science',
      bio: 'Senior Lecturer in Web Architecture, Python Systems, and Relational Databases.',
      active: true,
      createdAt: daysAgo(110),
    },
    {
      id: 'usr_inst_2',
      name: 'Prof. Daniel Okafor',
      email: 'instructor2@edutrack.edu',
      passwordHash: hashPassword('Instructor123!'),
      role: 'instructor',
      phone: '+1 (555) 782-1940',
      institution: 'School of Quantitative Sciences',
      bio: 'Mathematics & Computational Logic Educator focused on foundational mastery.',
      active: true,
      createdAt: daysAgo(95),
    },
    {
      id: 'usr_stu_1',
      name: 'Nadia Karim',
      email: 'student@edutrack.edu',
      passwordHash: hashPassword('Student123!'),
      role: 'student',
      phone: '+1 (555) 602-3319',
      institution: 'Metropolitan Open University',
      bio: 'Computer Science undergraduate preparing for full-stack and database certification exams.',
      active: true,
      createdAt: daysAgo(45),
    },
    {
      id: 'usr_stu_2',
      name: 'Liam Chen',
      email: 'student2@edutrack.edu',
      passwordHash: hashPassword('Student123!'),
      role: 'student',
      phone: '+1 (555) 912-0048',
      institution: 'Pacific Technical College',
      bio: 'Focused on Python data workflows and applied mathematics.',
      active: true,
      createdAt: daysAgo(30),
    },
  ];

  const categories: Category[] = [
    {
      id: 'cat_web',
      name: 'Web Development',
      slug: 'web-development',
      description: 'HTML5 semantics, modern CSS architecture, JavaScript, and full-stack fundamentals.',
    },
    {
      id: 'cat_python',
      name: 'Python Programming',
      slug: 'python-programming',
      description: 'Core Python syntax, data structures, algorithms, and clean modular scripting.',
    },
    {
      id: 'cat_db',
      name: 'Database Management',
      slug: 'database-management',
      description: 'Relational modeling, normalization, SQL querying, indexing, and transactions.',
    },
    {
      id: 'cat_math',
      name: 'Mathematics',
      slug: 'mathematics',
      description: 'Discrete structures, linear algebra, probability, and analytical problem solving.',
    },
    {
      id: 'cat_english',
      name: 'English Language',
      slug: 'english-language',
      description: 'Academic grammar, technical communication, and reading comprehension.',
    },
    {
      id: 'cat_ict',
      name: 'ICT & Computer Skills',
      slug: 'ict-computer-skills',
      description: 'Operating systems, networking essentials, cybersecurity hygiene, and office workflows.',
    },
  ];

  const programs: Program[] = [
    {
      id: 'prog_web',
      title: 'Full-Stack Web Engineering Foundations',
      slug: 'full-stack-web-engineering',
      categoryId: 'cat_web',
      instructorId: 'usr_inst_1',
      description:
        'Master semantic HTML5, responsive CSS layout systems, asynchronous JavaScript, and HTTP API design through structured lessons and graded assessments.',
      objectives: [
        'Build accessible, semantic document structures with HTML5',
        'Design fluid responsive grids using CSS Flexbox and Grid',
        'Handle asynchronous state and REST APIs with modern JavaScript',
        'Pass the comprehensive Web Engineering final assessment',
      ],
      level: 'Beginner',
      durationLabel: '6 Weeks',
      coverKey: 'web',
      published: true,
      createdAt: daysAgo(90),
    },
    {
      id: 'prog_python',
      title: 'Python Programming & Algorithmic Thinking',
      slug: 'python-programming-algorithms',
      categoryId: 'cat_python',
      instructorId: 'usr_inst_1',
      description:
        'Learn Python from foundational control flow through object-oriented design, complexity analysis, and structured problem solving.',
      objectives: [
        'Write idiomatic Python functions, comprehensions, and modules',
        'Select optimal lists, dictionaries, and sets for real workloads',
        'Analyze algorithm time and space complexity using Big-O notation',
      ],
      level: 'Intermediate',
      durationLabel: '8 Weeks',
      coverKey: 'python',
      published: true,
      createdAt: daysAgo(85),
    },
    {
      id: 'prog_db',
      title: 'Relational Database Architecture & SQL',
      slug: 'relational-database-sql',
      categoryId: 'cat_db',
      instructorId: 'usr_inst_1',
      description:
        'Design normalized MySQL schemas, write analytical JOIN and aggregate queries, and enforce transactional ACID integrity.',
      objectives: [
        'Normalize schemas through Third Normal Form (3NF)',
        'Write multi-table JOINs, subqueries, and window aggregations',
        'Understand B-Tree indexing and database transactions',
      ],
      level: 'Intermediate',
      durationLabel: '5 Weeks',
      coverKey: 'database',
      published: true,
      createdAt: daysAgo(70),
    },
    {
      id: 'prog_math',
      title: 'Discrete Mathematics & Applied Logic',
      slug: 'discrete-mathematics-logic',
      categoryId: 'cat_math',
      instructorId: 'usr_inst_2',
      description:
        'Develop mathematical rigor in propositional logic, set theory, combinatorics, and probability theory essential for computer science.',
      objectives: [
        'Construct formal truth tables and logical equivalence proofs',
        'Solve permutation, combination, and conditional probability problems',
        'Model relationships using graphs and recurrence relations',
      ],
      level: 'Beginner',
      durationLabel: '6 Weeks',
      coverKey: 'math',
      published: true,
      createdAt: daysAgo(60),
    },
    {
      id: 'prog_english',
      title: 'Academic English & Technical Writing',
      slug: 'academic-english-writing',
      categoryId: 'cat_english',
      instructorId: 'usr_inst_2',
      description:
        'Strengthen academic syntax, critical reading comprehension, structured argumentation, and technical documentation clarity.',
      objectives: [
        'Eliminate structural ambiguity in technical and academic prose',
        'Analyze dense expository passages for central claims and evidence',
        'Draft concise, well-organized analytical responses',
      ],
      level: 'Beginner',
      durationLabel: '4 Weeks',
      coverKey: 'english',
      published: true,
      createdAt: daysAgo(50),
    },
    {
      id: 'prog_ict',
      title: 'Essential ICT & Digital Systems Literacy',
      slug: 'essential-ict-systems',
      categoryId: 'cat_ict',
      instructorId: 'usr_inst_1',
      description:
        'Understand computer hardware architecture, TCP/IP networking basics, cloud storage workflows, and everyday security principles.',
      objectives: [
        'Explain CPU, memory hierarchy, and operating system scheduling',
        'Trace DNS, HTTP, and IP routing fundamentals',
        'Apply password hygiene and phishing defense practices',
      ],
      level: 'Beginner',
      durationLabel: '4 Weeks',
      coverKey: 'ict',
      published: true,
      createdAt: daysAgo(40),
    },
  ];

  const courses: Course[] = [
    {
      id: 'crs_web_1',
      programId: 'prog_web',
      title: 'Module 1: Semantic HTML5 & Modern CSS Layouts',
      description: 'Document landmarks, accessibility, Flexbox, and CSS Grid systems.',
      orderIndex: 1,
    },
    {
      id: 'crs_web_2',
      programId: 'prog_web',
      title: 'Module 2: JavaScript DOM & Asynchronous APIs',
      description: 'Event propagation, Fetch API, Promises, and client-server communication.',
      orderIndex: 2,
    },
    {
      id: 'crs_py_1',
      programId: 'prog_python',
      title: 'Module 1: Python Core & Data Structures',
      description: 'Variables, loops, functions, lists, tuples, sets, and dictionaries.',
      orderIndex: 1,
    },
    {
      id: 'crs_py_2',
      programId: 'prog_python',
      title: 'Module 2: Algorithms & Object-Oriented Python',
      description: 'Classes, inheritance, searching, sorting, and Big-O complexity.',
      orderIndex: 2,
    },
    {
      id: 'crs_db_1',
      programId: 'prog_db',
      title: 'Module 1: Relational Modeling & Normalization',
      description: 'Primary/foreign keys, ER diagrams, 1NF, 2NF, and 3NF design.',
      orderIndex: 1,
    },
    {
      id: 'crs_db_2',
      programId: 'prog_db',
      title: 'Module 2: Advanced SQL & Transactions',
      description: 'INNER/LEFT JOINs, GROUP BY aggregations, indexes, and ACID guarantees.',
      orderIndex: 2,
    },
    {
      id: 'crs_math_1',
      programId: 'prog_math',
      title: 'Module 1: Logic, Sets & Combinatorics',
      description: 'Propositional calculus, set operations, and counting principles.',
      orderIndex: 1,
    },
    {
      id: 'crs_eng_1',
      programId: 'prog_english',
      title: 'Module 1: Precision Grammar & Analytical Reading',
      description: 'Parallel structure, active voice, and argument evaluation.',
      orderIndex: 1,
    },
    {
      id: 'crs_ict_1',
      programId: 'prog_ict',
      title: 'Module 1: Systems, Networks & Security Hygiene',
      description: 'Hardware fundamentals, internet protocols, and digital safety.',
      orderIndex: 1,
    },
  ];

  const lessons: Lesson[] = [
    {
      id: 'les_1',
      courseId: 'crs_web_1',
      title: '1.1 Semantic Landmarks & Accessible Structure',
      summary: 'Why header, nav, main, article, and section tags matter for screen readers and SEO.',
      content:
        'Semantic HTML communicates meaning rather than mere presentation. Screen readers rely on landmark elements such as <header>, <nav>, <main>, <aside>, and <footer> to jump directly between regions of a page.\n\nKey Principles:\n1. Use exactly one <h1> per view representing the primary topic, followed sequentially by <h2> and <h3>.\n2. Pair every form <input> with an explicit <label for="..."> element.\n3. Use <button> for actions and <a href="..."> for navigation—never attach click handlers to plain <div> tags.',
      durationMinutes: 18,
      resourceType: 'Reading',
      orderIndex: 1,
    },
    {
      id: 'les_2',
      courseId: 'crs_web_1',
      title: '1.2 Mastering CSS Grid & Flexbox Alignment',
      summary: 'Choosing between 1D Flexbox tracks and 2D CSS Grid templates.',
      content:
        'Modern CSS separates one-dimensional distribution (Flexbox) from two-dimensional page architecture (CSS Grid).\n\n- Flexbox excels at navigation bars, button toolbars, and aligning items along a single main axis with justify-content and align-items.\n- CSS Grid lets you define explicit columns and rows simultaneously using grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)).\n\nTip: Combine gap utilities instead of fragile negative margins to keep spacing consistent across breakpoints.',
      durationMinutes: 22,
      resourceType: 'Lab Guide',
      orderIndex: 2,
    },
    {
      id: 'les_3',
      courseId: 'crs_web_2',
      title: '2.1 Asynchronous JavaScript & Fetch Lifecycle',
      summary: 'Understanding Promises, async/await, HTTP status codes, and error boundaries.',
      content:
        'Web applications communicate with backend servers over HTTP using asynchronous requests.\n\nWhen calling fetch(url):\n1. Always check response.ok (HTTP 200–299) because fetch only rejects on network failure, not HTTP 404 or 500 responses.\n2. Parse JSON via await response.json().\n3. Wrap requests in try/catch blocks and surface actionable error feedback to the user.',
      durationMinutes: 25,
      resourceType: 'Reading',
      orderIndex: 1,
    },
    {
      id: 'les_4',
      courseId: 'crs_web_2',
      title: '2.2 Event Delegation & Client State Hygiene',
      summary: 'Preventing memory leaks and securing user-generated output against XSS.',
      content:
        'Whenever displaying user-entered text in the DOM, prefer textContent over innerHTML to avoid Cross-Site Scripting (XSS). On the server, always validate request payloads independently of client-side form checks.',
      durationMinutes: 20,
      resourceType: 'Reference',
      orderIndex: 2,
    },
    {
      id: 'les_5',
      courseId: 'crs_py_1',
      title: '1.1 Python Built-in Collections: List, Tuple, Set, Dict',
      summary: 'Comparing mutability, ordering, and lookup performance across Python collections.',
      content:
        'Choosing the right collection directly impacts both clarity and runtime speed:\n\n- list: Ordered, mutable sequence. O(1) append, O(n) membership check.\n- tuple: Ordered, immutable sequence. Ideal for fixed records and dictionary keys.\n- set: Unordered unique elements backed by a hash table. O(1) average membership check.\n- dict: Key-value mapping preserving insertion order (Python 3.7+). O(1) average lookup.',
      durationMinutes: 20,
      resourceType: 'Reading',
      orderIndex: 1,
    },
    {
      id: 'les_6',
      courseId: 'crs_py_1',
      title: '1.2 Writing Clean Functions & List Comprehensions',
      summary: 'Default arguments, pure functions, and readable comprehensions.',
      content:
        'Avoid mutable default arguments such as def add_item(item, target=[]): because the default list is shared across every call. Instead, use target=None and initialize inside the function body.',
      durationMinutes: 18,
      resourceType: 'Lab Guide',
      orderIndex: 2,
    },
    {
      id: 'les_7',
      courseId: 'crs_py_2',
      title: '2.1 Time Complexity & Binary Search',
      summary: 'Why sorted arrays unlock O(log n) search performance.',
      content:
        'Linear scan checks elements one by one in O(n) time. Binary search repeatedly halves a sorted search interval, finding a target among 1,000,000 items in at most 20 comparisons—O(log n).',
      durationMinutes: 24,
      resourceType: 'Reading',
      orderIndex: 1,
    },
    {
      id: 'les_8',
      courseId: 'crs_db_1',
      title: '1.1 Primary Keys, Foreign Keys & Normalization (1NF–3NF)',
      summary: 'Eliminating update anomalies through clean relational table decomposition.',
      content:
        'Relational databases prevent data duplication and inconsistency through normalization:\n\n- 1NF: Every column holds atomic values; no repeating groups.\n- 2NF: Every non-key attribute depends on the entire primary key (no partial dependencies).\n- 3NF: No transitive dependencies between non-key attributes.\n\nForeign keys enforce referential integrity so child rows cannot reference non-existent parent records.',
      durationMinutes: 25,
      resourceType: 'Reading',
      orderIndex: 1,
    },
    {
      id: 'les_9',
      courseId: 'crs_db_2',
      title: '2.1 SQL JOINs, Aggregations & ACID Transactions',
      summary: 'Combining tables accurately and wrapping multi-step writes in transactions.',
      content:
        'An INNER JOIN returns only rows matching in both tables, whereas a LEFT JOIN preserves all rows from the left table even when no right-hand match exists.\n\nWhen submitting an examination or transferring funds, wrap all INSERT and UPDATE statements in a database transaction (BEGIN; ... COMMIT; or ROLLBACK;) so partial failures never corrupt state.',
      durationMinutes: 28,
      resourceType: 'Lab Guide',
      orderIndex: 1,
    },
    {
      id: 'les_10',
      courseId: 'crs_math_1',
      title: '1.1 Propositional Logic & De Morgan Laws',
      summary: 'Logical equivalence, implications, and negating compound statements.',
      content:
        'De Morgan Laws state that:\n- NOT (P AND Q) is logically equivalent to (NOT P) OR (NOT Q)\n- NOT (P OR Q) is logically equivalent to (NOT P) AND (NOT Q)\n\nUnderstanding implication (P -> Q) is equally crucial: it is false only when P is true and Q is false.',
      durationMinutes: 22,
      resourceType: 'Reading',
      orderIndex: 1,
    },
    {
      id: 'les_11',
      courseId: 'crs_eng_1',
      title: '1.1 Sentence Clarity, Parallelism & Concise Argumentation',
      summary: 'Structuring topic sentences and eliminating wordy passive constructions.',
      content:
        'Effective technical and academic writing places the primary subject and active verb early in the sentence. Parallel structure ensures items in a list or comparison share the same grammatical form.',
      durationMinutes: 16,
      resourceType: 'Reading',
      orderIndex: 1,
    },
    {
      id: 'les_12',
      courseId: 'crs_ict_1',
      title: '1.1 How DNS, HTTP & TLS Protect Web Traffic',
      summary: 'From domain lookup to encrypted transport over HTTPS.',
      content:
        'When you enter a web address, DNS resolves the human-readable hostname into an IP address. TLS then establishes an encrypted tunnel using asymmetric handshake keys before HTTP requests travel across the network.',
      durationMinutes: 18,
      resourceType: 'Reading',
      orderIndex: 1,
    },
  ];

  const questions: Question[] = [
    // Web Development MCQs & Written
    {
      id: 'q_web_1',
      categoryId: 'cat_web',
      createdBy: 'usr_inst_1',
      type: 'mcq',
      prompt: 'Which HTML5 element should wrap the primary unique content of a document for accessibility landmarks?',
      options: [
        { id: 'o1', text: '<section>' },
        { id: 'o2', text: '<main>' },
        { id: 'o3', text: '<div role="content">' },
        { id: 'o4', text: '<article>' },
      ],
      correctOptionId: 'o2',
      explanation: 'The <main> landmark identifies the dominant content of the <body> and allows assistive technologies to skip repeated navigation.',
      marks: 5,
      difficulty: 'Easy',
    },
    {
      id: 'q_web_2',
      categoryId: 'cat_web',
      createdBy: 'usr_inst_1',
      type: 'mcq',
      prompt: 'When using the JavaScript fetch() API, how does it handle an HTTP 404 Not Found response?',
      options: [
        { id: 'o1', text: 'It automatically throws a TypeError exception' },
        { id: 'o2', text: 'It resolves the Promise with response.ok set to false' },
        { id: 'o3', text: 'It retries the request three times before rejecting' },
        { id: 'o4', text: 'It returns null instead of a Response object' },
      ],
      correctOptionId: 'o2',
      explanation: 'fetch() only rejects on network failures or aborted requests; HTTP error statuses like 404 or 500 resolve with response.ok === false.',
      marks: 5,
      difficulty: 'Medium',
    },
    {
      id: 'q_web_3',
      categoryId: 'cat_web',
      createdBy: 'usr_inst_1',
      type: 'mcq',
      prompt: 'Which CSS layout model is specifically designed for simultaneous two-dimensional (row and column) alignment?',
      options: [
        { id: 'o1', text: 'CSS Grid' },
        { id: 'o2', text: 'CSS Flexbox' },
        { id: 'o3', text: 'CSS Float' },
        { id: 'o4', text: 'Inline-block flow' },
      ],
      correctOptionId: 'o1',
      explanation: 'CSS Grid controls rows and columns simultaneously, whereas Flexbox is designed for single-axis (1D) layout.',
      marks: 5,
      difficulty: 'Easy',
    },
    {
      id: 'q_web_4',
      categoryId: 'cat_web',
      createdBy: 'usr_inst_1',
      type: 'written',
      prompt: 'Explain the security difference between inserting user-supplied text with element.textContent versus element.innerHTML, and describe how to prevent Cross-Site Scripting (XSS) in a web form.',
      options: [],
      marks: 10,
      difficulty: 'Medium',
    },

    // Python MCQs & Written
    {
      id: 'q_py_1',
      categoryId: 'cat_python',
      createdBy: 'usr_inst_1',
      type: 'mcq',
      prompt: 'What is the average-case time complexity of checking membership (x in collection) in a Python set?',
      options: [
        { id: 'o1', text: 'O(n)' },
        { id: 'o2', text: 'O(log n)' },
        { id: 'o3', text: 'O(1)' },
        { id: 'o4', text: 'O(n log n)' },
      ],
      correctOptionId: 'o3',
      explanation: 'Python sets are implemented using hash tables, enabling O(1) average-case membership lookup.',
      marks: 5,
      difficulty: 'Medium',
    },
    {
      id: 'q_py_2',
      categoryId: 'cat_python',
      createdBy: 'usr_inst_1',
      type: 'mcq',
      prompt: 'Which Python data type is immutable and hashable (when containing hashable elements), making it valid as a dictionary key?',
      options: [
        { id: 'o1', text: 'list' },
        { id: 'o2', text: 'dict' },
        { id: 'o3', text: 'set' },
        { id: 'o4', text: 'tuple' },
      ],
      correctOptionId: 'o4',
      explanation: 'Tuples are immutable sequences and can serve as dictionary keys if all of their elements are also hashable.',
      marks: 5,
      difficulty: 'Easy',
    },
    {
      id: 'q_py_3',
      categoryId: 'cat_python',
      createdBy: 'usr_inst_1',
      type: 'mcq',
      prompt: 'Why is using a mutable default argument like def append_score(s, items=[]): discouraged in Python?',
      options: [
        { id: 'o1', text: 'Python raises a SyntaxError on empty lists in function signatures' },
        { id: 'o2', text: 'The default list is created once at function definition and shared across calls' },
        { id: 'o3', text: 'Lists inside function parameters are automatically converted to tuples' },
        { id: 'o4', text: 'It slows down garbage collection by 10x' },
      ],
      correctOptionId: 'o2',
      explanation: 'Default parameter expressions are evaluated once when def executes, causing mutations to persist across subsequent calls.',
      marks: 5,
      difficulty: 'Medium',
    },
    {
      id: 'q_py_4',
      categoryId: 'cat_python',
      createdBy: 'usr_inst_1',
      type: 'written',
      prompt: 'Describe how binary search works on a sorted Python list and explain why its worst-case time complexity is O(log n) rather than O(n).',
      options: [],
      marks: 10,
      difficulty: 'Medium',
    },

    // Database MCQs & Written
    {
      id: 'q_db_1',
      categoryId: 'cat_db',
      createdBy: 'usr_inst_1',
      type: 'mcq',
      prompt: 'Which SQL JOIN returns all rows from the left table and matched rows from the right table, filling unmatched right columns with NULL?',
      options: [
        { id: 'o1', text: 'INNER JOIN' },
        { id: 'o2', text: 'LEFT JOIN' },
        { id: 'o3', text: 'CROSS JOIN' },
        { id: 'o4', text: 'NATURAL INNER JOIN' },
      ],
      correctOptionId: 'o2',
      explanation: 'LEFT JOIN preserves every row from the left table regardless of whether a matching record exists in the right table.',
      marks: 5,
      difficulty: 'Easy',
    },
    {
      id: 'q_db_2',
      categoryId: 'cat_db',
      createdBy: 'usr_inst_1',
      type: 'mcq',
      prompt: 'In relational database normalization, what does Third Normal Form (3NF) specifically eliminate?',
      options: [
        { id: 'o1', text: 'Primary keys on lookup tables' },
        { id: 'o2', text: 'Transitive dependencies between non-key attributes' },
        { id: 'o3', text: 'All foreign key constraints' },
        { id: 'o4', text: 'Integer auto-increment columns' },
      ],
      correctOptionId: 'o2',
      explanation: '3NF requires a table to be in 2NF and have no non-key column depend transitively on the primary key via another non-key column.',
      marks: 5,
      difficulty: 'Medium',
    },
    {
      id: 'q_db_3',
      categoryId: 'cat_db',
      createdBy: 'usr_inst_1',
      type: 'mcq',
      prompt: 'In ACID database transactions, what does the "A" (Atomicity) property guarantee?',
      options: [
        { id: 'o1', text: 'All statements inside a transaction succeed together or roll back completely' },
        { id: 'o2', text: 'Queries run asynchronously without locking rows' },
        { id: 'o3', text: 'Tables are automatically backed up every hour' },
        { id: 'o4', text: 'Passwords are encrypted before storage' },
      ],
      correctOptionId: 'o1',
      explanation: 'Atomicity ensures an all-or-nothing unit of work: either every operation commits or all changes are rolled back.',
      marks: 5,
      difficulty: 'Easy',
    },
    {
      id: 'q_db_4',
      categoryId: 'cat_db',
      createdBy: 'usr_inst_1',
      type: 'written',
      prompt: 'Explain why saving a student examination submission (inserting student answers and computing the final result row) should be wrapped inside a database transaction.',
      options: [],
      marks: 10,
      difficulty: 'Hard',
    },

    // Mathematics MCQs
    {
      id: 'q_math_1',
      categoryId: 'cat_math',
      createdBy: 'usr_inst_2',
      type: 'mcq',
      prompt: 'According to De Morgan’s Laws, the negation of (P AND Q) is logically equivalent to:',
      options: [
        { id: 'o1', text: '(NOT P) AND (NOT Q)' },
        { id: 'o2', text: '(NOT P) OR (NOT Q)' },
        { id: 'o3', text: 'P OR (NOT Q)' },
        { id: 'o4', text: 'NOT (P OR Q)' },
      ],
      correctOptionId: 'o2',
      explanation: 'Negating a conjunction distributes the negation and flips AND to OR: !(P && Q) === (!P || !Q).',
      marks: 5,
      difficulty: 'Easy',
    },
    {
      id: 'q_math_2',
      categoryId: 'cat_math',
      createdBy: 'usr_inst_2',
      type: 'mcq',
      prompt: 'How many distinct 3-letter subsets can be chosen from a set of 5 distinct letters {A, B, C, D, E}?',
      options: [
        { id: 'o1', text: '10' },
        { id: 'o2', text: '15' },
        { id: 'o3', text: '60' },
        { id: 'o4', text: '125' },
      ],
      correctOptionId: 'o1',
      explanation: 'C(5, 3) = 5! / (3! * 2!) = (5 * 4) / 2 = 10 distinct subsets.',
      marks: 5,
      difficulty: 'Medium',
    },
    {
      id: 'q_math_3',
      categoryId: 'cat_math',
      createdBy: 'usr_inst_2',
      type: 'mcq',
      prompt: 'Under what condition is the logical implication P → Q evaluated as FALSE?',
      options: [
        { id: 'o1', text: 'When P is false and Q is false' },
        { id: 'o2', text: 'When P is false and Q is true' },
        { id: 'o3', text: 'When P is true and Q is false' },
        { id: 'o4', text: 'When both P and Q are true' },
      ],
      correctOptionId: 'o3',
      explanation: 'An implication P → Q is only false when the hypothesis P holds true yet the conclusion Q fails.',
      marks: 5,
      difficulty: 'Easy',
    },

    // English MCQs
    {
      id: 'q_eng_1',
      categoryId: 'cat_english',
      createdBy: 'usr_inst_2',
      type: 'mcq',
      prompt: 'Which sentence demonstrates correct parallel grammatical structure?',
      options: [
        { id: 'o1', text: 'The platform helps students to read lessons, taking quizzes, and track scores.' },
        { id: 'o2', text: 'The platform helps students read lessons, complete quizzes, and track scores.' },
        { id: 'o3', text: 'The platform helps students reading lessons, to complete quizzes, and tracking scores.' },
        { id: 'o4', text: 'The platform helps students read lessons, completing quizzes, and score tracking.' },
      ],
      correctOptionId: 'o2',
      explanation: 'All three verb phrases ("read lessons", "complete quizzes", "track scores") share the consistent base verb form.',
      marks: 5,
      difficulty: 'Easy',
    },
    {
      id: 'q_eng_2',
      categoryId: 'cat_english',
      createdBy: 'usr_inst_2',
      type: 'mcq',
      prompt: 'Choose the most concise active-voice revision of: "The final examination results were published by the academic committee."',
      options: [
        { id: 'o1', text: 'The academic committee published the final examination results.' },
        { id: 'o2', text: 'Publication of the final examination results was done by the committee.' },
        { id: 'o3', text: 'By the academic committee, the final examination results got published.' },
        { id: 'o4', text: 'There was a publication of final examination results by the committee.' },
      ],
      correctOptionId: 'o1',
      explanation: 'Active voice puts the actor ("The academic committee") first followed directly by the strong verb ("published").',
      marks: 5,
      difficulty: 'Easy',
    },

    // ICT MCQs
    {
      id: 'q_ict_1',
      categoryId: 'cat_ict',
      createdBy: 'usr_inst_1',
      type: 'mcq',
      prompt: 'Which network protocol is responsible for translating human-readable domain names (like edutrack.edu) into IP addresses?',
      options: [
        { id: 'o1', text: 'SMTP' },
        { id: 'o2', text: 'DNS' },
        { id: 'o3', text: 'FTP' },
        { id: 'o4', text: 'ARP' },
      ],
      correctOptionId: 'o2',
      explanation: 'The Domain Name System (DNS) maps domain names to numerical IP addresses.',
      marks: 5,
      difficulty: 'Easy',
    },
    {
      id: 'q_ict_2',
      categoryId: 'cat_ict',
      createdBy: 'usr_inst_1',
      type: 'mcq',
      prompt: 'Why should server-side applications hash passwords using an algorithm like scrypt or bcrypt rather than storing plain text or reversible encryption?',
      options: [
        { id: 'o1', text: 'Hashing allows administrators to email forgotten passwords back to users' },
        { id: 'o2', text: 'One-way salted hashing prevents attackers from recovering original passwords if a database leaks' },
        { id: 'o3', text: 'Hashing reduces the database file size by 90%' },
        { id: 'o4', text: 'Browsers require hashed passwords to render login forms' },
      ],
      correctOptionId: 'o2',
      explanation: 'Salted, slow one-way hashing ensures passwords cannot be reversed or cracked easily with precomputed rainbow tables.',
      marks: 5,
      difficulty: 'Medium',
    },
  ];

  const exams: Exam[] = [
    {
      id: 'exam_web_final',
      title: 'Web Engineering Comprehensive Assessment',
      categoryId: 'cat_web',
      programId: 'prog_web',
      createdBy: 'usr_inst_1',
      mode: 'scheduled',
      description:
        'Evaluates semantic HTML5, CSS Grid/Flexbox, Fetch API error handling, and web security fundamentals through both MCQ and written response questions.',
      durationMinutes: 25,
      totalMarks: 25,
      passMarks: 15,
      negativeMarking: 0,
      startTime: daysAgo(7),
      endTime: daysAhead(45),
      resultPublished: true,
      questionIds: ['q_web_1', 'q_web_2', 'q_web_3', 'q_web_4'],
      createdAt: daysAgo(30),
    },
    {
      id: 'exam_py_midterm',
      title: 'Python Data Structures & Algorithms Exam',
      categoryId: 'cat_python',
      programId: 'prog_python',
      createdBy: 'usr_inst_1',
      mode: 'scheduled',
      description:
        'Timed examination covering Python hash collections, function hygiene, and binary search complexity analysis.',
      durationMinutes: 25,
      totalMarks: 25,
      passMarks: 15,
      negativeMarking: 0.5,
      startTime: daysAgo(10),
      endTime: daysAhead(60),
      resultPublished: true,
      questionIds: ['q_py_1', 'q_py_2', 'q_py_3', 'q_py_4'],
      createdAt: daysAgo(25),
    },
    {
      id: 'exam_db_final',
      title: 'SQL & Relational Integrity Certification Exam',
      categoryId: 'cat_db',
      programId: 'prog_db',
      createdBy: 'usr_inst_1',
      mode: 'scheduled',
      description:
        'Assesses JOIN semantics, 3NF normalization, ACID guarantees, and transactional submission design.',
      durationMinutes: 30,
      totalMarks: 25,
      passMarks: 15,
      negativeMarking: 0,
      startTime: daysAgo(5),
      endTime: daysAhead(60),
      resultPublished: true,
      questionIds: ['q_db_1', 'q_db_2', 'q_db_3', 'q_db_4'],
      createdAt: daysAgo(20),
    },
    {
      id: 'exam_math_practice',
      title: 'Discrete Logic & Combinatorics Practice Quiz',
      categoryId: 'cat_math',
      programId: null,
      createdBy: 'usr_inst_2',
      mode: 'practice',
      description:
        'Open standalone practice quiz with instant automated grading and detailed logical explanations.',
      durationMinutes: 15,
      totalMarks: 15,
      passMarks: 10,
      negativeMarking: 0,
      startTime: daysAgo(30),
      endTime: daysAhead(180),
      resultPublished: true,
      questionIds: ['q_math_1', 'q_math_2', 'q_math_3'],
      createdAt: daysAgo(30),
    },
    {
      id: 'exam_eng_practice',
      title: 'Academic English & Technical Clarity Quiz',
      categoryId: 'cat_english',
      programId: null,
      createdBy: 'usr_inst_2',
      mode: 'practice',
      description:
        'Standalone quick assessment testing parallel sentence structure and active-voice technical editing.',
      durationMinutes: 10,
      totalMarks: 10,
      passMarks: 6,
      negativeMarking: 0,
      startTime: daysAgo(30),
      endTime: daysAhead(180),
      resultPublished: true,
      questionIds: ['q_eng_1', 'q_eng_2'],
      createdAt: daysAgo(30),
    },
    {
      id: 'exam_ict_standalone',
      title: 'ICT & Web Security Fundamentals Examination',
      categoryId: 'cat_ict',
      programId: null,
      createdBy: 'usr_inst_1',
      mode: 'scheduled',
      description:
        'Open standalone examination covering DNS resolution and cryptographic password storage practices.',
      durationMinutes: 15,
      totalMarks: 10,
      passMarks: 6,
      negativeMarking: 0,
      startTime: daysAgo(15),
      endTime: daysAhead(90),
      resultPublished: true,
      questionIds: ['q_ict_1', 'q_ict_2'],
      createdAt: daysAgo(20),
    },
  ];

  const enrollments: Enrollment[] = [
    {
      id: 'enr_1',
      studentId: 'usr_stu_1',
      programId: 'prog_web',
      enrolledAt: daysAgo(20),
      completedAt: null,
    },
    {
      id: 'enr_2',
      studentId: 'usr_stu_1',
      programId: 'prog_python',
      enrolledAt: daysAgo(14),
      completedAt: null,
    },
    {
      id: 'enr_3',
      studentId: 'usr_stu_1',
      programId: 'prog_ict',
      enrolledAt: daysAgo(28),
      completedAt: daysAgo(5),
    },
    {
      id: 'enr_4',
      studentId: 'usr_stu_2',
      programId: 'prog_python',
      enrolledAt: daysAgo(12),
      completedAt: null,
    },
  ];

  const lessonProgress: LessonProgress[] = [
    { id: 'lp_1', studentId: 'usr_stu_1', lessonId: 'les_1', completedAt: daysAgo(18) },
    { id: 'lp_2', studentId: 'usr_stu_1', lessonId: 'les_2', completedAt: daysAgo(16) },
    { id: 'lp_3', studentId: 'usr_stu_1', lessonId: 'les_3', completedAt: daysAgo(12) },
    { id: 'lp_4', studentId: 'usr_stu_1', lessonId: 'les_5', completedAt: daysAgo(10) },
    { id: 'lp_5', studentId: 'usr_stu_1', lessonId: 'les_12', completedAt: daysAgo(6) },
  ];

  // Seed realistic past exam attempts so analytics, history, and instructor evaluation queue are immediately meaningful
  const examAttempts: ExamAttempt[] = [
    {
      id: 'att_seed_1',
      examId: 'exam_ict_standalone',
      studentId: 'usr_stu_1',
      startedAt: daysAgo(12),
      expiresAt: daysAgo(12),
      submittedAt: daysAgo(12),
      status: 'evaluated',
    },
    {
      id: 'att_seed_2',
      examId: 'exam_math_practice',
      studentId: 'usr_stu_1',
      startedAt: daysAgo(8),
      expiresAt: daysAgo(8),
      submittedAt: daysAgo(8),
      status: 'evaluated',
    },
    {
      id: 'att_seed_3',
      examId: 'exam_eng_practice',
      studentId: 'usr_stu_1',
      startedAt: daysAgo(4),
      expiresAt: daysAgo(4),
      submittedAt: daysAgo(4),
      status: 'evaluated',
    },
    {
      id: 'att_seed_4',
      examId: 'exam_py_midterm',
      studentId: 'usr_stu_2',
      startedAt: daysAgo(2),
      expiresAt: daysAgo(2),
      submittedAt: daysAgo(2),
      status: 'submitted',
    },
  ];

  const studentAnswers: StudentAnswer[] = [
    // att_seed_1 (Nadia - ICT: 10/10)
    {
      id: 'ans_s1_1',
      attemptId: 'att_seed_1',
      questionId: 'q_ict_1',
      selectedOptionId: 'o2',
      writtenText: null,
      isCorrect: true,
      awardedMarks: 5,
      feedback: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    {
      id: 'ans_s1_2',
      attemptId: 'att_seed_1',
      questionId: 'q_ict_2',
      selectedOptionId: 'o2',
      writtenText: null,
      isCorrect: true,
      awardedMarks: 5,
      feedback: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    // att_seed_2 (Nadia - Math: 10/15 -> 66.7%)
    {
      id: 'ans_s2_1',
      attemptId: 'att_seed_2',
      questionId: 'q_math_1',
      selectedOptionId: 'o2',
      writtenText: null,
      isCorrect: true,
      awardedMarks: 5,
      feedback: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    {
      id: 'ans_s2_2',
      attemptId: 'att_seed_2',
      questionId: 'q_math_2',
      selectedOptionId: 'o3',
      writtenText: null,
      isCorrect: false,
      awardedMarks: 0,
      feedback: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    {
      id: 'ans_s2_3',
      attemptId: 'att_seed_2',
      questionId: 'q_math_3',
      selectedOptionId: 'o3',
      writtenText: null,
      isCorrect: true,
      awardedMarks: 5,
      feedback: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    // att_seed_3 (Nadia - English: 5/10 -> 50% Needs Practice)
    {
      id: 'ans_s3_1',
      attemptId: 'att_seed_3',
      questionId: 'q_eng_1',
      selectedOptionId: 'o2',
      writtenText: null,
      isCorrect: true,
      awardedMarks: 5,
      feedback: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    {
      id: 'ans_s3_2',
      attemptId: 'att_seed_3',
      questionId: 'q_eng_2',
      selectedOptionId: 'o2',
      writtenText: null,
      isCorrect: false,
      awardedMarks: 0,
      feedback: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    // att_seed_4 (Liam - Python Midterm with pending written answer for Instructor queue!)
    {
      id: 'ans_s4_1',
      attemptId: 'att_seed_4',
      questionId: 'q_py_1',
      selectedOptionId: 'o3',
      writtenText: null,
      isCorrect: true,
      awardedMarks: 5,
      feedback: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    {
      id: 'ans_s4_2',
      attemptId: 'att_seed_4',
      questionId: 'q_py_2',
      selectedOptionId: 'o4',
      writtenText: null,
      isCorrect: true,
      awardedMarks: 5,
      feedback: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    {
      id: 'ans_s4_3',
      attemptId: 'att_seed_4',
      questionId: 'q_py_3',
      selectedOptionId: 'o2',
      writtenText: null,
      isCorrect: true,
      awardedMarks: 5,
      feedback: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    {
      id: 'ans_s4_4',
      attemptId: 'att_seed_4',
      questionId: 'q_py_4',
      selectedOptionId: null,
      writtenText:
        'Binary search starts by checking the middle index of a sorted list. If the target value is smaller, we discard the upper half; if larger, we discard the lower half. Because each step cuts the remaining search space by 50%, the maximum number of comparisons grows logarithmically as O(log n).',
      isCorrect: null,
      awardedMarks: null,
      feedback: null,
      reviewedBy: null,
      reviewedAt: null,
    },
  ];

  const results: Result[] = [
    {
      id: 'res_seed_1',
      attemptId: 'att_seed_1',
      examId: 'exam_ict_standalone',
      studentId: 'usr_stu_1',
      totalMarks: 10,
      obtainedMarks: 10,
      percentage: 100,
      passed: true,
      pendingWrittenCount: 0,
      published: true,
      evaluatedAt: daysAgo(12),
    },
    {
      id: 'res_seed_2',
      attemptId: 'att_seed_2',
      examId: 'exam_math_practice',
      studentId: 'usr_stu_1',
      totalMarks: 15,
      obtainedMarks: 10,
      percentage: 66.7,
      passed: true,
      pendingWrittenCount: 0,
      published: true,
      evaluatedAt: daysAgo(8),
    },
    {
      id: 'res_seed_3',
      attemptId: 'att_seed_3',
      examId: 'exam_eng_practice',
      studentId: 'usr_stu_1',
      totalMarks: 10,
      obtainedMarks: 5,
      percentage: 50,
      passed: false,
      pendingWrittenCount: 0,
      published: true,
      evaluatedAt: daysAgo(4),
    },
    {
      id: 'res_seed_4',
      attemptId: 'att_seed_4',
      examId: 'exam_py_midterm',
      studentId: 'usr_stu_2',
      totalMarks: 25,
      obtainedMarks: 15,
      percentage: 60,
      passed: false,
      pendingWrittenCount: 1,
      published: false,
      evaluatedAt: daysAgo(2),
    },
  ];

  const announcements: Announcement[] = [
    {
      id: 'ann_1',
      title: 'Fall Assessment Window Open for All Programs',
      body: 'Scheduled examinations for Web Engineering, Python Programming, and Relational Databases are now open. Practice quizzes remain available anytime.',
      authorId: 'usr_admin_1',
      targetRole: 'all',
      createdAt: daysAgo(3),
    },
    {
      id: 'ann_2',
      title: 'Written Answer Grading Guideline Reminder',
      body: 'Instructors are reminded to include constructive feedback alongside awarded marks when reviewing student written examination responses.',
      authorId: 'usr_admin_1',
      targetRole: 'instructor',
      createdAt: daysAgo(2),
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif_1',
      userId: 'usr_stu_1',
      title: 'Certificate Issued: Essential ICT & Digital Systems Literacy',
      message: 'You completed all required lessons in Essential ICT & Digital Systems Literacy. Your verifiable certificate is ready.',
      read: false,
      createdAt: daysAgo(5),
      linkTab: 'certificates',
    },
    {
      id: 'notif_2',
      userId: 'usr_stu_1',
      title: 'Recommended Practice: Academic English',
      message: 'Your recent Academic English score was 50%. Review Module 1.1 and retake the practice quiz to improve.',
      read: false,
      createdAt: daysAgo(3),
      linkTab: 'analytics',
    },
    {
      id: 'notif_3',
      userId: 'usr_inst_1',
      title: 'Pending Written Evaluation',
      message: 'Liam Chen submitted a written response for Python Data Structures & Algorithms Exam awaiting your review.',
      read: false,
      createdAt: daysAgo(2),
      linkTab: 'reviews',
    },
  ];

  const achievements: Achievement[] = [
    {
      id: 'ach_1',
      code: 'FIRST_ENROLL',
      title: 'Academic Explorer',
      description: 'Enrolled in your first structured learning program.',
    },
    {
      id: 'ach_2',
      code: 'FIRST_EXAM',
      title: 'Exam Ready',
      description: 'Completed your first online examination or practice quiz.',
    },
    {
      id: 'ach_3',
      code: 'PERFECT_SCORE',
      title: 'Precision Scholar',
      description: 'Achieved 100% on a graded examination.',
    },
    {
      id: 'ach_4',
      code: 'PROGRAM_GRAD',
      title: 'Program Graduate',
      description: 'Completed all lessons in an enrolled program and earned a certificate.',
    },
  ];

  const studentAchievements: StudentAchievementLink[] = [
    { id: 'sa_1', studentId: 'usr_stu_1', achievementId: 'ach_1', earnedAt: daysAgo(20) },
    { id: 'sa_2', studentId: 'usr_stu_1', achievementId: 'ach_2', earnedAt: daysAgo(12) },
    { id: 'sa_3', studentId: 'usr_stu_1', achievementId: 'ach_3', earnedAt: daysAgo(12) },
    { id: 'sa_4', studentId: 'usr_stu_1', achievementId: 'ach_4', earnedAt: daysAgo(5) },
  ];

  const certificates: Certificate[] = [
    {
      id: 'cert_1',
      studentId: 'usr_stu_1',
      programId: 'prog_ict',
      issuedAt: daysAgo(5),
      certificateCode: 'EDU-2026-ICT-8841',
    },
  ];

  return {
    users,
    sessions: {},
    categories,
    programs,
    courses,
    lessons,
    enrollments,
    lessonProgress,
    questions,
    exams,
    examAttempts,
    studentAnswers,
    results,
    announcements,
    notifications,
    achievements,
    studentAchievements,
    certificates,
    contactSubmissions: [],
    settings: {
      platformName: 'EduTrack',
      tagline: 'Learn Better. Practice Smarter. Achieve More.',
      allowSelfRegistration: true,
      defaultPassPercentage: 60,
      maintenanceNotice: '',
    },
  };
}

class Store {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseState;
        if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.programs)) {
          return parsed;
        }
      }
    } catch {
      // Fall back to fresh seed if file corrupted
    }
    const seeded = seedDatabase();
    this.persistState(seeded);
    return seeded;
  }

  private persistState(data: DatabaseState) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_FILE);
  }

  public save() {
    this.persistState(this.state);
  }

  public get db(): DatabaseState {
    return this.state;
  }

  public createSession(userId: string): string {
    const token = crypto.randomBytes(24).toString('hex');
    this.state.sessions[token] = { userId, createdAt: new Date().toISOString() };
    this.save();
    return token;
  }

  public getUserByToken(token: string | undefined): StoredUser | null {
    if (!token) return null;
    const sess = this.state.sessions[token];
    if (!sess) return null;
    const user = this.state.users.find((u) => u.id === sess.userId && u.active);
    return user || null;
  }

  public deleteSession(token: string) {
    delete this.state.sessions[token];
    this.save();
  }

  public notify(userId: string, title: string, message: string, linkTab?: string) {
    this.state.notifications.unshift({
      id: makeId('notif'),
      userId,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      linkTab,
    });
  }

  public grantAchievement(studentId: string, code: string) {
    const ach = this.state.achievements.find((a) => a.code === code);
    if (!ach) return;
    const exists = this.state.studentAchievements.some(
      (sa) => sa.studentId === studentId && sa.achievementId === ach.id
    );
    if (!exists) {
      this.state.studentAchievements.push({
        id: makeId('sa'),
        studentId,
        achievementId: ach.id,
        earnedAt: new Date().toISOString(),
      });
      this.notify(
        studentId,
        `Achievement Unlocked: ${ach.title}`,
        ach.description,
        'achievements'
      );
    }
  }

  public checkProgramCompletion(studentId: string, programId: string) {
    const enrollment = this.state.enrollments.find(
      (e) => e.studentId === studentId && e.programId === programId
    );
    if (!enrollment) return;

    const programCourses = this.state.courses.filter((c) => c.programId === programId);
    const courseIds = new Set(programCourses.map((c) => c.id));
    const programLessons = this.state.lessons.filter((l) => courseIds.has(l.courseId));
    if (programLessons.length === 0) return;

    const completedIds = new Set(
      this.state.lessonProgress
        .filter((lp) => lp.studentId === studentId)
        .map((lp) => lp.lessonId)
    );

    const allDone = programLessons.every((l) => completedIds.has(l.id));
    if (allDone && !enrollment.completedAt) {
      enrollment.completedAt = new Date().toISOString();
      const alreadyCert = this.state.certificates.some(
        (c) => c.studentId === studentId && c.programId === programId
      );
      if (!alreadyCert) {
        const prog = this.state.programs.find((p) => p.id === programId);
        const code = `EDU-${new Date().getFullYear()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        this.state.certificates.push({
          id: makeId('cert'),
          studentId,
          programId,
          issuedAt: new Date().toISOString(),
          certificateCode: code,
        });
        this.notify(
          studentId,
          `Certificate Issued: ${prog?.title || 'Program'}`,
          `Congratulations on completing all lessons! Verification code: ${code}.`,
          'certificates'
        );
      }
      this.grantAchievement(studentId, 'PROGRAM_GRAD');
    }
  }

  public finalizeExamAttempt(attemptId: string): { attempt: ExamAttempt; result: Result } {
    const attempt = this.state.examAttempts.find((a) => a.id === attemptId);
    if (!attempt) throw new Error('Attempt not found');
    const exam = this.state.exams.find((e) => e.id === attempt.examId);
    if (!exam) throw new Error('Exam not found');

    if (attempt.status !== 'in_progress') {
      const existingRes = this.state.results.find((r) => r.attemptId === attempt.id);
      if (existingRes) return { attempt, result: existingRes };
    }

    const questions = exam.questionIds
      .map((qid) => this.state.questions.find((q) => q.id === qid))
      .filter((q): q is Question => Boolean(q));

    let obtainedMarks = 0;
    let totalMarks = 0;
    let pendingWrittenCount = 0;

    for (const q of questions) {
      totalMarks += q.marks;
      let ans = this.state.studentAnswers.find(
        (sa) => sa.attemptId === attempt.id && sa.questionId === q.id
      );
      if (!ans) {
        ans = {
          id: makeId('ans'),
          attemptId: attempt.id,
          questionId: q.id,
          selectedOptionId: null,
          writtenText: null,
          isCorrect: q.type === 'mcq' ? false : null,
          awardedMarks: q.type === 'mcq' ? 0 : null,
          feedback: null,
          reviewedBy: null,
          reviewedAt: null,
        };
        this.state.studentAnswers.push(ans);
      }

      if (q.type === 'mcq') {
        if (!ans.selectedOptionId) {
          ans.isCorrect = false;
          ans.awardedMarks = 0;
        } else if (ans.selectedOptionId === q.correctOptionId) {
          ans.isCorrect = true;
          ans.awardedMarks = q.marks;
          obtainedMarks += q.marks;
        } else {
          ans.isCorrect = false;
          const penalty = exam.negativeMarking > 0 ? -exam.negativeMarking : 0;
          ans.awardedMarks = penalty;
          obtainedMarks += penalty;
        }
      } else {
        // Written question
        if (ans.awardedMarks !== null && ans.awardedMarks !== undefined) {
          obtainedMarks += ans.awardedMarks;
        } else {
          pendingWrittenCount += 1;
        }
      }
    }

    obtainedMarks = Math.max(0, Math.round(obtainedMarks * 100) / 100);
    const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 1000) / 10 : 0;
    const passed = pendingWrittenCount === 0 && obtainedMarks >= exam.passMarks;

    attempt.submittedAt = new Date().toISOString();
    attempt.status = pendingWrittenCount > 0 ? 'submitted' : 'evaluated';

    let result = this.state.results.find((r) => r.attemptId === attempt.id);
    if (!result) {
      result = {
        id: makeId('res'),
        attemptId: attempt.id,
        examId: exam.id,
        studentId: attempt.studentId,
        totalMarks,
        obtainedMarks,
        percentage,
        passed,
        pendingWrittenCount,
        published: pendingWrittenCount === 0 ? exam.resultPublished : false,
        evaluatedAt: new Date().toISOString(),
      };
      this.state.results.push(result);
    } else {
      result.totalMarks = totalMarks;
      result.obtainedMarks = obtainedMarks;
      result.percentage = percentage;
      result.passed = passed;
      result.pendingWrittenCount = pendingWrittenCount;
      result.published = pendingWrittenCount === 0 ? exam.resultPublished : false;
      result.evaluatedAt = new Date().toISOString();
    }

    this.grantAchievement(attempt.studentId, 'FIRST_EXAM');
    if (pendingWrittenCount === 0 && percentage === 100) {
      this.grantAchievement(attempt.studentId, 'PERFECT_SCORE');
    }

    if (pendingWrittenCount > 0) {
      // Notify exam creator / instructor about pending written review
      this.notify(
        exam.createdBy,
        'Written Answer Awaiting Evaluation',
        `A student submitted "${exam.title}" with ${pendingWrittenCount} written answer(s) ready for review.`,
        'reviews'
      );
      this.notify(
        attempt.studentId,
        `Submitted: ${exam.title}`,
        `Your MCQ answers were scored (${obtainedMarks}/${totalMarks} partial). Written answers are pending instructor review.`,
        'results'
      );
    } else {
      this.notify(
        attempt.studentId,
        `Result Available: ${exam.title}`,
        `You scored ${obtainedMarks}/${totalMarks} (${percentage}%). Status: ${passed ? 'Passed' : 'Did not pass'}.`,
        'results'
      );
    }

    this.save();
    return { attempt, result };
  }
}

export const store = new Store();

export function hasRole(user: User, allowed: UserRole[]): boolean {
  return allowed.includes(user.role);
}
