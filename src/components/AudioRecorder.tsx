import { useState, useEffect, useRef } from "react";
import { Mic, Square, Volume2, AlertCircle, Languages } from "lucide-react";

interface AudioRecorderProps {
  onTranscriptComplete: (text: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
}

export default function AudioRecorder({
  onTranscriptComplete,
  language,
  setLanguage,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognitionError, setRecognitionError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionError(
        "Web Speech API is not supported in this browser. Please type your complaint details directly, or use Google Chrome/Microsoft Edge."
      );
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = language === "Tamil" ? "ta-IN" : "en-US";

    rec.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeTranscript = finalTranscript || interimTranscript;
      setTranscript(activeTranscript);
      onTranscriptComplete(activeTranscript);
    };

    rec.onerror = (event: any) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        // Benign state when user pauses or stops speaking, handled silently
        return;
      }
      console.error("Speech recognition error", event.error);
      if (event.error === "not-allowed") {
        setRecognitionError("Microphone permission denied. Please enable microphone access.");
      } else {
        setRecognitionError(`Speech recognition error: ${event.error}`);
      }
    };

    rec.onend = () => {
      if (isRecording) {
        // Auto-restart if it cuts out while we are in recording state
        try {
          rec.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = rec;
  }, [language, isRecording, onTranscriptComplete]);

  // Handle Recording start/stop
  const startRecording = async () => {
    setRecognitionError("");
    setTranscript("");
    setIsRecording(true);

    // Start browser Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start speech recognition", e);
      }
    }

    // Initialize Audio Visualizer
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();
    } catch (err) {
      console.error("Microphone access failed for visualizer", err);
      setRecognitionError("Could not access microphone. Please check system permissions.");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    // Stop streams & cleanup audio context
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.warn("AudioContext close error:", e);
      }
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Clear Canvas visualizer
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Render the sound visualizer wave
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "rgb(15, 23, 42)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 3;
      // Beautiful gradient matching our theme
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "#3b82f6");
      gradient.addColorStop(0.5, "#6366f1");
      gradient.addColorStop(1, "#8b5cf6");
      ctx.strokeStyle = gradient;

      ctx.beginPath();
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.warn("AudioContext close error on unmount:", e);
        }
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div id="audio-recorder-module" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-inner">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-blue-950 p-2 rounded-lg border border-blue-800">
            <Volume2 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-100 text-sm">Voice Dictation Hub</h3>
            <p className="text-xs text-slate-400">Speak naturally; MANU AI translates and structures it</p>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1.5">
          <Languages className="h-4 w-4 text-slate-400 ml-1" />
          <button
            type="button"
            onClick={() => {
              setLanguage("English");
              if (isRecording) stopRecording();
            }}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
              language === "English"
                ? "bg-slate-700 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => {
              setLanguage("Tamil");
              if (isRecording) stopRecording();
            }}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
              language === "Tamil"
                ? "bg-slate-700 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            தமிழ் (Tamil)
          </button>
        </div>
      </div>

      {recognitionError && (
        <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs rounded-lg p-3 mb-4">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{recognitionError}</span>
        </div>
      )}

      {/* Visualizer Area */}
      <div className="relative h-20 bg-slate-950 border border-slate-800/50 rounded-lg overflow-hidden mb-4">
        {isRecording ? (
          <canvas ref={canvasRef} className="w-full h-full" width={400} height={80} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-500">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
              <span>Waveform Idle</span>
            </div>
            <span>Press start to begin speech-to-text</span>
          </div>
        )}
      </div>

      {/* Record button */}
      <div className="flex justify-center">
        {!isRecording ? (
          <button
            id="start-record-btn"
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium px-5 py-2.5 rounded-full shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all text-sm"
          >
            <Mic className="h-4 w-4" />
            <span>Start Voice Dictation</span>
          </button>
        ) : (
          <button
            id="stop-record-btn"
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-medium px-5 py-2.5 rounded-full shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all text-sm"
          >
            <Square className="h-4 w-4" />
            <span>Stop and Save Draft</span>
          </button>
        )}
      </div>

      {transcript && (
        <div className="mt-4 bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Live Dictation Transcript</p>
          <p className="text-sm text-slate-300 leading-relaxed italic">"{transcript}"</p>
        </div>
      )}
    </div>
  );
}
