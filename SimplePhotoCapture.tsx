import React, { useState, useRef } from 'react';

const SimplePhotoCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStarted(true);
      setError(null);
    } catch (err) {
      setError('Failed to access camera. Please make sure you have granted camera permissions.');
      console.error('Camera access error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraStarted(false);
    setImage(null);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    try {
      setIsProcessing(true);
      setError(null);

      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1]; // Remove data:image/jpeg;base64, prefix

      // Send to your backend
      const response = await fetch('http://localhost:8000/chores/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          description: 'Photo taken from webcam for chore analysis'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      setAnalysis(result);
      setImage(dataUrl); // Show preview

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during analysis');
      console.error('Analysis error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2>📸 Simple Photo Capture for Chore Analysis</h2>
      <p>Take a photo with your webcam to analyze chores using AI</p>

      {/* Video Preview */}
      <div style={{
        margin: '20px 0',
        textAlign: 'center',
        border: '2px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#000'
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            maxWidth: '100%',
            height: 'auto',
            display: cameraStarted ? 'block' : 'none'
          }}
        />
        {!cameraStarted && (
          <div style={{
            padding: '40px 20px',
            color: '#666',
            textAlign: 'center'
          }}>
            📷 Camera off - Click "Start Camera" to begin
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={startCamera}
          disabled={cameraStarted || isProcessing}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            opacity: isProcessing ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          {isProcessing ? 'Processing...' : 'Start Camera'}
        </button>

        <button
          onClick={stopCamera}
          disabled={!cameraStarted || isProcessing}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            opacity: isProcessing ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          Stop Camera
        </button>

        <button
          onClick={capturePhoto}
          disabled={!cameraStarted || isProcessing}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            opacity: isProcessing ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          {isProcessing ? 'Analyzing...' : 'Capture & Analyze'}
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '12px',
          borderRadius: '6px',
          margin: '16px 0',
          borderLeft: '4px solid #f44336'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Results */}
      {image && !analysis && !isProcessing && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <img
            src={image}
            alt="Captured photo"
            style={{
              maxWidth: '100%',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}
          />
          <p style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
            Photo captured! Click "Capture & Analyze" to analyze with AI.
          </p>
        </div>
      )}

      {analysis && (
        <div style={{
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          padding: '16px',
          margin: '20px 0',
          borderLeft: '4px solid #4caf50'
        }}>
          <h3 style={{ marginTop: '0', color: '#2e7d32' }}>🤖 AI Analysis Results</h3>

          <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
            <div><strong>Chore:</strong> {analysis.chore_title || 'Not specified'}</div>
            <div><strong>Difficulty:</strong> {analysis.ai_difficulty || 'medium'}</div>
            <div><strong>Estimated Time:</strong> {analysis.ai_estimated_time || 'Unknown'}</div>
            <div><strong>Tools Needed:</strong> {analysis.ai_tools?.length ? analysis.ai_tools.join(', ') : 'None specified'}</div>
            <div><strong>Skills Needed:</strong> {analysis.ai_skills_needed?.length ? analysis.ai_skills_needed.join(', ') : 'None specified'}</div>
            <div><strong>Steps:</strong>
              {analysis.ai_steps?.length ? (
                <ol style={{ margin: '4px 0 0 20px', padding: '0' }}>
                  {analysis.ai_steps.map((step: string, index: number) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{step}</li>
                  ))}
                </ol>
              ) : (
                <em>No steps provided</em>
              )}
            </div>
            <div><strong>Safety Notes:</strong> {analysis.ai_safety_notes || 'None provided'}</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!image && !analysis && !isProcessing && (
        <div style={{
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          padding: '16px',
          margin: '20px 0',
          borderLeft: '4px solid #2196f3'
        }}>
          <h3 style={{ marginTop: '0', color: '#1565c0' }}>📝 How to Use</h3>
          <ol style={{ margin: '8px 0 0 20px', padding: '0' }}>
            <li>Click "Start Camera" to activate your webcam</li>
            <li>Position yourself/chore in the camera view</li>
            <li>Click "Capture & Analyze" to take a photo and get AI analysis</li>
            <li>Review the results to help create your chore posting</li>
          </ol>
          <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: '#666' }}>
            Make sure to grant camera permissions when prompted by your browser.
          </p>
        </div>
      )}
    </div>
  );
};

export default SimplePhotoCapture;