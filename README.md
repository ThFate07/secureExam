# SecureExam - Online Proctoring System

A comprehensive, secure online proctoring system built with Next.js, TypeScript, and Tailwind CSS. This system enables teachers to conduct exams with real-time monitoring and implements advanced anti-cheat functionalities.

## 🚀 Features

### Authentication & Authorization
- **Secure Login/Register**: Role-based authentication for students and teachers
- **Password Encryption**: Client-side encryption using crypto-js
- **Session Management**: Secure cookie-based authentication with encrypted user data
- **Role-based Access**: Different interfaces and permissions for teachers and students

### Teacher Features
- **Dashboard**: Comprehensive overview with exam statistics and quick actions
- **Exam Management**: Create, edit, and manage examinations
- **Real-time Monitoring**: Live monitoring of students during exams
- **Anti-cheat Detection**: Real-time alerts for suspicious activities
- **Webcam Monitoring**: Live video feeds from student cameras
- **Direct Messaging**: Send messages to students during exams
- **Analytics**: Detailed performance reports and insights

### Student Features
- **Dashboard**: View available exams, upcoming tests, and results
- **Exam Interface**: Clean, intuitive exam-taking interface
- **Progress Tracking**: Real-time progress indicators and navigation
- **Question Flagging**: Mark questions for review
- **Timer**: Countdown timer with automatic submission

### Anti-Cheat Technologies
- **Tab Switching Detection**: Alerts when students switch tabs
- **Window Focus Monitoring**: Detects when exam window loses focus
- **Keyboard Shortcuts Prevention**: Blocks developer tools, copy/paste, etc.
- **Right-click Disable**: Prevents context menu access
- **Fullscreen Enforcement**: Forces fullscreen mode during exams
- **Print Prevention**: Blocks printing attempts
- **Real-time Violation Tracking**: Logs and reports all suspicious activities

### Webcam Integration
- **Live Camera Feed**: Real-time webcam monitoring
- **Snapshot Capture**: Periodic photo capture during exams
- **Camera Status Monitoring**: Ensures camera remains active
- **Permission Handling**: Graceful handling of camera permissions

### Security Features
- **Data Encryption**: Client-side encryption for sensitive data
- **CSRF Protection**: Token-based request validation
- **Input Validation**: Comprehensive form validation using Zod
- **Secure Cookies**: HTTPOnly, Secure, and SameSite cookie settings
- **XSS Prevention**: Input sanitization and safe rendering

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Authentication**: Custom implementation with crypto-js
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Camera**: React Webcam
- **Real-time**: Socket.io (client)
- **State Management**: React hooks and context

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd proctoring_system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_ENCRYPTION_KEY=your-secret-encryption-key
   # Enable built-in demo data & local-only exam store (no backend required)
   NEXT_PUBLIC_DEMO_MODE=true
   ```

4. **Run the development server**

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 🧪 Demo Mode

When `NEXT_PUBLIC_DEMO_MODE=true` the application seeds an in-browser localStorage store with:

- Sample users (1 teacher, multiple students)
- Three fully populated exams (JavaScript, React, Mathematics)
- Student results and submissions
- Synthetic real-time monitoring events (violations, heartbeats, webcam status)

Use these credentials (or register any new mock account):

| Role    | Email             | Password |
|---------|------------------|----------|
| Teacher | `teacher@demo.com` | demo123  |
| Student | `student@demo.com` | demo123  |

Additional demo students appear in monitoring & submissions lists: `priya@student.demo`, `liam@student.demo` (password can be any string when logging in manually—new mock users are created client-side).

### What Works in Demo

| Area | Behavior |
|------|----------|
| Auth | Cookie + client encryption only; no server validation |
| Exams | Loaded from static `demoData.ts` & normalized to localStorage |
| Monitoring | Inter-tab BroadcastChannel simulation (open a student exam in one tab and a teacher monitoring page in another) |
| Anti-cheat | Client-side event detection (tab switch, blur, forbidden keys, fullscreen exit) |
| Webcam | Uses `navigator.mediaDevices`; permission prompts will appear |

### Resetting Demo Data
Clear browser site data (localStorage & cookies) or toggle the `NEXT_PUBLIC_DEMO_MODE` flag off/on and refresh.

### Production Hardening TODO (Out of Scope for Demo)

- Replace localStorage exam store with secure API endpoints
- Real authentication (JWT/session + password hashing)
- Server-side monitoring & persistence
- Role/permission enforcement on the server
- Secure media storage for webcam snapshots
- Rate limiting & audit logging


## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
