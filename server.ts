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

  // --- Feishu Webhook ---
  app.post("/api/webhook/feishu", async (req, res) => {
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
      res.json({ success: true, message: "Word added successfully" });
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).json({ error: "Failed to save word" });
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
