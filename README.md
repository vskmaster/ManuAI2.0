# 🏛️ MANU AI — Production-Ready Full-Stack AI Web Application

**Tagline:** *From Your Voice to an Official Government Document.*

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com)
[![Supabase](https://img.shields.io/badge/Auth-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)

MANU AI is an AI-powered portal designed to help citizens generate formal, professional, and compliant government document drafts directly from informal natural speech.

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Technical Architecture](#️-technical-architecture)
- [🚀 Quick Start](#-quick-start)
- [📦 Project Structure](#-project-structure)
- [⚙️ Environment Variables](#️-environment-variables)
- [🛠️ Development Setup](#️-development-setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [🔐 Authentication](#-authentication)
- [📊 Database Schema](#-database-schema)
- [🤖 AI Integration](#-ai-integration)
- [📱 API Endpoints](#-api-endpoints)
- [🧪 Testing](#-testing)
- [🚢 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Features

### Core Functionality
- 🎙️ **Voice-to-Text Transcription** – Convert natural speech to text using Gemini AI
- 📝 **Intelligent Document Structuring** – Transform raw text into formal government documents
- 🔒 **Secure Authentication** – User management powered by Supabase
- 💾 **Persistent Storage** – MongoDB Atlas for document history and user data
- 📄 **Multiple Document Types** – Support for various government document formats
- 🌐 **Responsive UI** – Modern, accessible interface built with React + Vite

### User Experience
- ⚡ **Real-time Processing** – Instant feedback during document generation
- 📱 **Mobile-First Design** – Fully responsive across all devices
- 🎨 **Sleek Modern UI** – Professional design with smooth animations
- 🔍 **Document History** – View and manage all generated documents

---

## 🏗️ Technical Architecture

```mermaid
graph TD
    A[Frontend: React + Vite] --> B[Backend: FastAPI]
    B --> C[MongoDB Atlas]
    B --> D[Gemini AI API]
    A --> E[Supabase Auth]
    E --> B
    B --> F[Render Deployment]
    A --> G[Vercel Deployment]
