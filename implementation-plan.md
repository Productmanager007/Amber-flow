# POAI Implementation Plan

This document outlines the step-by-step, phased execution plan to build the Partnership Operations AI Assistant (POAI) based on the defined architecture.

---

## Phase 1: Environment Setup & Scaffolding
**Goal:** Initialize the foundational framework, tooling, and design system.
* **1.1 Next.js Initialization:** Bootstrap a new Next.js 15 app using the App Router (`/app`), React, TypeScript, and Tailwind CSS.
* **1.2 UI Library Setup:** Install and configure `shadcn/ui`. Initialize core generic components (`Button`, `Card`, `Table`, `Badge`, `Tabs`, etc.).
* **1.3 Environment Variables:** Setup `.env.local` for Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and Groq (`GROQ_API_KEY`).
* **1.4 Design Tokens:** Configure `tailwind.config.ts` and `globals.css` to match the premium Antigravity SaaS aesthetic (fonts, dynamic colors, glassmorphism utilities).

## Phase 2: Database & Backend Initialization (Supabase)
**Goal:** Establish the database schema and authentication flows.
* **2.1 Supabase Project Creation:** Setup the Supabase backend project.
* **2.2 Schema Migrations:** Execute SQL to create tables: `users`, `partners`, `students`, `activities`, and `approvals` with their respective Foreign Keys.
* **2.3 Row Level Security (RLS):** Configure basic RLS policies for secure data access.
* **2.4 Mock Data Seeding:** Create and run a seed script to populate tables with realistic initial data (partners, dummy students, activity logs).
* **2.5 Auth Scaffolding:** Create a simple Login page (`/auth`) and configure Supabase Auth callbacks.

## Phase 3: Core UI Shell & Navigation
**Goal:** Build the global application layout.
* **3.1 Global Layout:** Construct the persistent dashboard shell in `app/(dashboard)/layout.tsx`.
* **3.2 Sidebar Navigation:** Build the left-side navigation panel reflecting the pages (Dashboard, Leads, Queue, Log, Settings).
* **3.3 Top Header:** Implement the top bar with user profile, date picker, and notification icons.
* **3.4 Micro-interactions:** Add hover states and smooth page transition animations.

## Phase 4: Dashboard & Lead Management Modules
**Goal:** Implement the primary data views.
* **4.1 KPI Cards:** Build the top metric cards (New Leads, Pending Approvals, etc.) fetching aggregate data from Server Components.
* **4.2 Dashboard Panels:** Layout the grid for Recent Activity, AI Insights, Slack Preview, and Quick Actions.
* **4.3 Lead Management Table:** Construct the searchable, filterable data table for the Leads page (`app/(dashboard)/leads/page.tsx`).

## Phase 5: Student 360 & Approval Queue
**Goal:** Implement detailed views and workflow mechanics.
* **5.1 Student 360 View:** Create the dynamic route (`/leads/[id]`) with interactive tabs (Overview, Timeline, Notes, Activity) showing chronological data.
* **5.2 Approval Queue UI:** Build the Queue table displaying pending AI-generated messages.
* **5.3 Approval Actions:** Implement Server Actions to handle "Approve", "Edit", and "Reject" workflows (updating the `approvals` status).

## Phase 6: AI Integration & Ingestion Workflows
**Goal:** Connect Groq & BGE and build the Slack ingestion mock.
* **6.1 Mock Slack Endpoint:** Create the API Route (`/api/webhooks/slack`) to receive mock JSON payloads.
* **6.2 AI Extraction Service:** Integrate the Groq API (LLM) and BGE (Embeddings) to parse the incoming text into structured JSON (Student Name, Partner, Status).
* **6.3 Message Generation Service:** Use a secondary LLM prompt to draft a professional follow-up based on the extracted data.
* **6.4 Database Orchestration:** Ensure the webhook seamlessly inserts the parsed lead into `students`, the draft into `approvals`, and logs the event in `activities`.

## Phase 7: Activity Logging & Final Polish
**Goal:** Finalize system observability and polish the user experience.
* **7.1 Activity Hooks:** Ensure all user mutations (status changes, approvals) trigger a log entry in the `activities` table.
* **7.2 Activity Log View:** Implement the global Activity Log page (`app/(dashboard)/activity-log/page.tsx`).
* **7.3 Final UI/UX Review:** Ensure zero placeholder images are used (replacing them with functional components or generated assets). Verify that all components match the requested high-fidelity prototype.

## Phase 8: Authentication & Security 
**Goal:** Implement strict access control as defined in `security.md`.
* **8.1 Domain Restriction:** Create a login wall that rejects any email not ending in `@amberstudent.com`.
* **8.2 OTP Flow:** Implement a 6-digit One-Time Password (OTP) login flow instead of standard passwords.
* **8.3 Middleware Enforcement:** Secure all dashboard routes with a Next.js middleware that forces unauthenticated users to the `/login` page.
* **8.4 Session Management:** Ensure session cookies are securely verified via `@supabase/ssr` on the server before granting access to protected routes.

## Phase 9: Core Slack-to-Agent Flow
**Goal:** Ensure every Slack message is securely picked up, verified, processed by the AI agent, and correctly queued in the dashboard.
* **9.1 Live Slack Webhook Integration:** Upgrade the webhook to handle real Slack Event API payloads, verify URLs, and map tagged users securely using the Slack Signing Secret.
* **9.2 AI Extraction & Queue Generation:** Refine the extraction prompts and ensure the drafted messages accurately populate the approval queue.
* **9.3 Slack Thread Life Cycle:** Manage Slack conversation threads natively (ingested, pending, sent, rejected). Track follow-ups by counting repeated replies on the same thread, trigger auto-replies for Queue actions (Approved/Rejected), and display the complete chronological thread in the Student 360 view.

## Phase 10: Agent-to-WhatsApp Flow
**Goal:** Ensure approved messages in the queue can be seamlessly dispatched to the Partner's mapped WhatsApp group, along with manual override actions.
* **10.1 Queue & WhatsApp Routing:** Ensure approved messages in the queue correctly route to the Partner's saved WhatsApp Group ID.
* **10.2 DNP Quick Actions:** Add a feature to instantly draft and send a WhatsApp message for leads marked as "DNP" (Did Not Pick) directly from the dashboard/queue.
* **10.3 Mappings & Settings:** Maintain the simplified views to map partners to their respective WhatsApp Group IDs and numbers.

## Phase 11: Multi-User KAM Architecture
**Goal:** Track, assign, and filter leads by Key Account Managers (KAMs) with Admin management controls.
* **11.1 Team Management DB:** Establish the `team_members` schema mapping `slack_id` to actual KAM profiles.
* **11.2 Admin UI:** Create the `/team` settings panel for Admins to add and remove KAMs from the system.
* **11.3 Webhook Auto-Assignment:** Update the Groq Slack extraction prompt to capture tagged Slack IDs (e.g., `<@U1234>`) and cross-reference them with the database to automatically attach KAMs to incoming leads.
* **11.4 Queue Filtering:** Enhance the Approval Queue with dynamic KAM badges and a dropdown filter allowing users to segment leads by individual KAMs.

