# System Architecture

## The Multi-Tenant Problem
Standard WhatsApp Web clients (and libraries like Baileys) are inherently single-tenant. They expect one device, one QR code, and one set of authentication keys. 
In a corporate environment, expecting every Key Account Manager (KAM) to run their own Node server is impossible.

## The Solution: A WebSocket Switchboard
This Gateway solves the multi-tenant problem by abstracting the socket connections into a localized memory map, effectively turning a single Express server into a WebSocket Switchboard.

### 1. In-Memory State Mapping
The core of the architecture relies on three synchronized Maps:
```typescript
const sessions = new Map<string, Socket>();
const qrCodes = new Map<string, string>();
const isReadyMap = new Map<string, boolean>();
```
When a request comes in from the Frontend API, it includes a `kamId` (the Supabase User ID). The Gateway uses this ID to instantly route the request to the correct active socket.

### 2. File-Based Auth Sharding
To maintain persistence across server restarts, the authentication keys provided by WhatsApp must be saved to disk. 
Instead of saving to a single `./auth_info_baileys` folder, the Gateway dynamically shards the auth state into unique folders based on the `kamId` (e.g., `./auth_info_baileys_user123`).

### 3. The Auto-Restore Boot Cycle
When the server boots up, it executes `restoreSessions()`. 
1. It scans the root directory for any folders matching the prefix `auth_info_baileys_*`.
2. It extracts the `kamId` from the folder name.
3. It recursively initializes a new `makeWASocket` instance for every folder it finds.
This guarantees that as long as the disk volume persists, a server crash will never log out a KAM.

### 4. Headless Pairing Flow
Since the Gateway is a backend microservice, it cannot display the pairing QR code in the terminal when 10 different KAMs try to log in simultaneously. 
Instead, the `connection.update` event listener intercepts the raw QR code string, stores it in the `qrCodes` map, and exposes it via `GET /sessions/status`. The frontend application polls this endpoint and securely renders the QR code on the client's screen.
