require('dotenv').config();
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_CONNECTIONS || '20', 10);
const ROOM_TTL = parseInt(process.env.ROOM_TTL_MS || '1800000', 10);

const app = express();
const server = http.createServer(app);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(express.static(path.join(__dirname, '..', 'client'), {
  maxAge: '1h',
  etag: true,
}));

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

const rooms = new Map();
const clients = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateId() {
  return crypto.randomUUID().slice(0, 12);
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').slice(0, 128);
}

function isRateLimited(clientId) {
  const client = clients.get(clientId);
  if (!client) return false;
  const now = Date.now();
  if (now - client.windowStart > RATE_LIMIT_WINDOW) {
    client.windowStart = now;
    client.messageCount = 0;
  }
  client.messageCount++;
  return client.messageCount > RATE_LIMIT_MAX;
}

function cleanupRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.peers.size === 0) {
    rooms.delete(roomId);
    console.log(`[Room] Cleaned up empty room: ${roomId}`);
  }
}

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const clientId = generateId();
  ws.clientId = clientId;
  ws.isAlive = true;

  clients.set(clientId, {
    ws,
    roomId: null,
    deviceInfo: null,
    messageCount: 0,
    windowStart: Date.now(),
  });

  ws.send(JSON.stringify({ type: 'welcome', clientId }));

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    if (isRateLimited(clientId)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded. Please wait.' }));
      return;
    }

    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    handleSignalingMessage(clientId, msg);
  });

  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client && client.roomId) {
      const room = rooms.get(client.roomId);
      if (room) {
        room.peers.delete(clientId);
        broadcastToRoom(client.roomId, {
          type: 'peer-left',
          peerId: clientId,
          peerName: client.deviceInfo?.name || 'Unknown',
        }, clientId);
        cleanupRoom(client.roomId);
      }
    }
    clients.delete(clientId);
  });
});

function handleSignalingMessage(clientId, msg) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (msg.type) {
    case 'create-room': {
      const roomId = generateRoomCode();
      rooms.set(roomId, {
        peers: new Map(),
        createdAt: Date.now(),
        ttl: ROOM_TTL,
      });
      joinRoom(clientId, roomId, msg.deviceInfo);
      wsSend(client.ws, {
        type: 'room-created',
        roomId,
      });
      break;
    }

    case 'join-room': {
      const roomId = (msg.roomId || '').toUpperCase().trim();
      const room = rooms.get(roomId);
      if (!room) {
        wsSend(client.ws, { type: 'error', message: 'Room not found. Check the code and try again.' });
        return;
      }
      if (room.peers.size >= 10) {
        wsSend(client.ws, { type: 'error', message: 'Room is full (max 10 devices).' });
        return;
      }
      joinRoom(clientId, roomId, msg.deviceInfo);
      wsSend(client.ws, { type: 'room-joined', roomId });
      break;
    }

    case 'leave-room': {
      if (client.roomId) {
        const room = rooms.get(client.roomId);
        if (room) {
          room.peers.delete(clientId);
          broadcastToRoom(client.roomId, {
            type: 'peer-left',
            peerId: clientId,
            peerName: client.deviceInfo?.name || 'Unknown',
          }, clientId);
          cleanupRoom(client.roomId);
        }
        client.roomId = null;
      }
      break;
    }

    case 'signal': {
      if (!client.roomId) {
        wsSend(client.ws, { type: 'error', message: 'Not in a room.' });
        return;
      }
      const target = clients.get(msg.targetId);
      if (!target || target.roomId !== client.roomId) {
        wsSend(client.ws, { type: 'error', message: 'Target peer not found in room.' });
        return;
      }
      wsSend(target.ws, {
        type: 'signal',
        fromId: clientId,
        signal: msg.signal,
      });
      break;
    }

    case 'transfer-request': {
      if (!client.roomId) return;
      const target = clients.get(msg.targetId);
      if (!target || target.roomId !== client.roomId) return;
      wsSend(target.ws, {
        type: 'transfer-request',
        fromId: clientId,
        fromName: client.deviceInfo?.name || 'Unknown',
        files: msg.files,
        totalSize: msg.totalSize,
      });
      break;
    }

    case 'transfer-response': {
      if (!client.roomId) return;
      const target = clients.get(msg.targetId);
      if (!target || target.roomId !== client.roomId) return;
      wsSend(target.ws, {
        type: 'transfer-response',
        fromId: clientId,
        accepted: msg.accepted,
      });
      break;
    }

    case 'text-send': {
      if (!client.roomId) return;
      const target = clients.get(msg.targetId);
      if (!target || target.roomId !== client.roomId) return;
      wsSend(target.ws, {
        type: 'text-received',
        fromId: clientId,
        fromName: client.deviceInfo?.name || 'Unknown',
        text: (msg.text || '').slice(0, 10000),
      });
      break;
    }

    case 'rename': {
      if (client.deviceInfo) {
        client.deviceInfo.name = sanitize(msg.name) || client.deviceInfo.name;
        if (client.roomId) {
          broadcastToRoom(client.roomId, {
            type: 'peer-renamed',
            peerId: clientId,
            newName: client.deviceInfo.name,
          }, clientId);
        }
      }
      break;
    }
  }
}

function joinRoom(clientId, roomId, deviceInfo) {
  const client = clients.get(clientId);
  if (!client) return;

  const room = rooms.get(roomId);

  const existingPeers = [];
  for (const [peerId, peerInfo] of room.peers) {
    existingPeers.push({ peerId, ...peerInfo });
  }

  room.peers.set(clientId, {
    name: sanitize(deviceInfo?.name) || 'Unknown Device',
    platform: deviceInfo?.platform || 'unknown',
    icon: deviceInfo?.icon || 'desktop',
  });

  client.roomId = roomId;
  client.deviceInfo = {
    name: sanitize(deviceInfo?.name) || 'Unknown Device',
    platform: deviceInfo?.platform || 'unknown',
    icon: deviceInfo?.icon || 'desktop',
  };

  wsSend(client.ws, {
    type: 'room-peers',
    peers: existingPeers,
  });

  broadcastToRoom(roomId, {
    type: 'peer-joined',
    peerId: clientId,
    ...client.deviceInfo,
  }, clientId);
}

function broadcastToRoom(roomId, message, excludeId) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [peerId] of room.peers) {
    if (peerId === excludeId) continue;
    const peer = clients.get(peerId);
    if (peer) {
      wsSend(peer.ws, message);
    }
  }
}

function wsSend(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeatInterval));

function cleanupExpiredRooms() {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    if (now - room.createdAt > room.ttl) {
      for (const [peerId] of room.peers) {
        const client = clients.get(peerId);
        if (client) {
          wsSend(client.ws, { type: 'room-expired', roomId });
          client.roomId = null;
        }
      }
      rooms.delete(roomId);
      console.log(`[Room] Expired room: ${roomId}`);
    }
  }
}
setInterval(cleanupExpiredRooms, 60000);

server.listen(PORT, HOST, () => {
  console.log(`[Chaminda Drop] Server running on ${HOST}:${PORT}`);
  console.log(`[Chaminda Drop] Serving client from ${path.join(__dirname, '..', 'client')}`);
});

process.on('SIGTERM', () => {
  wss.close();
  server.close(() => process.exit(0));
});
