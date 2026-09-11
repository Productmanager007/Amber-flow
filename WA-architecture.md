# Comprehensive Self-Hosted WhatsApp API Architecture

This document provides an in-depth architectural breakdown of the **Self-Hosted WhatsApp Gateway** (`whatsapp-bot`), designed to replace third-party providers like Ultramsg. It details system interactions, security, state management, deployment strategies, and integration with the POAI Next.js platform.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    %% POAI Platform Subgraph
    subgraph POAI ["POAI Platform (Next.js - Vercel)"]
        UI[Frontend UI / Client Components]
        Actions[Server Actions / API Routes]
        DB[(Supabase PostgreSQL)]
    end

    %% Self-Hosted Gateway Subgraph
    subgraph WABot ["Self-Hosted WhatsApp Gateway (Node.js VPS)"]
        API[Express REST API]
        AuthMid[Auth Middleware]
        Baileys[Baileys WebSocket Client]
        SessionStore[(Local Auth Session: auth_info_baileys/)]
        Pino[Pino Logger]
    end

    %% External Infrastructure
    subgraph WA ["WhatsApp Infrastructure"]
        WAServers[WhatsApp Multi-Device Servers]
        Phone[Primary Linked Mobile Device]
    end

    %% Data Flow
    UI -- "Approves Message" --> Actions
    Actions -- "POST /messages/chat\n(API_TOKEN)" --> AuthMid
    AuthMid -- "Validates & Routes" --> API
    API -- "Formats Payload" --> Baileys
    Baileys <== "Encrypted WebSockets\n(Noise Protocol)" ==> WAServers
    Baileys <--> SessionStore
    WAServers <.. "Cloud Sync" ..> Phone
    Actions -- "Logs Activity" --> DB
```

---

## 2. Core Components

### 2.1 POAI Platform (Next.js)
The main application hosted on Vercel. Because serverless environments (like Vercel) terminate execution rapidly and cannot maintain persistent WebSockets, the Next.js app acts purely as an HTTP client to the WhatsApp Gateway.
- **Trigger**: When a KAM clicks "Approve & Send to WhatsApp" in the UI.
- **Execution**: A Server Action (`actions.ts`) constructs an `application/x-www-form-urlencoded` payload and executes a `POST` request to the Gateway.

### 2.2 Express API Gateway (`whatsapp-bot`)
A persistent Node.js microservice handling HTTP ingestion and routing.
- **Port Binding**: Runs on port `3001` locally (or `80`/`443` in production).
- **Authentication Middleware**: Intercepts all requests to ensure the `token` parameter perfectly matches the server's `.env` secret (`API_TOKEN`). Rejects invalid requests with `HTTP 401 Unauthorized`.
- **Payload Parsing**: Decodes URL-encoded payloads to maintain 100% backward compatibility with the existing Ultramsg implementation.

### 2.3 Baileys WebSocket Engine (`@whiskeysockets/baileys`)
The core driver powering the WhatsApp connection.
- **Protocol**: Uses pure WebSockets connecting directly to `web.whatsapp.com` endpoints.
- **Efficiency**: Unlike Puppeteer-based solutions (`whatsapp-web.js`), Baileys does not run a headless Chromium browser. It operates natively in Node.js, consuming ~50MB of RAM compared to Puppeteer's ~400MB+.
- **Multi-Device Support**: Leverages WhatsApp's Multi-Device architecture. The host phone does *not* need an active internet connection to send/receive messages once the QR code is scanned.

### 2.4 State & Session Management
- **`auth_info_baileys/`**: A local directory containing the cryptographic keys (Noise protocol keys, identity keys, pre-keys).
- **Session Persistence**: If the Node.js server restarts or crashes, Baileys immediately reads this directory to re-establish the WebSocket connection without requiring a new QR scan.
- **Session Invalidation**: If the user explicitly selects "Log Out" from the linked devices menu on their phone, the session becomes invalid. The folder must be deleted to trigger a new QR code generation.

---

## 3. API Contract & Data Transformations

To ensure zero friction when migrating from Ultramsg, the Gateway perfectly replicates the expected API contracts.

### 3.1 Send Message Endpoint
- **Method**: `POST /messages/chat`
- **Payload Transform**:
  - POAI sends: `to: 919876543210` or `1234567890-123456@g.us`
  - Gateway logic: Normalizes strings. If a number lacks a domain suffix, it appends `@s.whatsapp.net` for individuals.
- **Response**: `{ "sent": "true", "message": "ok", "id": "MESSAGE_KEY_ID" }`

### 3.2 Create Group Endpoint
- **Method**: `POST /groups/create`
- **Payload Transform**:
  - POAI sends: `contacts: 919876543210,919999999999`
  - Gateway logic: Splits the comma-separated string, strips any `+` prefixes, and appends `@s.whatsapp.net` to each participant before executing the group creation command.
- **Response**: `{ "sent": "true", "message": "ok", "id": "NEW_GROUP_JID" }`

---

## 4. Error Handling & Reliability

1. **Connection Drops**: If the WebSocket disconnects (e.g., network failure), Baileys catches the `connection.update` event. The system evaluates `DisconnectReason` and automatically attempts reconnection with exponential backoff unless the reason is explicitly `loggedOut`.
2. **API Resilience**: If POAI hits the Gateway while Baileys is still initializing or disconnected, the Express middleware will return `HTTP 503 Service Unavailable`, preventing silent failures.
3. **Invalid Numbers**: If POAI passes a malformed number, the Baileys engine throws a validation error which the Express server catches and returns as an `HTTP 500` JSON response.

---

## 5. Security Considerations

1. **Network Isolation**: The WhatsApp Gateway should ideally sit behind a firewall (e.g., UFW or AWS Security Groups) that restricts inbound traffic on port 3001 exclusively to Vercel's IP ranges or a predefined static IP.
2. **Transport Security**: In production, the Gateway must be wrapped in a reverse proxy (like Nginx or Caddy) equipped with an SSL certificate (Let's Encrypt) to ensure the `API_TOKEN` is encrypted via HTTPS in transit.
3. **Token Management**: The `API_TOKEN` acts as a static bearer token. It must be a high-entropy string stored securely in both Vercel's Environment Variables and the VPS `.env` file.

---

## 6. Deployment Strategy

Because of the WebSocket persistence requirement, the Gateway cannot be deployed on Vercel. 

**Recommended Stack**:
- **Hosting**: A lightweight VPS (DigitalOcean Droplet, AWS EC2 t3.micro, or Railway App).
- **Process Manager**: Use `PM2` or `Docker`. PM2 ensures the Node.js process automatically restarts if it crashes and handles log rotation.
  ```bash
  npm install -g pm2
  pm2 start dist/index.js --name "wa-gateway"
  pm2 startup
  pm2 save
  ```
- **Updates**: When deploying updates to the Gateway, ensure the `auth_info_baileys` folder is mapped to a persistent volume (if using Docker) so the bot doesn't log out on every deployment.

---

## 7. Future Extensibility (Incoming Webhooks)

Currently, POAI relies on Slack for inbound notifications. If you wish to migrate fully to WhatsApp for two-way communication:
1. The Baileys engine can easily listen to incoming messages (`sock.ev.on('messages.upsert')`).
2. The Gateway can be extended to execute an outbound HTTP `POST` to a Next.js API route (`/api/webhooks/whatsapp`), pushing the incoming text to POAI for processing via Groq, eliminating the need for Slack integrations entirely.
