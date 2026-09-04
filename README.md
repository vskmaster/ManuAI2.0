# 🤖 MANU AI — Advanced UI & Graphics Platform

**From Your Voice to an Official Government Document.**

[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Render](https://img.shields.io/badge/Deployed-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com)
[![Supabase](https://img.shields.io/badge/Auth-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)

---

## 🎨 Premium UI Components

### 1. Interactive Voice Recorder
```jsx
// src/components/Voice/VoiceRecorder.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VoiceRecorder = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  // Real-time waveform visualization
  useEffect(() => {
    if (isRecording && !isPaused) {
      const updateVolume = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setVolume(prev => [...prev.slice(-40), average / 255]);
        }
        animationRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true 
        } 
      });
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        chunksRef.current = [];
        handleTranscription(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      
      const startTime = Date.now();
      const timer = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
      return () => clearInterval(timer);
    } catch (error) {
      console.error('Microphone access error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
    }
  };

  const handleTranscription = async (audioBlob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    try {
      const response = await fetch('/api/v1/voice/transcribe', {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const data = await response.json();
      onTranscriptionComplete(data.transcript);
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mic className="text-blue-400" />
            Voice Recorder
          </h3>
          <p className="text-gray-400 text-sm">Speak naturally, we'll structure it</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 
            audioURL ? 'bg-green-500/20 text-green-400' : 
            'bg-gray-700 text-gray-400'
          }`}>
            {isRecording ? '🔴 Recording' : audioURL ? '✅ Ready' : '⏸️ Idle'}
          </span>
        </div>
      </div>

      {/* Waveform Visualization - Advanced */}
      <div className="relative h-32 bg-gray-800/50 rounded-xl mb-6 overflow-hidden border border-gray-700">
        {isRecording ? (
          <div className="flex items-center justify-center h-full px-4 gap-1">
            {volume.map((value, index) => (
              <motion.div
                key={index}
                className="w-2 bg-gradient-to-t from-blue-400 to-purple-400 rounded-full"
                animate={{
                  height: `${value * 120 + 10}px`,
                  opacity: value * 2 + 0.3
                }}
                transition={{ duration: 0.1 }}
                style={{ height: `${value * 120 + 10}px` }}
              />
            ))}
          </div>
        ) : audioURL ? (
          <div className="flex items-center justify-center h-full">
            <audio controls src={audioURL} className="w-full px-6" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Mic size={48} className="mb-2 opacity-20" />
            <p className="text-sm">Click the microphone to start recording</p>
          </div>
        )}
        
        {/* Timer Overlay */}
        {isRecording && (
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg">
            <span className="text-white font-mono text-sm">{String(Math.floor(duration / 60)).padStart(2, '0')}:{String(duration % 60).padStart(2, '0')}</span>
          </div>
        )}
      </div>

      {/* Controls - Advanced */}
      <div className="flex justify-center items-center gap-4">
        {!isRecording && !audioURL && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={startRecording}
            className="relative group"
          >
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-5 rounded-full transition-all shadow-lg shadow-blue-500/30">
              <Mic size={28} />
            </div>
          </motion.button>
        )}
        
        {isRecording && (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsPaused(!isPaused)}
              className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-full transition-all"
            >
              {isPaused ? <Play size={24} /> : <Volume2 size={24} />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={stopRecording}
              className="relative group"
            >
              <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-5 rounded-full transition-all shadow-lg shadow-red-500/30">
                <Square size={28} />
              </div>
            </motion.button>
          </>
        )}
        
        {audioURL && !isRecording && (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setAudioURL(null);
                setDuration(0);
                setVolume([]);
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-full transition-all"
            >
              <Trash2 size={24} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-full transition-all shadow-lg shadow-blue-500/30"
            >
              <Mic size={24} />
            </motion.button>
          </>
        )}
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-400 font-medium">Processing your voice...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default VoiceRecorder;
```

---

### 2. Interactive Document Generator
```jsx
// src/components/Documents/DocumentGenerator.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Download, Copy, Share2, 
  Sparkles, Check, AlertCircle, 
  Building, Calendar, User, Mail,
  Loader2
} from 'lucide-react';

const DocumentGenerator = ({ transcript }) => {
  const [documentType, setDocumentType] = useState('official_letter');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [missingInfo, setMissingInfo] = useState([]);

  const documentTypes = [
    { 
      value: 'official_letter', 
      label: '📄 Official Letter',
      icon: FileText,
      color: 'blue',
      description: 'Formal government correspondence'
    },
    { 
      value: 'application', 
      label: '📝 Application',
      icon: User,
      color: 'green',
      description: 'Apply for services or permits'
    },
    { 
      value: 'complaint', 
      label: '⚖️ Complaint',
      icon: AlertCircle,
      color: 'red',
      description: 'Report issues or grievances'
    },
    { 
      value: 'request', 
      label: '📨 Request',
      icon: Mail,
      color: 'purple',
      description: 'Request information or action'
    },
    { 
      value: 'report', 
      label: '📊 Report',
      icon: Building,
      color: 'orange',
      description: 'Official reporting'
    }
  ];

  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  const generateDocument = async () => {
    setIsGenerating(true);
    setProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 300);

    try {
      const response = await fetch('/api/v1/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          transcript, 
          document_type: documentType 
        })
      });
      
      const data = await response.json();
      setProgress(100);
      setTimeout(() => {
        setGeneratedDoc(data);
        setProgress(0);
        setIsGenerating(false);
        clearInterval(interval);
      }, 500);
      
      // Detect missing information
      if (data.missing_info) {
        setMissingInfo(data.missing_info);
      }
    } catch (error) {
      console.error('Document generation error:', error);
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDoc.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = async (format) => {
    try {
      const response = await fetch(`/api/v1/documents/export/${generatedDoc.id}?format=${format}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document.${format}`;
      a.click();
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-yellow-400" />
            Document Generator
          </h3>
          <p className="text-gray-400 text-sm">AI-powered government document creation</p>
        </div>
        {generatedDoc && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-lg border border-green-500/30">
            <Check size={16} className="text-green-400" />
            <span className="text-green-400 text-sm font-medium">Generated</span>
          </div>
        )}
      </div>

      {/* Document Type Selector - Enhanced */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {documentTypes.map((type) => (
          <motion.button
            key={type.value}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setDocumentType(type.value)}
            className={`relative p-4 rounded-xl transition-all ${
              documentType === type.value
                ? `bg-gradient-to-r ${colorMap[type.color]} text-white shadow-lg`
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <type.icon size={24} />
              <span className="text-xs font-medium">{type.label}</span>
            </div>
            {documentType === type.value && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white rounded-full"
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Transcript Preview */}
      {transcript && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700"
        >
          <h4 className="text-sm font-medium text-gray-400 mb-2">📝 Voice Transcript</h4>
          <p className="text-gray-300 text-sm leading-relaxed">{transcript}</p>
        </motion.div>
      )}

      {/* Missing Information Detection */}
      {missingInfo.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-400 mt-0.5" size={20} />
            <div>
              <h5 className="text-yellow-400 font-medium text-sm">Missing Information</h5>
              <ul className="mt-2 space-y-1">
                {missingInfo.map((info, index) => (
                  <li key={index} className="text-gray-300 text-sm flex items-center gap-2">
                    <span className="w-1 h-1 bg-yellow-400 rounded-full" />
                    {info}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Generate Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={generateDocument}
        disabled={!transcript || isGenerating}
        className={`w-full py-4 rounded-xl font-medium transition-all ${
          !transcript || isGenerating
            ? 'bg-gray-700 cursor-not-allowed text-gray-500'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30'
        }`}
      >
        {isGenerating ? (
          <div className="flex items-center justify-center gap-3">
            <Loader2 size={20} className="animate-spin" />
            <span>Generating Document...</span>
            <div className="w-24 h-1 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        ) : (
          '🚀 Generate Official Document'
        )}
      </motion.button>

      {/* Generated Document Display */}
      <AnimatePresence>
        {generatedDoc && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8"
          >
            {/* Document Actions */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">✨ Generated Document</h4>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopy}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white relative"
                >
                  {isCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDownload('pdf')}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
                >
                  <Download size={18} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
                >
                  <Share2 size={18} />
                </motion.button>
              </div>
            </div>
            
            {/* Document Content */}
            <div className="p-6 bg-white rounded-xl shadow-inner max-h-96 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap font-serif text-gray-800 leading-relaxed">
                  {generatedDoc.content}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentGenerator;
```

---

### 3. Dashboard with Advanced Visuals
```jsx
// src/components/Layout/Dashboard.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Menu, User, FileText, Mic, Settings, LogOut,
  Home, Bell, Search, Plus, Users, TrendingUp,
  Calendar, Activity, BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const stats = [
    { label: 'Documents Generated', value: '247', change: '+12%', icon: FileText, color: 'blue' },
    { label: 'Voice Sessions', value: '1.2K', change: '+8%', icon: Mic, color: 'green' },
    { label: 'User Satisfaction', value: '94%', change: '+5%', icon: TrendingUp, color: 'purple' },
    { label: 'Departments Covered', value: '18', change: '+2', icon: Building, color: 'orange' }
  ];

  const chartData = [
    { day: 'Mon', docs: 12 },
    { day: 'Tue', docs: 19 },
    { day: 'Wed', docs: 15 },
    { day: 'Thu', docs: 27 },
    { day: 'Fri', docs: 22 },
    { day: 'Sat', docs: 14 },
    { day: 'Sun', docs: 9 }
  ];

  const navItems = [
    { icon: Home, label: 'Dashboard', active: true },
    { icon: Mic, label: 'Voice Input', active: false },
    { icon: FileText, label: 'Documents', active: false, badge: '3' },
    { icon: Users, label: 'Departments', active: false },
    { icon: Calendar, label: 'History', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -280 }}
        animate={{ x: isSidebarOpen ? 0 : -280 }}
        className="fixed left-0 top-0 h-full w-64 bg-gray-800/95 backdrop-blur-xl border-r border-gray-700 z-50"
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🏛️ MANU AI
          </h1>
          <p className="text-sm text-gray-400 mt-1">Government Document Assistant</p>
        </div>
        
        {/* Navigation */}
        <nav className="mt-6 px-3">
          {navItems.map((item, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                item.active
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <item.icon size={20} />
                {item.label}
              </span>
              {item.badge && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                  {item.badge}
                </span>
              )}
            </motion.button>
          ))}
          
          <div className="mt-8 pt-6 border-t border-gray-700">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={20} />
              Logout
            </motion.button>
          </div>
        </nav>
      </motion.div>

      {/* Main Content */}
      <div className={`${isSidebarOpen ? 'ml-64' : 'ml-0'} transition-all duration-300`}>
        {/* Header */}
        <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
              >
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">Welcome back, 👋</h2>
                <p className="text-gray-400 text-sm">Generate official documents from your voice</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
              >
                <Bell size={24} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </motion.button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/30">
                  SK
                </div>
                <div className="hidden md:block">
                  <p className="text-white text-sm font-medium">Santhakumar</p>
                  <p className="text-gray-400 text-xs">Developer</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                    <span className="text-xs text-green-400 flex items-center gap-1 mt-1">
                      <TrendingUp size={12} />
                      {stat.change}
                    </span>
                  </div>
                  <div className={`p-3 bg-${stat.color}-500/10 rounded-xl border border-${stat.color}-500/20`}>
                    <stat.icon className={`text-${stat.color}-400`} size={24} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">Document Generation Activity</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs">Week</button>
                <button className="px-3 py-1 bg-gray-700 text-gray-400 rounded-lg text-xs">Month</button>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="day" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="docs" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Children Content */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```

---

### 4. Advanced Animations with Framer Motion
```jsx
// src/utils/animations.js
import { motion } from 'framer-motion';

// Page Transitions
export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const PageTransition = ({ children }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={pageVariants}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// Stagger Children
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

// Floating Animation
export const FloatingElement = ({ children, delay = 0 }) => (
  <motion.div
    animate={{
      y: [0, -10, 0],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
      delay
    }}
  >
    {children}
  </motion.div>
);

// Pulse Glow
export const GlowPulse = ({ children }) => (
  <motion.div
    animate={{
      boxShadow: [
        '0 0 0 0 rgba(139, 92, 246, 0.3)',
        '0 0 0 20px rgba(139, 92, 246, 0)',
      ],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeOut"
    }}
  >
    {children}
  </motion.div>
);
```

---

### 5. Custom Hooks for Performance
```jsx
// src/hooks/useVoiceRecording.js
import { useState, useRef, useCallback } from 'react';

export const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true 
        } 
      });
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        chunksRef.current = [];
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      
      const startTime = Date.now();
      const timer = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
      return () => clearInterval(timer);
    } catch (error) {
      console.error('Microphone access error:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getT
