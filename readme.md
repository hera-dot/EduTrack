# 🎓 EduTrack – Online Examination & Learning Management Platform

**Learn Better. Practice Smarter. Achieve More.**

EduTrack is a web-based Online Examination and Learning Management Platform designed to provide students with a complete digital learning and assessment experience.

The platform allows students to enroll in educational programs, access learning materials, participate in online quizzes and examinations, view results, and track their academic performance.

---

## 🚀 Project Overview

EduTrack provides a centralized educational platform with three major user roles:

- **Student:** Access courses, participate in examinations, and track learning progress.
- **Admin:** Manage students, instructors, programs, examinations, and the entire platform.
- **Instructor:** Manage assigned programs, create examinations, evaluate written answers, and monitor student performance.

## 🎯 Main Features

### 👨‍🎓 Student Module
- Student Registration and Login
- Personal Profile Management
- Browse Educational Programs
- Enroll in Free Programs
- Access Courses and Learning Materials
- Practice Online Quizzes
- Participate in Scheduled Examinations
- View Examination Results
- Track Learning Progress
- View Achievements and Certificates
- Receive Notifications

### 🛠️ Admin Module
- Admin Dashboard
- Student Management
- Instructor Management
- Program and Course Management
- Lesson and Category Management
- Question Bank Management
- Examination Scheduling
- Enrollment Management
- Result Management
- Announcements
- Reports and Analytics
- System Settings

### 👨‍🏫 Instructor Module
- Instructor Dashboard
- Manage Assigned Programs
- Create Courses and Lessons
- Create MCQ and Written Questions
- Manage Quizzes and Examinations
- Evaluate Written Answers
- Provide Marks and Feedback
- Monitor Student Performance

### 📊 Analytics Module
- Overall Learning Progress
- Average Examination Scores
- Subject-wise Performance
- MCQ Accuracy
- Strength and Weakness Analysis
- Learning Activity Tracking
- Performance Charts

## 📝 Examination System

EduTrack supports two types of examination questions:

**1. Multiple Choice Questions (MCQ)**
- Multiple answer options
- Automatic answer evaluation
- Countdown timer
- Automatic marks calculation
- Instant result generation after publication

**2. Written Questions**
- Text-based answer submission
- Manual evaluation by authorized instructors or administrators
- Marks and feedback

Additional examination features:
- Examination scheduling
- Automatic submission when time expires
- Periodic answer saving
- Examination attempt history
- Negative marking configuration
- Secure result publication

## 💻 Technology Stack

| Category | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| CSS Framework | Bootstrap 5 |
| Icons | Bootstrap Icons |
| Backend | PHP |
| Database | MySQL |
| Charts | Chart.js |
| Development IDE | Visual Studio Code |
| Local Server | XAMPP |
| Database Management | phpMyAdmin |

## 🗄️ Database

**Database Name:** `edutrack_db`

Main database tables include:

- users
- student_profiles
- instructor_profiles
- categories
- programs
- enrollments
- courses
- lessons
- lesson_progress
- quizzes
- quiz_questions
- exams
- questions
- question_options
- exam_questions
- exam_attempts
- student_answers
- answer_reviews
- results
- achievements
- student_achievements
- certificates
- announcements
- notifications

## 📁 Project Structure

```text
EduTrack/
│
├── index.php
├── about.php
├── programs.php
├── exams.php
│
├── auth/
│   ├── login.php
│   ├── register.php
│   ├── logout.php
│   └── forgot-password.php
│
├── student/
│   ├── dashboard.php
│   ├── profile.php
│   ├── programs.php
│   ├── my-programs.php
│   ├── lessons.php
│   ├── exams.php
│   ├── take-exam.php
│   ├── results.php
│   └── progress.php
│
├── instructor/
│   ├── dashboard.php
│   ├── programs.php
│   ├── questions.php
│   ├── exams.php
│   └── review-answers.php
│
├── admin/
│   ├── dashboard.php
│   ├── students.php
│   ├── instructors.php
│   ├── programs.php
│   ├── courses.php
│   ├── lessons.php
│   ├── questions.php
│   ├── exams.php
│   └── results.php
│
├── includes/
│   ├── config.php
│   ├── database.php
│   ├── auth-check.php
│   ├── header.php
│   ├── footer.php
│   └── sidebar.php
│
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
│
└── database/
    └── edutrack.sql
```

## 🔐 Security Features

- Secure password hashing using `password_hash()`
- Password verification using `password_verify()`
- PDO Prepared Statements
- Role-Based Access Control
- Server-side Input Validation
- XSS Protection
- CSRF Protection
- Secure PHP Session Management
- Examination Access Protection
- Database Security

## ⚙️ Installation & Setup

Follow these steps to run EduTrack locally:

**Step 1:** Install XAMPP and Visual Studio Code.

**Step 2:** Clone the repository.

```bash
git clone https://github.com/YOUR-USERNAME/EduTrack.git
```

**Step 3:** Move the project folder into:

```text
C:\xampp\htdocs\
```

**Step 4:** Start Apache and MySQL from XAMPP Control Panel.

**Step 5:** Open phpMyAdmin:

```text
http://localhost/phpmyadmin
```

**Step 6:** Create a database named:

```text
edutrack_db
```

**Step 7:** Import the `database/edutrack.sql` file.

**Step 8:** Configure database credentials in the project configuration file.

**Step 9:** Open the project in your browser:

```text
http://localhost/EduTrack/
```

## 🛣️ Development Roadmap

The project will be developed in the following phases:

1. Project Setup and Home Page
2. Authentication System
3. Student Dashboard
4. Program Management
5. Course and Learning Management
6. Quiz and Examination System
7. Result Management
8. Learning Analytics
9. Admin and Instructor Modules
10. Testing and Deployment

## 🔮 Future Enhancements

- Email Notifications
- PDF Performance Reports
- Certificate Verification
- Gamification and Achievement Badges
- Advanced Analytics
- Multi-language Support
- Progressive Web App (PWA)

## 🎨 UI/UX Design

The platform will follow a modern, professional, and responsive design.

- Primary Color: Navy Blue
- Secondary Color: Purple
- Background: Light Gray / White
- Typography: Inter / Poppins
- Responsive layouts for desktop, tablet, and mobile devices

## 🎯 Project Goal

The main goal of EduTrack is to develop a complete, functional, and user-friendly educational platform that combines online learning, examination management, automated assessment, manual evaluation, and student performance tracking in one system.

**EduTrack – Learn Better. Practice Smarter. Achieve More.**

---

**Project Type:** Web-Based Educational Platform  
**Backend:** PHP  
**Database:** MySQL  
**Development Environment:** VS Code + XAMPP  
**Status:** Under Development
