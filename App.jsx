import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SimplePhotoCapture from './components/SimplePhotoCapture';

const API = 'http://localhost:8000';
const NVIDIA_KEY = import.meta.env.VITE_NVIDIA_API_KEY;

function parseJsonList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function dataUrlToFile(dataUrl, filename) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function uniqueById(items) {
  return Array.from(new Map((items || []).map(item => [item.id, item])).values());
}

function formatStatus(status) {
  return {
    open: 'Open',
    claimed: 'Claimed',
    pending_review: 'Needs review',
    done: 'Approved',
    rejected: 'Not approved'
  }[status] || status;
}

function proofImageUrl(path) {
  return `${API}/${path.replace(/\\/g, '/')}`;
}

const cameraConstraints = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 }
  },
  audio: false
};

function pastedImageFiles(event) {
  return Array.from(event.clipboardData?.items || [])
    .filter(item => item.type.startsWith('image/'))
    .map(item => item.getAsFile())
    .filter(Boolean);
}

function stopMediaStream(stream) {
  stream?.getTracks().forEach(track => track.stop());
}

// AI ANALYZE FUNCTION
async function analyzeChoreImage(base64Image, description) {
  const response = await fetch(`${API}/chores/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: base64Image, description })
  });
  return await response.json();
}

// HOME
function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#f6fbf7] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">ChoreMap</p>
            <h1 className="text-3xl font-bold text-slate-950">Help at home, reviewed with care.</h1>
          </div>
          <button onClick={() => navigate('/login')} className="rounded-full border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 shadow-sm hover:border-emerald-500">Login</button>
        </header>

        <main className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section>
            <p className="mb-4 inline-flex rounded-full bg-emerald-100 px-4 py-2 text-base font-semibold text-emerald-800">Senior approval before points</p>
            <h2 className="mb-5 max-w-3xl text-5xl font-bold leading-tight text-slate-950">A calmer way for seniors and volunteers to coordinate chores.</h2>
            <p className="max-w-2xl text-xl leading-8 text-slate-600">Seniors post what they need, volunteers claim work and upload proof, and points are awarded only after the senior approves the review.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => navigate('/register')} className="rounded-xl bg-emerald-700 px-7 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-900/10 hover:bg-emerald-800">Create account</button>
              <button onClick={() => navigate('/login')} className="rounded-xl bg-white px-7 py-4 text-lg font-bold text-slate-700 shadow-md ring-1 ring-slate-200 hover:ring-emerald-300">I already have one</button>
            </div>
          </section>

          <section className="grid gap-4">
            <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-100">
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">For seniors</p>
              <h3 className="mt-2 text-2xl font-bold">Post, schedule, review</h3>
              <p className="mt-2 text-lg leading-7 text-slate-600">See claimed chores and a clear review queue when a volunteer submits proof.</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-100">
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">For volunteers</p>
              <h3 className="mt-2 text-2xl font-bold">Claim, prove, earn</h3>
              <p className="mt-2 text-lg leading-7 text-slate-600">Upload or capture a proof photo, then track pending, approved, and not approved work.</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

// REGISTER
function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm_password: '', role: 'volunteer' });
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.confirm_password) { setError('All fields are required.'); return; }
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    try {
      const res = await axios.post(`${API}/users/register`, form);
      localStorage.setItem('user_id', res.data.user_id);
      localStorage.setItem('role', form.role);
      localStorage.setItem('name', form.name);
      if (form.role === 'senior') navigate('/senior');
      else navigate('/volunteer');
    } catch (e) {
      setError(e.response?.data?.detail || 'Registration failed. Email may already exist.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md">
        <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">Create Account</h2>
        {error && <p className="text-red-500 bg-red-50 rounded-xl p-3 mb-4 text-center">{error}</p>}
        <input className="w-full border rounded-xl px-4 py-3 mb-4 text-gray-700" placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className="w-full border rounded-xl px-4 py-3 mb-4 text-gray-700" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input type="password" className="w-full border rounded-xl px-4 py-3 mb-4 text-gray-700" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <input type="password" className="w-full border rounded-xl px-4 py-3 mb-6 text-gray-700" placeholder="Confirm Password" value={form.confirm_password} onChange={e => setForm({ ...form, confirm_password: e.target.value })} />
        <div className="flex gap-4 mb-6">
          <button onClick={() => setForm({ ...form, role: 'volunteer' })} className={`flex-1 py-3 rounded-xl font-semibold border ${form.role === 'volunteer' ? 'bg-blue-600 text-white' : 'text-blue-600 border-blue-600'}`}> Volunteer</button>
          <button onClick={() => setForm({ ...form, role: 'senior' })} className={`flex-1 py-3 rounded-xl font-semibold border ${form.role === 'senior' ? 'bg-green-600 text-white' : 'text-green-600 border-green-600'}`}> Senior</button>
        </div>
        <button onClick={handleSubmit} className="w-full bg-blue-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-blue-700">Register</button>
        <p className="text-center text-gray-500 mt-4 cursor-pointer hover:text-blue-600" onClick={() => navigate('/login')}>Already have an account? Login</p>
      </div>
    </div>
  );
}

// LOGIN
function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [resetMode, setResetMode] = useState(false);
  const [resetForm, setResetForm] = useState({ email: '', new_password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError('All fields are required.'); return; }
    try {
      const res = await axios.post(`${API}/users/login`, form);
      localStorage.setItem('user_id', res.data.user_id);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('name', res.data.name);
      if (res.data.role === 'senior') navigate('/senior');
      else navigate('/volunteer');
    } catch (e) {
      setError(e.response?.data?.detail || 'Invalid email or password.');
    }
  };

  const handleReset = async () => {
    if (!resetForm.email || !resetForm.new_password || !resetForm.confirm_password) {
      setError('All reset fields are required.');
      return;
    }
    if (resetForm.new_password !== resetForm.confirm_password) {
      setError('New passwords do not match.');
      return;
    }
    try {
      const res = await axios.post(`${API}/users/reset-password`, resetForm);
      setSuccess(res.data.message || 'Password updated successfully.');
      setError('');
      setResetMode(false);
      setResetForm({ email: '', new_password: '', confirm_password: '' });
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not reset password.');
      setSuccess('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md">
        <div className="text-5xl text-center mb-4"></div>
        <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">{resetMode ? 'Reset Password' : 'Welcome Back'}</h2>
        {error && <p className="text-red-500 bg-red-50 rounded-xl p-3 mb-4 text-center">{error}</p>}
        {success && <p className="text-green-600 bg-green-50 rounded-xl p-3 mb-4 text-center">{success}</p>}

        {resetMode ? (
          <>
            <input className="w-full border rounded-xl px-4 py-3 mb-4 text-gray-700" placeholder="Email" value={resetForm.email} onChange={e => setResetForm({ ...resetForm, email: e.target.value })} />
            <input type="password" className="w-full border rounded-xl px-4 py-3 mb-4 text-gray-700" placeholder="New Password" value={resetForm.new_password} onChange={e => setResetForm({ ...resetForm, new_password: e.target.value })} />
            <input type="password" className="w-full border rounded-xl px-4 py-3 mb-6 text-gray-700" placeholder="Confirm New Password" value={resetForm.confirm_password} onChange={e => setResetForm({ ...resetForm, confirm_password: e.target.value })} />
            <button onClick={handleReset} className="w-full bg-blue-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-blue-700">Update Password</button>
            <p className="text-center text-gray-500 mt-4 cursor-pointer hover:text-blue-600" onClick={() => { setResetMode(false); setError(''); setSuccess(''); }}>Back to login</p>
          </>
        ) : (
          <>
            <input className="w-full border rounded-xl px-4 py-3 mb-4 text-gray-700" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input type="password" className="w-full border rounded-xl px-4 py-3 mb-6 text-gray-700" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-blue-700">Login</button>
            <p className="text-center text-gray-500 mt-4 cursor-pointer hover:text-blue-600" onClick={() => { setResetMode(true); setError(''); setSuccess(''); }}>Forgot password?</p>
            <p className="text-center text-gray-500 mt-2 cursor-pointer hover:text-blue-600" onClick={() => navigate('/register')}>No account? Register</p>
          </>
        )}
      </div>
    </div>
  );
}

// SENIOR DASHBOARD
function SeniorDashboard() {
  const navigate = useNavigate();
  const name = localStorage.getItem('name');
  const userId = localStorage.getItem('user_id');
  const [form, setForm] = useState({ title: '', description: '', location: '', scheduled_time: '' });
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [myChores, setMyChores] = useState([]);
  const [seniorTab, setSeniorTab] = useState('overview');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [uploadMessage, setUploadMessage] = useState('');

  const MAX_PHOTOS = 3;
  const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

  // Camera state
  const videoRef = useRef(null);
  const photoInputRef = useRef(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);

  useEffect(() => {
    axios.get(`${API}/chores/senior/${userId}`).then(res => {
      setMyChores(uniqueById(res.data));
    }).catch(() => {});
  }, [success, userId]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play?.().catch(() => {});
    }
  }, [cameraStream]);

  useEffect(() => () => stopMediaStream(cameraStream), [cameraStream]);

  const removeSelectedPhoto = (indexToRemove) => {
    const updatedPhotos = selectedPhotos.filter((_, index) => index !== indexToRemove);
    setSelectedPhotos(updatedPhotos);
    if (updatedPhotos.length === 0) {
      setImage(null);
      setImageBase64(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }
    const firstPhoto = updatedPhotos[0];
    setImage(firstPhoto.preview);
    setImageBase64(firstPhoto.base64);
  };

  const handlePhotoFiles = async (incomingFiles) => {
    const files = Array.from(incomingFiles || []);
    if (!files.length) return;

    setError('');
    setUploadMessage('');

    const remainingSlots = MAX_PHOTOS - selectedPhotos.length;
    if (remainingSlots <= 0) {
      setUploadMessage(`You can upload up to ${MAX_PHOTOS} photos at a time.`);
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    const invalidFiles = filesToAdd.filter(file => !file.type.startsWith('image/'));
    const oversizedFiles = filesToAdd.filter(file => file.size > MAX_PHOTO_SIZE_BYTES);

    if (invalidFiles.length || oversizedFiles.length) {
      const reasons = [];
      if (invalidFiles.length) reasons.push('Only image files are allowed.');
      if (oversizedFiles.length) reasons.push(`Each photo must be smaller than ${Math.round(MAX_PHOTO_SIZE_BYTES / (1024 * 1024))}MB.`);
      setUploadMessage(reasons.join(' '));
      return;
    }

    const preparedPhotos = await Promise.all(filesToAdd.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve({ file, name: file.name, preview: reader.result, base64 });
      };
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    })));

    const nextPhotos = [...selectedPhotos, ...preparedPhotos].slice(0, MAX_PHOTOS);
    setSelectedPhotos(nextPhotos);

    const firstPhoto = nextPhotos[0];
    if (firstPhoto) {
      setImage(firstPhoto.preview);
      setImageBase64(firstPhoto.base64);
    }

    if (files.length > filesToAdd.length) {
      setUploadMessage(`You can upload up to ${MAX_PHOTOS} photos. Only the first ${filesToAdd.length} were added.`);
    }
  };

  const handleImage = async (e) => {
    await handlePhotoFiles(e.target.files);
    e.target.value = '';
  };

  const handleSeniorPaste = async (e) => {
    const files = pastedImageFiles(e);
    if (files.length) {
      e.preventDefault();
      await handlePhotoFiles(files);
    }
  };

  const startCamera = async () => {
    try {
      stopMediaStream(cameraStream);
      const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
      setCameraStream(stream);
      setCameraStarted(true);
      setCameraError(null);
    } catch (err) {
      setCameraError('Could not access the camera. Use the photo picker, paste an image, or allow camera permissions on HTTPS/localhost.');
      console.error('Camera access error:', err);
    }
  };

  const stopCamera = () => {
    stopMediaStream(cameraStream);
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStream(null);
    setCameraStarted(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !videoRef.current.videoWidth) {
      setCameraError('Camera is still warming up. Wait a second and try again.');
      return;
    }

    try {
      setIsProcessing(true);
      setCameraError(null);

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      // Fixed: Isolate data structure payload to a pure string format
      const base64String = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

      const response = await fetch(`${API}/chores/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64String,
          description: 'Photo taken from webcam for chore analysis'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      setAiResult(result);
      setImageBase64(base64String);
      setImage(dataUrl);
      const file = dataUrlToFile(dataUrl, `camera-chore-${Date.now()}.jpg`);
      setSelectedPhotos([{ file, name: file.name, preview: dataUrl, base64: base64String }]);

    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Unknown error during analysis');
      console.error('Analysis error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64) { setError('Please upload an image first.'); return; }
    setAiLoading(true);
    setError('');
    try {
      const result = await analyzeChoreImage(imageBase64, form.description || form.title);
      setAiResult(result);
    } catch (e) {
      setError('AI analysis failed. Check your NVIDIA API key in .env');
    }
    setAiLoading(false);
  };

  const handlePost = async () => {
    if (!form.title || !form.description || !form.location) { setError('All fields required.'); return; }
    try {
      const formData = new FormData();
      formData.append('senior_id', userId);
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('location', form.location);
      formData.append('scheduled_time', form.scheduled_time);
      formData.append('ai_tools', aiResult ? JSON.stringify(aiResult.ai_tools) : '');
      formData.append('ai_steps', aiResult ? JSON.stringify(aiResult.ai_steps) : '');
      formData.append('ai_skills_needed', aiResult ? JSON.stringify(aiResult.ai_skills_needed) : '');
      formData.append('ai_difficulty', aiResult?.ai_difficulty || '');
      formData.append('ai_estimated_time', aiResult?.ai_estimated_time || '');
      formData.append('ai_safety_notes', aiResult?.ai_safety_notes || '');
      selectedPhotos.forEach(photo => {
        formData.append('images', photo.file, photo.name);
      });
      await axios.post(`${API}/chores/post`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Chore posted successfully! ');
      setError('');
      setForm({ title: '', description: '', location: '', scheduled_time: '' });
      setImage(null);
      setImageBase64(null);
      setSelectedPhotos([]);
      setUploadMessage('');
      setAiResult(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (cameraStarted) stopCamera();
    } catch (e) {
      setError('Failed to post chore. ' + (e.response?.data?.detail || ''));
    }
  };

  const handleReviewCompletion = async (choreId, approved) => {
    try {
      const formData = new FormData();
      formData.append('review_text', approved ? 'Looks good, thank you!' : 'Please fix and resubmit proof.');
      formData.append('review_rating', approved ? '5' : '1');
      await axios.post(`${API}/chores/${choreId}/review`, formData, {
        params: { senior_id: parseInt(userId, 10), approved },
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(approved ? 'Completion approved and points awarded.' : 'Completion rejected.');
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not review completion.');
    }
  };

  const statusColor = {
    open: 'bg-green-100 text-green-700',
    claimed: 'bg-yellow-100 text-yellow-700',
    pending_review: 'bg-blue-100 text-blue-700',
    done: 'bg-purple-100 text-purple-700',
    rejected: 'bg-red-100 text-red-700'
  };
  const reviewRequests = myChores.filter(chore => chore.status === 'pending_review');
  const claimedCount = myChores.filter(chore => chore.status === 'claimed').length;
  const approvedCount = myChores.filter(chore => chore.status === 'done').length;

  return (
    <div className="min-h-screen bg-green-50">
      <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center shadow">
        <div>
          <h1 className="text-2xl font-bold"> ChoreMap</h1>
          <p className="text-green-100 text-sm">Welcome, {name}! </p>
        </div>
        <button onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-green-700 px-4 py-2 rounded-xl text-sm">Logout</button>
      </div>
      <div className="max-w-lg mx-auto p-6">
        <h2 className="text-2xl font-bold text-green-700 mb-4">Post a Chore</h2>
        {success && <p className="text-green-600 bg-green-100 rounded-xl p-3 mb-4">{success}</p>}
        {error && <p className="text-red-500 bg-red-50 rounded-xl p-3 mb-4">{error}</p>}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <input className="w-full border rounded-xl px-4 py-3 mb-4 text-gray-700" placeholder="Chore Title (e.g. Fix leaky faucet)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <textarea className="w-full border rounded-xl px-4 py-3 mb-4 text-gray-700 h-28" placeholder="Describe what needs to be done..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input className="w-full border rounded-xl px-4 py-3 mb-4 text-gray-700" placeholder="Location (e.g. 123 Main St)" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          <input type="datetime-local" className="w-full border rounded-xl px-4 py-3 mb-4 text-gray-700" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })} />

          {/* Image Upload or Camera */}
          <div className="mb-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4" onPaste={handleSeniorPaste}>
            <label className="block text-gray-700 font-semibold mb-2">Add chore photos</label>
            <p className="text-sm text-gray-500 mb-3">Upload, paste, or take photos from a phone or tablet. Up to {MAX_PHOTOS} images, {Math.round(MAX_PHOTO_SIZE_BYTES / (1024 * 1024))}MB each.</p>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" multiple onChange={handleImage} className="w-full text-gray-500 mb-2 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:font-semibold file:text-white" />
            {uploadMessage && <p className="text-sm text-amber-600 mb-2">{uploadMessage}</p>}
            {selectedPhotos.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {selectedPhotos.map((photo, index) => (
                  <div key={`${photo.name}-${index}`} className="relative">
                    <img src={photo.preview} alt={`chore-${index + 1}`} className="rounded-xl w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSelectedPhoto(index)}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                      aria-label={`Remove ${photo.name}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
            {image && selectedPhotos.length === 0 && <img src={image} alt="chore" className="mt-3 rounded-xl w-full max-h-48 object-cover" />}
          </div>

          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-gray-700 font-semibold mb-2">Use live camera</label>
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full rounded-xl bg-black object-cover ${cameraStarted && !isProcessing ? 'block aspect-video' : 'hidden'}`}
              />
              {!cameraStarted && !isProcessing && (
                <div className="rounded-xl bg-white p-4 text-center text-sm text-gray-500 ring-1 ring-slate-200">
                  Camera is off. You can also paste or upload a photo above.
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  onClick={startCamera}
                  disabled={cameraStarted || isProcessing}
                  className="rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Start Camera'}
                </button>
                <button
                  onClick={stopCamera}
                  disabled={!cameraStarted || isProcessing}
                  className="rounded-xl bg-slate-700 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  Stop Camera
                </button>
                <button
                  onClick={capturePhoto}
                  disabled={!cameraStarted || isProcessing}
                  className="rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {isProcessing ? 'Capturing...' : 'Capture & Analyze'}
                </button>
              </div>
            </div>

            {cameraError && (
              <p className="text-red-500 text-center mt-2">{cameraError}</p>
            )}

            {/* Image Preview */}
            {image && !aiResult && !isProcessing && (
              <div className="mt-4 text-center">
                <img src={image} alt="captured" className="rounded-xl w-full max-h-48 object-cover" />
                <p className="text-sm text-gray-600 mt-2">Photo captured! Click "Capture & Analyze" to analyze with AI.</p>
              </div>
            )}

            {/* AI Analyze Button */}
            {imageBase64 && !aiResult && (
              <button onClick={handleAnalyze} disabled={aiLoading} className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 mb-4">
                {aiLoading ? ' Analyzing with AI...' : ' Analyze with NVIDIA AI'}
              </button>
            )}

            {/* AI Result */}
            {aiResult && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                <h3 className="font-bold text-purple-700 mb-2"> AI Analysis</h3>
                <p className="text-sm text-gray-600 mb-1"><span className="font-semibold"> Tools:</span> {aiResult.ai_tools?.join(', ')}</p>
                <p className="text-sm text-gray-600 mb-1"><span className="font-semibold"> Time:</span> {aiResult.ai_estimated_time}</p>
                <p className="text-sm text-gray-600 mb-1"><span className="font-semibold"> Difficulty:</span> {aiResult.ai_difficulty}</p>
                <p className="text-sm text-gray-600 mb-1"><span className="font-semibold"> Safety:</span> {aiResult.ai_safety_notes}</p>
                <div className="mt-2">
                  <p className="text-sm font-semibold text-gray-600 mb-1"> Steps:</p>
                  {aiResult.ai_steps?.map((step, i) => <p key={i} className="text-sm text-gray-500 ml-2">- {step}</p>)}
                </div>
              </div>
            )}

            <button onClick={handlePost} className="w-full bg-green-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-green-700">Post Chore </button>
          </div>

          <h2 className="text-xl font-bold text-green-700 mb-4">My Posted Chores</h2>
          {myChores.length === 0 && <p className="text-gray-400 text-center">No chores posted yet.</p>}
          {myChores.map(chore => (
            <div key={chore.id} className="bg-white rounded-2xl shadow p-5 mb-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-800">{chore.title}</h3>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColor[chore.status] || 'bg-gray-100 text-gray-600'}`}>{chore.status}</span>
              </div>
              <p className="text-gray-500 text-sm mb-1">{chore.description}</p>
              <p className="text-gray-400 text-sm"> {chore.location}</p>
              {chore.scheduled_time && <p className="text-xs text-blue-500 mt-1">Time: {chore.scheduled_time}</p>}
              {chore.volunteer_name && <p className="text-xs text-gray-500 mt-2">Claimed by: {chore.volunteer_name}</p>}
              {chore.status === 'pending_review' && (
                <div className="mt-3 bg-blue-50 rounded-xl p-3">
                  <p className="text-sm font-semibold text-blue-700 mb-1">Completion proof ready for review</p>
                  {chore.completion_note && <p className="text-sm text-gray-600 mb-1">{chore.completion_note}</p>}
                  {chore.completion_proof && (
                    chore.completion_proof.match(/\.(jpg|jpeg|png|webp|gif)$/i)
                      ? <img src={`${API}/${chore.completion_proof.replace(/\\/g, '/')}`} alt="completion proof" className="rounded-xl w-full max-h-48 object-cover mb-2" />
                      : <p className="text-xs text-gray-500 mb-2">Proof: {chore.completion_proof}</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => handleReviewCompletion(chore.id, true)} className="flex-1 bg-green-600 text-white py-2 rounded-xl font-semibold hover:bg-green-700">Approve</button>
                    <button onClick={() => handleReviewCompletion(chore.id, false)} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-semibold hover:bg-red-700">Reject</button>
                  </div>
                </div>
              )}
              {chore.status === 'rejected' && chore.review_text && <p className="text-xs text-red-500 mt-2">Review: {chore.review_text}</p>}
              {chore.ai_difficulty && <p className="text-xs text-purple-500 mt-1"> {chore.ai_difficulty} - {chore.ai_estimated_time}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// VOLUNTEER DASHBOARD
function VolunteerDashboard() {
  const navigate = useNavigate();
  const name = localStorage.getItem('name');
  const userId = localStorage.getItem('user_id');
  const [chores, setChores] = useState([]);
  const [claimedChores, setClaimedChores] = useState([]);
  const [points, setPoints] = useState(0);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('chores');
  const [expanded, setExpanded] = useState(null);
  const [completionDrafts, setCompletionDrafts] = useState({});
  const volunteerVideoRef = useRef(null);
  const [volunteerCameraStarted, setVolunteerCameraStarted] = useState(false);
  const [volunteerCameraError, setVolunteerCameraError] = useState('');
  const [volunteerCameraStream, setVolunteerCameraStream] = useState(null);
  const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024;

  useEffect(() => {
    axios.get(`${API}/chores/all`).then(res => setChores(res.data.filter(c => c.status === 'open'))).catch(() => {});
    axios.get(`${API}/chores/volunteer/${userId}`).then(res => setClaimedChores(res.data)).catch(() => {});
    axios.get(`${API}/users/${userId}`).then(res => setPoints(res.data.points || 0)).catch(() => {});
  }, [message, userId]);

  useEffect(() => {
    if (volunteerVideoRef.current && volunteerCameraStream) {
      volunteerVideoRef.current.srcObject = volunteerCameraStream;
      volunteerVideoRef.current.play?.().catch(() => {});
    }
  }, [volunteerCameraStream]);

  useEffect(() => () => stopMediaStream(volunteerCameraStream), [volunteerCameraStream]);

  const setCompletionDraft = (choreId, patch) => {
    setCompletionDrafts(prev => ({
      ...prev,
      [choreId]: { ...(prev[choreId] || {}), ...patch }
    }));
  };

  const handleClaim = async (choreId) => {
    try {
      await axios.post(`${API}/chores/${choreId}/claim`, null, {
        params: { volunteer_id: parseInt(userId, 10) }
      });
      setMessage('Chore claimed! Good luck! ');
      setChores(chores.filter(c => c.id !== choreId));
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Could not claim chore.');
    }
  };

  const handleCompletionProofFile = (choreId, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Completion proof must be an image.');
      return;
    }
    if (file.size > MAX_PROOF_SIZE_BYTES) {
      setMessage('Completion proof photo must be smaller than 5MB.');
      return;
    }
    setCompletionDraft(choreId, { proof: file, preview: URL.createObjectURL(file) });
    setMessage('');
  };

  const handleVolunteerPaste = (choreId, e) => {
    const files = pastedImageFiles(e);
    if (files.length) {
      e.preventDefault();
      handleCompletionProofFile(choreId, files[0]);
    }
  };

  const startVolunteerCamera = async () => {
    try {
      stopMediaStream(volunteerCameraStream);
      const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
      setVolunteerCameraStream(stream);
      setVolunteerCameraStarted(true);
      setVolunteerCameraError('');
    } catch (err) {
      setVolunteerCameraError('Could not access the camera. Use upload/paste, or allow camera permissions on HTTPS/localhost.');
    }
  };

  const stopVolunteerCamera = () => {
    stopMediaStream(volunteerCameraStream);
    if (volunteerVideoRef.current) volunteerVideoRef.current.srcObject = null;
    setVolunteerCameraStream(null);
    setVolunteerCameraStarted(false);
  };

  const captureCompletionProof = (choreId) => {
    if (!volunteerVideoRef.current || !volunteerVideoRef.current.videoWidth) {
      setVolunteerCameraError('Camera is not ready yet. Wait a moment and try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = volunteerVideoRef.current.videoWidth;
    canvas.height = volunteerVideoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(volunteerVideoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const file = dataUrlToFile(dataUrl, `completion-proof-${Date.now()}.jpg`);
    setCompletionDraft(choreId, { proof: file, preview: dataUrl });
    setVolunteerCameraError('');
  };

  const handleSubmitCompletion = async (choreId) => {
    try {
      const draft = completionDrafts[choreId] || {};
      if (!draft.proof) {
        setMessage('Please upload or capture a proof photo before submitting.');
        return;
      }
      const formData = new FormData();
      formData.append('completion_note', draft.note || '');
      formData.append('completion_proof_file', draft.proof, draft.proof.name);
      await axios.post(`${API}/chores/${choreId}/submit-completion`, formData, {
        params: { volunteer_id: parseInt(userId, 10) },
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('Completion submitted. Points stay pending until the senior approves it.');
      setCompletionDrafts(prev => {
        const next = { ...prev };
        delete next[choreId];
        return next;
      });
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Could not submit completion.');
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center shadow">
        <div>
          <h1 className="text-2xl font-bold"> ChoreMap</h1>
          <p className="text-blue-100 text-sm">Welcome, {name}! </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold"> {points} pts</span>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-blue-700 px-4 py-2 rounded-xl text-sm">Logout</button>
        </div>
      </div>

      <div className="flex border-b bg-white">
        {['chores', 'leaderboard', 'rewards'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 font-semibold capitalize ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}>
            {t === 'chores' ? ' Chores' : t === 'leaderboard' ? ' Leaderboard' : ' Rewards'}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto p-6">
        {message && <p className="text-blue-600 bg-blue-100 rounded-xl p-3 mb-4">{message}</p>}

        {tab === 'chores' && (
          <>
            <h2 className="text-2xl font-bold text-blue-700 mb-4">My Claimed Chores</h2>
            {claimedChores.length === 0 && <p className="text-gray-400 text-center mb-6">Claim a chore to submit proof here.</p>}
            {claimedChores.map(chore => {
              const draft = completionDrafts[chore.id] || {};
              return (
              <div key={chore.id} className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-6 mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-800">{chore.title}</h3>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${chore.status === 'done' ? 'bg-emerald-100 text-emerald-700' : chore.status === 'pending_review' ? 'bg-amber-100 text-amber-700' : chore.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{formatStatus(chore.status)}</span>
                </div>
                <p className="text-gray-500 mb-2">{chore.description}</p>
                {chore.scheduled_time && <p className="text-xs text-blue-500 mb-2">Time: {chore.scheduled_time}</p>}
                {(chore.status === 'claimed' || chore.status === 'rejected') ? (
                  <div className="bg-gray-50 rounded-xl p-3" onPaste={(e) => handleVolunteerPaste(chore.id, e)}>
                    {chore.status === 'rejected' && chore.review_text && <p className="text-sm text-red-500 mb-2">Senior feedback: {chore.review_text}</p>}
                    <p className="text-sm font-semibold text-gray-700 mb-2">Submit completion proof</p>
                    <textarea value={draft.note || ''} onChange={e => setCompletionDraft(chore.id, { note: e.target.value })} placeholder="What did you do?" className="w-full border rounded-lg p-2 text-sm mb-2" />
                    <p className="text-xs text-gray-500 mb-2">Upload, paste, or take one image smaller than {Math.round(MAX_PROOF_SIZE_BYTES / (1024 * 1024))}MB.</p>
                    <input type="file" accept="image/*" capture="environment" onChange={e => handleCompletionProofFile(chore.id, e.target.files?.[0])} className="w-full text-gray-500 mb-2 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-2 file:font-semibold file:text-white" />
                    {draft.preview && <img src={draft.preview} alt="completion proof preview" className="rounded-xl w-full max-h-48 object-cover mb-2" />}
                    <div className="bg-white rounded-xl p-3 mb-2 ring-1 ring-slate-200">
                      <video ref={volunteerVideoRef} autoPlay playsInline muted className={`w-full rounded-lg bg-black mb-2 object-cover ${volunteerCameraStarted ? 'block aspect-video' : 'hidden'}`} />
                      {volunteerCameraError && <p className="text-sm text-red-500 mb-2">{volunteerCameraError}</p>}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button onClick={startVolunteerCamera} disabled={volunteerCameraStarted} className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-semibold disabled:opacity-50">Start Camera</button>
                        <button onClick={() => captureCompletionProof(chore.id)} disabled={!volunteerCameraStarted} className="flex-1 bg-green-600 text-white py-2 rounded-xl font-semibold disabled:opacity-50">Capture</button>
                        <button onClick={stopVolunteerCamera} disabled={!volunteerCameraStarted} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-semibold disabled:opacity-50">Stop</button>
                      </div>
                    </div>
                    <button onClick={() => handleSubmitCompletion(chore.id)} className="w-full bg-green-600 text-white py-2 rounded-xl font-semibold hover:bg-green-700">Submit for Review</button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{chore.status === 'done' ? 'Approved by the senior. Points have been awarded.' : 'Waiting for senior review before points are awarded.'}</p>
                )}
              </div>
              );
            })}

            <h2 className="text-2xl font-bold text-blue-700 mb-4">Available Chores</h2>
            {chores.length === 0 && <p className="text-gray-400 text-center mt-10">No chores available right now.</p>}
            {chores.map(chore => (
              <div key={chore.id} className="bg-white rounded-2xl shadow p-6 mb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-1">{chore.title}</h3>
                <p className="text-gray-500 mb-2">{chore.description}</p>
                <p className="text-sm text-gray-400 mb-2"> {chore.location}</p>
                {chore.ai_difficulty && (
                  <div className="mb-3">
                    <p className="text-xs text-purple-600 font-semibold"> AI Analysis</p>
                    <p className="text-xs text-gray-500"> {chore.ai_difficulty} -  {chore.ai_estimated_time}</p>
                    {chore.ai_safety_notes && <p className="text-xs text-red-400"> {chore.ai_safety_notes}</p>}
                    <button onClick={() => setExpanded(expanded === chore.id ? null : chore.id)} className="text-xs text-purple-500 mt-1 underline">
                      {expanded === chore.id ? 'Hide steps' : 'Show steps'}
                    </button>
                    {expanded === chore.id && (
                      <div className="mt-2">
                        {parseJsonList(chore.ai_steps).map((step, i) => (
                          <p key={i} className="text-xs text-gray-500 ml-2">- {step}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-3 space-y-2">
                  <button onClick={() => handleClaim(chore.id)} className="w-full bg-blue-600 text-white py-2 rounded-xl font-semibold hover:bg-blue-700">Claim Chore </button>
                </div>
              </div>
            ))}
          </>
        )}
        {tab === 'leaderboard' && <LeaderboardTab />}
        {tab === 'rewards' && <RewardsTab points={points} onPointsChange={setPoints} userId={userId} />}
      </div>
    </div>
  );
}

// LEADERBOARD TAB
function LeaderboardTab() {
  const [leaders, setLeaders] = useState([]);
  useEffect(() => {
    axios.get(`${API}/volunteers/leaderboard`).then(res => setLeaders(res.data)).catch(() => {});
  }, []);
  const medals = ['', '', ''];
  return (
    <>
      <h2 className="text-2xl font-bold text-blue-700 mb-4"> Leaderboard</h2>
      {leaders.length === 0 && <p className="text-gray-400 text-center mt-10">No volunteers yet.</p>}
      {leaders.map((v, i) => (
        <div key={i} className="bg-white rounded-2xl shadow p-5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-3xl">{medals[i] || `#${i + 1}`}</span>
            <div>
              <p className="font-bold text-gray-800">{v.name}</p>
              <p className="text-sm text-gray-400">{v.chores_completed || 0} chores completed</p>
            </div>
          </div>
          <p className="text-yellow-500 font-bold text-lg"> {v.points || 0}</p>
        </div>
      ))}
    </>
  );
}

// REWARDS TAB
function RewardsTab({ points, onPointsChange, userId }) {
  const [rewards, setRewards] = useState([]);
  const [redeemingId, setRedeemingId] = useState(null);
  const [redemption, setRedemption] = useState(null);
  const [redeemError, setRedeemError] = useState('');

  useEffect(() => {
    axios.get(`${API}/rewards`).then(res => setRewards(res.data)).catch(() => {});
  }, []);

  const handleRedeem = async (reward) => {
    if (points < reward.points_needed) {
      setRedeemError(`You need ${reward.points_needed - points} more points for ${reward.title}.`);
      setRedemption(null);
      return;
    }

    const confirmed = window.confirm(`Redeem ${reward.points_needed} points for ${reward.title}?`);
    if (!confirmed) return;

    try {
      setRedeemingId(reward.id);
      setRedeemError('');
      const res = await axios.post(`${API}/rewards/${reward.id}/redeem`, null, {
        params: { volunteer_id: parseInt(userId, 10) }
      });
      setRedemption(res.data);
      onPointsChange(res.data.remaining_points);
    } catch (e) {
      setRedeemError(e.response?.data?.detail || 'Could not redeem this reward.');
      setRedemption(null);
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-blue-700 mb-1"> Rewards</h2>
      <p className="text-gray-500 mb-4">You have <span className="font-bold text-yellow-500"> {points} points</span></p>
      {redeemError && <p className="text-red-600 bg-red-50 rounded-xl p-3 mb-4">{redeemError}</p>}
      {redemption && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="font-bold text-green-800">Redeemed: {redemption.reward_title}</p>
          <p className="text-sm text-green-700 mt-1">Code: <span className="font-bold tracking-wide">{redemption.redemption_code}</span></p>
          <p className="text-sm text-green-700 mt-1">{redemption.instructions}</p>
          <p className="text-xs text-green-700 mt-2">Businesses can verify this code at /verify-reward.</p>
        </div>
      )}
      {rewards.map((r, i) => (
        <div key={i} className={`bg-white rounded-2xl shadow p-5 mb-4 border-2 ${points >= r.points_needed ? 'border-green-400' : 'border-gray-100'}`}>
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-gray-800">{r.title}</h3>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${points >= r.points_needed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}> {r.points_needed} pts</span>
          </div>
          <p className="text-sm text-gray-500 mb-1">{r.description}</p>
          <p className="text-xs text-gray-400"> {r.business_name}</p>
          <button
            onClick={() => handleRedeem(r)}
            disabled={points < r.points_needed || redeemingId === r.id}
            className="mt-3 w-full bg-green-600 text-white py-2 rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500"
          >
            {redeemingId === r.id ? 'Redeeming...' : points >= r.points_needed ? 'Redeem' : `${r.points_needed - points} pts more needed`}
          </button>
        </div>
      ))}
    </>
  );
}

function VerifyReward() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedCode = code.trim().toUpperCase();

  const handleVerify = async () => {
    if (!normalizedCode) {
      setMessage('Enter a redemption code.');
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const res = await axios.get(`${API}/rewards/redemptions/${normalizedCode}`);
      setResult(res.data);
    } catch (e) {
      setResult(null);
      setMessage(e.response?.data?.detail || 'Could not verify that code.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkUsed = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/rewards/redemptions/${normalizedCode}/use`);
      setMessage('Code marked as used.');
      const res = await axios.get(`${API}/rewards/redemptions/${normalizedCode}`);
      setResult(res.data);
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Could not mark this code as used.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-xl">
        <button onClick={() => navigate('/')} className="mb-6 text-sm font-semibold text-blue-700">Back to ChoreMap</button>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-950">Verify Reward Code</h1>
          <p className="mt-2 text-sm text-slate-500">For partner businesses: enter the code shown by the volunteer before giving the reward.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="CHORE-ABC123"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-semibold uppercase tracking-wide"
            />
            <button onClick={handleVerify} disabled={loading} className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">
              {loading ? 'Checking...' : 'Verify'}
            </button>
          </div>
          {message && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-700">{message}</p>}
          {result && (
            <div className={`mt-5 rounded-xl border p-4 ${result.status === 'active' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">{result.reward_title}</p>
                  <p className="text-sm text-slate-600">{result.business_name}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${result.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{result.status}</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">Volunteer: <span className="font-semibold">{result.volunteer_name}</span></p>
              <p className="text-sm text-slate-600">Points spent: <span className="font-semibold">{result.points_spent}</span></p>
              {result.redeemed_at && <p className="text-sm text-slate-600">Used at: {result.redeemed_at}</p>}
              {result.status === 'active' && (
                <button onClick={handleMarkUsed} disabled={loading} className="mt-4 w-full rounded-xl bg-green-700 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50">
                  Mark Code Used
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// APP ROUTES
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/senior" element={<SeniorDashboard />} />
        <Route path="/volunteer" element={<VolunteerDashboard />} />
        <Route path="/camera-test" element={<SimplePhotoCapture />} />
        <Route path="/verify-reward" element={<VerifyReward />} />
      </Routes>
    </Router>
  );
}

export default App;

