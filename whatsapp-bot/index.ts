import express from 'express';
import cors from 'cors';
import pino from 'pino';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3001;
const AUTH_DIR_PREFIX = process.env.AUTH_DIR || './auth_info_baileys';

// Multi-Tenant State Management
const sessions = new Map<string, ReturnType<typeof makeWASocket>>();
const qrCodes = new Map<string, string>();
const isReadyMap = new Map<string, boolean>();

async function connectToWhatsApp(kamId: string) {
  const authDir = `${AUTH_DIR_PREFIX}_${kamId}`;
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Still print to terminal for debugging
    logger: pino({ level: 'silent' }), // Hide noisy logs
  });

  sessions.set(kamId, sock);
  isReadyMap.set(kamId, false);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log(`[KAM: ${kamId}] QR Code generated`);
      qrCodes.set(kamId, qr);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[KAM: ${kamId}] Connection closed. Reconnecting: ${shouldReconnect}`);
      isReadyMap.set(kamId, false);
      if (shouldReconnect) {
        connectToWhatsApp(kamId);
      } else {
        console.log(`[KAM: ${kamId}] Logged out. Clearing session.`);
        sessions.delete(kamId);
        qrCodes.delete(kamId);
        // Clean up the directory so it's fresh next time
        if (fs.existsSync(authDir)) {
           fs.rmSync(authDir, { recursive: true, force: true });
        }
      }
    } else if (connection === 'open') {
      console.log(`✅ [KAM: ${kamId}] WhatsApp API is ready!`);
      isReadyMap.set(kamId, true);
      qrCodes.delete(kamId); // Clear QR code once connected
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Listen for incoming messages to provide the Group ID privately
  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg.message) return;

      let text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      if (!text && msg.message?.ephemeralMessage?.message) {
        text = msg.message.ephemeralMessage.message.conversation || msg.message.ephemeralMessage.message.extendedTextMessage?.text || '';
      }
      const textLower = text.toLowerCase().trim();
      
      console.log(`[KAM: ${kamId}] [DEBUG EVENT] Type: ${m.type} | fromMe: ${msg.key.fromMe} | JID: ${msg.key.remoteJid}`);
      if (textLower) {
        console.log(`[KAM: ${kamId}] [DEBUG] Bot heard text: "${textLower}"`);
      }
      
      if (textLower.startsWith('!id') || textLower.startsWith('!getid')) {
        console.log(`[KAM: ${kamId}] [DEBUG] !id command triggered by: ${msg.key.remoteJid}`);
        let senderJid = msg.key.fromMe ? sock!.user?.id : (msg.key.participant || msg.key.remoteJid);
        if (senderJid && senderJid.includes(':')) {
          senderJid = senderJid.split(':')[0] + '@s.whatsapp.net';
        }
        if (!senderJid) return;

        const args = textLower.split(' ');
        if (args.length > 1) {
          const searchName = textLower.substring(textLower.indexOf(' ') + 1).trim();
          const groups = await sock!.groupFetchAllParticipating();
          const matchedGroups = Object.values(groups).filter(g => g.subject.toLowerCase().includes(searchName));
          
          let replyText = '';
          if (matchedGroups.length === 0) {
            replyText = `🤖 Could not find any group matching "${searchName}".`;
          } else {
            replyText = `🤖 *Group IDs matching "${searchName}":*\n\n`;
            matchedGroups.forEach(g => {
              replyText += `- *${g.subject}*: ${g.id}\n`;
            });
          }
          await sock!.sendMessage(senderJid, { text: replyText });
        } else {
          const chatId = msg.key.remoteJid;
          if (chatId) {
            await sock!.sendMessage(senderJid, { 
              text: `🤖 *Private Admin Message*\nThe ID for the group/chat "${chatId}" is:\n\n*${chatId}*` 
            });
          }
        }
      }
    } catch (err) {
      console.error(`[KAM: ${kamId}] Error inside messages.upsert:`, err);
    }
  });
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.body.token || req.query.token;
  if (!token || token !== process.env.API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
  next();
};

// MULTI-TENANT SESSION MANAGEMENT
app.post('/sessions/create', requireAuth, (req, res) => {
  const { kamId } = req.body;
  if (!kamId) return res.status(400).json({ error: 'Missing kamId' });
  
  if (isReadyMap.get(kamId)) {
    return res.json({ message: 'Already connected', isReady: true });
  }

  if (!sessions.has(kamId)) {
    connectToWhatsApp(kamId);
  }
  
  return res.json({ message: 'Session generation started. Poll /sessions/status for QR.' });
});

app.get('/sessions/status', requireAuth, (req, res) => {
  const kamId = req.query.kamId as string;
  if (!kamId) return res.status(400).json({ error: 'Missing kamId' });
  
  const isReady = isReadyMap.get(kamId) || false;
  const qr = qrCodes.get(kamId) || null;
  
  res.json({ kamId, isReady, qr });
});

app.delete('/sessions', requireAuth, (req, res) => {
  const { kamId } = req.body;
  if (!kamId) return res.status(400).json({ error: 'Missing kamId' });

  const sock = sessions.get(kamId);
  if (sock) {
     sock.logout();
     sessions.delete(kamId);
     isReadyMap.delete(kamId);
     qrCodes.delete(kamId);
  }
  res.json({ success: true });
});

// WHATSAPP ACTION ROUTES
app.post('/messages/chat', requireAuth, async (req, res) => {
  try {
    let { to, body, kamId } = req.body;
    
    // Fallback kamId to support older architecture seamlessly if needed
    if (!kamId) kamId = 'default';
    
    const sock = sessions.get(kamId);
    if (!sock || !isReadyMap.get(kamId)) {
      return res.status(503).json({ error: `WhatsApp client for KAM [${kamId}] is not ready.` });
    }

    if (!to || !body) return res.status(400).json({ error: 'Missing to or body parameters' });

    if (to.includes('@c.us')) {
      to = to.replace('@c.us', '@s.whatsapp.net');
    } else if (!to.includes('@')) {
      to = `${to}@s.whatsapp.net`;
    }

    const sentMsg = await sock.sendMessage(to, { text: body });
    return res.json({ sent: 'true', message: 'ok', id: sentMsg?.key.id });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/groups/create', requireAuth, async (req, res) => {
  try {
    let { group_name, contacts, kamId } = req.body;
    if (!kamId) kamId = 'default';
    
    const sock = sessions.get(kamId);
    if (!sock || !isReadyMap.get(kamId)) {
      return res.status(503).json({ error: `WhatsApp client for KAM [${kamId}] is not ready.` });
    }

    if (!group_name || !contacts) return res.status(400).json({ error: 'Missing parameters' });

    const contactArray = contacts.split(',').map((c: string) => {
      let num = c.trim().replace('+', '');
      if (num.includes('@c.us')) num = num.replace('@c.us', '@s.whatsapp.net');
      if (!num.includes('@')) num = num + '@s.whatsapp.net';
      return num;
    });

    const group = await sock.groupCreate(group_name, contactArray);
    return res.json({ sent: 'true', message: 'ok', id: group.id });
  } catch (error: any) {
    console.error('Error creating group:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/groups', requireAuth, async (req, res) => {
  try {
    let kamId = req.query.kamId as string;
    if (!kamId) kamId = 'default';

    const sock = sessions.get(kamId);
    if (!sock || !isReadyMap.get(kamId)) {
      return res.status(503).json({ error: `WhatsApp client for KAM [${kamId}] is not ready.` });
    }

    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.values(groups).map(g => ({
      id: g.id,
      name: g.subject
    }));
    return res.json(groupList);
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Auto-restore existing sessions on boot
function restoreSessions() {
  console.log('Scanning for existing KAM sessions...');
  try {
    const files = fs.readdirSync(process.cwd());
    let restoredCount = 0;
    files.forEach(file => {
      if (file.startsWith(AUTH_DIR_PREFIX.replace('./', '') + '_')) {
        const kamId = file.replace(AUTH_DIR_PREFIX.replace('./', '') + '_', '');
        console.log(`Auto-restoring session for KAM: ${kamId}`);
        connectToWhatsApp(kamId);
        restoredCount++;
      }
    });
    if (restoredCount === 0) {
      console.log('No existing sessions found. Auto-starting "default" single-tenant session as a fallback...');
      connectToWhatsApp('default');
    }
  } catch(e) {
    console.log('Error scanning for sessions:', e);
  }
}

app.listen(PORT, () => {
  console.log(`Multi-Tenant WhatsApp Gateway starting on port ${PORT}...`);
  restoreSessions();
});
