import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Telegram bot setup
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  let bot: TelegramBot | null = null;
  if (botToken) {
    bot = new TelegramBot(botToken, { polling: true });
    
    bot.onText(/\/start/, (msg) => {
      bot?.sendMessage(msg.chat.id, `Привет! Ваш Telegram ID: ${msg.chat.id}. Используйте его для привязки к порталу.`);
    });
  }

  // API route to send notification
  app.post("/api/send-telegram", async (req, res) => {
    const { chatId, message } = req.body;
    if (!bot) {
      return res.status(500).json({ error: "Telegram bot not initialized" });
    }
    if (!chatId || !message) {
      return res.status(400).json({ error: "Missing chatId or message" });
    }
    
    try {
      await bot.sendMessage(chatId, message);
      res.json({ status: "ok" });
    } catch (error) {
      console.error("Error sending Telegram message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
