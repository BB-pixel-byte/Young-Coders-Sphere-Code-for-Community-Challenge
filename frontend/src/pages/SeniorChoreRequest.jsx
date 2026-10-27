import { useState } from 'react'
import './SeniorChoreRequest.css'

const CATEGORIES = [
  { id: 'repair', label: 'Home repair', icon: '🔧' },
  { id: 'yard', label: 'Yard work', icon: '🌿' },
  { id: 'clean', label: 'Cleaning', icon: '✨' },
  { id: 'tech', label: 'Tech help', icon: '📱' },
  { id: 'other', label: 'Something else', icon: '💬' },
]

const URGENCY = [
  { id: 'flexible', label: 'Flexible', sub: 'Within 2 weeks' },
  { id: 'soon', label: 'This week', sub: 'Within 7 days' },
  { id: 'urgent', label: 'Urgent', sub: 'Within 48 hours' },
]

const STEPS = ['Scan area', 'Add details', 'Review']

export default function SeniorChoreRequest() {
  const [activeStep] = useState(0)
  const [category, setCategory] = useState('repair')
  const [urgency, setUrgency] = useState('flexible')
  const [scanning, setScanning] = useState(false)

  return (
    <div className="chore-request">
      <header className="page-header">
        <p className="greeting">Good morning, Margaret</p>
        <h1>Share a community opportunity</h1>
        <p>Describe the place and contribution you have in mind; the coordinator will keep the opportunity clear and suitable for interested women contributors.</p>
      </header>

      <div className="step-track" aria-hidden="true">
        {STEPS.map((step, i) => (
          <div key={step} className={`step-item ${i <= activeStep ? 'done' : ''} ${i === activeStep ? 'current' : ''}`}>
            <div className="step-dot">{i < activeStep ? '✓' : i + 1}</div>
            <span>{step}</span>
          </div>
        ))}
      </div>

      <section className="scan-section" aria-label="Video scan preview">
        <div className={`scan-viewfinder ${scanning ? 'scanning' : ''}`}>
          <div className="scan-grid" />
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />

          <div className="scan-center">
            <div className="scan-pulse" />
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
              <path d="M24 16v16M16 24h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p>Tap to start video scan</p>
            <span className="scan-hint">Slowly pan across the area — like showing a friend</span>
          </div>

          {scanning && <div className="scan-line" />}
        </div>

        <div className="scan-actions">
          <button
            type="button"
            className="scan-btn primary"
            onClick={() => setScanning((s) => !s)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M5 12a7 7 0 0114 0" strokeLinecap="round" />
            </svg>
            {scanning ? 'Stop scan' : 'Start scan'}
          </button>
          <button type="button" className="scan-btn secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Add photos
          </button>
        </div>
      </section>

      <div className="ai-preview-card">
        <div className="ai-preview-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2a4 4 0 014 4v1a3 3 0 013 3v2a3 3 0 01-3 3h-8a3 3 0 01-3-3V10a3 3 0 013-3V6a4 4 0 014-4z" />
            <path d="M8 14v2a4 4 0 008 0v-2" strokeLinecap="round" />
            <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <div>
          <strong>Spatial AI preview</strong>
          <p>Your scan becomes a visual guide with context, safety notes and clear steps for contributors.</p>
        </div>
      </div>

      <section className="form-section">
        <div className="field-group">
          <label className="section-label" htmlFor="chore-title">What contribution would be useful?</label>
          <input
            id="chore-title"
            className="input-field"
            type="text"
            placeholder="e.g. Kitchen faucet dripping"
            defaultValue=""
          />
        </div>

        <div className="field-group">
          <label className="section-label" htmlFor="chore-desc">What skills or context should contributors know?</label>
          <textarea
            id="chore-desc"
            className="input-field"
            placeholder="Water pools under the sink. I tried tightening it myself."
            defaultValue=""
          />
        </div>

        <div className="field-group">
          <span className="section-label">Category</span>
          <div className="chip-row">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`chip ${category === cat.id ? 'selected' : ''}`}
                onClick={() => setCategory(cat.id)}
              >
                <span className="chip-emoji">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-group">
          <span className="section-label">When do you need help?</span>
          <div className="urgency-row">
            {URGENCY.map((u) => (
              <button
                key={u.id}
                type="button"
                className={`urgency-card ${urgency === u.id ? 'selected' : ''}`}
                onClick={() => setUrgency(u.id)}
              >
                <span className="urgency-label">{u.label}</span>
                <span className="urgency-sub">{u.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="media-thumbs" aria-label="Captured media">
          <div className="thumb empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="thumb empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 12h14M12 5v14" strokeLinecap="round" />
            </svg>
          </div>
          <div className="thumb placeholder">
            <span>Scan</span>
          </div>
        </div>
      </section>

      <footer className="submit-footer">
        <button type="button" className="btn-primary">
          Submit request
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className="submit-note">Women contributors can review the opportunity and choose whether it fits their skills and availability.</p>
      </footer>
    </div>
  )
}
