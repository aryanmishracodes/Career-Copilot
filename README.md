<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_AI-powered-4285F4?logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
</p>

# 🚀 Career Copilot

**An AI-powered career intelligence platform that transforms your resume into actionable career strategy.**

<p align="center">
  <a href="https://career-copilot-web.vercel.app"><img src="https://img.shields.io/badge/🌐_Live_Demo-career--copilot--web.vercel.app-blue?style=for-the-badge" /></a>
  &nbsp;
  <a href="https://render.com/deploy?repo=https://github.com/aryanmishracodes/Career-Copilot"><img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" /></a>
</p>

> **Note:** The first request may take ~30s if the backend is waking up (free tier cold start).

Career Copilot is a full-stack SaaS application that combines resume analysis, live job market intelligence, adaptive mock interviews, and personalized learning roadmaps — all powered by Google Gemini AI. Upload your resume once and get a complete career command center.

---

## ✨ Features

### 📄 Resume Intelligence
- **PDF & DOCX upload** with real-time text extraction
- **ATS Compatibility Score** — 6-dimension analysis (contact info, formatting, keyword density, action verbs, quantified metrics, section structure)
- **Skill Extraction** — NLP-powered skill identification across 12+ categories
- **Role Fit Analysis** — AI-generated role match profiles with fit percentages and gap identification
- **Recruiter Signals** — Positive and negative signals a recruiter would flag
- **Shortlist Probability** — AI-estimated chance of passing initial screening
- **Improvement Tips** — Actionable recommendations based on detected gaps
- **Resume Version History** — Track ATS score progression across uploads

### 📊 Market Intelligence
- **Live Job Listings** — Real-time job search powered by JSearch API (RapidAPI)
- **AI Match Scoring** — Personalized job-to-resume compatibility scores
- **Tier Classification** — Jobs categorized as Strong Match, ROI Opportunity, or Stretch Role
- **Skill Gap Analysis** — See exactly which skills you need for each role
- **"Why This Fits" Reasoning** — AI-generated explanations for each match

### 🎤 Mock Interview Engine
- **5 Interview Types** — Technical, Behavioral, System Design, HR, and Mixed
- **Adaptive Question Bank** — Curated questions with subtopic and cognitive mode tracking to prevent repetition
- **5-Dimension Evaluation** — Technical accuracy, relevance, communication, depth, and structure
- **Bluff Detection** — Catches advanced terminology used without proper explanation
- **Gibberish & Spam Guard** — Validates answer quality before scoring
- **8 Named Evaluation States** — Granular feedback beyond simple percentages
- **5 Interviewer Personalities** — Distinct pressure styles from friendly to adversarial
- **Custom Interview Length** — Choose 5, 10, 20, or 40 questions
- **Pass/Fail Prediction** — Data-driven hiring outcome estimation

### 🗺️ Learning Roadmap
- **Personalized Skill Roadmap** — AI-generated learning path based on your resume gaps
- **Priority Scoring** — Skills ranked by career impact
- **Resource Recommendations** — Curated learning resources per skill
- **Progress Tracking** — Visual progress indicators

### 🏠 Dashboard
- **Career Positioning** — At-a-glance career health metrics
- **Onboarding Flow** — Guided first-time user experience
- **Recruiter Snapshot** — Summary of how recruiters would perceive your profile
- **Quick Navigation** — One-click access to all platform features

### ⚙️ Settings & Profile
- **Profile Management** — Name editing, password changes
- **OAuth Connections** — View connected Google/GitHub accounts
- **Email Verification** — Full verification flow with Resend
- **Resume History** — Browse all uploaded resume versions with scores
- **Career Memory** — Interview count, average scores, and career statistics
- **Account Deletion** — Full cascade delete with data cleanup

### 🔐 Authentication
- **Email/Password** — Secure signup with bcrypt hashing
- **Google OAuth** — One-click Google sign-in
- **GitHub OAuth** — One-click GitHub sign-in
- **Email Verification** — Verification emails via Resend
- **Password Recovery** — Forgot password and reset flow
- **JWT Sessions** — Stateless authentication with token persistence

---

## 🏗️ Architecture

Career Copilot is built as a **Turborepo monorepo** with three main applications and two shared packages:

```
career-copilot/
├── apps/
│   ├── web/              # Next.js 16 frontend (React 19, Tailwind CSS 4)
│   ├── api/              # Express.js backend API (TypeScript)
│   └── ai-service/       # FastAPI Python service (Gemini AI)
├── packages/
│   ├── db/               # Drizzle ORM schema & migrations
│   └── shared-types/     # Shared TypeScript type definitions
├── docker-compose.yml    # PostgreSQL 16 + Redis 7
├── turbo.json            # Turborepo pipeline config
└── package.json          # npm workspaces root
```

### Data Flow — Resume Upload

```
User uploads PDF/DOCX
  → Next.js sends to Express API (POST /api/v1/resumes/upload)
  → API stores placeholder record in PostgreSQL
  → API enqueues job to BullMQ (Redis)
  → Background worker picks up job
  → Worker calls Python AI service (POST /resume/parse)
  → Python extracts text via PyPDF2
  → Gemini AI analyzes resume → structured JSON
  → Worker updates PostgreSQL with parsed data
  → Frontend polls /resumes/:id/status every 2s
  → Status = "ready" → full analysis displayed
```

### Data Flow — Mock Interview

```
User selects interview type + length
  → Frontend serves question from local question bank
  → User submits answer
  → Local evaluation engine scores instantly (5 dimensions)
  → Results page shows detailed analytics
  → All scoring is deterministic from answer content
```

### Data Flow — Authentication

```
Email Signup:
  Form → Express API → bcrypt hash → PostgreSQL insert
  → Resend sends verification email → User clicks link
  → /verify-email → API marks email_verified = true

OAuth (Google/GitHub):
  Click provider button → Redirect to provider
  → Provider redirects to Express callback
  → API exchanges code for token → upserts user
  → Generates JWT → redirects to /auth/callback?token=...
  → Next.js stores token → redirects to dashboard
```

---

## 🛠️ Tech Stack

### Frontend — `apps/web`
| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | React framework with file-based routing |
| **React 19** | UI library |
| **TypeScript 5** | Type safety |
| **Tailwind CSS 4** | Utility-first styling |
| **Framer Motion 12** | Animations and transitions |
| **Lucide React** | Icon library |

### Backend API — `apps/api`
| Technology | Purpose |
|---|---|
| **Express.js 4** | HTTP server framework |
| **TypeScript 5** | Type safety |
| **Drizzle ORM** | Database queries and schema |
| **PostgreSQL 16** | Primary database |
| **BullMQ + Redis** | Background job queue |
| **JWT** | Stateless authentication |
| **Multer** | File upload handling |
| **Resend** | Transactional email delivery |
| **bcryptjs** | Password hashing |

### AI Service — `apps/ai-service`
| Technology | Purpose |
|---|---|
| **FastAPI** | Python web framework |
| **Google Gemini AI** | Resume analysis and intelligence |
| **PyPDF2** | PDF text extraction |
| **Pydantic** | Request/response validation |
| **Uvicorn** | ASGI server |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker Compose** | Container orchestration |
| **PostgreSQL 16** | Relational database |
| **Redis 7** | Job queue backend |
| **Turborepo** | Monorepo build orchestration |
| **npm Workspaces** | Package management |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Docker Desktop** (for PostgreSQL and Redis)
- **npm** ≥ 10

### 1. Clone the Repository

```bash
git clone https://github.com/aryanmishracodes/Career-Copilot.git
cd Career-Copilot
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies (all workspaces)
npm install

# Set up Python virtual environment
cd apps/ai-service
python -m venv venv

# Activate venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cd ../..
```

### 3. Configure Environment Variables

**API** — Create `apps/api/.env`:
```env
DATABASE_URL=postgres://postgres:password@localhost:5432/career_copilot
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-here
RESEND_API_KEY=your-resend-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

**AI Service** — Create `apps/ai-service/.env`:
```env
GEMINI_API_KEY=your-gemini-api-key
JSEARCH_API_KEY=your-rapidapi-key
```

**Web** — Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id
```

### 4. Start Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379) in the background.

### 5. Run Database Migrations

```bash
node -e "const {Client}=require('pg');const c=new Client({connectionString:'postgres://postgres:password@localhost:5432/career_copilot'});c.connect().then(()=>c.query(require('fs').readFileSync('packages/db/drizzle/0000_ancient_multiple_man.sql','utf8'))).then(()=>c.query(require('fs').readFileSync('packages/db/drizzle/0001_auth_upgrade.sql','utf8'))).then(()=>{console.log('Migrations done');c.end()}).catch(e=>{console.error(e.message);c.end()})"
```

### 6. Start Development Servers

```bash
npm run dev
```

Turborepo starts all three services in parallel:

| Service | URL |
|---|---|
| 🌐 **Web App** | http://localhost:3000 |
| ⚡ **API Server** | http://localhost:4000 |
| 🤖 **AI Service** | http://localhost:8000 |

### 7. Open the App

Navigate to **http://localhost:3000** and create an account to get started!

---

## 📁 Project Structure

```
career-copilot/
│
├── apps/
│   ├── web/                          # Next.js Frontend
│   │   ├── app/
│   │   │   ├── dashboard/            # Main dashboard
│   │   │   ├── resume/               # Resume intelligence page
│   │   │   ├── market/               # Market intelligence page
│   │   │   ├── interview/            # Mock interview engine
│   │   │   ├── roadmap/              # Learning roadmap
│   │   │   ├── settings/             # User settings
│   │   │   ├── login/                # Login page
│   │   │   ├── register/             # Registration page
│   │   │   ├── auth/                 # OAuth callback handler
│   │   │   ├── forgot-password/      # Password recovery
│   │   │   ├── reset-password/       # Password reset
│   │   │   └── verify-email/         # Email verification
│   │   ├── components/               # Reusable UI components
│   │   └── contexts/                 # React context providers
│   │
│   ├── api/                          # Express.js Backend
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── auth.ts           # Authentication (signup, login, OAuth)
│   │       │   ├── resumes.ts        # Resume upload & status
│   │       │   ├── interviews.ts     # Mock interview sessions
│   │       │   ├── market.ts         # Job market search
│   │       │   ├── roadmap.ts        # Learning roadmap
│   │       │   └── gaps.ts           # Skill gap analysis
│   │       ├── queue/                # BullMQ job processors
│   │       └── middleware/           # Auth middleware
│   │
│   └── ai-service/                   # Python AI Service
│       ├── routers/
│       │   ├── resume.py             # Resume parsing endpoint
│       │   ├── interview.py          # Interview AI endpoint
│       │   ├── market.py             # Market analysis endpoint
│       │   └── roadmap.py            # Roadmap generation endpoint
│       └── services/
│           ├── resume_analyzer.py    # Gemini-powered resume analysis
│           ├── resume_parser.py      # PDF/DOCX text extraction
│           ├── gemini_client.py      # Google Gemini API client
│           ├── job_search.py         # JSearch API integration
│           └── embeddings.py         # Embedding service (stub)
│
├── packages/
│   ├── db/                           # Database Package
│   │   ├── src/
│   │   │   └── schema.ts            # Drizzle ORM schema
│   │   └── drizzle/                  # SQL migration files
│   └── shared-types/                 # Shared TypeScript types
│
├── docker-compose.yml                # PostgreSQL + Redis
├── turbo.json                        # Turborepo config
└── package.json                      # Workspace root
```

---

## 🔑 API Keys Required

| Service | Key | Purpose | Get It From |
|---|---|---|---|
| **Google Gemini** | `GEMINI_API_KEY` | Resume analysis AI | [Google AI Studio](https://aistudio.google.com/apikey) |
| **JSearch (RapidAPI)** | `JSEARCH_API_KEY` | Live job listings | [RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) |
| **Resend** | `RESEND_API_KEY` | Verification emails | [Resend](https://resend.com) |
| **Google OAuth** | `GOOGLE_CLIENT_ID` / `SECRET` | Google sign-in | [Google Cloud Console](https://console.cloud.google.com) |
| **GitHub OAuth** | `GITHUB_CLIENT_ID` / `SECRET` | GitHub sign-in | [GitHub Developer Settings](https://github.com/settings/developers) |

> **Note:** The app works without OAuth keys — email/password auth is always available. Without Gemini API key, resume analysis falls back to a local NLP pipeline.

---

## 🗄️ Database Schema

Key tables managed by Drizzle ORM:

| Table | Purpose |
|---|---|
| `users` | User accounts, auth credentials, OAuth links |
| `resumes` | Uploaded resumes with raw text and parsed JSON |
| `skills` | Extracted skills linked to resumes |
| `interviews` | Mock interview sessions and scores |
| `roadmap_items` | Personalized learning roadmap entries |
| `applications` | Job application tracking |
| `jobs` | Cached job listing data |

---

## 🧪 Development

### Useful Commands

```bash
# Start all services
npm run dev

# Build all packages
npm run build

# Lint all packages
npm run lint

# Start only the web app
npm run dev --workspace=web

# Start only the API
npm run dev --workspace=api
```

### Stopping the App

```bash
# Stop dev servers
Ctrl+C

# Stop Docker containers
docker compose down
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Aryan Mishra** — [@aryanmishracodes](https://github.com/aryanmishracodes)

---

<p align="center">
  <b>Built with ❤️</b>
</p>
