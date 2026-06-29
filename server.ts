import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import pg from "pg";
import crypto from "crypto";
import { Telegraf } from "telegraf";

const { Pool } = pg as unknown as { Pool: typeof import('pg').Pool };

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL
});


dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));




// Gemini Initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Telegram integration (bot + bind + notify)
// NOTE: this server supports Telegram webhook at POST /api/telegram/webhook
// and provides API endpoints for binding + notifying.

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  console.warn("TELEGRAM_BOT_TOKEN is not set. Telegram features will be disabled.");
}

const telegramBot = TELEGRAM_BOT_TOKEN ? new Telegraf(TELEGRAM_BOT_TOKEN) : null;

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "dev_secret";

async function ensureTelegramTables(): Promise<void> {
  // Keep it idempotent for local dev.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_bind_tokens (
      token TEXT PRIMARY KEY,
      record_book_id TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_users (
      telegram_user_id BIGINT PRIMARY KEY,
      record_book_id TEXT NOT NULL,
      telegram_username TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function createBindToken(record_book_id: string): Promise<{ token: string; expires_at: string }> {
  const ttlSeconds = Number(process.env.TELEGRAM_BIND_TOKEN_TTL_SECONDS || 600);
  const token = String(Math.floor(1000000 + Math.random() * 9000000)); // 7-digit
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await pool.query(
    `INSERT INTO telegram_bind_tokens(token, record_book_id, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE SET record_book_id = EXCLUDED.record_book_id, expires_at = EXCLUDED.expires_at`,
    [token, record_book_id, expiresAt.toISOString()]
  );

  return { token, expires_at: expiresAt.toISOString() };
}

async function bindTelegramUserByToken(params: {
  token: string;
  telegram_user_id: number;
  telegram_username?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const { token, telegram_user_id, telegram_username } = params;

  const result = await pool.query(
    `SELECT record_book_id, expires_at FROM telegram_bind_tokens WHERE token = $1`,
    [token]
  );

  const row = result.rows[0];
  if (!row) return { ok: false, reason: "invalid_token" };

  const expiresAt = new Date(row.expires_at);
  if (expiresAt.getTime() < Date.now()) return { ok: false, reason: "token_expired" };

  const record_book_id = row.record_book_id as string;

  await pool.query(
    `DELETE FROM telegram_bind_tokens WHERE token = $1`,
    [token]
  );

  await pool.query(
    `INSERT INTO telegram_users(telegram_user_id, record_book_id, telegram_username)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_user_id) DO UPDATE SET
       record_book_id = EXCLUDED.record_book_id,
       telegram_username = EXCLUDED.telegram_username`,
    [telegram_user_id, record_book_id, telegram_username || null]
  );

  return { ok: true };
}

async function getTelegramUserByRecordBook(record_book_id: string): Promise<{ telegram_user_id: number } | null> {
  const result = await pool.query(
    `SELECT telegram_user_id FROM telegram_users WHERE record_book_id = $1 LIMIT 1`,
    [record_book_id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { telegram_user_id: Number(row.telegram_user_id) };
}

async function sendTelegramMessage(record_book_id: string, text: string): Promise<boolean> {
  if (!telegramBot) return false;

  const telegramUser = await getTelegramUserByRecordBook(record_book_id);
  if (!telegramUser) return false;

  await telegramBot.telegram.sendMessage(telegramUser.telegram_user_id, text);


  return true;
}

// API Routes
app.post("/api/avatar/generate", async (req, res) => {

  const { prompt, userInterests } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Gemini API key is not configured" });
  }

  try {
    // Generate a creative avatar prompt based on interests
    const promptResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a detailed, single-paragraph artistic prompt for an AI image generator to create a professional academic avatar for a student researcher. 
      Interests: ${userInterests || 'Economics, Science'}. 
      Style requested: ${prompt || 'Modern 3D illustration'}. 
      The output should ONLY be the prompt string.`,
    });

    const refinedPrompt = promptResponse.text || prompt || "A professional 3D student avatar, academic style, economy theme";

    // Now generate the actual image
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: refinedPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    const candidates = imageResponse?.candidates;
    const firstCandidate = candidates?.[0];
    const parts = firstCandidate?.content?.parts;

    let base64Image = "";
    if (Array.isArray(parts)) {
      for (const part of parts) {
        const inlineData = (part as any)?.inlineData;
        if (inlineData?.data) {
          base64Image = `data:image/png;base64,${inlineData.data}`;
          break;
        }
      }
    }


    if (!base64Image) {
      throw new Error("No image was generated by the model");
    }

    res.json({ imageUrl: base64Image });
  } catch (error: any) {
    console.error("Avatar generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate avatar" });
  }
});

// Telegram webhook + bot init
app.post("/api/telegram/webhook", async (req, res) => {
  try {
    // Optionally validate secret header
    const receivedSecret = (req.headers["x-telegram-bot-api-secret-token"] || "") as string;
    if (process.env.TELEGRAM_WEBHOOK_SECRET) {
      if (receivedSecret !== TELEGRAM_WEBHOOK_SECRET) {
        return res.status(401).json({ ok: false });
      }
    }

    // Pass update to Telegraf
    const update = req.body;
    await telegramBot?.handleUpdate(update);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Telegram webhook error:", e);
    return res.status(200).json({ ok: true });
  }
});

app.post("/api/telegram/bind/start", async (req, res) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) return res.status(503).json({ error: "telegram_disabled" });
    await ensureTelegramTables();
    const { record_book_id } = req.body as { record_book_id?: string };
    if (!record_book_id) return res.status(400).json({ error: "record_book_id_required" });

    const { token, expires_at } = await createBindToken(record_book_id);
    return res.json({ token, expires_at });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "bind_start_failed" });
  }
});

app.post("/api/telegram/notify", async (req, res) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) return res.status(503).json({ ok: false, error: "telegram_disabled" });
    await ensureTelegramTables();
    const { record_book_id, title, message } = req.body as { record_book_id?: string; title?: string; message?: string };
    if (!record_book_id) return res.status(400).json({ error: "record_book_id_required" });

    const text = title ? `📣 ${title}\n\n${message || ""}` : (message || "");
    const ok = await sendTelegramMessage(record_book_id, text);
    return res.json({ ok });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "notify_failed" });
  }
});

app.post("/api/telegram/bind/unlink", async (req, res) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) return res.status(503).json({ error: "telegram_disabled" });
    await ensureTelegramTables();
    const { record_book_id } = req.body as { record_book_id?: string };
    if (!record_book_id) return res.status(400).json({ error: "record_book_id_required" });

    await pool.query(`UPDATE telegram_users SET record_book_id = NULL WHERE record_book_id = $1`, [record_book_id]);
    return res.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "unlink_failed" });
  }
});

// Bot command /start expects token as plain number
if (telegramBot) {
  await telegramBot.telegram.setMyCommands([
    { command: "start", description: "Привязать Telegram к SNO.PORTAL" }
  ]);

  telegramBot.start(async (ctx) => {
    if (!ctx.from) return;
    await ensureTelegramTables();

    const telegramUserId = ctx.from.id;
    const telegramUsername = ctx.from.username;

    const existing = await pool.query(
      `SELECT record_book_id FROM telegram_users WHERE telegram_user_id = $1`,
      [telegramUserId]
    );

    if (existing.rows[0]?.record_book_id) {
      await ctx.reply("✅ Telegram уже привязан к аккаунту на портале.");
      return;
    }

    await ctx.reply("Отправьте код привязки (число) из личного кабинета SNO.PORTAL. Например: 1234567");
  });

  telegramBot.on("text", async (ctx) => {
    if (!ctx.from) return;
    await ensureTelegramTables();

    const text = (ctx.message as any)?.text || "";
    const token = text.trim();
    if (!/^\d{6,10}$/.test(token)) return;

    try {
      const bindRes = await bindTelegramUserByToken({
        token,
        telegram_user_id: ctx.from.id,
        telegram_username: ctx.from.username || undefined
      });

      if (!bindRes.ok) {
        await ctx.reply("❌ Код неверный или просрочен. Попробуйте снова в портале.");
        return;
      }

      await ctx.reply("✅ Привязка выполнена! Теперь уведомления будут приходить и в Telegram.");
    } catch (e) {
      console.error("bindTelegramUserByToken error", e);
      await ctx.reply("❌ Не удалось подтвердить привязку. Попробуйте позже.");
    }
  });

  // NOTE: webhook will be set on server start below (needs public URL)
}

// Vite middleware setup
async function startServer() {
  await ensureTelegramTables();

  if (telegramBot) {
    // Webhook URL must be publicly reachable. Provide it via TELEGRAM_WEBHOOK_URL.
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    if (webhookUrl) {
      await telegramBot.telegram.setWebhook(webhookUrl, {
        secret_token: TELEGRAM_WEBHOOK_SECRET
      });
      console.log("Telegram webhook set to", webhookUrl);
    } else {
      console.warn("TELEGRAM_WEBHOOK_URL is not set, webhook not configured.");
    }
  }

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
