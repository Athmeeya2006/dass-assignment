# Felicity Fest Management System

A full-stack MERN (MongoDB, Express.js, React, Node.js) application for managing college fest events, merchandise, and club discovery. Built as part of the DASS (Design and Analysis of Software Systems) course at IIIT Hyderabad.

---

## Table of Contents

1. [Libraries, Frameworks & Modules](#libraries-frameworks--modules)
2. [Advanced Features Implemented](#advanced-features-implemented)
3. [System Roles](#system-roles)
4. [Project Structure](#project-structure)
5. [Setup & Installation](#setup--installation)
6. [Environment Variables](#environment-variables)
7. [Default Admin Credentials](#default-admin-credentials)

---

## Libraries, Frameworks & Modules

### Backend Libraries

| Library | Version | Justification |
|---|---|---|
| **express** | 4.18.2 | Chosen as the HTTP framework because it is the de facto standard for Node.js web servers. Its minimalist middleware architecture makes it easy to compose route handlers, authentication guards, and error handlers without framework lock-in. Alternatives like Fastify offer marginal speed gains but lack the ecosystem maturity and community plugin support that Express provides. |
| **mongoose** | 7.5.0 | Selected as the MongoDB ODM because it provides schema validation, middleware hooks (used for automatic password hashing via `pre('save')`), discriminator-based inheritance (used to model Participant/Organizer/Admin from a single User base), and population for cross-document references. Raw MongoDB driver was considered but would require manually implementing validation and relationship management. |
| **bcryptjs** | 2.4.3 | Used for password hashing with a configurable salt rounds parameter (set to 12). Chosen over the native `bcrypt` C++ addon because bcryptjs is a pure JavaScript implementation that requires no native compilation, making it portable across all deployment environments without build tools. The 12-round cost factor balances security against login latency. |
| **jsonwebtoken** | 9.0.0 | Implements stateless JWT authentication with 7-day token expiry. Chosen over session-based auth because JWTs eliminate server-side session storage, work seamlessly across multiple backend instances, and integrate naturally with the React SPA frontend (stored in localStorage, attached via Axios interceptor). The token payload carries userId and role, enabling role-based route guards without additional DB queries. |
| **socket.io** | 4.7.2 | Provides real-time bidirectional communication for the event discussion forum and team chat features. Chosen over raw WebSockets because Socket.IO handles automatic reconnection, room-based namespacing (each event/team gets its own room), fallback to long-polling when WebSockets are blocked, and structured event emission. The server integrates with the existing Express HTTP server via `http.createServer`. |
| **nodemailer** | 6.9.3 | Handles SMTP email delivery for registration confirmations, attendance notifications, organizer credential distribution, and password reset notifications. Chosen because it is the most mature Node.js email library with native support for Gmail SMTP, TLS, and Ethereal test accounts for development. In development mode, the service auto-detects placeholder SMTP credentials and falls back to Ethereal test accounts with clickable preview URLs logged to the console. |
| **multer** | 1.4.4 | Middleware for handling `multipart/form-data` file uploads (payment proof images, custom registration form file fields). Chosen because it integrates directly with Express middleware chains, supports disk storage with configurable filename generation, file type filtering (images + PDF + Word documents), and size limits (10MB). Files are stored in `backend/uploads/` with unique timestamped names to prevent collisions. |
| **qrcode** | 1.5.3 | Generates QR code images as base64 data URLs from ticket ID strings. Each registration/ticket gets a unique QR code that encodes the ticket UUID. Chosen for its simplicity  -- a single function call produces a ready-to-embed PNG data URL without any external service dependency. |
| **uuid** | 9.0.0 | Generates cryptographically random v4 UUIDs for ticket identifiers. Chosen over MongoDB ObjectIds for ticket IDs because UUIDs are URL-safe, not guessable from creation time, and provide a namespace separate from database document IDs. This supports the QR scanning workflow where ticket IDs need to be compact and independently verifiable. |
| **ical-generator** | 3.2.0 | Creates RFC 5545-compliant `.ics` calendar files for the "Add to Calendar" feature. Chosen because it produces standards-compliant output that works with Apple Calendar, Google Calendar (via import), and Outlook without any manual iCalendar string formatting. The generated files include event name, description, venue, and start/end timestamps. |
| **json2csv** | 5.0.7 | Converts JavaScript objects to CSV format for the participant list and attendance export features. Chosen over manual CSV string building because it handles edge cases like commas in field values, proper escaping, and configurable column headers. Used by organizers to export registration data and attendance records. |
| **fuse.js** | 6.5.3 | Implements client-side fuzzy search for event browsing. Chosen because it runs entirely in-process without requiring an external search service like Elasticsearch. Configured to search across event name, description, and tags with weighted scoring, enabling participants to find events even with partial or misspelled queries. |
| **axios** | 1.5.0 | Used server-side exclusively for outbound HTTP calls to Discord webhook URLs when organizers publish events. Chosen over the built-in `http` module because Axios provides a cleaner Promise-based API with automatic JSON serialization and error handling for webhook delivery. |
| **dotenv** | 16.0.3 | Loads environment variables from `.env` files into `process.env` at startup. Chosen as the standard approach for managing configuration (database URI, JWT secret, SMTP credentials) across development and production environments without hardcoding secrets. |
| **cors** | 2.8.5 | Enables Cross-Origin Resource Sharing so the React frontend (port 5173) can communicate with the Express backend (port 5000) during development. In production, the frontend and backend may be on different domains (e.g., Vercel and Render), making CORS headers essential. |
| **express-async-errors** | 3.1.1 | Patches Express to automatically catch rejected promises in async route handlers and forward them to the error middleware. Without this, every async handler would need explicit try/catch wrapping to prevent unhandled promise rejections from crashing the server. |
| **nodemon** | 3.0.1 | Development-only file watcher that auto-restarts the Node.js server on source file changes. Eliminates the need to manually restart the backend after every code edit during development. |

### Frontend Libraries

| Library | Version | Justification |
|---|---|---|
| **react** | 18.2.0 | Chosen as the UI library for its component-based architecture, virtual DOM diffing for efficient updates, and the hooks API (`useState`, `useEffect`, `useContext`, `useCallback`, `useRef`) which simplifies state management without external state libraries. React's ecosystem and community support made it the natural choice for building 23 distinct page components across 3 role-based dashboards. |
| **react-dom** | 18.2.0 | Required companion to React for rendering components to the browser DOM. Provides `createRoot` for React 18's concurrent rendering mode. |
| **react-router-dom** | 6.15.0 | Handles client-side routing with nested layouts, parameterized routes (`:eventId`, `:organizerId`, `:ticketId`), and a custom `ProtectedRoute` component that guards role-based pages. Chosen over alternatives like TanStack Router because React Router v6 has the largest adoption, stable API, and built-in `useNavigate`/`useParams`/`useLocation` hooks. |
| **axios** | 1.5.0 | HTTP client configured as a singleton instance (`api/axios.js`) with a request interceptor that attaches the JWT Bearer token from localStorage to every API call, and a response interceptor that redirects to login on 401 errors. Chosen over the native `fetch` API because Axios provides automatic JSON parsing, request/response interceptors, better error handling with structured error objects, and cleaner syntax. |
| **socket.io-client** | 4.7.2 | Client-side Socket.IO library that connects to the backend for real-time features (forum messages, team chat, online status). Configured with JWT token authentication via `handshake.auth`. Chosen to pair with the server-side Socket.IO for consistent room-based event handling and automatic reconnection. |
| **html5-qrcode** | 2.3.4 | Camera-based QR code scanner used by organizers to mark attendance at events. Supports browser camera APIs, handles permission requests, and decodes QR codes in real-time. Chosen because it works without any native app -- organizers scan QR codes directly from their browser on the event dashboard page. |
| **jwt-decode** | 3.1.2 | Lightweight library that decodes JWT payloads without verification (verification happens server-side). Used in `AuthContext.jsx` to extract the user's role from the stored token, enabling instant role-based route rendering without an API call on page load. |
| **lucide-react** | 0.575.0 | Icon library providing consistent, tree-shakeable SVG icons used throughout the UI (navigation, buttons, status indicators, empty states). Chosen over Font Awesome or Heroicons because Lucide icons are MIT-licensed, individually importable (no bundle bloat), and follow a consistent 24x24 stroke-based design that matches the application's minimal aesthetic. |
| **tailwindcss** | 3.3.0 | Utility-first CSS framework used for all styling. Chosen over component libraries like Material-UI or Chakra UI because Tailwind provides complete design freedom without opinionated component patterns, produces smaller CSS bundles via PurgeCSS (built into Tailwind), and enables rapid prototyping with utility classes directly in JSX. A custom "Neon Brutalist" design system was built on top of Tailwind's configuration with custom colors, fonts, and animations. |
| **vite** | 4.5.0 | Build tool and development server. Chosen over Create React App (webpack-based) because Vite uses native ES modules for instant hot module replacement (HMR) during development, and Rollup for optimized production builds. Build times are under 4 seconds for the entire frontend. |
| **@vitejs/plugin-react** | 4.1.0 | Vite plugin that enables React Fast Refresh (hot reload preserving component state), JSX transformation, and React-specific optimizations during both development and production builds. |
| **autoprefixer** | 10.4.16 | PostCSS plugin that adds vendor prefixes to CSS rules for cross-browser compatibility. Required by Tailwind CSS's PostCSS pipeline to ensure generated utility classes work across Chrome, Firefox, Safari, and Edge. |
| **postcss** | 8.4.31 | CSS transformation tool that powers the Tailwind CSS build pipeline. Processes `@tailwind` directives and applies autoprefixer. Required as a peer dependency by both Tailwind CSS and autoprefixer. |

---

## Advanced Features Implemented

### Feature Selection Rationale

The feature selection was driven by two goals: (1) building a cohesive product where features complement each other, and (2) demonstrating proficiency across different technical domains (real-time communication, file handling, cryptographic privacy, third-party integrations).

- **Tier A features** were all implemented because they form an interconnected system: team registration (A1) enables team chat (B3), merchandise workflow (A2) exercises file upload and approval patterns, and QR attendance (A3) provides the data pipeline for CSV exports and feedback eligibility.
- **Tier B features** were selected to cover real-time communication (B1: forum via Socket.IO), admin workflow automation (B2: password resets), and to extend team registration with live collaboration (B3: team chat).
- **Tier C features** were both implemented because they address different user needs: anonymous feedback (C1) provides post-event analytics for organizers, while calendar integration (C2) improves the participant experience by connecting event data with external tools.

---

### Tier A: Advanced Event Features (all 3 implemented)

#### A1: Hackathon Team Registration

**Design Choices:**
- Teams are created with a randomly generated 8-character invite code that members use to join, avoiding the need to share database IDs or complex URLs.
- Member acceptance uses a 3-state model (Pending/Accepted/Rejected) so the team leader has explicit control over who joins before finalization.
- Finalization triggers bulk ticket generation for all accepted members in a single operation, with individual registration records and QR-coded tickets created for each member.
- Teams have a configurable `maxSize` derived from the event's `teamMaxSize` setting, preventing over-enrollment.

**Implementation Approach:**
- `Team` model stores the leader reference, event reference, members array (with participantId and status), and invite code.
- `teamController.js` handles the full lifecycle: create, join via code, accept/reject members, finalize (bulk ticket creation), leave, and dissolve.
- On finalization, the controller iterates through accepted members, creates `Registration` and `Ticket` documents for each, generates QR codes, and sends confirmation emails.
- Frontend `TeamChat.jsx` integrates with Socket.IO for real-time team coordination after formation.

#### A2: Merchandise Payment Approval Workflow

**Design Choices:**
- A manual approval workflow was chosen over automated payment processing because college fest merchandise typically uses UPI/bank transfers where automated verification is not feasible.
- Payment proof is uploaded as an image file (Multer handles `multipart/form-data`), stored on disk, and displayed to the organizer for visual verification.
- The approval flow follows: Purchase -> Upload Proof -> Pending Approval -> Approved/Rejected. Only approved purchases receive QR tickets and trigger stock decrements.
- Stock management uses atomic `$inc` operations to prevent overselling under concurrent requests.

**Implementation Approach:**
- `Event` model includes a `merchandiseVariants` array (name, size, color, price, stock) for merchandise-type events.
- `participantController.purchaseMerchandise` validates variant/stock availability and creates a `Registration` with status "Pending Payment".
- `uploadMiddleware.js` handles proof image upload with file type filtering and 10MB size limits.
- `organizerController.approveMerchandisePurchase` decrements stock, generates ticket + QR, sends confirmation email, and updates registration status.

#### A3: QR Scanner & Attendance Tracking

**Design Choices:**
- Browser-based QR scanning was chosen over a native mobile app to eliminate installation barriers for organizers -- they can scan from any device with a camera.
- Manual ticket ID entry is provided as a fallback for situations where QR codes are damaged or cameras are unavailable.
- Duplicate scan prevention returns a clear error message rather than silently ignoring, so organizers know the ticket was already scanned.
- Attendance data is tracked with timestamps (`checkedInAt`) enabling time-based analytics.

**Implementation Approach:**
- `html5-qrcode` library is used on the organizer's EventDetail page, wrapped in a camera component that requests permissions and decodes QR codes in real-time.
- `eventController.markAttendance` validates the ticket exists, belongs to the correct event, and hasn't been scanned. It then marks `attended: true` with a `checkedInAt` timestamp and increments the event's `totalAttendance` counter.
- Live attendance stats (scanned vs. unscanned) are displayed in a dashboard tab alongside an exportable attendance CSV.
- Manual attendance marking allows organizers to enter ticket IDs directly for edge cases.

---

### Tier B: Enhanced Features (all 3 implemented)

#### B1: Real-Time Discussion Forum

**Design Choices:**
- Per-event rooms isolate conversations so messages from one event never leak into another.
- Registration gating ensures only participants who registered for an event can post in its forum, maintaining relevance.
- Organizer moderation (pin/delete) gives event creators control over content without requiring admin intervention.
- Emoji reactions provide lightweight interaction without cluttering the message stream with "+1" replies.
- Reply threading connects responses to specific messages for context in busy forums.

**Implementation Approach:**
- Socket.IO rooms named `event-${eventId}` handle real-time message broadcast, deletion events, pin events, and reaction updates.
- `ForumMessage` model stores content, sender, event, reply reference, pin status, reactions (Map of emoji to user arrays), and soft-delete flag.
- `forumController.js` handles CRUD operations with role-based permissions (participants can delete own messages, organizers can delete/pin any).
- Frontend forum component auto-scrolls to newest messages, shows threaded replies with a quoted reference, and renders emoji reactions with click-to-toggle.

#### B2: Organizer Password Reset Workflow

**Design Choices:**
- A request-and-approve workflow was chosen instead of email-based self-service reset because organizer accounts are created by admins, and password resets should go through the same administrative approval channel.
- Organizers must provide a reason for the reset request, creating an audit trail.
- On approval, a cryptographically secure password is auto-generated using `crypto.randomBytes` with Fisher-Yates shuffling for character distribution, then emailed to the organizer.

**Implementation Approach:**
- `PasswordResetRequest` model tracks organizerId, reason, status (Pending/Approved/Rejected), and timestamps.
- Organizers submit requests via their Profile page; admins review them in the PasswordResets management page.
- `adminController.approvePasswordReset` generates a secure password via `tokenUtils.generateSecurePassword()`, updates the organizer's password (auto-hashed by Mongoose pre-save hook), and sends the new credentials via email.
- The admin sees pending count in their dashboard and can filter by status (Pending/Approved/Rejected/All).

#### B3: Team Chat (requires A1)

**Design Choices:**
- Persistent message history (stored in MongoDB) ensures team members who join late can read previous discussions.
- Online status indicators show which team members are currently connected, aiding real-time coordination.
- The chat is scoped to finalized teams only, preventing premature use before team formation is complete.

**Implementation Approach:**
- `TeamChatMessage` model stores senderId, teamId, content, and timestamp with a compound index on `teamId + timestamp` for efficient retrieval.
- Socket.IO handles `join-team`, `team-message`, and `team-typing` events. An in-memory `teamOnlineUsers` Map tracks connected users per team room.
- Frontend `TeamChat.jsx` renders a sidebar of team members with online/offline indicators, a scrollable message list, and a message input with real-time delivery.

---

### Tier C: Bonus Features (both implemented)

#### C1: Anonymous Feedback System

**Design Choices:**
- Privacy-by-design: participant identity is never stored in feedback documents. Instead, a SHA-256 hash of `participantId:eventId` is used for deduplication, making it mathematically infeasible to reverse the hash back to the participant.
- Feedback is only available for events with status "Completed" or "Closed", and only to participants who attended (verified by checking the ticket's `attended` flag).
- Star ratings (1-5) provide quantitative data; optional text comments provide qualitative insights.

**Implementation Approach:**
- `Feedback` model stores eventId, participantHash (SHA-256), rating, comment, and timestamp. A compound unique index on `eventId + participantHash` prevents duplicate submissions.
- `feedbackController.submitFeedback` computes `crypto.createHash('sha256').update(participantId:eventId).digest('hex')` for the dedup hash, then performs an upsert.
- Organizer feedback summary view shows total count, average rating, rating distribution histogram, and individual comments.

#### C2: Add to Calendar Integration

**Design Choices:**
- Three calendar formats are supported to cover the major platforms: `.ics` file download (works with Apple Calendar, any desktop client), Google Calendar deep-link URL, and Microsoft Outlook web-link URL.
- Calendar entries include event name, description, venue, and start/end timestamps, giving recipients full context.
- The feature is accessible from the TicketView page since it represents a confirmed registration -- users have already committed to attending.

**Implementation Approach:**
- `ticketController.generateCalendarFile` uses `ical-generator` to produce an RFC 5545-compliant `.ics` file served with `Content-Type: text/calendar` headers for automatic download.
- `ticketController.getGoogleCalendarUrl` constructs a `calendar.google.com/calendar/render` URL with URL-encoded event parameters.
- `ticketController.getOutlookCalendarUrl` constructs an `outlook.live.com/calendar/0/deeplink/compose` URL with the same parameters adapted to Outlook's format.
- Frontend renders a dropdown menu with all three options on the TicketView page.

---

## System Roles

| Role | Capabilities |
|---|---|
| **Participant** | Sign up, onboarding (interest selection + club following), browse/search events, register for events (with custom form responses and file uploads), purchase merchandise, view QR tickets, add events to calendar, participate in event forums, team registration and chat, submit anonymous feedback, follow/unfollow clubs |
| **Organizer** | Create and manage events (Normal + Merchandise) with full lifecycle management (Draft/Published/Ongoing/Completed/Closed), build custom registration forms, scan QR codes for attendance, approve/reject merchandise payments, view analytics and participant data, export CSV reports, moderate event forums, configure Discord webhooks, request password resets |
| **Admin** | View system dashboard with live health monitoring, create and manage organizer accounts, review and process password reset requests, view platform-wide statistics |

---

## Project Structure

```
backend/
  server.js                         Express + Socket.IO server, admin seeding, SPA fallback
  config/
    db.js                           MongoDB connection via Mongoose
  controllers/
    authController.js               Signup, login, get current user, change password
    adminController.js              Organizer CRUD, password reset management, dashboard stats
    organizerController.js          Event CRUD, merchandise approvals, CSV export, profile, Discord webhooks
    participantController.js        Registration, tickets, follow/unfollow, merchandise purchase, onboarding
    eventController.js              Public event browsing, trending, QR attendance, search (Fuse.js)
    teamController.js               Team creation, invite join, finalization, bulk ticket generation
    feedbackController.js           Anonymous feedback submission and aggregated summaries
    forumController.js              Forum CRUD, pinning, emoji reactions, moderation
    ticketController.js             Ticket details, ICS generation, Google/Outlook calendar URLs
  middleware/
    authMiddleware.js               JWT verification, optional auth, role-based guards
    uploadMiddleware.js             Multer file upload (disk storage, type filter, 10MB limit)
  models/
    User.js                         Base User + Participant/Organizer/Admin discriminators
    Event.js                        Events with custom forms, merchandise variants, view tracking
    Registration.js                 Event registrations with form responses, payment status
    Ticket.js                       QR-coded tickets with attendance tracking and audit log
    Team.js                         Hackathon teams with invite codes and member states
    TeamChatMessage.js              Persisted team chat messages
    ForumMessage.js                 Forum messages with replies, pins, reactions
    Feedback.js                     Anonymous feedback with SHA-256 dedup hashing
    PasswordResetRequest.js         Organizer password reset requests with status tracking
  routes/
    auth.js                         /api/auth/* (signup, login, me, change-password)
    admin.js                        /api/admin/* (organizers, resets, stats)
    organizer.js                    /api/organizer/* (events, profile, approvals, exports)
    participant.js                  /api/participant/* (registration, tickets, profile, onboarding)
    event.js                        /api/event/* (public browsing, attendance, forum, calendar)
    organizers.js                   /api/organizers/* (public club listings, follow/unfollow)
    team.js                         /api/team/* (create, join, finalize, chat)
    feedback.js                     /api/feedback/* (submit, summary)
    passwordReset.js                /api/password-reset/* (request, history)
  seed/
    adminSeed.js                    Standalone admin seeding script
  utils/
    emailService.js                 Nodemailer with Ethereal fallback for development
    qrGenerator.js                  QR code generation (base64 PNG data URLs)
    tokenUtils.js                   JWT generation and secure password generation
  uploads/                          File upload storage directory

frontend/
  index.html                        SPA entry point
  vite.config.js                    Vite configuration with React plugin and API proxy
  tailwind.config.js                Custom design system (colors, fonts, animations)
  postcss.config.js                 PostCSS pipeline (Tailwind + Autoprefixer)
  src/
    main.jsx                        React 18 createRoot entry
    App.jsx                         React Router v6 route definitions
    index.css                       Tailwind directives and custom global styles
    api/
      axios.js                      Axios singleton with JWT interceptor
    context/
      AuthContext.jsx               Authentication state, login/logout, token management
      ToastContext.jsx              Global toast notification system
    components/
      Navbar.jsx                    Role-aware navigation bar
      ui/                           Reusable UI primitives (Badge, Button, Card, Input, Modal, etc.)
    pages/
      auth/
        Login.jsx                   Email/password login for all roles
        Signup.jsx                  Multi-step participant registration
      participant/
        Dashboard.jsx               Upcoming events, recent registrations, followed clubs
        BrowseEvents.jsx            Event search, filtering, trending carousel
        EventDetail.jsx             Registration, forum, team management, feedback
        Clubs.jsx                   Club discovery and following
        OrganizerDetail.jsx         Club profile with events and follow toggle
        Profile.jsx                 Edit profile, password change, following list
        Onboarding.jsx              Interest selection and initial club following
        TicketView.jsx              QR ticket display with calendar integration
        TeamChat.jsx                Real-time team messaging
      organizer/
        Dashboard.jsx               Event overview, quick actions
        CreateEvent.jsx             Event creation with form builder
        EventDetail.jsx             Analytics, participants, attendance, forum, feedback
        Profile.jsx                 Organizer profile and password reset requests
        OngoingEvents.jsx           Live event management dashboard
      admin/
        Dashboard.jsx               System stats, live health check, quick actions
        ManageOrganizers.jsx        Create, view organizer accounts
        PasswordResets.jsx          Review and process reset requests
    routes/
      ProtectedRoute.jsx           Role-based route guard component
```

---

## Setup & Installation

### Prerequisites

- **Node.js** 18+ (with npm)
- **MongoDB** running locally on port 27017, or a MongoDB Atlas connection URI

### 1. Clone and install dependencies

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure environment variables

Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/felicity
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=7d
BCRYPT_ROUNDS=12
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@felicity.com
ADMIN_PASSWORD=Admin@123
NODE_ENV=development
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

> **Note on email:** If SMTP credentials are left as placeholders (`test@gmail.com` / `test_password`), the email service automatically falls back to Ethereal test accounts. Sent emails will be visible via preview URLs printed in the backend console.

### 3. Start the application

```bash
# Terminal 1 -- Backend (port 5000)
cd backend
npm run dev

# Terminal 2 -- Frontend (port 5173)
cd frontend
npm run dev
```

### 4. Access the application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **Health check:** http://localhost:5000/api/health

An admin account is automatically seeded on first server startup using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values from `backend/.env`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Backend server port (default: 5000) |
| `MONGODB_URI` | Yes | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens (use 32+ random characters in production) |
| `JWT_EXPIRY` | No | Token expiration duration (default: 7d) |
| `BCRYPT_ROUNDS` | No | bcrypt salt rounds for password hashing (default: 12) |
| `SMTP_HOST` | No | SMTP server hostname (default: smtp.gmail.com) |
| `SMTP_PORT` | No | SMTP server port (default: 587) |
| `SMTP_USER` | No | SMTP sender email address (placeholder triggers Ethereal fallback) |
| `SMTP_PASS` | No | SMTP sender password / app password |
| `FRONTEND_URL` | No | Frontend origin for CORS and email links (default: http://localhost:5173) |
| `ADMIN_EMAIL` | No | Auto-seeded admin email (default: admin@felicity.com) |
| `ADMIN_PASSWORD` | No | Auto-seeded admin password (default: Admin@123) |
| `NODE_ENV` | No | Set to `production` to enable static file serving and SPA fallback |
| `VITE_API_URL` | Yes | Frontend environment variable pointing to the backend API base URL |

---

## Default Admin Credentials

An admin account is created automatically on server startup if one does not already exist.

- **Email:** `admin@felicity.com`
- **Password:** `Admin@123`

> Change these via `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env` before deploying to production.
