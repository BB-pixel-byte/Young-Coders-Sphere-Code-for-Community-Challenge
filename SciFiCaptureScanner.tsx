import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle } from 'lucide-react';

const SciFiCaptureScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [frames, setFrames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get NVIDIA API URL from environment variables
  const NVIDIA_API_URL =
    (typeof window !== 'undefined' && (window as any).import?.meta?.env?.VITE_NVIDIA_ENDPOINT) ||
    (process.env && process.env.NEXT_PUBLIC_NVIDIA_API_URL) ||
    '';

  // Real NVIDIA API integration
  const analyzeFramesWithNVIDIA = async (imageFrames: string[]) => {
    if (!NVIDIA_API_URL) {
      setError('NVIDIA API endpoint not configured');
      setIsProcessing(false);
      return;
    }

    setError(null);
    setIsProcessing(true);
    try {
      // Prepare payload for NVIDIA NIM Vision API
      const payload = {
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this sequence of 20 images for 3D spatial mapping, depth metrics, and structure details"
              },
              ...imageFrames.map((frame) => ({
                type: "image_url",
                image_url: {
                  url: frame,
                }
              }))
            ]
          }
        ],
        max_tokens: 1024,
        temperature: 0.2,
        top_p: 0.9,
        stream: false
      };

      const response = await fetch(NVIDIA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Extract analysis text from NVIDIA NIM response format
      let analysisText = '';
      if (result.choices && result.choices && result.choices.message) {
        analysisText = result.choices.message.content;
      } else if (result.text) {
        analysisText = result.text;
      } else {
        analysisText = JSON.stringify(result, null, 2);
      }

      setAnalysisResult(analysisText);
      setIsProcessing(false);
      setIsComplete(true);
    } catch (err) {
      console.error('Error analyzing frames:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsProcessing(false);
    }
  };

  // Start camera stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsStreaming(true);
      // Automatically trigger frame gathering once initialized
      startCapture();
    } catch (err) {
      console.error('Camera access denied or unavailable:', err);
      setIsStreaming(false);
      setError('Failed to access camera');
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsStreaming(false);
    }
  };

  // Start capturing frames
  const startCapture = () => {
    setIsStarted(true);
    setFrames([]);
    setAnalysisResult(null);
    setError(null);

    // Track frame accumulation via mutable local reference to bypass stale closure hook state
    let accumulatedFrames: string[] = [];

    captureIntervalRef.current = setInterval(() => {
      if (videoRef.current && videoRef.current.videoWidth > 0 && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas dimensions to match video
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        // Draw current video frame
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        // Extract frame as JPEG data URL
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        accumulatedFrames.push(dataURL);
        setFrames([...accumulatedFrames]);

        // Check if we've reached 20 frames
        if (accumulatedFrames.length === 20) {
          if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
          }
          stopCamera();
          analyzeFramesWithNVIDIA(accumulatedFrames);
        }
      }
    }, 200); // Captures a frame every 200ms (~4 seconds total run time)
  };

  // Reset scanner state
  const handleReset = () => {
    setIsComplete(false);
    setIsStarted(false);
    setFrames([]);
    setAnalysisResult(null);
    setError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[500px] bg-[#0a0a12] rounded-lg overflow-hidden">
      {/* Video Stream */}
      {isStreaming && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
        />
      )}

      {/* Hidden Canvas for Frame Capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Fallback UI (when no stream) */}
      {!isStreaming && !isProcessing && !isComplete && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a12]/80">
          <div className="text-cyan-400 text-2xl font-mono mb-6">
            CAMERA OFFLINE
          </div>
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 font-mono text-xs tracking-widest hover:bg-cyan-500/30 transition-all duration-300"
          >
            INITIALIZE SCANNER
          </button>
        </div>
      )}

      {/* HUD Overlay (active during streaming) */}
      {isStreaming && !isProcessing && !isComplete && isStarted && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Animated Corner Brackets */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-[30px] h-[30px] border-t-2 border-l-2 border-cyan-500/50"></div>
            <div className="absolute top-0 right-0 w-[30px] h-[30px] border-t-2 border-r-2 border-cyan-500/50"></div>
            <div className="absolute bottom-0 left-0 w-[30px] h-[30px] border-b-2 border-l-2 border-cyan-500/50"></div>
            <div className="absolute bottom-0 right-0 w-[30px] h-[30px] border-b-2 border-r-2 border-cyan-500/50"></div>
          </div>

          {/* Pulsing Center Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[2px] h-[20px] bg-cyan-400/50 animate-pulse"></div>
            <div className="w-[20px] h-[2px] bg-cyan-400/50 animate-pulse"></div>
          </div>

          {/* Rotating Scanning Ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[280px] h-[280px] border-2 border-cyan-500/50 rounded-full animate-rotate"></div>
          </div>

          {/* Telemetry Panel */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-col items-center gap-2 text-xs text-cyan-400/80 font-mono">
            <div className="flex flex-row items-center gap-4">
              <div>FRAMES: {frames.length} / 20</div>
              <div>DEPTH_EST_READY: TRUE</div>
              <div>STABILITY: 98.4%</div>
            </div>
            <div className="w-full bg-[#0a0a12]/40 h-[4px] rounded overflow-hidden">
              <div
                className="h-full bg-cyan-400/50 transition-all duration-300"
                style={{ width: `${Math.min((frames.length / 20) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a12]/90">
          <div className="w-[48px] h-[48px] border-4 border-cyan-400/50 border-t-transparent rounded-full animate-spin mb-6"></div>
          <div className="space-y-2 text-cyan-400 font-mono text-sm text-center">
            <div>CONNECTING_TO_NVIDIA_NIM...</div>
            <div>UPLOADING_SPATIAL_FRAMES...</div>
            <div>ANALYZING_SURFACE_MESH...</div>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && !isProcessing && !isComplete && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a12]/90 p-4">
          <div className="w-[48px] h-[48px] bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
            <span className="text-rose-500 font-bold">!</span>
          </div>
          <p className="text-rose-500 font-mono text-sm tracking-widest text-center max-w-md mb-4">
            {error}
          </p>
          <button
            onClick={() => {
              setError(null);
              if (frames.length === 20) {
                analyzeFramesWithNVIDIA(frames);
              } else {
                startCamera();
              }
            }}
            className="px-6 py-3 bg-rose-500/20 text-rose-500 border border-rose-500/50 font-mono text-xs tracking-widest hover:bg-rose-500/30 transition-all duration-300"
          >
            {frames.length === 20 ? 'RETRY UPLOAD' : 'RESTART CAMERA'}
          </button>
        </div>
      )}

      {/* Complete Overlay */}
      {isComplete && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a12]/90 p-4">
          <div className="w-[48px] h-[48px] bg-emerald-400/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-[24px] h-[24px] text-emerald-400" />
          </div>
          <p className="text-emerald-400 font-mono text-base tracking-widest text-center">
            SCAN COMPLETE / MESH GENERATED
          </p>
          {analysisResult && (
            <div className="mt-4 w-full max-w-[90%]">
              <div className="bg-black/50 border border-emerald-500/30 font-mono text-[10px] p-3 max-h-[150px] overflow-y-auto text-emerald-300 whitespace-pre-wrap">
                {analysisResult}
              </div>
            </div>
          )}
          <button
            onClick={handleReset}
            className="mt-4 px-6 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-mono text-xs tracking-widest hover:bg-emerald-500/30 transition-all duration-300"
          >
            RESET SCANNER
          </button>
        </div>
      )}

      {/* Custom Styles for Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-pulse {
          animation: pulse 2s infinite;
        }
        .animate-rotate {
          animation: rotate 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default SciFiCaptureScanner;