# 🏛️ MANU AI — Voice-to-Government Document Portal

**From Your Voice to an Official Government Document.**

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat&logo=vercel)](https://vercel.com)
[![Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=flat&logo=render)](https://render.com)

---

## 🎨 UI Components Gallery

### 1. Voice Recorder — Animated Waveform

```jsx
// components/Voice/VoiceRecorder.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, Loader2 } from 'lucide-react';

const VoiceRecorder = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState(Array(40).fill(10));
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const animationRef = useRef(null);

  // Animated waveform generator
  useEffect(() => {
    if (isRecording) {
      const generateWave = () => {
        const newData = waveformData.map(() => Math.random() * 40 + 10);
        setWaveformData(newData);
        animationRef.current = requestAnimationFrame(generateWave);
      };
      generateWave();
    } else {
      cancelAnimationFrame(animationRef.current);
      setWaveformData(Array(40).fill(10));
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRecording]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioURL(URL.createObjectURL(blob));
      setIsProcessing(true);
      // Transcribe
      const formData = new FormData();
      formData.append('audio', blob);
      const res = await fetch('/api/v1/voice/transcribe', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setIsProcessing(false);
      onTranscriptionComplete(data.transcript);
    };
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-lg border border-slate-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Mic className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-xl">Voice Recorder</h3>
            <p className="text-slate-400 text-sm">Speak naturally, we'll structure it</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-slate-800 rounded-lg">
          <span className="text-slate-300 font-mono text-sm">
            {String(Math.floor(duration / 60)).padStart(2, '0')}:
            {String(duration % 60).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Animated Waveform */}
      <div className="h-32 bg-slate-800/50 rounded-xl mb-6 flex items-center justify-center overflow-hidden border border-slate-700">
        {isRecording ? (
          <div className="flex items-center gap-[3px] px-4">
            {waveformData.map((height, i) => (
              <div
                key={i}
                className="w-2 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full transition-all duration-75"
                style={{ 
                  height: `${height}px`,
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>
        ) : audioURL ? (
          <audio controls src={audioURL} className="w-full px-6" />
        ) : isProcessing ? (
          <div className="text-center">
            <Loader2 className="animate-spin text-blue-400 mx-auto mb-2" size={32} />
            <p className="text-slate-400 text-sm">Transcribing your voice...</p>
          </div>
        ) : (
          <div className="text-center">
            <Mic className="text-slate-600 mx-auto mb-2" size={32} />
            <p className="text-slate-500 text-sm">Click the button below to start</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!isRecording && !audioURL && !isProcessing && (
          <button
            onClick={startRecording}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white font-medium transition-all hover:scale-105 hover:shadow-xl"
          >
            <span className="flex items-center gap-2">
              <Mic size={20} />
              Start Recording
            </span>
          </button>
        )}
        {isRecording && (
          <button
            onClick={stopRecording}
            className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-full text-white font-medium animate-pulse transition-all hover:scale-105"
          >
            <span className="flex items-center gap-2">
              <Square size={20} />
              Stop Recording
            </span>
          </button>
        )}
        {audioURL && !isRecording && (
          <div className="flex gap-3">
            <button
              onClick={() => { setAudioURL(null); chunksRef.current = []; }}
              className="px-6 py-3 bg-slate-700 rounded-full text-white transition-all hover:bg-slate-600"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={startRecording}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white transition-all hover:scale-105"
            >
              <Mic size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="mt-6 flex justify-center">
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
          isRecording ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
          isProcessing ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
          audioURL ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
          'bg-slate-800 text-slate-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            isRecording ? 'bg-red-500 animate-pulse' :
            isProcessing ? 'bg-yellow-500 animate-pulse' :
            audioURL ? 'bg-green-500' :
            'bg-slate-500'
          }`} />
          {isRecording ? 'Recording...' :
           isProcessing ? 'Processing...' :
           audioURL ? 'Ready to process' :
           'Ready'}
        </span>
      </div>
    </div>
  );
};

export default VoiceRecorder;
