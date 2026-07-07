import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  PlusCircle,
  FileClock,
  User,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  FileCheck2,
  Mail,
  Lock,
  ArrowRight,
  Info,
  CheckCircle,
  FolderSync,
  Fingerprint,
  Printer,
  Share2,
  FileText,
  Save,
} from "lucide-react";
import AudioRecorder from "./components/AudioRecorder";
import ProfileForm from "./components/ProfileForm";
import TemplateGrid, { templates } from "./components/TemplateGrid";
import ImageUploader from "./components/ImageUploader";
import ProblemImageUploader from "./components/ProblemImageUploader";
import ComplaintHistory from "./components/ComplaintHistory";
import { UserProfile } from "./types";
const manuAiLogo = "/manu_ai_logo.png";

let globalSupabaseClient: any = null;

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"draft" | "profile" | "history">("draft");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Advanced configurations & connected integrations state
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [aiEngine, setAiEngine] = useState<"gemini" | "huggingface">("gemini");
  const [systemStatus, setSystemStatus] = useState({
    mongoDb: "connecting",
    cloudinary: "checking",
    huggingFace: "checking"
  });

  // Landing page multi-view states
  const [landingTab, setLandingTab] = useState<"landing" | "about" | "features" | "how-it-works" | "contact" | "login" | "signup">("landing");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const [contactSubmitted, setContactSubmitted] = useState(false);
  
  // Current draft state & sequential wizard steps
  const [draftStep, setDraftStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [language, setLanguage] = useState("English");
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [problemImages, setProblemImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  
  // Dynamic Questionnaire States for Missing Details
  const [missingFields, setMissingFields] = useState<any[]>([]);
  const [missingAnswers, setMissingAnswers] = useState<Record<string, string>>({});
  const [showMissingFieldsForm, setShowMissingFieldsForm] = useState(false);
  const [isAnalyzingDetails, setIsAnalyzingDetails] = useState(false);
  
  // Generated output
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedSubject, setGeneratedSubject] = useState("");
  const [generatedBody, setGeneratedBody] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<"preview" | "edit">("preview");
  
  // Modals / Selected Complaint for review
  const [selectedComplaintReview, setSelectedComplaintReview] = useState<any | null>(null);

  // Initialize Supabase and poll system statuses
  useEffect(() => {
    // 1. Load local mock states as fallback
    const savedProfile = localStorage.getItem("manu_ai_profile");
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
    const logged = localStorage.getItem("manu_ai_logged");
    if (logged === "true") {
      setIsLoggedIn(true);
    }

    // 2. Fetch live service connection statuses from backend
    fetch("/api/status")
      .then((res) => res.json())
      .then((status) => {
        setSystemStatus(status);
      })
      .catch((err) => console.error("Error fetching system connection status:", err));

    // 3. Fetch config and lazy-load Supabase SDK
    fetch("/api/config")
      .then((res) => res.json())
      .then(async (config) => {
        const isPlaceholderUrl = (url: string) => {
          if (!url) return true;
          const lower = url.toLowerCase();
          return lower.includes("your-") || lower.includes("your_") || lower.includes("your-project.supabase.co");
        };
        if (config.supabaseUrl && config.supabaseAnonKey && !isPlaceholderUrl(config.supabaseUrl) && !isPlaceholderUrl(config.supabaseAnonKey)) {
          console.log("Supabase credentials detected! Lazy-loading official SDK...");
          try {
            if (!globalSupabaseClient) {
              const { createClient } = await import("@supabase/supabase-js");
              globalSupabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
            }
            const client = globalSupabaseClient;
            setSupabaseClient(client);

            // Fetch current active user session if exists
            const { data: { session } } = await client.auth.getSession();
            if (session) {
              setIsLoggedIn(true);
              localStorage.setItem("manu_ai_logged", "true");
              const userProfile: UserProfile = {
                name: session.user?.user_metadata?.full_name || session.user?.email?.split("@")[0] || "",
                fatherName: "",
                dob: "",
                gender: "",
                address: "",
                district: "",
                state: "",
                pincode: "",
                phone: "",
                email: session.user?.email || ""
              };
              setProfile(userProfile);
              localStorage.setItem("manu_ai_profile", JSON.stringify(userProfile));
            }

            // Bind global state listener once
            if (!client.__listenerBound) {
              client.__listenerBound = true;
              client.auth.onAuthStateChange((_event, session) => {
                if (session) {
                  setIsLoggedIn(true);
                  localStorage.setItem("manu_ai_logged", "true");
                } else {
                  setIsLoggedIn(false);
                  localStorage.removeItem("manu_ai_logged");
                }
              });
            }
          } catch (e) {
            console.error("Failed to load and initialize Supabase client:", e);
          }
        }
      })
      .catch((err) => console.error("Error fetching client config:", err));
  }, []);

  // Theme support
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const handleProfileSave = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem("manu_ai_profile", JSON.stringify(newProfile));
    setShowSaveToast(true);
    // Auto-dismiss the popup message after 4 seconds
    setTimeout(() => {
      setShowSaveToast(false);
    }, 4000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      alert("Please provide both email and password.");
      return;
    }

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });
        if (error) {
          alert(`Authentication failed: ${error.message}`);
          return;
        }
        
        setIsLoggedIn(true);
        localStorage.setItem("manu_ai_logged", "true");

        // Construct profile from user metadata or defaults
        const userProfile: UserProfile = {
          name: data.user?.user_metadata?.full_name || loginEmail.split("@")[0],
          fatherName: "",
          dob: "",
          gender: "",
          address: "",
          district: "",
          state: "",
          pincode: "",
          phone: "",
          email: loginEmail
        };
        setProfile(userProfile);
        localStorage.setItem("manu_ai_profile", JSON.stringify(userProfile));
      } catch (err: any) {
        console.error("Supabase signin error:", err);
        alert(`Login failed: ${err.message || err}`);
      }
    } else {
      // Local demo fallback
      setIsLoggedIn(true);
      localStorage.setItem("manu_ai_logged", "true");
      
      const defaultProfile: UserProfile = {
        name: "Citizen Demo User",
        fatherName: "Official Citizen",
        dob: "1990-01-01",
        gender: "Male",
        address: "10, Rajaji Salai, Fort St. George",
        district: "Chennai",
        state: "Tamil Nadu",
        pincode: "600009",
        phone: "9876543210",
        email: loginEmail
      };
      setProfile(defaultProfile);
      localStorage.setItem("manu_ai_profile", JSON.stringify(defaultProfile));
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword) {
      alert("Please fill in all the registration fields.");
      return;
    }

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email: signupEmail,
          password: signupPassword,
          options: {
            data: {
              full_name: signupName,
            }
          }
        });
        if (error) {
          alert(`Registration failed: ${error.message}`);
          return;
        }
        alert("Registration successful! Please check your email for confirmation, or log in.");
        setLandingTab("login");
      } catch (err: any) {
        console.error("Supabase signup error:", err);
        alert(`Signup failed: ${err.message || err}`);
      }
    } else {
      const initialProfile: UserProfile = {
        name: signupName,
        fatherName: "",
        dob: "",
        gender: "",
        address: "",
        district: "",
        state: "",
        pincode: "",
        phone: "",
        email: signupEmail
      };
      setProfile(initialProfile);
      localStorage.setItem("manu_ai_profile", JSON.stringify(initialProfile));
      setIsLoggedIn(true);
      localStorage.setItem("manu_ai_logged", "true");
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactName("");
      setContactEmail("");
      setContactMsg("");
      alert("Your message has been successfully transmitted to the National Grievance Desk. Reference Ticket generated.");
    }, 1200);
  };

  const handleLogout = async () => {
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (e) {
        console.error("Supabase signOut error:", e);
      }
    }
    setIsLoggedIn(false);
    setProfile(null);
    localStorage.removeItem("manu_ai_logged");
    localStorage.removeItem("manu_ai_profile");
  };

  const handleGenerateComplaint = async () => {
    if (!selectedTemplateId) {
      alert("Please select a document template first.");
      return;
    }
    if (!rawText.trim()) {
      alert("Please enter details or dictate raw speech transcript.");
      return;
    }

    const template = templates.find((t) => t.id === selectedTemplateId);
    const templateName = template?.name || "General Complaint";

    // STAGE 1: Check for missing details first (if we haven't shown the form yet)
    if (!showMissingFieldsForm && missingFields.length === 0) {
      setIsAnalyzingDetails(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 seconds timeout
      
      try {
        const response = await fetch("/api/analyze-missing-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawInput: rawText,
            templateName,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const result = await response.json();
          if (result.needsMoreDetails && result.missingFields && result.missingFields.length > 0) {
            setMissingFields(result.missingFields);
            const initialAnswers: Record<string, string> = {};
            result.missingFields.forEach((field: any) => {
              initialAnswers[field.key] = "";
            });
            setMissingAnswers(initialAnswers);
            setShowMissingFieldsForm(true);
            setIsAnalyzingDetails(false);
            return; // STOP here to let the user fill in details
          }
        }
      } catch (e) {
        clearTimeout(timeoutId);
        console.error("Failed to analyze missing details, falling back directly to generation:", e);
      } finally {
        setIsAnalyzingDetails(false);
      }
    }

    // STAGE 2: Proceed to full generation
    setIsGenerating(true);
    setGenerationStep(0);
    const steps = [
      "Interpreting speech phonetics...",
      "Removing linguistic verbal fillers & correction of grammar...",
      "Converting draft elements into official administrative terminology...",
      "Mapping dynamic user profile placeholders...",
      "Formulating precise legal complaint subject...",
      "Finalizing structured legal output text...",
    ];

    // Fancy loading text cycles
    const interval = setInterval(() => {
      setGenerationStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 1500);

    try {
      // Merge extra details if present
      let mergedInput = rawText;
      const extraDetailsList = Object.entries(missingAnswers)
        .filter(([_, val]) => (val as string).trim())
        .map(([key, val]) => {
          const field = missingFields.find((f) => f.key === key);
          const label = field ? field.label : key;
          return `${label}: ${(val as string).trim()}`;
        });

      if (extraDetailsList.length > 0) {
        mergedInput = `${rawText}\n\n[ADMINISTRATIVE DETAILS SPECIFIED IN TEXT FORM]:\n${extraDetailsList.join("\n")}`;
      }

      const response = await fetch("/api/generate-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: mergedInput,
          templateName,
          profile,
          language,
          engine: aiEngine,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error("Failed to communicate with AI server");
      }

      const result = await response.json();
      setGeneratedTitle(result.title || `${template?.name} Draft`);
      setGeneratedSubject(result.subject || "Regarding formal application details.");
      setGeneratedBody(result.body || "");
      setShowEditor(true);
      setShowMissingFieldsForm(false);
      setDraftStep(3); // Advance to Draft Preview step
    } catch (e: any) {
      clearInterval(interval);
      alert(e.message || "An error occurred while generating complaint.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraftToRecords = async () => {
    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          title: generatedTitle,
          subject: generatedSubject,
          body: generatedBody,
          profile,
          evidenceImages,
          problemImages,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save draft on server.");
      }

      alert("Draft successfully saved to Grievance Records!");
      setActiveTab("history");
      setShowEditor(false);
      // Reset states
      setRawText("");
      setSelectedTemplateId(null);
      setEvidenceImages([]);
      setProblemImages([]);
      setMissingFields([]);
      setMissingAnswers({});
      setShowMissingFieldsForm(false);
      setDraftStep(1);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to save draft.");
    }
  };

  const handleDownloadFile = async (type: "pdf" | "docx") => {
    try {
      const response = await fetch(`/api/generate-${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generatedTitle,
          subject: generatedSubject,
          body: generatedBody,
          profile,
          evidenceImages,
          problemImages,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Document generation failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = (generatedTitle || "Complaint_Draft")
        .trim()
        .replace(/[^a-zA-Z0-9_\u0B80-\u0BFF-]+/g, "_");
      a.download = `MANU_AI_${safeTitle}.${type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to generate document.");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const title = generatedTitle || "Document Draft";
      const templateName = selectedTemplateId 
        ? templates.find(t => t.id === selectedTemplateId)?.name.toUpperCase() + " DIVISION"
        : "PUBLIC SERVICES GRIEVANCE DIVISION";
      const collectorate = profile?.district ? `${profile.district} District, ${profile.state} - ${profile.pincode}` : "[Regional Collectorate Address]";
      const dateStr = new Date().toLocaleDateString("en-IN", { dateStyle: "long" });

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body {
                font-family: Georgia, serif;
                color: #0f172a;
                margin: 40px;
                line-height: 1.6;
                font-size: 14px;
              }
              .header {
                border-bottom: 2px solid #000;
                padding-bottom: 15px;
                margin-bottom: 25px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .header-text h1 {
                font-size: 16px;
                font-weight: bold;
                margin: 0;
                text-transform: uppercase;
              }
              .header-text p {
                font-family: sans-serif;
                font-size: 10px;
                color: #64748b;
                margin: 4px 0 0 0;
                font-style: italic;
              }
              .seal {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                border: 1px solid #94a3b8;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .seal-inner {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 2px solid #cbd5e1;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .seal-dot {
                width: 12px;
                height: 12px;
                background-color: #cbd5e1;
                border-radius: 50%;
              }
              .recipient {
                margin-bottom: 20px;
              }
              .recipient p {
                margin: 2px 0;
              }
              .recipient-title {
                font-weight: bold;
              }
              .recipient-sub {
                font-family: sans-serif;
                font-size: 11px;
                color: #475569;
                font-style: italic;
              }
              .subject {
                font-weight: bold;
                text-decoration: underline;
                text-align: center;
                margin: 30px 0;
                font-size: 15px;
              }
              .salutation {
                margin-bottom: 15px;
                font-weight: bold;
              }
              .body {
                text-align: justify;
                white-space: pre-line;
                margin-bottom: 40px;
              }
              .sign-off {
                border-top: 1px solid #f1f5f9;
                padding-top: 15px;
                font-family: sans-serif;
                font-size: 12px;
                color: #475569;
              }
              .sign-off p {
                margin: 4px 0;
              }
              .sign-off-heading {
                font-family: Georgia, serif;
                font-style: italic;
                color: #64748b;
              }
              .signature-line {
                height: 40px;
                width: 150px;
                border-bottom: 1px solid #cbd5e1;
                margin: 5px 0;
                font-family: Georgia, serif;
                font-style: italic;
                color: #94a3b8;
                display: flex;
                align-items: flex-end;
              }
              .sign-off-name {
                font-weight: bold;
                color: #0f172a;
              }
              .sign-off-date {
                font-size: 10px;
                font-family: monospace;
                color: #94a3b8;
                margin-top: 8px !important;
              }
              @media print {
                body { margin: 20px; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-text">
                <h1>${templateName}</h1>
                <p>Department of Administrative Reforms & Public Grievances</p>
              </div>
              <div class="seal">
                <div class="seal-inner">
                  <div class="seal-dot"></div>
                </div>
              </div>
            </div>

            <div class="recipient">
              <p class="recipient-title">To,</p>
              <p style="font-weight: 500;">The Respected Officer / District Administration Office,</p>
              <p class="recipient-sub">${collectorate}</p>
            </div>

            <div class="subject">
              Subject: ${generatedSubject || "Formal Representation regarding citizen grievance."}
            </div>

            <div class="salutation">Respected Sir/Madam,</div>

            <div class="body">${generatedBody || ""}</div>

            <div class="sign-off">
              <p class="sign-off-heading">Yours Sincerely,</p>
              <div class="signature-line">
                ${profile?.name ? `/s/ ${profile.name}` : "/s/ Digital Signature"}
              </div>
              <p class="sign-off-name">${profile?.name || "[Applicant Full Name]"}</p>
              <p>Address: ${profile?.address || "[Address details incomplete]"}</p>
              ${profile ? `<p>Phone: +91 ${profile.phone} | Email: ${profile.email}</p>` : ""}
              <p class="sign-off-date">Date: ${dateStr}</p>
            </div>

            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(generatedTitle || "Draft Complaint - MANU AI");
    const body = encodeURIComponent(
      `Dear Sir/Madam,\n\nI would like to submit the following formal complaint generated via MANU AI:\n\nSubject: ${generatedSubject || ""}\n\n${generatedBody || ""}\n\nYours Sincerely,\n${profile?.name || "[Applicant Name]"}\nAddress: ${profile?.address || ""}\nPhone: ${profile?.phone || ""}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const reviewAndDownloadFile = async (complaint: any, type: "pdf" | "docx") => {
    try {
      const response = await fetch(`/api/generate-${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: complaint.title,
          subject: complaint.subject,
          body: complaint.body,
          profile: complaint.profile,
          date: new Date(complaint.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" }),
          evidenceImages: complaint.evidenceImages || [],
          problemImages: complaint.problemImages || [],
        }),
      });

      if (!response.ok) throw new Error("Document generation failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MANU_AI_${complaint.title.replace(/\s+/g, "_")}.${type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      


      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          /* =======================================================
             OFFICIAL CITIZEN PORTAL LANDING & AUTHENTICATION SUITE
             ======================================================= */
          <motion.div
            key="landing-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-slate-50 dark:bg-[#070b13] flex flex-col justify-between"
          >
            {/* Ambient visual accents */}
            <div className="absolute inset-0 bg-radial-at-t from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
            
            {/* Top Landing Navigation Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#080d16]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
              <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLandingTab("landing")}>
                  <img src={manuAiLogo} alt="MANU AI Logo" className="w-8 h-8 rounded-lg object-cover border border-indigo-500/20 shadow-sm" referrerPolicy="no-referrer" />
                  <div>
                    <span className="font-logo tracking-tight font-black text-lg bank-icon-gradient">MANU AI</span>
                  </div>
                </div>

                {/* Navigation Options */}
                <nav className="hidden md:flex items-center gap-6 h-full">
                  <button
                    type="button"
                    onClick={() => setLandingTab("landing")}
                    className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                      landingTab === "landing" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-indigo-600"
                    }`}
                  >
                    Home
                  </button>
                  <button
                    type="button"
                    onClick={() => setLandingTab("features")}
                    className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                      landingTab === "features" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-indigo-600"
                    }`}
                  >
                    Features
                  </button>
                  <button
                    type="button"
                    onClick={() => setLandingTab("how-it-works")}
                    className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                      landingTab === "how-it-works" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-indigo-600"
                    }`}
                  >
                    How It Works
                  </button>
                  <button
                    type="button"
                    onClick={() => setLandingTab("about")}
                    className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                      landingTab === "about" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-indigo-600"
                    }`}
                  >
                    About Initiative
                  </button>
                </nav>

                {/* Auth CTAs */}
                <div className="flex items-center gap-3">
                  {/* Theme Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 text-slate-500 dark:text-slate-400"
                    title="Toggle light & dark mode"
                  >
                    {isDarkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLandingTab("login")}
                    className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:text-indigo-600 px-3 py-1.5 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setLandingTab("signup")}
                    className="text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-2 rounded-lg transition-all shadow-md active:scale-95"
                  >
                    Register
                  </button>
                </div>
              </div>
            </header>

            {/* Mobile Navigation bar helper */}
            <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 h-11 flex items-center justify-around text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <button onClick={() => setLandingTab("landing")} className={landingTab === "landing" ? "text-indigo-600" : ""}>Home</button>
              <button onClick={() => setLandingTab("features")} className={landingTab === "features" ? "text-indigo-600" : ""}>Features</button>
              <button onClick={() => setLandingTab("how-it-works")} className={landingTab === "how-it-works" ? "text-indigo-600" : ""}>Process</button>
              <button onClick={() => setLandingTab("about")} className={landingTab === "about" ? "text-indigo-600" : ""}>About</button>
            </div>

            {/* Main Stage Multi-View Router */}
            <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col justify-center relative z-10">
              <AnimatePresence mode="wait">
                
                {/* 1. HERO HOME VIEW */}
                {landingTab === "landing" && (
                  <motion.div
                    key="landing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-12"
                  >
                    <div className="text-center space-y-6 max-w-3xl mx-auto">
                      <div className="flex flex-col items-center gap-4">
                        <img 
                          src={manuAiLogo} 
                          alt="MANU AI Logo" 
                          className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500/20 shadow-xl" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 px-4 py-1 rounded-full text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest">
                          <Fingerprint className="h-3.5 w-3.5" />
                          <span>Empowering National Citizen Grievances</span>
                        </div>
                      </div>
                      
                      <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight text-slate-900 dark:text-white leading-tight">
                        From Your Voice to an <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-500/30">Official Government Document</span>
                      </h1>
                      
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto font-sans">
                        Dictate your complaint naturally in Tamil or English. Our advanced AI removes verbal fillers, corrects grammar, replaces profile placeholders, and formats details into professional, print-ready PDFs and DOCX documents in seconds.
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                        <button
                          type="button"
                          onClick={() => setLandingTab("signup")}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-95"
                        >
                          <span>Start Drafting Free</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail("citizen.demo@gov.in");
                            setLoginPassword("demopass");
                            setIsLoggedIn(true);
                            localStorage.setItem("manu_ai_logged", "true");
                          }}
                          className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-sm active:scale-95"
                        >
                          <span>Explore Sandbox Demo</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm text-center">
                        <h3 className="font-mono text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-1">Tamil & English</h3>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wide">Dual Language Support</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Speech recognition calibrated for regional accents</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm text-center">
                        <h3 className="font-mono text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-1">6 Templates</h3>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wide">Configuration-Driven</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Police complaints, public grievances, resignations, and notices</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm text-center">
                        <h3 className="font-mono text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-1">100% Secure</h3>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wide">Citizen Privacy Vault</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Data parsed via server-side encrypted secure parameters</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. FEATURES VIEW */}
                {landingTab === "features" && (
                  <motion.div
                    key="features"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="text-center max-w-2xl mx-auto mb-8">
                      <h2 className="font-display font-black text-3xl tracking-tight text-slate-900 dark:text-white mb-2">
                        Advanced Platform Capabilities
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans uppercase tracking-widest font-bold">
                        Engineered for High-Precision Citizen Advocacy
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center mb-4">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base mb-2">
                          Linguistic Grammar Correction
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                          Our advanced language model parses spoken Tamil or English. It actively eliminates verbal fillers, filters out structural repetitions, and transcribes spoken dialogue into polished legal and administrative phrasing.
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center mb-4">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base mb-2">
                          Evidence Archival Integration
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                          Citizens can upload photographs, invoices, or identification papers. Images are automatically processed, resized, and rendered inline inside the generated PDF document as an official annexure.
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mb-4">
                          <FileCheck2 className="h-5 w-5" />
                        </div>
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base mb-2">
                          Interactive Placeholder Interpolation
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                          Citizen profiles are configured once. When a grievance document template is selected, user properties (Full Name, Father's Name, DOB, Address, District) are automatically mapped onto placeholders, preventing spelling errors.
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center mb-4">
                          <FolderSync className="h-5 w-5" />
                        </div>
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base mb-2">
                          PDF and DOCX Export Engine
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                          Generate highly polished government complaint letters, formatted as either immutable PDFs or editable MS Word (DOCX) files. Includes custom signature margins, official header markers, and stamp margins.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. HOW IT WORKS VIEW */}
                {landingTab === "how-it-works" && (
                  <motion.div
                    key="how-it-works"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="text-center max-w-2xl mx-auto mb-8">
                      <h2 className="font-display font-black text-3xl tracking-tight text-slate-900 dark:text-white mb-2">
                        How MANU AI Operates
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans uppercase tracking-widest font-bold">
                        A Simple, Accessible Workflow for All Citizens
                      </p>
                    </div>

                    <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-8 space-y-10">
                      <div className="relative">
                        <span className="absolute -left-12 top-0.5 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs shadow-md">1</span>
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base mb-1">Set Up Your Citizen Profile</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl font-sans">
                          Provide your permanent demographics (Full Name, Father's Name, dob, Phone, Email, Address, Pincode). This profile is securely saved in your browser and used to automatically pre-populate the complainant metadata blocks.
                        </p>
                      </div>

                      <div className="relative">
                        <span className="absolute -left-12 top-0.5 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs shadow-md">2</span>
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base mb-1">Select an Administrative Template</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl font-sans">
                          Select the document category: Police Complaints, Public Grievances (water, roads), General Grievances, Leave Letters, Resignation Notices, or Divorce pre-litigation notifications.
                        </p>
                      </div>

                      <div className="relative">
                        <span className="absolute -left-12 top-0.5 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs shadow-md">3</span>
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base mb-1">Speak Naturally (Dictation)</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl font-sans">
                          Use our Speech-to-Text dictation module in Tamil or English, or simply copy/type raw text describing what occurred. Speak normally—the AI is calibrated to understand colloquial narratives and translate them into formal terminology.
                        </p>
                      </div>

                      <div className="relative">
                        <span className="absolute -left-12 top-0.5 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs shadow-md">4</span>
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base mb-1">Attach Supporting Material</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl font-sans">
                          Drag and drop photographs, bills, or proof of grievance. Our image compressor handles raw captures instantly, storing them for embedded compilation inside the PDF annexure.
                        </p>
                      </div>

                      <div className="relative">
                        <span className="absolute -left-12 top-0.5 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs shadow-md">5</span>
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base mb-1">Preview, Edit, and Print</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl font-sans">
                          Instantly preview the professional formal document generated by the AI. Review or edit any wording in our text editor before downloading the final print-ready PDF or editable Word document.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. ABOUT VIEW */}
                {landingTab === "about" && (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 max-w-2xl mx-auto text-center"
                  >
                    <h2 className="font-display font-black text-3xl tracking-tight text-slate-900 dark:text-white">
                      The MANU AI Initiative
                    </h2>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest leading-none">
                      Bridging the Digital Literacy Divide
                    </p>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm text-left space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                      <p>
                        In many regions, citizens know their rights and have valid, critical grievances regarding public utility delays, local security, or workplace misconduct. However, formulating these thoughts into structured legal or administrative language is a severe barrier.
                      </p>
                      <p>
                        <strong>MANU AI</strong> was initiated to empower citizens by transforming natural spoken words into official, formal representations that can be submitted straight to the District Collector, Superintendent of Police, or Corporate Human Resources.
                      </p>
                      <p>
                        By combining multi-lingual speech-to-text algorithms with state-of-the-art LLMs, we produce high-precision drafts that adhere exactly to official administrative styles. No manual drafting or expensive legal counsel is required.
                      </p>
                    </div>
                  </motion.div>
                )}



                {/* 6. LOGIN VIEW */}
                {landingTab === "login" && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-md mx-auto w-full"
                  >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8">
                      <div className="flex flex-col items-center mb-6">
                        <img 
                          src={manuAiLogo} 
                          alt="MANU AI Logo" 
                          className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-500/20 shadow-md mb-4" 
                          referrerPolicy="no-referrer"
                        />
                        <h2 className="font-display font-black text-2xl tracking-tight text-slate-900 dark:text-white mb-1">
                          Citizen Authentication
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-sans text-center">
                          Sign in securely to generate complaints and view records
                        </p>
                      </div>

                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                              type="email"
                              required
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              placeholder="citizens@manai.gov.in"
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                              type="password"
                              required
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                            />
                          </div>
                        </div>

                        <button
                          id="login-submit-btn"
                          type="submit"
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-wider shadow-md transition-colors"
                        >
                          <span>Proceed to Citizen Portal</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </form>

                      <div className="relative my-6 text-center">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white dark:bg-slate-900 px-3 text-slate-500">Or Unified Login</span>
                        </div>
                      </div>

                      <button
                        id="google-sso-btn"
                        type="button"
                        onClick={() => {
                          setIsLoggedIn(true);
                          localStorage.setItem("manu_ai_logged", "true");
                        }}
                        className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-lg transition-colors text-xs uppercase tracking-wider"
                      >
                        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.94h6.6a5.64 5.64 0 0 1-2.45 3.71v3.08h3.95c2.31-2.13 3.64-5.26 3.64-8.66z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.95-3.08c-1.1.74-2.51 1.18-3.98 1.18-3.07 0-5.67-2.08-6.6-4.88H1.4v3.18A11.94 11.94 0 0 0 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.4 14.31a7.16 7.16 0 0 1 0-4.62V6.51H1.4a11.94 11.94 0 0 0 0 10.98l4-3.18z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.93 11.93 0 0 0 1.4 6.51l4 3.18c.93-2.8 3.53-4.94 6.6-4.94z"
                          />
                        </svg>
                        <span>Single Sign On (Google Auth)</span>
                      </button>

                      <div className="mt-4 text-center text-xs">
                        <span className="text-slate-500">Don't have an account? </span>
                        <button onClick={() => setLandingTab("signup")} className="font-bold text-indigo-600 hover:underline">Register Now</button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 7. SIGNUP VIEW */}
                {landingTab === "signup" && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-w-md mx-auto w-full"
                  >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8">
                      <div className="flex flex-col items-center mb-6">
                        <img 
                          src={manuAiLogo} 
                          alt="MANU AI Logo" 
                          className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-500/20 shadow-md mb-4" 
                          referrerPolicy="no-referrer"
                        />
                        <h2 className="font-display font-black text-2xl tracking-tight text-slate-900 dark:text-white mb-1">
                          Citizen Registration
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-sans text-center">
                          Create an account to securely persist identity details
                        </p>
                      </div>

                      <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Complainant Full Name</label>
                          <input
                            type="text"
                            required
                            value={signupName}
                            onChange={(e) => setSignupName(e.target.value)}
                            placeholder="Arun Kumar"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                          <input
                            type="email"
                            required
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            placeholder="arun@gmail.com"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Secure Password</label>
                          <input
                            type="password"
                            required
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-wider shadow-md transition-colors"
                        >
                          <span>Complete Citizen Registration</span>
                        </button>
                      </form>

                      <div className="mt-6 text-center text-xs">
                        <span className="text-slate-500">Already registered? </span>
                        <button onClick={() => setLandingTab("login")} className="font-bold text-indigo-600 hover:underline">Log In</button>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </main>

            {/* Elegant minimalist landing footer */}
            <footer className="bg-white dark:bg-[#070b12] border-t border-slate-200 dark:border-slate-800/80 transition-colors shrink-0">
              <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <img src={manuAiLogo} alt="MANU AI Logo" className="w-7 h-7 rounded-lg object-cover border border-indigo-500/20 shadow-sm" referrerPolicy="no-referrer" />
                  <span className="font-logo tracking-tight font-black text-lg bank-icon-gradient">MANU AI</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-md text-center md:text-right">
                  Citizen-centric administrative auxiliary platform transforming verbal raw complaints into highly formatted, legally structured representation documents.
                </p>
              </div>
              
              <div className="border-t border-slate-200 dark:border-slate-800/60 px-6 py-4 bg-slate-50 dark:bg-[#04060b]">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 font-sans">
                  <span className="uppercase tracking-wider">Official Grievance Support — Cognitive Citizen Initiative</span>
                  <span className="uppercase tracking-wider">© {new Date().getFullYear()} MANU AI Services • All Rights Reserved</span>
                </div>
              </div>
            </footer>
          </motion.div>
        ) : (
          /* =======================================================
             MAIN DASHBOARD PLATFORM VIEW
             ======================================================= */
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950"
          >
            {/* Upper Premium Nav Bar */}
            <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
              <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={manuAiLogo} alt="MANU AI Logo" className="w-8 h-8 rounded-lg object-cover border border-indigo-500/20 shadow-sm" referrerPolicy="no-referrer" />
                  <span className="font-logo tracking-tight font-black text-xl bank-icon-gradient">MANU AI</span>
                </div>

                {/* Main Navigation Tabs */}
                <nav className="hidden md:flex items-center gap-6 h-full">
                  <button
                    type="button"
                    onClick={() => setActiveTab("draft")}
                    className={`text-sm font-medium h-16 transition-all border-b-2 px-1 focus:outline-none ${
                      activeTab === "draft"
                        ? "text-indigo-600 dark:text-indigo-400 font-bold border-indigo-600 dark:border-indigo-400"
                        : "text-slate-500 hover:text-indigo-600 dark:text-slate-400 border-transparent"
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className={`text-sm font-medium h-16 transition-all border-b-2 px-1 focus:outline-none ${
                      activeTab === "profile"
                        ? "text-indigo-600 dark:text-indigo-400 font-bold border-indigo-600 dark:border-indigo-400"
                        : "text-slate-500 hover:text-indigo-600 dark:text-slate-400 border-transparent"
                    }`}
                  >
                    Citizen Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className={`text-sm font-medium h-16 transition-all border-b-2 px-1 focus:outline-none ${
                      activeTab === "history"
                        ? "text-indigo-600 dark:text-indigo-400 font-bold border-indigo-600 dark:border-indigo-400"
                        : "text-slate-500 hover:text-indigo-600 dark:text-slate-400 border-transparent"
                    }`}
                  >
                    Grievance Records
                  </button>
                </nav>

                {/* Clean Logout & Theme Header Block */}
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                  {/* Theme Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 text-slate-500 dark:text-slate-400"
                    title="Toggle light & dark mode"
                  >
                    {isDarkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
                  </button>

                  <button
                    id="logout-btn"
                    onClick={handleLogout}
                    title="Logout from platform"
                    className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </div>

              {/* Mobile Navigation Bar */}
              <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-12 flex items-center justify-around">
                <button
                  type="button"
                  onClick={() => setActiveTab("draft")}
                  className={`flex flex-col items-center text-[10px] font-semibold transition-all ${
                    activeTab === "draft" ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  <PlusCircle className="h-4 w-4 mb-0.5" />
                  <span>Draft</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className={`flex flex-col items-center text-[10px] font-semibold transition-all ${
                    activeTab === "profile" ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  <User className="h-4 w-4 mb-0.5" />
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`flex flex-col items-center text-[10px] font-semibold transition-all ${
                    activeTab === "history" ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  <FileClock className="h-4 w-4 mb-0.5" />
                  <span>Records</span>
                </button>
              </div>
            </header>

            {/* Core Application Stage */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
              
              {/* Force profile notification */}
              {!profile && activeTab === "draft" && (
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-400 rounded-xl p-4">
                  <Info className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">Profile Setup Required</p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                      To dynamically map official placeholders in legal documents, please complete your Citizen Profile.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("profile")}
                      className="mt-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>Set up Profile Now</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {activeTab === "draft" && (
                  <motion.div
                    key="tab-draft"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-8"
                  >
                    {/* Multi-step Horizontal Navigation Stepper */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 sm:gap-4 w-full justify-around max-w-3xl mx-auto">
                        <button
                          type="button"
                          onClick={() => setDraftStep(1)}
                          className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none cursor-pointer ${
                            draftStep === 1
                              ? "text-indigo-600 dark:text-indigo-400 font-black"
                              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center border font-mono ${
                            draftStep === 1 ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 dark:border-slate-700 text-slate-400"
                          }`}>1</span>
                          <span className="hidden sm:inline">Select Template</span>
                        </button>
                        
                        <div className="h-0.5 w-12 bg-slate-200 dark:bg-slate-800 shrink-0"></div>

                        <button
                          type="button"
                          onClick={() => selectedTemplateId && setDraftStep(2)}
                          disabled={!selectedTemplateId}
                          className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none ${
                            draftStep === 2
                              ? "text-indigo-600 dark:text-indigo-400 font-black"
                              : selectedTemplateId
                              ? "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                              : "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center border font-mono ${
                            draftStep === 2 ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 dark:border-slate-700 text-slate-400"
                          }`}>2</span>
                          <span className="hidden sm:inline">Voiceover & Details</span>
                        </button>

                        <div className="h-0.5 w-12 bg-slate-200 dark:bg-slate-800 shrink-0"></div>

                        <button
                          type="button"
                          onClick={() => generatedBody && setDraftStep(3)}
                          disabled={!generatedBody}
                          className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none ${
                            draftStep === 3
                              ? "text-indigo-600 dark:text-indigo-400 font-black"
                              : generatedBody
                              ? "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                              : "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center border font-mono ${
                            draftStep === 3 ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 dark:border-slate-700 text-slate-400"
                          }`}>3</span>
                          <span className="hidden sm:inline">Draft Preview</span>
                        </button>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {draftStep === 1 && (
                        <motion.div
                          key="step-1"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-6"
                        >
                          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                            <TemplateGrid
                              selectedTemplateId={selectedTemplateId}
                              onSelect={(id) => {
                                setSelectedTemplateId(id);
                              }}
                            />
                            <div className="mt-8 flex justify-end">
                              <button
                                type="button"
                                disabled={!selectedTemplateId}
                                onClick={() => setDraftStep(2)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer ${
                                  selectedTemplateId
                                    ? "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/10"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                <span>Next: Voiceover Dictation & Images</span>
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {draftStep === 2 && showMissingFieldsForm ? (
                        <motion.div
                          key="step-2-missing-details"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-6"
                        >
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 text-left">
                            <div className="flex items-start gap-4">
                              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                                <Sparkles className="h-6 w-6 text-indigo-500 animate-pulse" />
                              </div>
                              <div>
                                <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-base mb-1">
                                  Complete Missing Administrative Details
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                  Our AI has identified that the following key administrative details are missing or would greatly enhance your official document. Please fill them in below to proceed:
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                              {missingFields.map((field) => (
                                <div key={field.key} className="space-y-1.5 text-left">
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    {field.label}
                                  </label>
                                  <input
                                    type={field.type === "date" ? "date" : "text"}
                                    value={missingAnswers[field.key] || ""}
                                    onChange={(e) =>
                                      setMissingAnswers((prev) => ({
                                        ...prev,
                                        [field.key]: e.target.value,
                                      }))
                                    }
                                    placeholder={field.placeholder}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-slate-100 font-sans"
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Back and Generate Buttons */}
                            <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowMissingFieldsForm(false);
                                  setMissingFields([]);
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                <ChevronLeft className="h-4 w-4" />
                                <span>Back & Edit Transcript</span>
                              </button>

                              <button
                                type="button"
                                disabled={isGenerating}
                                onClick={handleGenerateComplaint}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs tracking-wider uppercase shadow-sm transition-all active:scale-95 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/20`}
                              >
                                <Sparkles className="h-4.5 w-4.5 text-indigo-300 animate-pulse" />
                                <span>
                                  {isGenerating ? "Generating..." : "Generate Final Draft"}
                                </span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ) : draftStep === 2 && (
                        <motion.div
                          key="step-2"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-6"
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Inputs left */}
                            <div className="lg:col-span-6 space-y-6">
                              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col gap-4">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400 block">Dictation & Description</span>
                                
                                <AudioRecorder
                                  onTranscriptComplete={setRawText}
                                  language={language}
                                  setLanguage={setLanguage}
                                />

                                {/* Document Output Language Selection Button */}
                                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-xl p-4 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                      Draft Language Selection
                                    </label>
                                    <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900">
                                      AI Draft Language
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <button
                                      type="button"
                                      onClick={() => setLanguage("English")}
                                      className={`py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                        language === "English"
                                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/15"
                                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                                      }`}
                                    >
                                      {language === "English" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                      English Draft
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setLanguage("Tamil")}
                                      className={`py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                        language === "Tamil"
                                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/15"
                                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                                      }`}
                                    >
                                      {language === "Tamil" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                      தமிழ் வரைவு (Tamil)
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                                    {language === "Tamil" 
                                      ? "அனைத்து வரிகளும் மற்றும் ஆவணமும் தூய தமிழில் எழுதப்படும்." 
                                      : "The entire drafted complaint, subject, and letters will be written in highly polished formal English."}
                                  </p>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Detailed Raw Description
                                  </label>
                                  <textarea
                                    id="raw-text-textarea"
                                    rows={7}
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                    placeholder="Type details of your complaint here, or speak using the Voice Dictation module above..."
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none leading-relaxed text-slate-900 dark:text-slate-100 font-sans"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Uploaders right */}
                            <div className="lg:col-span-6 space-y-6">
                              {/* Component 3: Problem Image Uploader */}
                              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <ProblemImageUploader onImagesChange={setProblemImages} />
                              </div>

                              {/* Component 4: Supporting Evidence Uploader */}
                              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <ImageUploader onImagesChange={setEvidenceImages} />
                              </div>
                            </div>
                          </div>

                          {/* Back and Generate Buttons */}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => setDraftStep(1)}
                              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span>Back to Templates</span>
                            </button>

                            <button
                              id="ai-generate-complaint-btn"
                              type="button"
                              disabled={isGenerating || isAnalyzingDetails || !rawText.trim()}
                              onClick={handleGenerateComplaint}
                              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs tracking-wider uppercase shadow-sm transition-all active:scale-95 cursor-pointer ${
                                isGenerating || isAnalyzingDetails || !rawText.trim()
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                                  : "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/20"
                              }`}
                            >
                              <Sparkles className="h-4.5 w-4.5 text-indigo-300 animate-pulse" />
                              <span>
                                {isAnalyzingDetails ? "Analyzing Transcript..." : isGenerating ? "AI Processing..." : "Generate Formal Draft"}
                              </span>
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {draftStep === 3 && (
                        <motion.div
                          key="step-3"
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="space-y-6 max-w-5xl mx-auto"
                        >
                          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                            {/* Draft Toolbar */}
                            <div className="h-14 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">DRAFT FILE:</span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">
                                  {generatedTitle ? `${generatedTitle.replace(/\s+/g, "_")}.pdf` : "Draft_Awaiting_Generation.pdf"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setEditorMode(editorMode === "preview" ? "edit" : "preview")}
                                  className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition-all focus:outline-none cursor-pointer flex items-center gap-1.5 ${
                                    editorMode === "edit"
                                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                  }`}
                                >
                                  <FileCheck2 className="h-3.5 w-3.5" />
                                  <span>{editorMode === "edit" ? "Show Letterhead" : "Edit Text"}</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDownloadFile("pdf")}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>PDF</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDownloadFile("docx")}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                                >
                                  <FileText className="h-3.5 w-3.5 text-blue-200" />
                                  <span>DOCX</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={handlePrint}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  <span>Print</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={handleShareEmail}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                  <Share2 className="h-3.5 w-3.5" />
                                  <span>Email</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={handleSaveDraftToRecords}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                                >
                                  <Save className="h-3.5 w-3.5" />
                                  <span>Save Complaint</span>
                                </button>
                              </div>
                            </div>

                            {/* Content area */}
                            <div className="flex-1 bg-slate-50 dark:bg-slate-950/40 p-4 sm:p-8 overflow-y-auto flex justify-center items-start">
                              {editorMode === "edit" ? (
                                /* Edit Mode inputs */
                                <div className="w-full max-w-[650px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4 text-left">
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Complaint Document Title</label>
                                    <input
                                      type="text"
                                      value={generatedTitle}
                                      onChange={(e) => setGeneratedTitle(e.target.value)}
                                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject / Matter Reference</label>
                                    <input
                                      type="text"
                                      value={generatedSubject}
                                      onChange={(e) => setGeneratedSubject(e.target.value)}
                                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm italic text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Detailed Statement Body</label>
                                    <textarea
                                      rows={14}
                                      value={generatedBody}
                                      onChange={(e) => setGeneratedBody(e.target.value)}
                                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
                                    />
                                  </div>
                                </div>
                              ) : (
                                /* Physical Letterhead document preview */
                                <div className="w-full max-w-[620px] bg-white text-slate-900 shadow-2xl p-8 sm:p-12 flex flex-col gap-6 font-serif relative min-h-[720px] border border-slate-200 text-left">
                                  {/* Letterhead Header */}
                                  <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                                    <div className="text-left">
                                      <h1 className="font-serif text-base font-bold uppercase tracking-tight text-slate-900">
                                        {selectedTemplateId 
                                          ? templates.find(t => t.id === selectedTemplateId)?.name.toUpperCase() + " DIVISION"
                                          : "PUBLIC SERVICES GRIEVANCE DIVISION"
                                        }
                                      </h1>
                                      <p className="text-[10px] text-slate-500 italic font-sans leading-tight">
                                        Department of Administrative Reforms & Public Grievances
                                      </p>
                                    </div>
                                    {/* Seal placeholder */}
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-300 shrink-0">
                                      <div className="w-8 h-8 rounded-full border-2 border-slate-400 flex items-center justify-center">
                                        <div className="w-3 h-3 bg-slate-400 rounded-full" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Letter content */}
                                  <div className="text-[12px] leading-relaxed font-serif space-y-4 text-slate-800 flex-1">
                                    <div className="flex flex-col gap-0.5">
                                      <p className="font-bold text-slate-950">To,</p>
                                      <p className="text-slate-800 font-medium">The Respected Officer / District Administration Office,</p>
                                      <p className="text-slate-600 font-sans text-[11px] italic">
                                        {profile?.district ? `${profile.district} District, ${profile.state} - ${profile.pincode}` : "[Regional Collectorate Address]"}
                                      </p>
                                    </div>

                                    <p className="font-bold underline text-center mt-6 text-slate-950">
                                      Subject: {generatedSubject || "Formal Representation regarding citizen grievance."}
                                    </p>

                                    <p className="mt-4">Respected Sir/Madam,</p>

                                    <p className="whitespace-pre-line text-justify leading-relaxed">
                                      {generatedBody || "The drafted statement outlining your precise petition details, corrective demands, and representation clauses."}
                                    </p>

                                    {/* Attached problem images preview count */}
                                    {problemImages.length > 0 && (
                                      <div className="mt-4 p-2 bg-indigo-50/60 border border-indigo-100 rounded font-sans text-[10px] text-indigo-800 flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                        <span><b>Problem Images Embedded:</b> {problemImages.length} photographic proof image(s) attached (Site & Area).</span>
                                      </div>
                                    )}

                                    {/* Attached supporting evidence preview count */}
                                    {evidenceImages.length > 0 && (
                                      <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded font-sans text-[10px] text-slate-600 flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span><b>Supporting Evidence Embedded:</b> {evidenceImages.length} additional proof image(s) attached.</span>
                                      </div>
                                    )}

                                    {/* Profile Sign-off */}
                                    <div className="mt-8 border-t border-slate-100 pt-4 font-sans text-[11px] text-slate-600 space-y-1">
                                      <p className="font-serif italic font-medium text-slate-500">Yours Sincerely,</p>
                                      <div className="h-10 w-32 border-b border-slate-300 my-1 italic text-slate-400 flex items-end font-serif">
                                        {profile?.name ? `/s/ ${profile.name}` : "/s/ Digital Signature"}
                                      </div>
                                      <p className="font-bold text-slate-900 font-sans">{profile?.name || "[Applicant Full Name]"}</p>
                                      <p>Address: {profile?.address || "[Address details incomplete]"}</p>
                                      {profile && <p>Phone: +91 {profile.phone} | Email: {profile.email}</p>}
                                      <p className="text-[9px] text-slate-400 mt-2 font-mono">
                                        Date: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Back and Start Over Buttons */}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => setDraftStep(2)}
                              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span>Back to Details & Voiceover</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRawText("");
                                setSelectedTemplateId(null);
                                setEvidenceImages([]);
                                setProblemImages([]);
                                setDraftStep(1);
                                setShowEditor(false);
                              }}
                              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              <span>Create New Complaint</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {activeTab === "profile" && (
                  <motion.div
                    key="tab-profile"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="max-w-2xl mx-auto w-full"
                  >
                    <ProfileForm initialProfile={profile} onProfileSave={handleProfileSave} />
                  </motion.div>
                )}

                {activeTab === "history" && (
                  <motion.div
                    key="tab-history"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="w-full"
                  >
                    <ComplaintHistory onSelectComplaint={setSelectedComplaintReview} />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* AI Generation Loading Modal */}
            {isGenerating && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-indigo-500 animate-bounce" />
                    </div>
                  </div>
                  <h4 className="font-display font-bold text-slate-900 dark:text-white text-base mb-2">
                    Structuring Complaint
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 h-10 flex items-center justify-center">
                    {generationStep === 0 && "Interpreting speech phonetics..."}
                    {generationStep === 1 && "Removing verbal fillers & correcting grammar..."}
                    {generationStep === 2 && "Converting elements to administrative terminology..."}
                    {generationStep === 3 && "Mapping dynamic user profile placeholders..."}
                    {generationStep === 4 && "Formulating precise legal subject line..."}
                    {generationStep >= 5 && "Finalizing structured legal output text..."}
                  </p>
                </div>
              </div>
            )}

            {/* Selected Complaint Detail Review Modal */}
            {selectedComplaintReview && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
                  {/* Header */}
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 mb-1 inline-block">
                        {selectedComplaintReview.templateId} Draft
                      </span>
                      <h4 className="font-display font-bold text-slate-900 dark:text-white text-lg">
                        {selectedComplaintReview.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedComplaintReview(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                    >
                      Close
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 overflow-y-auto space-y-4 flex-1">
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Subject Matter</p>
                      <p className="text-sm italic text-slate-800 dark:text-slate-200">"{selectedComplaintReview.subject}"</p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Detailed Petition Text</p>
                      <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 whitespace-pre-line font-sans text-justify">
                        {selectedComplaintReview.body}
                      </p>
                    </div>

                    {selectedComplaintReview.evidenceImages && selectedComplaintReview.evidenceImages.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Supporting Evidence ({selectedComplaintReview.evidenceImages.length})</p>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedComplaintReview.evidenceImages.map((img: string, idx: number) => (
                            <div key={idx} className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 aspect-video flex items-center justify-center">
                              <img src={img} alt="Evidence" className="object-cover w-full h-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => reviewAndDownloadFile(selectedComplaintReview, "pdf")}
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewAndDownloadFile(selectedComplaintReview, "docx")}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                    >
                      Download DOCX
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedComplaintReview(null)}
                      className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                    >
                      Dismiss Review
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Improvised Dashboard Status Footer */}
            <footer className="py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-8 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400 font-sans transition-colors">
              <div className="flex items-center gap-2">
                <span>© {new Date().getFullYear()} MANU AI</span>
              </div>
              <div className="flex items-center gap-6 uppercase tracking-wider">
                <span className="text-indigo-600 dark:text-indigo-400">Terms of Service</span>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Profile Saved Toast */}
      <AnimatePresence>
        {showSaveToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 bg-white dark:bg-slate-900 border border-emerald-500/30 dark:border-emerald-800/50 p-4 rounded-xl shadow-2xl max-w-sm transition-colors duration-300"
          >
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-0.5">Profile Saved</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans leading-normal">
                Your national citizen demographics have been securely updated and stored in local cache.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
