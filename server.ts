import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Telegram bot setup
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  let bot: TelegramBot | null = null;
  if (botToken) {
    const TelegramBotClass = (TelegramBot as any).default || TelegramBot;
    bot = new TelegramBotClass(botToken, { polling: true });
    
    // Suppress Telegram polling conflict logs caused by multiple server reloads
    bot.on('polling_error', (error: any) => {
      if (error.message?.includes('409 Conflict')) {
        return;
      }
      console.error("Telegram polling error:", error);
    });
    
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

  // API route to generate an avatar SVG using Gemini
  app.post("/api/generate-avatar", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured in Settings -> Secrets" });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Create a highly styled, modern, circular, vector SVG avatar based on this request: "${prompt}".
The avatar must represent this character or concept in a flat, clean, artistic science/economic research aesthetic.

Return the response as a JSON object with a single field "svg" containing the RAW SVG string.
The SVG MUST:
1. Be enclosed in <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">...</svg>
2. Have a nice solid circle background (e.g. <circle cx="50" cy="50" r="48" fill="#1e293b"/>) or elegant gradient so it looks like a clean round badge.
3. Be perfectly centered and highly stylized, using clean vector paths, circles, or rects.
4. ONLY contain valid SVG code. No markdown formatting, no code blocks, no trailing comments.
5. Use highly visible, beautiful, and contrasting colors.

Response must strictly match this schema:
{ "svg": "<svg...>...</svg>" }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              svg: {
                type: Type.STRING,
                description: "The complete, valid SVG string enclosing the vector avatar"
              }
            },
            required: ["svg"]
          }
        }
      });

      const responseText = response.text || "";
      let data: { svg?: string } = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Fallback: extract SVG manually if JSON parsing fails
        const svgMatch = responseText.match(/<svg[\s\S]*<\/svg>/i);
        if (svgMatch) {
          data = { svg: svgMatch[0] };
        } else {
          throw new Error("Failed to parse Gemini response as JSON/SVG");
        }
      }

      if (!data.svg) {
        throw new Error("No SVG code generated");
      }

      res.json({ svg: data.svg });
    } catch (error: any) {
      console.error("Error generating AI avatar:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI avatar" });
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
