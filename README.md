CareOps - Modern Care Operations & Patient Management Platform

CareOps is an all-in-one clinical operations platform built to eliminate administrative bottlenecks in healthcare and specialized care delivery. It unifies patient self-scheduling, automated dynamic intake workflows, role-based staff management, real-time inventory monitoring, and AI-assisted operational reporting into a single command center.

Key Features

1. Patient Self-Scheduling & Intake
 * Public Booking Portal: Responsive 3-step scheduling interface allowing patients to pick services, dates, and times seamlessly.
 * Automated Intake Engine: Instantly generates unique, pre-filled digital intake forms sent upon appointment creation.
 * Google Calendar Integration: One-click calendar sync directly within confirmation emails.
2. Operational Command Center
 * Live KPI Dashboard: Real-time metrics tracking upcoming visits, active practitioners, total patient records, and completed services.
 * Actionable Quick Report: Dedicated alert panel prioritizing items requiring immediate attention (missing intake forms, pending approvals, low stock thresholds, and unread inquiries).
 * Theme Customization: Full native Dark and Light mode support with persistent state.
3. Staff & Role-Based Access Control (RBAC)
 * Granular Permissions Matrix: Configurable user-level access across individual modules (Inbox, Bookings, Forms, Inventory).
 * Adaptive Viewports: Desktop data tables adapt dynamically into touch-friendly cards on mobile and tablet screens.
 * Staff Invitations: Streamlined team onboarding modal with custom role assignments (Owner, Manager, Staff).
4. Automated Communications & Inventory Control
 * Email Automation (SendGrid): Transactional templates for booking confirmations, intake reminders, and cancellations formatted in exact local time (Asia/Kolkata / IST).
 * Auto-Stock Depletion: Automatically deducts clinical supplies (e.g., examination gloves) upon confirmed bookings and triggers low-stock alerts.
5. Context-Aware AI Assistant
 * Admin Mode: Instant natural language queries for daily schedules, stock checks, and clinic status.
 * Patient Mode: Guided conversational support for pricing, services, and scheduling assistance.

Tech Stack

| Frontend | React 18, Vite, Tailwind CSS, Lucide React, React Router DOM, Axios, React Hot Toast |
| Backend | Node.js, Express.js, PostgreSQL (pg connection pool) |
| Database | PostgreSQL (Hosted via Supabase Connection Pooler) |
| Integrations | SendGrid API (Transactional Email), Twilio SDK (SMS ready) |
| Deployment | Vercel (Frontend SPA), Render (Backend Web Service) |

Getting Started

Prerequisites
 * Node.js: v18.0.0 or higher
 * npm or yarn
 * PostgreSQL Database (e.g., Supabase, Neon, or local instance)
 * SendGrid API Key (for email workflows)
   
Installation & Local Setup

1. Clone the Repository
git clone https://github.com/GuduruVinay/CareOps-Hackathon.git
cd CareOps-Hackathon

2. Backend Setup
cd server
npm install

Create a .env file in /server:
PORT=5000
DATABASE_URI=postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
CLIENT_URL=http://localhost:5173
SENDGRID_API_KEY=SG.your_sendgrid_key_here
SENDGRID_FROM_EMAIL=verified_sender@yourdomain.com
ADMIN_EMAIL=admin@careops.com
ADMIN_PASSWORD=admin123

Start the backend development server:
npm run dev
# Or: node index.js

3. Frontend Setup
Open a new terminal session:
cd client
npm install

Create a .env file in /client:
VITE_API_URL=http://localhost:5000

Start the frontend development server:
npm run dev

Visit http://localhost:5173 in your browser.
