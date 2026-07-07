import os
import io
import json
import base64
from datetime import datetime
import requests
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pymongo import MongoClient
from docx import Document as DocxDocument
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph as RLParagraph, Spacer, Image as RLImage, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from config import settings
from models import (
    ComplaintGenerationRequest,
    ComplaintSaveRequest,
    ComplaintResponse,
    UserProfileSchema
)

app = FastAPI(
    title="MANU AI API",
    description="Production-Ready Full-Stack AI Web Application",
    version="1.0.0",
    docs_url="/docs"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection Helper
def get_db():
    try:
        client = MongoClient(settings.MONGODB_URI)
        db = client[settings.DATABASE_NAME]
        return db
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        return None

# AI Draft Generator utilizing Hugging Face Serverless API or Gemini
def query_ai_model(prompt: str, system_instruction: str) -> dict:
    # Attempting Hugging Face with GGUF or standard fallback
    hf_token = os.getenv("HUGGINGFACE_API_KEY", "")
    model_id = "mradermacher/oh-dcft-v3.1-gemini-1.5-flash-GGUF"
    
    if hf_token:
        # Querying Hugging Face serverless API
        headers = {"Authorization": f"Bearer {hf_token}"}
        payload = {
            "inputs": f"<system>{system_instruction}</system>\n<user>{prompt}</user>",
            "parameters": {"max_new_tokens": 1024, "return_full_text": False}
        }
        try:
            api_url = f"https://api-inference.huggingface.co/models/{model_id}"
            response = requests.post(api_url, headers=headers, json=payload, timeout=15)
            if response.status_code == 200:
                result = response.json()
                text = result[0]["generated_text"] if isinstance(result, list) else result.get("generated_text", "")
                return json.loads(text)
        except Exception as e:
            print(f"Hugging Face API failed: {e}, falling back to Gemini")

    # Primary Fallback: Google Gemini API (Standard for the AI Studio Workspace)
    gemini_key = settings.GEMINI_API_KEY
    if gemini_key:
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{
                "parts": [{"text": f"System Directive: {system_instruction}\n\nUser Input: {prompt}"}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        try:
            response = requests.post(api_url, headers=headers, json=payload, timeout=15)
            if response.status_code == 200:
                res_json = response.json()
                text_content = res_json["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text_content)
        except Exception as e:
            print(f"Gemini fallback failed: {e}")

    # Ultimate dry-run structural backup to ensure reliability
    return {
        "title": "Official Complaint Notice",
        "subject": "Petition regarding reported grievances.",
        "body": f"This is an official document drafted concerning the raw input: {prompt}. Please review and update details accordingly."
    }

@app.post("/api/generate-complaint")
async def generate_complaint(request: ComplaintGenerationRequest):
    profile_info = ""
    if request.profile:
        p = request.profile
        profile_info = (
            f"Name: {p.name}\n"
            f"Father/Spouse Name: {p.fatherName}\n"
            f"Address: {p.address}, {p.district}, {p.state} - {p.pincode}\n"
            f"Phone: {p.phone}, Email: {p.email}"
        )

    system_instruction = (
        "You are an elite legal drafting expert. Turn the raw written or verbal spoken transcript "
        "into an official, polished government document formatted strictly as JSON.\n"
        "Remove fillers, correct grammar, write with extreme professional authority.\n"
        "Return JSON only with fields: 'title', 'subject', 'body'.\n"
        f"Target language is {request.language}."
    )

    prompt = (
        f"Raw spoken or written content: '{request.rawInput}'\n"
        f"Selected Template Profile Category: {request.templateName}\n"
        f"Applicant Citizen Profile:\n{profile_info}"
    )

    result = query_ai_model(prompt, system_instruction)
    return result

@app.get("/api/complaints")
async def list_complaints():
    db = get_db()
    if db is None:
        # Fallback to local files if Mongo is not running
        if os.path.exists("complaints.json"):
            with open("complaints.json", "r") as f:
                return json.load(f)
        return []

    collection = db["complaints"]
    cursor = collection.find().sort("createdAt", -1)
    results = []
    for doc in cursor:
        doc["id"] = str(doc.get("_id", doc.get("id", "")))
        if "_id" in doc:
            del doc["_id"]
        results.append(doc)
    return results

@app.post("/api/complaints", status_code=201)
async def save_complaint(request: ComplaintSaveRequest):
    db = get_db()
    new_doc = {
        "id": f"complaint_{int(datetime.utcnow().timestamp())}",
        "templateId": request.templateId,
        "title": request.title,
        "subject": request.subject,
        "body": request.body,
        "profile": request.profile.dict() if request.profile else None,
        "evidenceImages": request.evidenceImages or [],
        "problemImages": request.problemImages or [],
        "createdAt": datetime.utcnow().isoformat()
    }

    if db is not None:
        collection = db["complaints"]
        collection.insert_one(new_doc.copy())
    else:
        # Save to local JSON file
        history = []
        if os.path.exists("complaints.json"):
            with open("complaints.json", "r") as f:
                try:
                    history = json.load(f)
                except:
                    pass
        history.insert(0, new_doc)
        with open("complaints.json", "w") as f:
            json.dump(history, f, indent=2)

    return new_doc

@app.post("/api/generate-pdf")
async def generate_pdf(request: ComplaintSaveRequest):
    buffer = io.BytesIO()
    
    # Register Tamil Unicode Font dynamically with robust absolute path detection
    font_name = "Helvetica"
    font_path = os.path.join(os.path.dirname(__file__), "Pavanam-Regular.ttf")
    if os.path.exists(font_path):
        try:
            pdfmetrics.registerFont(TTFont("Pavanam", font_path))
            font_name = "Pavanam"
            print(f"Successfully registered Unicode font '{font_name}' from {font_path}")
        except Exception as e:
            print(f"Error registering TrueType Unicode font: {e}")
    else:
        print(f"Warning: Unicode font file '{font_path}' was not found. Falling back to Helvetica.")

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    story = []
    styles = getSampleStyleSheet()

    # Custom typography style setups
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=18,
        textColor=colors.HexColor('#0f172a'),
        alignment=1, # Center
        spaceAfter=15
    )
    
    sub_title_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=9,
        textColor=colors.HexColor('#64748b'),
        alignment=1,
        spaceAfter=25
    )

    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )

    text_style = ParagraphStyle(
        'StandardText',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10,
        textColor=colors.HexColor('#334155'),
        leading=14,
        spaceAfter=10
    )

    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10,
        textColor=colors.HexColor('#0f172a'),
        leading=16,
        alignment=4, # Justified
        spaceAfter=12
    )

    # Document Header Title
    story.append(Spacer(1, 10))
    story.append(RLParagraph("OFFICIAL PETITION & GRIEVANCE RECORD", title_style))
    story.append(RLParagraph("Formulated via MANU AI Platform (National Citizen Services)", sub_title_style))

    # Profile Section
    story.append(RLParagraph("FROM (APPLICANT INFORMATION):", label_style))
    if request.profile:
        p = request.profile
        profile_text = (
            f"<b>Full Name:</b> {p.name}<br/>"
            f"<b>Father / Spouse:</b> {p.fatherName}<br/>"
            f"<b>Address:</b> {p.address}, {p.district}, {p.state} - {p.pincode}<br/>"
            f"<b>Contact:</b> Phone: {p.phone} | Email: {p.email}"
        )
        story.append(RLParagraph(profile_text, text_style))
    else:
        story.append(RLParagraph("Applicant details: [Dynamic profile information missing]", text_style))

    story.append(Spacer(1, 15))

    # Reference RE & Subject Section
    story.append(RLParagraph(f"<b>RE:</b> {request.title.upper()}", label_style))
    story.append(RLParagraph(f"<b>SUBJECT:</b> {request.subject}", text_style))
    story.append(Spacer(1, 15))

    # Document Body Section
    story.append(RLParagraph("DETAILED STATEMENT OF COMPLAINT / GRIEVANCE:", label_style))
    story.append(RLParagraph(request.body.replace("\n", "<br/>"), body_style))
    story.append(Spacer(1, 30))

    # Verification and Signatures
    story.append(RLParagraph("<i>I hereby solemnly verify that the facts stated in this grievance are true, correct, and faithful to the best of my knowledge.</i>", text_style))
    story.append(Spacer(1, 20))

    sig_data = [
        [RLParagraph("<b>Signature of Applicant:</b><br/><br/>_________________________", text_style), 
         RLParagraph("<b>Official Digital Stamp:</b><br/><br/><b>[ MANU AI VERIFIED ]</b>", text_style)]
    ]
    sig_table = Table(sig_data, colWidths=[250, 250])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(sig_table)

    # Embed Base64 Evidence Images on separate pages
    if request.evidenceImages:
        for idx, img_b64 in enumerate(request.evidenceImages):
            try:
                story.append(Spacer(1, 40)) # Trigger new flow or divider
                cleaned_b64 = img_b64.split(",")[-1] if "," in img_b64 else img_b64
                img_data = base64.b64decode(cleaned_b64)
                img_stream = io.BytesIO(img_data)
                
                # ReportLab Simple Image sizing
                rl_img = RLImage(img_stream, width=400, height=300)
                story.append(RLParagraph(f"<b>ANNEXURE EVIDENCE {idx+1}:</b>", label_style))
                story.append(Spacer(1, 10))
                story.append(rl_img)
            except Exception as ex:
                print(f"Failed to embed image in python PDF: {ex}")

    # Embed Base64 Problem Site & Area Images
    if request.problemImages:
        for idx, img_b64 in enumerate(request.problemImages):
            try:
                story.append(Spacer(1, 40))
                cleaned_b64 = img_b64.split(",")[-1] if "," in img_b64 else img_b64
                img_data = base64.b64decode(cleaned_b64)
                img_stream = io.BytesIO(img_data)
                
                rl_img = RLImage(img_stream, width=400, height=300)
                story.append(RLParagraph(f"<b>ANNEXURE PROBLEM AREA / SITE IMAGE {idx+1}:</b>", label_style))
                story.append(Spacer(1, 10))
                story.append(rl_img)
            except Exception as ex:
                print(f"Failed to embed problem image in python PDF: {ex}")

    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=MANU_AI_Complaint.pdf"}
    )

@app.post("/api/generate-docx")
async def generate_docx(request: ComplaintSaveRequest):
    doc = DocxDocument()
    
    # Official document heading
    title = doc.add_paragraph()
    r_title = title.add_run("OFFICIAL LEGAL PETITION & COMPLAINT")
    r_title.bold = True
    r_title.font.size = Pt(16)
    r_title.font.name = 'Arial'
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    subtitle = doc.add_paragraph()
    r_sub = subtitle.add_run("Generated Digitally via MANU AI Platform (National Grievance Portal)")
    r_sub.italic = True
    r_sub.font.size = Pt(9)
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph("-" * 80)

    # Applicant details
    doc.add_heading("APPLICANT / PETITIONER DETAILS:", level=2)
    p_info = doc.add_paragraph()
    if request.profile:
        p = request.profile
        p_info.add_run(f"Full Name: {p.name}\n").bold = True
        p_info.add_run(f"Father's / Spouse's Name: {p.fatherName}\n")
        p_info.add_run(f"Address: {p.address}, {p.district}, {p.state} - {p.pincode}\n")
        p_info.add_run(f"Contact Information: Phone: {p.phone} | Email: {p.email}\n")
    else:
        p_info.add_run("Name: [Petitioner Name]\nAddress: [Petitioner Address]\nContact details missing.")

    doc.add_paragraph("-" * 80)

    # Title & Subject
    doc.add_paragraph().add_run(f"RE: {request.title.upper()}").bold = True
    
    subj = doc.add_paragraph()
    subj.add_run("SUBJECT: ").bold = True
    subj.add_run(request.subject)

    doc.add_paragraph("-" * 80)

    # Core Body Text
    doc.add_heading("STATEMENT OF DETAILS:", level=2)
    doc.add_paragraph(request.body)

    doc.add_paragraph("\n\nI hereby solemnly declare that the facts outlined in this representation are fully true, precise, and authentic.")
    
    doc.add_paragraph("\n\nSignature of Applicant: _____________________        Official Stamp: [ MANU AI SYSTEM ]")

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=MANU_AI_Complaint.docx"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
