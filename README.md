# TeamTask • Modern Team Task Management & Collaboration Platform

A complete, production-ready, modern, responsive, and secure web application designed for seamless task management, private communication, and media exchange between **1 Administrator** and **15–20 Team Members**.

---

## 🌟 Key Features

### 1. 🛡️ Admin Dashboard & Management
- **Full Task Lifecycle**: Create, edit, assign, prioritize (`Low`, `Medium`, `High`, `Urgent`), categorize, and delete tasks.
- **Specific User Assignment**: Assign tasks to individual team members or multi-select members separately.
- **Progress Tracking**: Real-time monitoring of each member's assignment status (`Pending`, `In Progress`, `Completed`).
- **Spreadsheet Login Audit**: Interactive spreadsheet table tracking every login attempt (IP address, user agent/browser, timestamp, SUCCESS / FAILED, failure reasons) with **Instant CSV Export**.
- **User Files & Media Central**: Admin can view, inspect, preview, and download all proof documents, deliverables, and media uploaded across all users.
- **Private Communication**: Dedicated 1-on-1 private messaging channels with every team member.

### 2. 🔐 User Accounts & OTP Authentication
- **Secure Email OTP Verification**: 6-digit cryptographic verification code sent to user email during registration.
- **Strict Verification Gate**: Account creation is locked until the valid OTP is entered and verified.
- **Welcome Email**: Automated celebratory welcome email dispatched upon successful verification.
- **Dedicated Administrator & Real Member Verification**: Secure workspace with clean database and real OTP authentication.
- **Role-Based Access Control (RBAC)**: Enforced via JWT tokens, bcrypt password hashing, and server middleware.

### 3. 📋 Task Management System
- **Personalized Member Dashboard**: Team members see **only** the tasks assigned to them.
- **3-State Task Progression**: Smooth transitions between `Pending`, `In Progress`, and `Completed`.
- **Work Deliverable Uploads**: Users can upload files (PDFs, docs, images, archives) showing completed work with notes.
- **Confetti Celebration**: Micro-interaction celebration upon completing tasks.
- **Multi-View Modes**: Switch between dynamic **Kanban Board** and **Table List View**.

### 4. 💬 Private Chat & Isolated Media Storage
- **1-on-1 Direct Messaging**: Private doubt clearance between each team member and the Administrator.
- **Real-Time WebSockets**: Powered by Socket.IO with typing indicators and delivery receipts.
- **Media Attachments**: Support for uploading images, documents, presentations, videos, and zip files.
- **Strict Permission Isolation**: Uploaded files and chats are accessible **only** to the user who uploaded them and the Administrator. Never exposed to other users.

### 5. 🔔 Notifications & Dev Mailbox
- **In-App Notification Center**: Real-time bell popover with unread counter badges and one-click "Mark All Read".
- **Email Notifications**: For task assignments, welcome greetings, admin registration alerts, and status changes.
- **Built-In Dev Mailbox**: Live in-app mailbox drawer allowing instant inspection and 1-click auto-fill of OTP codes even in offline environments without external SMTP keys.

---

## 🚀 Quick Start Guide

### 1. Requirements
- Node.js (v18+ recommended, compatible with Node 20 / 22 / 24)
- npm (v9+)

### 2. Installation
From the project root:
```bash
npm install
npm --prefix client install
```

### 3. Build & Run Locally
To run the full-stack server (serves API, WebSockets, and client bundle on port 5000):
```bash
# 1. Build the frontend client bundle
npm run build

# 2. Start the production server
npm start
```
Or to run concurrently with Vite hot-reload development server:
```bash
npm run dev
```

The application will be accessible at:
```
http://localhost:5000
```
(Or `http://localhost:5173` when running Vite dev server)

---

## 🔑 Administrator Access

### 🛡️ Administrator Account
| Email | Password | Role |
|---|---|---|
| `jerison1539@gmail.com` | `JeriAD07#` | `admin` |

*Team members register individually with their own email and verify via 6-digit email OTP.*

---

## 📧 Email & SMTP Configuration

The system is configured with dual email delivery modes:

1. **Development Mailer (Default)**:
   - Does not require any external email accounts or API keys.
   - All outgoing emails (OTPs, Welcome emails, task alerts) are logged to the console and displayed in the in-app **Mailbox & OTPs** inspector in the navbar.
   - You can copy or auto-fill OTPs directly from the UI.

2. **Production SMTP (Gmail, Resend, SendGrid, Amazon SES, or custom SMTP)**:
   - Edit the `.env` file in the project root:
   ```env
   SMTP_ENABLED=true
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_google_app_password
   SMTP_FROM="Team Task Manager" <no-reply@teamtask.com>
   ```

### How to Obtain Real Email Credentials:

#### Option A: Gmail (Free & Quick)
1. Go to your **Google Account** -> **Security**.
2. Enable **2-Step Verification** if not already active.
3. Search for **App Passwords** (or visit `myaccount.google.com/apppasswords`).
4. Generate a new App Password named `Team Task Manager`.
5. Copy the 16-character password into `.env`:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_SECURE=false`
   - `SMTP_USER=your_gmail@gmail.com`
   - `SMTP_PASS=xxxx xxxx xxxx xxxx`

#### Option B: Resend (Modern Developer Email)
1. Sign up at [resend.com](https://resend.com) (free tier allows 3,000 emails/month).
2. Go to **API Keys** -> Create an API key.
3. Configure `.env`:
   - `SMTP_HOST=smtp.resend.com`
   - `SMTP_PORT=465`
   - `SMTP_SECURE=true`
   - `SMTP_USER=resend`
   - `SMTP_PASS=re_your_api_key_here`
   - `SMTP_FROM=onboarding@resend.dev`

#### Option C: SendGrid
1. Sign up at [sendgrid.com](https://sendgrid.com).
2. Create an **API Key** with Mail Send permissions.
3. Configure `.env`:
   - `SMTP_HOST=smtp.sendgrid.net`
   - `SMTP_PORT=587`
   - `SMTP_USER=apikey`
   - `SMTP_PASS=SG.your_sendgrid_api_key`

---

## 🧪 Automated End-to-End Test Suite

The project includes an automated test script (`test_suite.js`) that verifies every single server flow without relying on external dependencies:
```bash
node test_suite.js
```
The test suite covers:
1. Server health check endpoint
2. Admin authentication and JWT generation
3. User OTP generation, cryptographic expiry check, and OTP verification
4. User registration with welcome email dispatch and admin alerts
5. Task creation and multi-user assignment by Admin
6. User-restricted task dashboard (verifies user sees *only* their assigned tasks)
7. 3-state task progression (`pending` -> `in_progress` -> `completed`)
8. Work submission with proof file uploads (multipart/form-data)
9. Private 1-on-1 chat between User and Admin
10. Spreadsheet login activity logging and CSV export
11. Ownership isolation (proves normal users cannot access other users' files)

---

## 📁 Project Architecture

```
├── client/                     # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── components/         # Navbar, Sidebar, Toast, Modals (Auth, CreateTask, SubmitWork, FilePreview, DevMailbox)
│   │   ├── context/            # AuthContext (JWT, Socket.IO, Notifications, Toasts)
│   │   ├── views/              # AdminDashboard, TasksBoard, SpreadsheetLogs, TeamMembers, FilesManager, ChatView
│   │   ├── App.jsx             # Master View Orchestrator
│   │   └── index.css           # Premium Dark-Mode Design System & CSS Tokens
│   └── vite.config.js          # Vite config with API and Socket proxy
├── server/                     # Backend API & Real-time Server
│   ├── middleware/             # auth.js (JWT validation, RBAC, Login activity logger)
│   ├── routes/
│   │   ├── auth.js             # OTP generation, verification, registration, login
│   │   ├── tasks.js            # Admin task CRUD, assignments, user statuses, submissions
│   │   ├── users.js            # User roster, spreadsheet login logs, CSV export
│   │   ├── chat.js             # 1-on-1 private messaging & media attachments
│   │   ├── files.js            # Secure uploads, permission-checked streaming downloads
│   │   └── notifications.js    # In-app notifications & read receipts
│   ├── utils/uploader.js       # Multer storage configuration and MIME validation
│   ├── mailer.js               # Nodemailer transporter & HTML email templates
│   ├── db.js                   # SQLite database wrapper, tables, and automated seeding
│   ├── database.sqlite         # Persistent relational SQLite database
│   └── index.js                # Express & Socket.IO server entrypoint
├── uploads/                    # Secure storage directory (submissions, chat, general)
├── test_suite.js               # Automated end-to-end integration test runner
├── .env.example                # Environment variables template
└── package.json                # Project root scripts and dependencies
```

---

## 🔒 Security Best Practices Implemented

- **Password Hashing**: `bcryptjs` with 10 salt rounds.
- **Stateless Authorization**: Signed JSON Web Tokens (JWT) verified on every protected route.
- **Granular RBAC**: Strict separation between `admin` and `user` permissions enforced on the backend.
- **File Access Security**: Files cannot be accessed by public URL guessing. Every download/preview route validates user ownership or admin privilege.
- **Audit Logging**: Every authentication event (successful or failed) records IP origin, user agent, failure reason, and timestamp.
- **OTP Expiration**: Cryptographic 6-digit codes automatically expire after 10 minutes.

---

## 🌐 Deployment Instructions

The application is structured to be deployed on platforms such as **Render**, **Railway**, **DigitalOcean**, or **VPS (Ubuntu/Debian)**:

### Deploying to Render / Railway:
1. Connect your repository to Render or Railway.
2. Set the **Build Command**: `npm install && npm run build`
3. Set the **Start Command**: `npm start`
4. Configure persistent storage:
   - For **Render**: Add a Persistent Disk mounted at `/uploads` and `/server`.
   - For **Railway**: Add a Volume mounted at `/uploads`.
5. Configure the Environment Variables in the platform's dashboard:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `JWT_SECRET=your_strong_random_secret_string`
   - `DEFAULT_ADMIN_EMAIL=admin@yourdomain.com`
   - `DEFAULT_ADMIN_PASSWORD=YourSecureAdminPassword123!`
   - *(Optional)* SMTP credentials (`SMTP_ENABLED=true`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`)
