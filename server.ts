import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

console.log(">>> SERVER.TS LOADING AT " + new Date().toISOString());

dotenv.config();

// Initialize Firebase Admin
let firestoreDb: any;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Starting server function...");
  
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    firestoreDb = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(admin.apps[0]!, firebaseConfig.firestoreDatabaseId)
      : getFirestore(admin.apps[0]!);
    console.log("Firebase Admin initialized.");
  } catch (e) {
    console.error("Firebase Admin Init Error:", e);
  }

  const app = express();
  const PORT = 3000;

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Server is listening on port ${PORT} <<<`);
  });

  app.use(express.json());

  // --- Feishu Table Sync Helper ---
  async function syncToFeishuTable(word: string, translation: string) {
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;
    const appToken = process.env.FEISHU_APP_TOKEN;
    const tableId = process.env.FEISHU_TABLE_ID;

    if (!appId || !appSecret || !appToken || !tableId) {
      console.log("Feishu sync skipped: Missing environment variables.");
      return;
    }

    try {
      // 1. Get Tenant Access Token
      const authRes = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appId, app_secret: appSecret })
      });
      const authData: any = await authRes.json();
      const token = authData.tenant_access_token;

      if (!token) throw new Error("Failed to get Feishu tenant token");

      // 2. Add Record to Table
      // Note: We assume the table has fields named "Word" and "Translation" (or similar)
      // We will try to map common names.
      const recordRes = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            "Word": word,
            "Translation": translation,
            "SyncTime": new Date().toISOString()
          }
        })
      });
      const recordData: any = await recordRes.json();
      if (recordData.code !== 0) {
        console.error("Feishu Record Error:", recordData.msg);
      } else {
        console.log(`Successfully synced "${word}" to Feishu table.`);
      }
    } catch (error) {
      console.error("Feishu Sync Exception:", error);
    }
  }

  // Root test
  app.get("/express-test", (req, res) => {
    res.send("Express is working!");
  });

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working!", time: new Date().toISOString() });
  });

  // --- Feishu Webhook ---
  app.get(["/api/webhook/feishu", "/api/webhook/feishu/"], (req, res) => {
    res.send("Webhook endpoint is active! Please use POST method to send data.");
  });

  app.post(["/api/webhook/feishu", "/api/webhook/feishu/"], async (req, res) => {
    const { secret, word, translation, userId } = req.body;
    
    // Security check
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Invalid secret" });
    }

    const targetUid = userId || process.env.TARGET_USER_ID;
    if (!targetUid) {
      return res.status(400).json({ error: "Target User ID not specified" });
    }

    if (!word) {
      return res.status(400).json({ error: "Word is required" });
    }

    try {
      const material = {
        title: word,
        content: translation || "",
        chinese: translation || "", // Save translation to chinese field for UI display
        type: "vocabulary",
        subType: word.includes(" ") ? "phrase" : "word",
        createdAt: Date.now(),
        mastery_score: 0,
        streak: 0,
        last_seen: Date.now(),
        next_review_at: Date.now(),
        uid: targetUid
      };

      await firestoreDb.collection("materials").add(material);
      
      // Sync to Feishu Table asynchronously
      syncToFeishuTable(word, translation || "");

      res.json({ success: true, message: "Word added successfully" });
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).json({ error: "Failed to save word" });
    }
  });

  // 2. Add Record to Table
  app.post("/api/feishu/sync", async (req, res) => {
    const { word, translation } = req.body;
    if (!word) return res.status(400).json({ error: "Word is required" });
    
    try {
      await syncToFeishuTable(word, translation || "");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Sync failed" });
    }
  });

  // --- AI API Routes ---

  // 1. Dictionary Info API
  app.post("/api/dictionary", async (req, res) => {
    const { word } = req.body;
    if (!word) return res.status(400).json({ error: "Word is required" });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Fetch dictionary information for the English word or phrase "${word}".`,
        config: { 
          systemInstruction: "You are a helpful English-Chinese dictionary assistant. Return accurate dictionary data in JSON format.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              phonetic: { type: Type.STRING, description: "IPA phonetic notation" },
              chinese: { type: Type.STRING, description: "Primary Chinese translation" },
              partOfSpeech: { type: Type.STRING, description: "e.g. noun, verb" },
              plural: { type: Type.STRING },
              pastTense: { type: Type.STRING },
              phrases: { type: Type.ARRAY, items: { type: Type.STRING } },
              examples: { type: Type.ARRAY, items: { type: Type.STRING } },
              definition: { type: Type.STRING }
            },
            required: ["phonetic", "chinese", "partOfSpeech", "definition"]
          }
        }
      });
      
      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("Server Dictionary Error:", error);
      res.status(500).json({ error: "Failed to fetch dictionary info" });
    }
  });

  // 2. TTS API
  app.post("/api/tts", async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say in an elegant British voice: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Zephyr" },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        res.json({ audio: base64Audio });
      } else {
        res.status(500).json({ error: "Failed to generate audio" });
      }
    } catch (error) {
      console.error("Server TTS Error:", error);
      res.status(500).json({ error: "TTS generation failed" });
    }
  });

  // API 404 Handler
  app.use("/api", (req, res) => {
    console.log(`[API 404] ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      error: "API route not found", 
      method: req.method,
      path: req.originalUrl 
    });
  });

  // --- Vite / Static Files ---
  console.log("Initializing Vite middleware...");
  try {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    console.log("Vite middleware initialized.");
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      if (req.url.startsWith("/api")) return next();
      try {
        const url = req.originalUrl;
        const html = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        const transformedHtml = await vite.transformIndexHtml(url, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(transformedHtml);
      } catch (e) {
        console.error("Vite Render Error:", e);
        next(e);
      }
    });
  } catch (viteError) {
    console.error("Failed to initialize Vite:", viteError);
  }
}

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION at:", promise, "reason:", reason);
});

startServer();
// 在 server.ts 文件末尾添加
export async function syncVocabularyFromFeishu() {
  // ...（完整的同步函数代码）
}

// 飞书词汇同步API端点
app.post('/api/sync-vocabulary', async (req, res) => {
  try {
    console.log('Received sync request');
    const result = await syncVocabularyFromFeishu();
    console.log('Sync result:', result);
    res.json(result);
  } catch (error) {
    console.error('API sync error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
