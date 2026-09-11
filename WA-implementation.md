# Phase-Wise Implementation Plan: Self-Hosted WhatsApp Gateway

This document outlines the step-by-step phases required to transition from Ultramsg to the Self-Hosted WhatsApp Gateway outlined in `WA-architecture.md`.

---

## Phase 1: Local Setup & Verification (Completed)
**Objective**: Build and verify the core Baileys WebSocket connection and Express REST API locally.

1. **Scaffold Project**: Created the `whatsapp-bot` directory with Node.js, TypeScript, and `@whiskeysockets/baileys`.
2. **Build Express API**: Implemented the HTTP server (`index.ts`) matching the Ultramsg payload structures for:
   - `POST /messages/chat`
   - `POST /groups/create`
3. **Local Testing**:
   - Run `npm run dev` in the `whatsapp-bot` folder.
   - Scan the terminal QR code using a WhatsApp account.
   - Test sending a message to the local API using Postman or cURL.

---

## Phase 2: Production Server Deployment
**Objective**: Host the Node.js Gateway on a persistent VPS (Virtual Private Server) since Vercel serverless functions cannot maintain WebSockets.

1. **Provision Infrastructure**: 
   - Spin up a basic VPS (e.g., DigitalOcean Droplet, AWS EC2 t3.micro, or Railway).
   - Minimum specs: 1 vCPU, 512MB RAM (Baileys is very lightweight).
2. **Environment Setup**:
   - Install Node.js (v18+) and PM2 globally (`npm install -g pm2`).
   - Clone the repository to the VPS.
3. **Run the Gateway**:
   - Compile TypeScript: `npm run build` (or run directly with `ts-node`).
   - Start process with PM2: `pm2 start index.ts --name wa-gateway`.
   - Scan the QR code from the server console: `pm2 logs wa-gateway`.
4. **Network & Security**:
   - Assign a static IP or Domain Name to the VPS.
   - Setup a reverse proxy (Nginx or Caddy) to terminate SSL (HTTPS).
   - Configure Firewall (UFW) to only allow traffic from Vercel IPs or lock it down using the `API_TOKEN`.

---

## Phase 3: POAI Next.js Integration
**Objective**: Point the main POAI platform away from Ultramsg and towards the new Self-Hosted Gateway.

1. **Environment Variables**: Update the Vercel production `.env` variables:
   ```env
   # Replace Ultramsg credentials
   ULTRAMSG_INSTANCE_ID=local
   ULTRAMSG_TOKEN=poai_local_token_123 # The secret API_TOKEN set on your VPS
   ```
2. **Update Server Actions**: Modify `app/(dashboard)/queue/actions.ts` to route requests to the new VPS URL instead of `api.ultramsg.com`.
   - Change `https://api.ultramsg.com/${instanceId}/messages/chat` to `https://your-vps-domain.com/messages/chat`.
   - Change `https://api.ultramsg.com/${instanceId}/groups/create` to `https://your-vps-domain.com/groups/create`.
3. **End-to-End Testing**: 
   - Approve a message in the POAI Queue.
   - Verify the Next.js app hits the VPS via Server Actions.
   - Verify the VPS successfully dispatches the message via Baileys WebSockets to the partner.

---

## Phase 4: Two-Way Sync (Optional Future Expansion)
**Objective**: Fully replace Slack by pushing incoming WhatsApp replies directly back to POAI.

1. **Extend Gateway**: Add an event listener in `index.ts` for `messages.upsert` to capture incoming messages.
2. **Push to Next.js**: Configure the Gateway to execute a `POST` request to a new Next.js route: `https://poai.vercel.app/api/webhooks/whatsapp`.
3. **AI Processing**: When POAI receives the webhook, route the incoming text through Groq to identify lead sentiment or draft an auto-reply.
