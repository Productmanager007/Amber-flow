# POAI Multi-Tenant WhatsApp Gateway

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-v18%2B-green)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)

A high-performance, multi-tenant WebSocket gateway built to bridge the gap between Key Account Managers (KAMs) and external partners on WhatsApp. 

This microservice replaces expensive third-party vendors (like Ultramsg/Twilio) by acting as a native WhatsApp client, establishing persistent WebSocket connections using the official WhatsApp Web protocol via `@whiskeysockets/baileys`.

## 🚀 Key Features

- **True Multi-Tenancy**: Supports an unlimited number of concurrent WhatsApp sessions on a single server instance.
- **Dynamic QR Generation**: Exposes a real-time API to generate QR codes on-the-fly, allowing KAMs to pair their devices directly from a frontend UI.
- **Auto-Restoration**: Features a self-healing boot cycle. Upon server restart, the gateway scans disk storage and instantly restores all previously active WhatsApp WebSocket connections in the background without user intervention.
- **Private Commands**: Includes a stealth parser that intercepts specific commands (e.g., `!id`) to return metadata (like Group IDs) privately to the admin without broadcasting to the group.

## 🔌 API Reference

The Gateway exposes standard REST endpoints that mimic the UltraMsg API, ensuring seamless drop-in compatibility with legacy systems.

### Session Management
- `POST /sessions/create` - Initializes a new WebSocket session and generates a pairing QR code.
- `GET /sessions/status` - Polls the connection status of a specific KAM.
- `DELETE /sessions` - Terminates a session and destroys the auth state.

### Messaging
- `POST /messages/chat` - Dispatches a message through the active socket of the specified KAM.
- `POST /groups/create` - Creates a new WhatsApp group dynamically using the KAM's account.

## 🛠️ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure Environment
# Copy .env.example to .env and set your API_TOKEN

# 3. Start the Gateway
npm run dev
```

For a detailed breakdown of the system architecture and state management, please read [ARCHITECTURE.md](./ARCHITECTURE.md).
