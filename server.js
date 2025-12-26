import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 10000;

/* --------------------------------------
   IN-MEMORY STATE (ALPHA)
-------------------------------------- */

let clients = new Set();
let chatHistory = [];

/* --------------------------------------
   SERVER
-------------------------------------- */

const wss = new WebSocketServer({ port: PORT });

console.log("🐣 Gobachi server running on port", PORT);

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
    }
  }
}

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("➕ client connected", clients.size);

  // send initial state
  ws.send(JSON.stringify({
    type: "init",
    presence: clients.size,
    chat: chatHistory
  }));

  // notify others of presence change
  broadcast({
    type: "presence",
    presence: clients.size
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "chat") {
      const entry = {
        emoji: msg.emoji || "👻",
        text: String(msg.text || "").slice(0, 200),
        time: Date.now()
      };

      chatHistory.push(entry);
      if (chatHistory.length > 50) chatHistory.shift();

      broadcast({
        type: "chat",
        entry
      });
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log("➖ client disconnected", clients.size);

    broadcast({
      type: "presence",
      presence: clients.size
    });
  });
});
