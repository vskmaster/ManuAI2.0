import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, HeadingLevel } from "docx";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 images
app.use(express.json({ limit: "25mb" }));

// Initialize Cloudinary if credentials exist
let isCloudinaryConfigured = false;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  isCloudinaryConfigured = true;
  console.log(`Cloudinary configured successfully for cloud: "${process.env.CLOUDINARY_CLOUD_NAME}"`);
} else {
  console.log("No Cloudinary credentials detected. Evidence images will fall back to local base64 storage.");
}

async function uploadToCloudinary(base64Image: string): Promise<string> {
  if (!isCloudinaryConfigured) {
    return base64Image;
  }
  try {
    if (base64Image.startsWith("http")) {
      return base64Image;
    }
    let formattedBase64 = base64Image;
    if (!base64Image.startsWith("data:image")) {
      formattedBase64 = `data:image/jpeg;base64,${base64Image}`;
    }
    const uploadResponse = await cloudinary.uploader.upload(formattedBase64, {
      folder: "manu_ai_evidence",
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return base64Image;
  }
}

// HuggingFace AI Generator Helper
async function generateWithHuggingFace(prompt: string, systemInstruction: string): Promise<any> {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  const model = process.env.HUGGINGFACE_MODEL || "mradermacher/oh-dcft-v3.1-gemini-1.5-flash-GGUF";
  const apiUrl = process.env.HUGGINGFACE_API_URL || "https://api-inference.huggingface.co/models";
  const timeoutSec = parseInt(process.env.HUGGINGFACE_TIMEOUT || "120");

  if (!token || token === "your-huggingface-api-token") {
    throw new Error("HuggingFace API Token is not configured. Please supply a valid token.");
  }

  console.log(`Querying HuggingFace Inference API for model: "${model}"...`);
  const fullPrompt = `${systemInstruction}\n\nUser request to rewrite into formal document:\n"${prompt}"\n\nRewrite as formal document conforming strictly to the requested JSON structure:`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutSec * 1000);

  try {
    const res = await fetch(`${apiUrl}/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.3,
          return_full_text: false,
        }
      }),
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HuggingFace API failed: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    let generatedText = "";
    if (Array.isArray(data) && data[0]?.generated_text) {
      generatedText = data[0].generated_text;
    } else if (data?.generated_text) {
      generatedText = data.generated_text;
    } else if (typeof data === "string") {
      generatedText = data;
    } else {
      generatedText = JSON.stringify(data);
    }

    // Try to locate JSON inside response if it has extra text
    let jsonStart = generatedText.indexOf("{");
    let jsonEnd = generatedText.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      generatedText = generatedText.substring(jsonStart, jsonEnd + 1);
    }

    return JSON.parse(generatedText);
  } catch (error: any) {
    clearTimeout(id);
    console.error("HuggingFace generation failure:", error);
    throw error;
  }
}

// Persistent Storage for complaints (File-based Fallback)
const COMPLAINTS_FILE = path.join(process.cwd(), "complaints.json");

function readComplaints() {
  if (!fs.existsSync(COMPLAINTS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(COMPLAINTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function writeComplaints(complaints: any[]) {
  fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(complaints, null, 2), "utf-8");
}

// MongoDB Client Setup
let mongoClient: MongoClient | null = null;
let complaintsCollection: any = null;
let mongoDbStatus = "disconnected";

function isPlaceholder(val: string | undefined): boolean {
  if (!val) return true;
  const lower = val.toLowerCase();
  return lower.includes("<username>") || 
         lower.includes("<password>") || 
         lower.includes("your-") || 
         lower.includes("your_") ||
         lower.trim() === "";
}

async function initMongoDB() {
  let mongoUri = process.env.MONGODB_URI;
  if (isPlaceholder(mongoUri)) {
    mongoUri = process.env.MONGODB_URL;
  }
  if (isPlaceholder(mongoUri)) {
    console.log("No valid MONGODB_URI or MONGODB_URL environment variable detected. Running with local complaints.json storage.");
    mongoDbStatus = "offline_local";
    return;
  }
  try {
    const dbName = process.env.DATABASE_NAME || process.env.MONGODB_DB_NAME || "manu_ai";
    console.log(`Connecting to MongoDB Atlas...`);
    mongoClient = new MongoClient(mongoUri, {
      connectTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });
    await mongoClient.connect();
    const db = mongoClient.db(dbName);
    complaintsCollection = db.collection("complaints");
    
    // Create index on createdAt to speed up listings and ensure clean sorting
    await complaintsCollection.createIndex({ createdAt: -1 });
    mongoDbStatus = "connected";
    console.log(`Connected to MongoDB Atlas database: "${dbName}" successfully!`);
  } catch (error) {
    console.error("MongoDB Atlas connection failed. Falling back to local file storage:", error);
    if (mongoClient) {
      try {
        await mongoClient.close();
      } catch (closeErr) {
        console.error("Error closing mongoClient after connection failure:", closeErr);
      }
    }
    mongoClient = null;
    complaintsCollection = null;
    mongoDbStatus = "fallback_local";
  }
}

// Call initMongoDB on startup
initMongoDB();

async function fetchComplaints() {
  if (complaintsCollection) {
    try {
      return await complaintsCollection.find({}).sort({ createdAt: -1 }).toArray();
    } catch (err) {
      console.error("Failed to fetch from MongoDB, falling back to local file:", err);
    }
  }
  return readComplaints();
}

async function insertComplaint(complaint: any) {
  if (complaintsCollection) {
    try {
      await complaintsCollection.insertOne(complaint);
      return;
    } catch (err) {
      console.error("Failed to insert into MongoDB, falling back to local file:", err);
    }
  }
  const complaints = readComplaints();
  complaints.unshift(complaint);
  writeComplaints(complaints);
}

const TAMIL_FONT_PATH = path.join(process.cwd(), "Pavanam-Regular.ttf");

function shapeTamilText(text: string): string {
  return text;
}

async function ensureTamilFont(): Promise<boolean> {
  try {
    if (fs.existsSync(TAMIL_FONT_PATH)) {
      const stats = fs.statSync(TAMIL_FONT_PATH);
      if (stats.size === 63100) {
        return true;
      }
      console.log(`Existing font size is ${stats.size} bytes (expected 63100). Deleting corrupted font file...`);
      fs.unlinkSync(TAMIL_FONT_PATH);
    }
  } catch (err) {
    console.error("Error checking existing font file:", err);
  }

  try {
    console.log("Downloading Pavanam Regular Tamil static font...");
    const url = "https://github.com/google/fonts/raw/main/ofl/pavanam/Pavanam-Regular.ttf";
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(TAMIL_FONT_PATH, Buffer.from(buffer));
    console.log("Pavanam Tamil font downloaded successfully and saved!");
    return true;
  } catch (error) {
    console.error("Error downloading Tamil font from primary URL:", error);
    try {
      console.log("Trying fallback URL for Pavanam Tamil font...");
      const fallbackUrl = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/pavanam/Pavanam-Regular.ttf";
      const response = await fetch(fallbackUrl);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(TAMIL_FONT_PATH, Buffer.from(buffer));
        console.log("Pavanam Tamil font downloaded from fallback successfully!");
        return true;
      }
    } catch (fbError) {
      console.error("Fallback font download failed:", fbError);
    }
    return false;
  }
}

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Fetch client-safe Supabase configuration
app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  });
});

// Fetch system connection status for UI dashboard indicators
app.get("/api/status", (req, res) => {
  res.json({
    mongoDb: mongoDbStatus,
    cloudinary: isCloudinaryConfigured ? "connected" : "offline_local",
    huggingFace: !!process.env.HUGGINGFACE_API_TOKEN ? "ready" : "not_configured",
  });
});

// Fetch all complaints
app.get("/api/complaints", async (req, res) => {
  const complaints = await fetchComplaints();
  res.json(complaints);
});

// Save a new complaint (Uploads evidence to Cloudinary if available)
app.post("/api/complaints", async (req, res) => {
  const { templateId, title, subject, body, profile, evidenceImages } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: "Title and body are required" });
  }

  // Upload any raw base64 evidence images to Cloudinary
  const uploadedUrls: string[] = [];
  if (evidenceImages && Array.isArray(evidenceImages)) {
    for (const img of evidenceImages) {
      if (img) {
        const url = await uploadToCloudinary(img);
        uploadedUrls.push(url);
      }
    }
  }

  const newComplaint = {
    id: `complaint_${Date.now()}`,
    templateId,
    title,
    subject: subject || "",
    body,
    profile,
    evidenceImages: uploadedUrls,
    createdAt: new Date().toISOString(),
  };

  await insertComplaint(newComplaint);
  res.status(201).json(newComplaint);
});

// AI generator endpoint supporting both Gemini & HuggingFace
app.post("/api/generate-complaint", async (req, res) => {
  const { rawInput, templateName, profile, language = "English", engine = "gemini" } = req.body;

  if (!rawInput) {
    return res.status(400).json({ error: "Input text is required for AI generation" });
  }

  const systemInstruction = `You are an elite, highly professional legal advisor and official government document drafter. 
Your task is to take a raw, informal, spoken voice transcript or text input (which may be in Tamil, English, or mixed Tanglish) and rewrite it into a highly formal, grammatically correct, and official government-grade complaint document.
The output must maintain absolute professional trust and follow strict legal conventions.
You must return your output strictly in JSON format matching the schema. Do not include any other conversational filler or markdown markers outside of the JSON block.

Schema:
- title: A concise, formal subject title of the complaint (e.g., "Official Complaint Regarding Unauthorized Land Encroachment")
- subject: A formal, standard 'Subject' line suitable for government submission (e.g., "Request for immediate intervention regarding illegal fence construction on public property at [Location].")
- body: The full, detailed, professional legal letter body. Ensure it uses highly polished, official language, replaces any filler words, formats dates properly, organizes facts systematically, and addresses the relevant authorities appropriately. Use professional greetings, a formal narrative flow, and a polite but assertive concluding call to action.

Important translation and tone requirements:
- CRITICAL: The requested target language for the generated complaint draft is: ${language}.
  - If the target language is "Tamil" (or "tamil"), the entire generated JSON response (including 'title', 'subject', and 'body') MUST be written in pristine, highly formal, and grammatically precise Tamil script (தமிழ்). Do NOT mix English and Tamil, and do NOT output Latin characters where Tamil words can be used. Translate any raw English inputs to formal Tamil.
  - If the target language is "English" (or "english"), the entire output MUST be written in highly polished, official government-grade English, translating any raw Tamil/Tanglish inputs to English.
- Include placeholders for dynamic profile details if they are missing, but if the following profile data is provided, seamlessly integrate it:
  Name: ${profile?.name || "[Full Name]"}
  Father/Spouse: ${profile?.fatherName || "[Father's/Spouse's Name]"}
  Address: ${profile?.address || "[Address]"}, ${profile?.district || "[District]"}, ${profile?.state || "[State]"} - ${profile?.pincode || "[Pincode]"}
  Contact: Phone: ${profile?.phone || "[Phone]"}, Email: ${profile?.email || "[Email]"}`;

  if (engine === "huggingface" && process.env.HUGGINGFACE_API_TOKEN) {
    try {
      const data = await generateWithHuggingFace(rawInput, systemInstruction);
      return res.json(data);
    } catch (hfError: any) {
      console.warn("HuggingFace failed, falling back to Gemini:", hfError.message || hfError);
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Raw User Input: "${rawInput}"\nDocument Template selected: ${templateName}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A formal title of the document." },
            subject: { type: Type.STRING, description: "A highly concise, professional subject statement." },
            body: { type: Type.STRING, description: "The complete formal body text of the petition, formatted as a legal letter." },
          },
          required: ["title", "subject", "body"],
        },
      },
    });

    const resultText = response.text?.trim() || "{}";
    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Gemini AI error:", error);
    res.status(500).json({ error: error.message || "Failed to generate complaint content via Gemini" });
  }
});

// Endpoint to analyze raw transcripts for missing administrative details depending on template
app.post("/api/analyze-missing-details", async (req, res) => {
  const { rawInput, templateName } = req.body;

  if (!rawInput) {
    return res.status(400).json({ error: "Input text is required for analysis" });
  }

  try {
    const systemInstruction = `You are an elite, highly precise legal and administrative details analyzer.
Your task is to analyze the user's raw voice transcript or text input for a "${templateName}" document and identify if any crucial administrative details are missing.
Analyze the user's raw transcript and only identify fields that are ACTUALLY missing and crucial for generating a highly professional document.
Fields to check depending on template:
- Police Complaint: Name of Accused/Suspect (if known), Date & Time of Incident, Specific Incident Location.
- Public Grievance: Municipality/Ward/Locality, State/District, Department name.
- Leave Letter: School / Organization Name, Recipient's Name or Designation (e.g., Principal, Manager, Supervisor), Leave Duration (Start & End dates), Specific Reason.
- Resignation Letter: Organization Name, Manager/HR Name, Notice Period or Last Working Day.
- Divorce Notice: Spouse's Name, Marriage Date.
- General Complaint: Company/Merchant Name, Order/Account/Reference ID.

Return a JSON block adhering strictly to this schema:
{
  "needsMoreDetails": boolean (true if important fields are missing from the raw input),
  "missingFields": [
    {
      "key": string (camelCase identifier e.g., "schoolName", "managerName", "incidentDate", "accusedName"),
      "label": string (User-friendly clean label e.g., "School Name", "Manager Name", "Incident Date", "Accused Person Name"),
      "placeholder": string (Helpful context placeholder e.g., "e.g., Springdale High School", "e.g., Dr. Rajesh Kumar", "e.g., June 12th, 2026"),
      "type": "text" | "date"
    }
  ],
  "reason": string (Brief supportive explanation for why these details are required)
}

CRITICAL RULES:
- If the user ALREADY stated some of these details in their raw text or voice, DO NOT list them as missing.
- Only list fields that are truly absent or unclear.
- If no critical information is missing, set needsMoreDetails to false and return an empty missingFields array.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Raw User Input: "${rawInput}"\nSelected Document Template: "${templateName}"`,
      config: {
        responseMimeType: "application/json",
        systemInstruction,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            needsMoreDetails: { type: Type.BOOLEAN },
            missingFields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  label: { type: Type.STRING },
                  placeholder: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["text", "date"] }
                },
                required: ["key", "label", "placeholder", "type"]
              }
            },
            reason: { type: Type.STRING }
          },
          required: ["needsMoreDetails", "missingFields", "reason"],
        },
      },
    });

    const resultText = response.text?.trim() || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Failed to analyze missing details" });
  }
});

// PDF Generation endpoint using PDFKit
app.post("/api/generate-pdf", async (req, res) => {
  const { title, subject, body, profile, date, evidenceImages } = req.body;

  try {
    const hasTamil = /[\u0B80-\u0BFF]/.test((title || "") + " " + (subject || "") + " " + (body || ""));
    let regularFont = "Helvetica";
    let boldFont = "Helvetica-Bold";
    let italicFont = "Helvetica-Oblique";

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    if (hasTamil) {
      const fontLoaded = await ensureTamilFont();
      if (fontLoaded) {
        doc.registerFont("TamilFont", TAMIL_FONT_PATH);
        regularFont = "TamilFont";
        boldFont = "TamilFont";
        italicFont = "TamilFont";
      }
    }

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    // Header Background Accent Bar with Logo theme colors
    const grad = doc.linearGradient(0, 0, 595.28, 0);
    grad.stop(0, '#00D2C4');
    grad.stop(0.5, '#007FFF');
    grad.stop(1, '#002FBE');
    doc.rect(0, 0, 595.28, 15).fill(grad);

    // Primary Header Section
    doc.moveDown(2);
    if (hasTamil) {
      doc.font(boldFont).fontSize(18).fillColor("#002FBE").text(shapeTamilText("பொது மக்கள் குறைதீர்ப்பு மனு"), { align: "center", features: true } as any);
      doc.font(regularFont).fontSize(10).fillColor("#007FFF").text(shapeTamilText("MANU AI - பொதுமக்கள் குறைதீர்ப்பு உதவி தளம்"), { align: "center", features: true } as any);
    } else {
      doc.font(boldFont).fontSize(18).fillColor("#002FBE").text("OFFICIAL PETITION & GRIEVANCE", { align: "center" });
      doc.font(regularFont).fontSize(10).fillColor("#007FFF").text("Generated digitally via MANU AI Platform", { align: "center" });
    }
    
    // Decorative separating line
    doc.moveDown(1);
    doc.strokeColor("#007FFF").lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    
    // Date & Location Info Block (Right-aligned)
    doc.moveDown(1.5);
    const currentDate = date || new Date().toLocaleDateString("en-IN", { dateStyle: "long" });
    const placeName = (profile && profile.district) ? profile.district : "As per Profile";

    if (hasTamil) {
      doc.font(boldFont).fontSize(10).fillColor("#1e293b").text(shapeTamilText(`நாள் (Date): ${currentDate}`), { align: "right", features: true } as any);
      doc.font(regularFont).fontSize(10).fillColor("#475569").text(shapeTamilText(`இடம் (Place): ${placeName}`), { align: "right", features: true } as any);
    } else {
      doc.font(boldFont).fontSize(10).fillColor("#1e293b").text(`Date: ${currentDate}`, { align: "right" });
      doc.font(regularFont).fontSize(10).fillColor("#475569").text(`Place: ${placeName}`, { align: "right" });
    }

    // Two-Column Layout for FROM and TO
    doc.moveDown(1.5);
    const startY = doc.y;

    // Left Column: FROM
    doc.font(boldFont).fontSize(11).fillColor("#002FBE").text(hasTamil ? shapeTamilText("அனுப்புநர் (FROM):") : "FROM (APPLICANT):", 50, startY, { width: 240, features: hasTamil ? true : undefined } as any);
    doc.font(regularFont).fontSize(10).fillColor("#334155");
    
    if (profile) {
      doc.text(hasTamil ? shapeTamilText(`பெயர் (Name): ${profile.name || "N/A"}`) : `Name: ${profile.name || "N/A"}`, { width: 240, features: hasTamil ? true : undefined } as any);
      if (profile.fatherName) {
        doc.text(hasTamil ? shapeTamilText(`தந்தை/கணவர் பெயர்: ${profile.fatherName}`) : `S/o or D/o: ${profile.fatherName}`, { width: 240, features: hasTamil ? true : undefined } as any);
      }
      const fullAddress = `${profile.address || ""}, ${profile.district || ""}, ${profile.state || ""} - ${profile.pincode || ""}`;
      doc.text(hasTamil ? shapeTamilText(`முகவரி (Address): ${fullAddress}`) : `Address: ${fullAddress}`, { width: 240, features: hasTamil ? true : undefined } as any);
      doc.text(hasTamil ? shapeTamilText(`கைபேசி (Mobile): ${profile.phone || "N/A"}`) : `Phone: ${profile.phone || "N/A"}`, { width: 240, features: hasTamil ? true : undefined } as any);
      if (profile.email) {
        doc.text(hasTamil ? shapeTamilText(`மின்னஞ்சல் (Email): ${profile.email}`) : `Email: ${profile.email}`, { width: 240, features: hasTamil ? true : undefined } as any);
      }
    } else {
      doc.text(hasTamil ? shapeTamilText("பெயர்: [விண்ணப்பதாரர் பெயர்]\nமுகவரி: [விண்ணப்பதாரர் முகவரி]") : "Name: [Applicant Name]\nAddress: [Applicant Address]\nContact details as provided", { width: 240, features: hasTamil ? true : undefined } as any);
    }

    const leftColY = doc.y;

    // Right Column: TO
    doc.font(boldFont).fontSize(11).fillColor("#002FBE").text(hasTamil ? shapeTamilText("பெறுநர் (TO):") : "TO (RECIPIENT):", 310, startY, { width: 230, features: hasTamil ? true : undefined } as any);
    doc.font(regularFont).fontSize(10).fillColor("#334155");

    let officerTitle = hasTamil ? "உயர்திரு அதிகாரி அவர்கள்" : "The Designated Officer";
    let officeName = hasTamil ? "வட்டார வளர்ச்சி / மாநகராட்சி அலுவலகம்" : "Local Administrative Department";
    let officeDistrict = (profile && profile.district) ? `${profile.district} மாவட்டம்` : "Local District";

    if (hasTamil) {
      doc.text(shapeTamilText(`${officerTitle},`), 310, doc.y, { width: 230, features: true } as any);
      doc.text(shapeTamilText(`${officeName},`), 310, doc.y, { width: 230, features: true } as any);
      doc.text(shapeTamilText(officeDistrict), 310, doc.y, { width: 230, features: true } as any);
    } else {
      doc.text(`${officerTitle},`, 310, doc.y, { width: 230 });
      doc.text(`${officeName},`, 310, doc.y, { width: 230 });
      doc.text(officeDistrict, 310, doc.y, { width: 230 });
    }

    // Reset cursor
    const endY = Math.max(leftColY, doc.y) + 20;
    doc.y = endY;
    doc.x = 50;

    // Divider
    doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();

    // Subject & Title Block
    doc.moveDown(1.5);
    if (hasTamil) {
      doc.font(boldFont).fontSize(11).fillColor("#002FBE").text(shapeTamilText("பொருள் (SUBJECT):"), { continued: true, features: true } as any);
      doc.font(boldFont).fontSize(11).fillColor("#1e293b").text(" " + shapeTamilText(`${subject || "உரிய நடவடிக்கை எடுக்கக் கோருதல்"}`), { features: true } as any);
    } else {
      doc.font(boldFont).fontSize(11).fillColor("#002FBE").text("SUBJECT: ", { continued: true });
      doc.font(boldFont).fontSize(11).fillColor("#1e293b").text(" " + (subject || "Grievance petition for administrative action"));
    }

    // Divider
    doc.moveDown(1);
    doc.strokeColor("#007FFF").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();

    // Body Block Greeting
    doc.moveDown(1.5);
    if (hasTamil) {
      doc.font(boldFont).fontSize(11).fillColor("#1e293b").text(shapeTamilText("மதிப்பிற்குரிய ஐயா / அம்மையார்,"), { features: true } as any);
    } else {
      doc.font(boldFont).fontSize(11).fillColor("#1e293b").text("Respected Sir / Madam,");
    }
    
    doc.moveDown(0.8);
    doc.font(regularFont).fontSize(10.5).fillColor("#1e293b");

    const bodyParagraphs = (body || "").split("\n").map(p => p.trim()).filter(p => p.length > 0);
    bodyParagraphs.forEach((paragraph) => {
      const formattedPara = hasTamil ? shapeTamilText(paragraph) : paragraph;
      doc.text(formattedPara, {
        align: "justify",
        lineGap: 4,
        paragraphGap: 12,
        features: hasTamil ? true : undefined
      } as any);
    });

    // Thank you & Signatures
    doc.moveDown(2);
    if (hasTamil) {
      doc.font(boldFont).fontSize(10).fillColor("#1e293b").text(shapeTamilText("நன்றி,"), { align: "center", features: true } as any);
      doc.moveDown(1.5);
      doc.font(regularFont).fontSize(10).fillColor("#475569").text(shapeTamilText("இப்படிக்கு,"), { align: "right", features: true } as any);
      doc.font(boldFont).fontSize(10).fillColor("#1e293b").text(shapeTamilText("தங்கள் உண்மையுள்ள,"), { align: "right", features: true } as any);
      doc.moveDown(2);
      doc.font(boldFont).fontSize(10).fillColor("#1e293b").text(shapeTamilText(`(கையொப்பம்) ${profile?.name || "[உங்கள் பெயர்]"}`), { align: "right", features: true } as any);
    } else {
      doc.font(boldFont).fontSize(10).fillColor("#1e293b").text("Thank you.", { align: "center" });
      doc.moveDown(1.5);
      doc.font(regularFont).fontSize(10).fillColor("#475569").text("Yours faithfully,", { align: "right" });
      doc.font(boldFont).fontSize(10).fillColor("#1e293b").text("Signature of Applicant", { align: "right" });
      doc.moveDown(2);
      doc.font(boldFont).fontSize(10).fillColor("#1e293b").text(`_________________________`, { align: "right" });
    }

    // Evidence Page (if images are present)
    if (evidenceImages && evidenceImages.length > 0) {
      for (let idx = 0; idx < evidenceImages.length; idx++) {
        const imgBase64 = evidenceImages[idx];
        doc.addPage();
        doc.rect(0, 0, 595.28, 15).fill(grad);
        
        doc.moveDown(2);
        doc.font(boldFont).fontSize(16).fillColor("#1e293b").text(hasTamil ? shapeTamilText(`இணைப்பு - ஆதாரம் ${idx + 1}`) : `ANNEXURE - EVIDENCE ${idx + 1}`, { align: "center", features: hasTamil ? true : undefined } as any);
        doc.font(regularFont).fontSize(10).fillColor("#64748b").text(hasTamil ? shapeTamilText(`புகாரை விளக்கும் புகைப்பட ஆதாரம்: ${title}`) : `Attached supporting image evidence for complaint: ${title}`, { align: "center", features: hasTamil ? true : undefined } as any);
        doc.moveDown(1);
        doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(2);

        try {
          let imgBuffer: Buffer;
          if (imgBase64.startsWith("http")) {
            console.log(`Downloading Remote Evidence Image from Cloudinary: ${imgBase64}...`);
            const fetchRes = await fetch(imgBase64);
            const arrayBuf = await fetchRes.arrayBuffer();
            imgBuffer = Buffer.from(arrayBuf);
          } else {
            const cleanedBase64 = imgBase64.replace(/^data:image\/\w+;base64,/, "");
            imgBuffer = Buffer.from(cleanedBase64, "base64");
          }
          
          doc.image(imgBuffer, {
            fit: [495, 450],
            align: "center",
            valign: "center"
          });
        } catch (imgError: any) {
          console.error("PDF image embedding error:", imgError);
          doc.font(italicFont).fillColor("#ef4444").text(`[Could not render evidence image: ${imgError.message || "invalid content"}]`, { align: "center" });
        }
      }
    }

    doc.end();
    const pdfBuffer = Buffer.concat(chunks);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="MANU_AI_Complaint.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("PDF generation error:", error);
    res.status(500).json({ error: "Failed to generate PDF document" });
  }
});

// DOCX Generation endpoint using Docx
app.post("/api/generate-docx", async (req, res) => {
  const { title, subject, body, profile, date } = req.body;

  try {
    const currentDate = date || new Date().toLocaleDateString("en-IN", { dateStyle: "long" });
    const placeName = (profile && profile.district) ? profile.district : "As per Profile";
    const hasTamil = /[\u0B80-\u0BFF]/.test((title || "") + " " + (subject || "") + " " + (body || ""));

    const childrenElements: any[] = [];

    // Title / Header
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: hasTamil ? "பொது மக்கள் குறைதீர்ப்பு மனு" : "OFFICIAL PUBLIC GRIEVANCE PETITION",
            bold: true,
            size: 32, // 16pt
            color: "002FBE",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: hasTamil ? "MANU AI - பொதுமக்கள் குறைதீர்ப்பு உதவி தளம்" : "Generated digitally via MANU AI Platform",
            size: 18, // 9pt
            color: "007FFF",
            italics: true,
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: "_________________________________________________________________________________",
            color: "007FFF",
            size: 16,
          }),
        ],
      })
    );

    // Date & Place (Right aligned)
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: hasTamil ? `நாள்: ${currentDate}` : `Date: ${currentDate}`,
            bold: true,
            size: 20, // 10pt
            color: "1e293b",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: hasTamil ? `இடம்: ${placeName}` : `Place: ${placeName}`,
            bold: true,
            size: 20, // 10pt
            color: "475569",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      })
    );

    // FROM block
    childrenElements.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: hasTamil ? "அனுப்புநர் (FROM):" : "FROM (APPLICANT):",
            bold: true,
            size: 22, // 11pt
            color: "002FBE",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      })
    );

    if (profile) {
      const details = [
        hasTamil ? `பெயர்: ${profile.name || "N/A"}` : `Name: ${profile.name || "N/A"}`,
        profile.fatherName ? (hasTamil ? `தந்தை/கணவர் பெயர்: ${profile.fatherName}` : `S/o or D/o: ${profile.fatherName}`) : null,
        hasTamil ? `முகவரி: ${profile.address || ""}, ${profile.district || ""}, ${profile.state || ""} - ${profile.pincode || ""}` : `Address: ${profile.address || ""}, ${profile.district || ""}, ${profile.state || ""} - ${profile.pincode || ""}`,
        hasTamil ? `கைபேசி எண்: ${profile.phone || "N/A"}` : `Mobile No.: ${profile.phone || "N/A"}`,
        profile.email ? (hasTamil ? `மின்னஞ்சல்: ${profile.email}` : `Email Address: ${profile.email}`) : null,
      ].filter(Boolean);

      details.forEach(detail => {
        childrenElements.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: detail!,
                size: 20, // 10pt
                color: "334155",
                font: hasTamil ? "Segoe UI" : "Arial",
              }),
            ],
          })
        );
      });
    } else {
      childrenElements.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: hasTamil ? "விண்ணப்பதாரர் பெயர்: [அனுப்புநர் பெயர்]\nமுகவரி: [விண்ணப்பதாரர் முகவரி]" : "Applicant Details: As per Profile Settings",
              size: 20,
              color: "334155",
              font: hasTamil ? "Segoe UI" : "Arial",
            }),
          ],
        })
      );
    }

    // Spacing
    childrenElements.push(new Paragraph({ spacing: { after: 120 } }));

    // TO block
    let officerTitle = hasTamil ? "உயர்திரு அதிகாரி அவர்கள்" : "The Designated Officer";
    let officeName = hasTamil ? "வட்டார வளர்ச்சி / மாநகராட்சி அலுவலகம்" : "Local Administrative Department";
    let officeDistrict = (profile && profile.district) ? `${profile.district} மாவட்டம்` : "Local District";

    childrenElements.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: hasTamil ? "பெறுநர் (TO):" : "TO (RECIPIENT):",
            bold: true,
            size: 22, // 11pt
            color: "002FBE",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `${officerTitle},`,
            size: 20,
            color: "334155",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `${officeName},`,
            size: 20,
            color: "334155",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: officeDistrict,
            size: 20,
            color: "334155",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      })
    );

    // Separator line
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: "_________________________________________________________________________________",
            color: "cbd5e1",
            size: 16,
          }),
        ],
      })
    );

    // Subject
    childrenElements.push(
      new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: hasTamil ? "பொருள் (SUBJECT): " : "SUBJECT: ",
            bold: true,
            size: 22,
            color: "002FBE",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
          new TextRun({
            text: subject || (hasTamil ? "மனு" : "Grievance petition for administrative action"),
            bold: true,
            size: 22,
            color: "1e293b",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      })
    );

    // Separator line
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: "_________________________________________________________________________________",
            color: "cbd5e1",
            size: 16,
          }),
        ],
      })
    );

    // Greeting
    childrenElements.push(
      new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: hasTamil ? "மதிப்பிற்குரிய ஐயா / அம்மையார்," : "Respected Sir / Madam,",
            bold: true,
            size: 21,
            color: "1e293b",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      })
    );

    // Body split by paragraphs
    const bodyLines = (body || "")
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    bodyLines.forEach(line => {
      childrenElements.push(
        new Paragraph({
          spacing: { after: 120 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({
              text: line,
              size: 21, // 10.5pt
              color: "1e293b",
              font: hasTamil ? "Segoe UI" : "Arial",
            }),
          ],
        })
      );
    });

    // Spacing
    childrenElements.push(new Paragraph({ spacing: { after: 240 } }));

    // Closing & Signatures
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 },
        children: [
          new TextRun({
            text: hasTamil ? "நன்றி," : "Thank you.",
            bold: true,
            size: 20,
            color: "1e293b",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120 },
        children: [
          new TextRun({
            text: hasTamil ? "இப்படிக்கு," : "Yours faithfully,",
            size: 20,
            color: "475569",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 60 },
        children: [
          new TextRun({
            text: hasTamil ? "தங்கள் உண்மையுள்ள," : "Signature of Applicant:",
            bold: true,
            size: 20,
            color: "1e293b",
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120 },
        children: [
          new TextRun({
            text: hasTamil ? `(கையொப்பம்) ${profile?.name || "[உங்கள் பெயர்]"}` : "____________________________________",
            color: "1e293b",
            bold: true,
            size: 20,
            font: hasTamil ? "Segoe UI" : "Arial",
          }),
        ],
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: childrenElements,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", 'attachment; filename="MANU_AI_Complaint.docx"');
    res.send(buffer);
  } catch (error: any) {
    console.error("DOCX generation error:", error);
    res.status(500).json({ error: "Failed to generate DOCX document" });
  }
});

// Vite Setup (Development vs Production)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MANU AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
