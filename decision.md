# Architectural & Design Decisions: Partnership Operations AI (POAI)

This document outlines the core technical, architectural, and design decisions made for the **Amber Flow (POAI)** project.

---

## 1. Core Framework & Architecture
**Decision:** Next.js (App Router) + React.
**Rationale:** Next.js provides a unified full-stack environment where we can seamlessly blend React server components, client-side interactivity, and serverless API routes (like our Slack webhooks) in a single repository.

## 2. Database & Authentication (Supabase)
**Decision:** Supabase (PostgreSQL + Auth).
**Rationale:** 
- **Database:** Provides a robust relational database capable of handling complex joins between `students`, `partners`, `approvals`, and `slack_threads`.
- **Security:** We implemented a strict **Domain-Restricted OTP Login**. Users must authenticate using a corporate `@amberstudent.com` email address with passwordless OTPs to ensure maximum security without the friction of managing passwords.

## 3. Real-Time AI Processing (Groq)
**Decision:** Use Groq API (`llama-3.1-8b-instant`).
**Rationale:** 
- **Slack Webhook Constraints:** Slack requires webhook endpoints to acknowledge receipt within 3 seconds, or it considers the delivery failed and retries. 
- **Speed is Critical:** Groq's LPU inference speed is near-instantaneous. This allows us to run complex JSON extraction on incoming Slack messages *synchronously* without hitting the 3-second timeout limit.
- **Drafting:** The same fast model is used in the Approval Queue to generate contextual WhatsApp draft messages instantly.

## 4. WhatsApp Integration (UltraMsg)
**Decision:** UltraMsg REST API.
**Rationale:** 
- Setting up the official WhatsApp Business API requires extensive verification and message template approvals. 
- UltraMsg allows us to connect a standard WhatsApp number and programmatically create groups, add participants (e.g., `handleCreateWaGroup`), and send dynamic text instantly without template restrictions, which is crucial for the MVP phase.

## 5. Eavesdrop Architecture (Slack)
**Decision:** Passive Slack Monitoring via Webhooks.
**Rationale:** 
- Rather than forcing agents to use slash commands, the POAI bot listens to channel messages. It only triggers the AI extraction and queue insertion pipeline when the official user ID is tagged in a message containing lead information. This creates a frictionless experience for the operations team.

## 6. UI/UX: The Approval Queue
**Decision:** Centralized Dashboard with Modal Interventions.
**Rationale:** 
- The system prevents AI from auto-sending messages to partners. Every extracted lead drops into an "Approval Queue" where a human can review the AI-drafted message, edit it, or reject it. 
- We recently shifted complex actions (like WhatsApp Group Creation) into centralized modal popups to reduce UI clutter and ensure all necessary data (Group Name, Participants, Intro Message) is captured before API execution.
