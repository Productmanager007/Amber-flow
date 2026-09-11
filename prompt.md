# User Prompts & Context
*This file stores user prompts to provide context for the AI without needing to read past chat responses.*

## 2026-09-10
**Prompt:** Why have we created a POAI here? its already deployed in Vercel and is working Its just that I wanted an environment to run sen whats app message from POAI to Whats app. Do it. You wasted whole my time. You are so confused, create a prompt.md file so we can save all the prompts, dont save the response if you will be able to remember and take context from that file.

## 2026-09-11
**Objective:** Safely implement 8 Additive Improvements to POAI (Amber-flow) and update dashboard UI without breaking existing working webhook dispatch paths.

**Completed Tasks (Synced to Vercel):**
1. Replaced `max-w-5xl mx-auto` layout constraints with `w-full` across all dashboard pages to ensure a fit-to-screen full-width view.
2. Split the Approval Queue into two distinct tabs: "New Tags" and "Follow-up Messages" using a new `QueueTabs` component.
3. Fixed strict Vercel build errors (ESLint unescaped single quotes and TypeScript spread operator on `Set`).
4. Successfully synced `whatsapp-bot/index.ts` from Codespaces to the local disk.

**Implementation Plan Approved:**
The Implementation Plan for the 8 Additive Improvements (Session Persistence, Health Endpoint, Idempotency, Dashboard Metrics, Layout Caching, Failure Logging, Structured Fields extraction, and Latency Tracking) was rigorously code-reviewed and corrected to ensure absolutely zero breakage to the existing success-path. The plan is now final and ready for execution.

**Next Immediate Action For AI:** 
Proceed with executing the 8 Additive Improvements from the Implementation Plan safely.

## 2026-09-11 (Later Update)
**Completed Backend Infrastructure & UI Tasks:**
1. **Settings Page UI Overhaul**: Converted static settings page into a dynamic client component. Implemented functional tabs (Account, Notifications, Security) and moved profile management into Security. Created an explicit Edit -> Save state to prevent accidental changes and resolved a silent save failure by adding an upsert check for the database row.
2. **Global Header Dynamic Data**: Rewired the global layout to securely fetch the user's name from Supabase and pass it down to the Header, replacing the hardcoded "Manu" fallback.
3. **Idempotency (Double-Send Prevention)**: Added `select` and status checking locks in `queue/actions.ts` to immediately reject duplicate user clicks, preventing double dispatch to UltraMsg/Slack.
4. **Latency Metrics**: Added `slack_received_at`, `draft_ready_at`, and `sent_at` columns. Next.js queue actions now populate `sent_at` exactly when actions are approved/rejected.
5. **Dashboard KPI Refinements**: Wired the "Average Response Time" to use the new exact latency timestamps instead of log fallback times. Capped the "Latest Pending Actions" feed to 8 to prevent UI crashes, and applied a `force-dynamic` cache bypass to fix the frozen date header.
6. **AI Context Parsing**: Upgraded the Groq prompt in the Slack webhook to enforce extraction of `context` and `action_type`.

**Abandoned/Skipped Tasks:**
- Custom Baileys Gateway (Session Persistence & Gateway Logging) is no longer required because the dispatch routes have been successfully wired to use the managed UltraMsg API directly.
