import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' });
const ANALYTICS_TOKEN_KEY = 'c4m_analytics_token';
const VISITOR_KEY = 'c4m_visitor_id';
const VISIT_SESSION_KEY = 'c4m_visit_session';
const SESSION_TIMEOUT = 30 * 60 * 1000;

const createAnonymousId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replaceAll('-', '');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
};

const analyticsIdentity = () => {
  const now = Date.now();
  let visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = createAnonymousId();
    localStorage.setItem(VISITOR_KEY, visitorId);
  }

  let visitSession;
  try { visitSession = JSON.parse(localStorage.getItem(VISIT_SESSION_KEY)); } catch { visitSession = null; }
  if (!visitSession?.id || now - visitSession.lastActive > SESSION_TIMEOUT) {
    visitSession = { id: createAnonymousId(), lastActive: now };
  } else {
    visitSession.lastActive = now;
  }
  localStorage.setItem(VISIT_SESSION_KEY, JSON.stringify(visitSession));
  return { visitorId, sessionId: visitSession.id };
};

const getSession = () => ({
  id: localStorage.getItem('user_id'),
  name: localStorage.getItem('name'),
  role: localStorage.getItem('role'),
});

const saveSession = ({ user_id, name, role }) => {
  localStorage.setItem('user_id', user_id);
  localStorage.setItem('name', name);
  localStorage.setItem('role', role);
};

const clearUserSession = () => {
  localStorage.removeItem('user_id');
  localStorage.removeItem('name');
  localStorage.removeItem('role');
};

const messageFrom = (error, fallback) =>
  error?.response?.data?.detail || error?.response?.data?.error || fallback;

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/analytics')) return;
    try {
      const { visitorId, sessionId } = analyticsIdentity();
      let referrerHost = '';
      if (document.referrer) {
        const referrer = new URL(document.referrer);
        if (referrer.hostname !== window.location.hostname) referrerHost = referrer.hostname;
      }
      api.post('/analytics/visit', {
        visitor_id: visitorId,
        session_id: sessionId,
        path: location.pathname,
        referrer_host: referrerHost,
      }).catch(() => {});
    } catch {
      // Analytics must never stop someone from using the app.
    }
  }, [location.pathname]);

  return null;
}

function Brand({ light = false }) {
  return (
    <Link className={`brand ${light ? 'brand--light' : ''}`} to="/" aria-label="Chore4More home">
      <span className="brand-mark" aria-hidden="true">C4</span>
      <span>Chore4More</span>
    </Link>
  );
}

function PublicHeader() {
  return (
    <header className="public-header">
      <Brand />
      <nav aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <Link className="text-link" to="/login">Sign in</Link>
        <Link className="small-button" to="/register">Create account</Link>
      </nav>
    </header>
  );
}

function Home() {
  return (
    <div className="site-page">
      <PublicHeader />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="project-label">A student-built community project</p>
            <h1>Ask for a hand.<br />Offer one nearby.</h1>
            <p className="hero-text">
              Chore4More connects older adults who need help with everyday household
              tasks to volunteers in their community.
            </p>
            <div className="hero-actions">
              <Link className="primary-button" to="/register">Get started</Link>
              <a className="secondary-button" href="#how-it-works">See how it works</a>
            </div>
            <p className="prototype-note">Competition prototype · Young Coders&apos; Sphere</p>
          </div>

          <div className="demo-panel" aria-label="Example chore request">
            <div className="demo-topbar">
              <span className="demo-logo">C4</span>
              <span>Request preview</span>
              <span className="status status--open">Open</span>
            </div>
            <div className="demo-image" role="img" aria-label="Simple illustration of watering a houseplant">
              <span className="sun" />
              <span className="plant-pot" />
              <span className="leaf leaf-one" />
              <span className="leaf leaf-two" />
              <span className="leaf leaf-three" />
              <span className="watering-can">●</span>
            </div>
            <div className="demo-content">
              <div>
                <p className="demo-kicker">Garden · Flexible</p>
                <h2>Water balcony plants</h2>
              </div>
              <span className="time-chip">About 30 min</span>
              <p>I need a little help watering the larger pots and moving one planter.</p>
              <div className="demo-meta">
                <span>📍 Nearby</span>
                <span>🧤 Gloves suggested</span>
              </div>
            </div>
          </div>
        </section>

        <section className="steps-section" id="how-it-works">
          <div className="section-heading">
            <p className="project-label">How it works</p>
            <h2>One clear path for each person.</h2>
          </div>
          <div className="steps-grid">
            <article>
              <span className="step-number">1</span>
              <h3>Describe the chore</h3>
              <p>A senior adds the task, location and an optional photo. Image analysis can suggest tools, steps and safety notes.</p>
            </article>
            <article>
              <span className="step-number">2</span>
              <h3>A volunteer claims it</h3>
              <p>Nearby volunteers can review open requests and choose a chore that suits their time and skills.</p>
            </article>
            <article>
              <span className="step-number">3</span>
              <h3>The task gets done</h3>
              <p>Both sides can track the request from open to claimed to complete, while volunteers earn points.</p>
            </article>
          </div>
        </section>

        <section className="project-strip">
          <div>
            <p className="project-label">About this build</p>
            <h2>Created by a four-person team who met through Discord.</h2>
          </div>
          <p>
            The original prototype was developed for the Young Coders&apos; Sphere competition.
            This version includes later reliability and interface refinements for demonstration.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'senior' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.email || !form.password || (!isLogin && !form.name)) {
      setError('Please complete every field.');
      return;
    }
    setBusy(true);
    try {
      if (isLogin) {
        const { data } = await api.post('/users/login', {
          email: form.email.trim(), password: form.password,
        });
        saveSession(data);
        navigate(data.role === 'senior' ? '/senior' : '/volunteer');
      } else {
        const payload = { ...form, email: form.email.trim() };
        const { data } = await api.post('/users/register', payload);
        if (data.error) throw new Error(data.error);
        saveSession({ user_id: data.user_id, name: form.name, role: form.role });
        navigate(form.role === 'senior' ? '/senior' : '/volunteer');
      }
    } catch (err) {
      setError(err.message === 'Email already registered' ? err.message : messageFrom(err, isLogin ? 'Sign-in failed.' : 'Registration failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <Link className="back-home" to="/">← Back to home</Link>
      <section className="auth-card">
        <Brand />
        <div className="auth-heading">
          <p className="project-label">{isLogin ? 'Welcome back' : 'Create an account'}</p>
          <h1>{isLogin ? 'Sign in to continue.' : 'How will you use Chore4More?'}</h1>
          <p>{isLogin ? 'Enter the details you used when registering.' : 'Choose a role now—you will see the matching dashboard.'}</p>
        </div>

        <form onSubmit={submit}>
          {!isLogin && (
            <div className="role-selector" aria-label="Choose your role">
              <button type="button" className={form.role === 'senior' ? 'selected' : ''} onClick={() => setForm({ ...form, role: 'senior' })}>
                <strong>I need help</strong><span>Senior</span>
              </button>
              <button type="button" className={form.role === 'volunteer' ? 'selected' : ''} onClick={() => setForm({ ...form, role: 'volunteer' })}>
                <strong>I want to help</strong><span>Volunteer</span>
              </button>
            </div>
          )}
          {!isLogin && <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} placeholder="Your name" />}
          <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} placeholder="you@example.com" />
          <Field label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} placeholder="Enter a password" />
          {error && <p className="form-message form-message--error" role="alert">{error}</p>}
          <button className="primary-button form-submit" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="auth-switch">
          {isLogin ? 'New to Chore4More?' : 'Already registered?'}{' '}
          <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Sign in'}</Link>
        </p>
      </section>
    </main>
  );
}

function AnalyticsPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem(ANALYTICS_TOKEN_KEY) || '');
  const [password, setPassword] = useState('');
  const [days, setDays] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const response = await api.get(`/analytics/summary?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        sessionStorage.removeItem(ANALYTICS_TOKEN_KEY);
        setToken('');
        setData(null);
      }
      setError(messageFrom(err, 'Could not load analytics.'));
    } finally { setBusy(false); }
  }, [days, token]);

  useEffect(() => { load(); }, [load]);

  const unlock = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await api.post('/analytics/login', { password });
      sessionStorage.setItem(ANALYTICS_TOKEN_KEY, response.data.token);
      setToken(response.data.token);
      setPassword('');
    } catch (err) {
      setError(messageFrom(err, 'Could not unlock analytics.'));
    } finally { setBusy(false); }
  };

  const lock = () => {
    sessionStorage.removeItem(ANALYTICS_TOKEN_KEY);
    setToken('');
    setData(null);
  };

  const downloadSnapshot = async () => {
    setError('');
    try {
      const response = await api.get(`/analytics/export.csv?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = days ? `chore4more-analytics-${days}-days.csv` : 'chore4more-analytics-all-time.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(messageFrom(err, 'Could not download the snapshot.')); }
  };

  if (!token) {
    return (
      <main className="analytics-lock-page">
        <Link className="back-home" to="/">← Back to Chore4More</Link>
        <section className="analytics-lock-card">
          <Brand />
          <p className="project-label">Private owner view</p>
          <h1>Pilot analytics</h1>
          <p>Enter the analytics password to view anonymized traffic and activity.</p>
          <form onSubmit={unlock}>
            <Field label="Analytics password" type="password" value={password} onChange={setPassword} placeholder="Enter your private password" />
            {error && <p className="form-message form-message--error" role="alert">{error}</p>}
            <button className="primary-button form-submit" disabled={busy}>{busy ? 'Checking…' : 'Unlock dashboard'}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <Brand light />
        <div className="analytics-title">
          <p>Private owner view</p>
          <h1>Chore4More pilot analytics</h1>
          <span>Anonymized evidence of reach, activation and real chore activity.</span>
        </div>
        <button className="logout-button" onClick={lock}>Lock dashboard</button>
      </header>

      <main className="analytics-main">
        <section className="analytics-toolbar" aria-label="Analytics controls">
          <div className="period-selector">
            {[{ label: 'All time', value: 0 }, { label: '30 days', value: 30 }, { label: '7 days', value: 7 }].map((period) => (
              <button key={period.value} className={days === period.value ? 'selected' : ''} onClick={() => setDays(period.value)}>{period.label}</button>
            ))}
          </div>
          <div className="analytics-actions">
            <span>{busy ? 'Refreshing…' : `Updated ${formatTimestamp(data?.last_updated)}`}</span>
            <button onClick={load}>Refresh</button>
            <button onClick={downloadSnapshot}>Download CSV</button>
          </div>
        </section>

        {error && <p className="form-message form-message--error analytics-error" role="alert">{error}</p>}
        {!data ? <section className="analytics-loading">Loading pilot evidence…</section> : (
          <>
            <section className="analytics-metrics" aria-label="Key pilot metrics">
              <MetricCard label="Unique visitors" value={data.traffic.unique_visitors} detail="Anonymous browsers" tone="blue" />
              <MetricCard label="Registered accounts" value={data.users.registered} detail={`${data.users.seniors} seniors · ${data.users.volunteers} volunteers`} tone="navy" />
              <MetricCard label="Activated accounts" value={data.users.activated} detail="Posted or claimed a chore" tone="green" />
              <MetricCard label="Completed chores" value={data.chores.completed} detail={`${data.rates.chore_completion}% of requests`} tone="orange" />
              <MetricCard label="Returning visitors" value={data.traffic.returning_visitors} detail="Two or more sessions" tone="purple" />
              <MetricCard label="Page views" value={data.traffic.page_views} detail={`${data.traffic.sessions} total sessions`} tone="slate" />
            </section>

            <section className="analytics-grid">
              <article className="analytics-panel analytics-panel--wide">
                <div className="analytics-panel-heading">
                  <div><p>Last 14 days</p><h2>Audience and registration trend</h2></div>
                  <div className="chart-legend"><span><i className="legend-visitors" />Visitors</span><span><i className="legend-accounts" />Accounts</span></div>
                </div>
                <AnalyticsBarChart points={data.daily} />
              </article>

              <article className="analytics-panel funnel-panel">
                <div className="analytics-panel-heading"><div><p>Pilot funnel</p><h2>From visit to real-world action</h2></div></div>
                <FunnelRow label="Visited the site" value={data.traffic.unique_visitors} max={data.traffic.unique_visitors} />
                <FunnelRow label="Created an account" value={data.users.registered} max={data.traffic.unique_visitors} />
                <FunnelRow label="Posted or claimed" value={data.users.activated} max={data.traffic.unique_visitors} />
                <FunnelRow label="Chores completed" value={data.chores.completed} max={data.traffic.unique_visitors} />
                <div className="rate-row">
                  <div><strong>{data.rates.visitor_to_account}%</strong><span>visitor → account</span></div>
                  <div><strong>{data.rates.account_activation}%</strong><span>account activation</span></div>
                </div>
              </article>

              <article className="analytics-panel">
                <div className="analytics-panel-heading"><div><p>Core workflow</p><h2>Chore activity</h2></div></div>
                <div className="workflow-stats">
                  <div><span>Requests posted</span><strong>{data.chores.posted}</strong></div>
                  <div><span>Requests claimed</span><strong>{data.chores.claimed}</strong></div>
                  <div><span>Requests completed</span><strong>{data.chores.completed}</strong></div>
                </div>
              </article>

              <article className="analytics-panel sources-panel">
                <div className="analytics-panel-heading"><div><p>Discovery</p><h2>How visitors arrived</h2></div></div>
                {data.sources.length ? (
                  <div className="source-list">
                    {data.sources.map((source) => <div key={source.source}><span>{source.source}</span><strong>{source.visitors}</strong></div>)}
                  </div>
                ) : <p className="analytics-empty">Traffic sources will appear after the link is shared.</p>}
              </article>

              <aside className="analytics-privacy">
                <strong>Privacy-conscious measurement</strong>
                <p>This dashboard stores random browser identifiers and aggregate app actions. It does not display visitors&apos; names, email addresses or IP addresses.</p>
                <span>A returning visitor means the same browser started at least two sessions, separated by 30 minutes of inactivity.</span>
              </aside>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({ label, value, detail, tone }) {
  return <article className={`metric-card metric-card--${tone}`}><span>{label}</span><strong>{Number(value || 0).toLocaleString()}</strong><p>{detail}</p></article>;
}

function FunnelRow({ label, value, max }) {
  const width = max ? Math.min(100, Math.max(value ? 5 : 0, value / max * 100)) : 0;
  return (
    <div className="funnel-row">
      <div><span>{label}</span><strong>{value}</strong></div>
      <div className="funnel-track"><span style={{ width: `${width}%` }} /></div>
    </div>
  );
}

function AnalyticsBarChart({ points }) {
  const maximum = Math.max(1, ...points.flatMap((point) => [point.visitors, point.registrations]));
  return (
    <div className="analytics-chart" aria-label="Fourteen-day visitors and registrations chart">
      {points.map((point, index) => (
        <div className="trend-column" key={point.date}>
          <div className="trend-bars">
            <span className="trend-bar trend-bar--visitors" style={{ height: `${point.visitors ? Math.max(5, point.visitors / maximum * 100) : 0}%` }} title={`${point.visitors} visitors`} />
            <span className="trend-bar trend-bar--accounts" style={{ height: `${point.registrations ? Math.max(5, point.registrations / maximum * 100) : 0}%` }} title={`${point.registrations} registrations`} />
          </div>
          <small>{index % 2 === 0 ? formatChartDate(point.date) : ''}</small>
        </div>
      ))}
    </div>
  );
}

function formatChartDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatTimestamp(value) {
  if (!value) return 'when activity begins';
  return new Date(`${value.replace(' ', 'T')}Z`).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function Field({ label, type = 'text', value, onChange, placeholder, required = true }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </label>
  );
}

function DashboardHeader({ eyebrow, title, description }) {
  const navigate = useNavigate();
  const logout = () => {
    clearUserSession();
    navigate('/');
  };
  return (
    <header className="dashboard-header">
      <Brand light />
      <div className="dashboard-intro">
        <p>{eyebrow}</p><h1>{title}</h1><span>{description}</span>
      </div>
      <button className="logout-button" onClick={logout}>Sign out</button>
    </header>
  );
}

function SeniorDashboard() {
  const session = getSession();
  const [form, setForm] = useState({ title: '', description: '', location: '' });
  const [image, setImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [chores, setChores] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState('');

  const loadChores = useCallback(async () => {
    try {
      const { data } = await api.get(`/chores/senior/${session.id}`);
      setChores(data);
    } catch { setMessage({ type: 'error', text: 'Could not load your requests.' }); }
  }, [session.id]);

  useEffect(() => { loadChores(); }, [loadChores]);

  if (!session.id || session.role !== 'senior') return <Navigate to="/login" replace />;

  const analyze = async () => {
    if (!image) return;
    setBusy('analyze');
    setMessage({ type: '', text: '' });
    const data = new FormData();
    data.append('image', image);
    data.append('description', form.description);
    try {
      const response = await api.post('/chores/analyze', data);
      setAnalysis(response.data.analysis);
    } catch (error) {
      setMessage({ type: 'error', text: messageFrom(error, 'Image analysis failed. You can still post the request.') });
    } finally { setBusy(''); }
  };

  const post = async (event) => {
    event.preventDefault();
    setBusy('post');
    setMessage({ type: '', text: '' });
    const data = new FormData();
    data.append('senior_id', session.id);
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (image) data.append('images', image);
    if (analysis) {
      data.append('ai_tools', JSON.stringify(analysis.tools_needed || []));
      data.append('ai_steps', JSON.stringify(analysis.steps || []));
      data.append('ai_skills_needed', JSON.stringify(analysis.skills_needed || []));
      data.append('ai_difficulty', analysis.difficulty || '');
      data.append('ai_estimated_time', analysis.estimated_time || '');
      data.append('ai_safety_notes', analysis.safety_notes || '');
    }
    try {
      await api.post('/chores/post', data);
      setForm({ title: '', description: '', location: '' });
      setImage(null); setAnalysis(null);
      setMessage({ type: 'success', text: 'Your request is now visible to volunteers.' });
      await loadChores();
    } catch (error) {
      setMessage({ type: 'error', text: messageFrom(error, 'The request could not be posted.') });
    } finally { setBusy(''); }
  };

  return (
    <div className="dashboard-page">
      <DashboardHeader eyebrow="Senior dashboard" title={`Hello, ${session.name || 'there'}`} description="Create a request and follow its progress." />
      <main className="dashboard-grid">
        <section className="panel request-panel">
          <div className="panel-heading"><div><p>New request</p><h2>What do you need help with?</h2></div><span className="panel-icon">＋</span></div>
          <form onSubmit={post}>
            <Field label="Chore title" value={form.title} onChange={(title) => setForm({ ...form, title })} placeholder="e.g. Carry two boxes upstairs" />
            <label className="field"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add anything the volunteer should know" required /></label>
            <Field label="General location" value={form.location} onChange={(location) => setForm({ ...form, location })} placeholder="e.g. Setagaya, Tokyo" />
            <label className="upload-box">
              <input type="file" accept="image/*" onChange={(event) => { setImage(event.target.files?.[0] || null); setAnalysis(null); }} />
              <span className="upload-symbol">↥</span><strong>{image ? image.name : 'Add a photo (optional)'}</strong><small>A photo can help explain the task.</small>
            </label>
            {image && !analysis && <button className="analysis-button" type="button" onClick={analyze} disabled={busy === 'analyze'}>{busy === 'analyze' ? 'Analyzing…' : 'Suggest a plan from this photo'}</button>}
            {analysis && <AnalysisCard analysis={analysis} />}
            {message.text && <p className={`form-message form-message--${message.type}`}>{message.text}</p>}
            <button className="primary-button form-submit" disabled={Boolean(busy)}>{busy === 'post' ? 'Posting…' : 'Post request'}</button>
          </form>
        </section>

        <section className="panel activity-panel">
          <div className="panel-heading"><div><p>Your activity</p><h2>Recent requests</h2></div><span className="count-chip">{chores.length}</span></div>
          <div className="chore-list">
            {chores.length ? chores.map((chore) => <ChoreCard key={chore.id} chore={chore} />) : <EmptyState title="No requests yet" text="Your first posted chore will appear here." />}
          </div>
        </section>
      </main>
    </div>
  );
}

function AnalysisCard({ analysis }) {
  return (
    <div className="analysis-card">
      <div><strong>Suggested plan</strong><span>{analysis.difficulty || 'Medium'} · {analysis.estimated_time || 'Time unknown'}</span></div>
      {analysis.tools_needed?.length > 0 && <p><b>Tools:</b> {analysis.tools_needed.join(', ')}</p>}
      {analysis.steps?.length > 0 && <ol>{analysis.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
      {analysis.safety_notes && <p><b>Safety:</b> {analysis.safety_notes}</p>}
      <small>Review these suggestions before sharing them with a volunteer.</small>
    </div>
  );
}

function VolunteerDashboard() {
  const session = getSession();
  const [openChores, setOpenChores] = useState([]);
  const [myChores, setMyChores] = useState([]);
  const [stats, setStats] = useState({ points: 0, completed_chores: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const [open, mine, userStats] = await Promise.all([
        api.get('/chores/all'), api.get(`/chores/volunteer/${session.id}`), api.get(`/users/${session.id}/stats`),
      ]);
      setOpenChores(open.data); setMyChores(mine.data); setStats(userStats.data);
    } catch { setError('Could not refresh the dashboard.'); }
  }, [session.id]);

  useEffect(() => { load(); }, [load]);

  if (!session.id || session.role !== 'volunteer') return <Navigate to="/login" replace />;

  const act = async (choreId, action) => {
    setBusy(choreId); setError('');
    try {
      await api.post(`/chores/${choreId}/${action}?volunteer_id=${session.id}`);
      await load();
    } catch (err) { setError(messageFrom(err, `Could not ${action} this chore.`)); }
    finally { setBusy(null); }
  };

  return (
    <div className="dashboard-page">
      <DashboardHeader eyebrow="Volunteer dashboard" title={`Ready to help, ${session.name || 'there'}?`} description="Choose a request that fits your time and skills." />
      <main className="volunteer-layout">
        <section className="stats-row" aria-label="Volunteer summary">
          <div><span>Available nearby</span><strong>{openChores.length}</strong></div>
          <div><span>Your active chores</span><strong>{myChores.filter((item) => item.status === 'claimed').length}</strong></div>
          <div><span>Completed</span><strong>{stats.completed_chores || 0}</strong></div>
          <div><span>Points earned</span><strong>{stats.points || 0}</strong></div>
        </section>
        {error && <p className="form-message form-message--error dashboard-message">{error}</p>}
        <div className="volunteer-columns">
          <section className="panel">
            <div className="panel-heading"><div><p>Community board</p><h2>Open requests</h2></div><span className="count-chip">{openChores.length}</span></div>
            <div className="chore-list">
              {openChores.length ? openChores.map((chore) => <ChoreCard key={chore.id} chore={chore} actionLabel={busy === chore.id ? 'Claiming…' : 'I can help'} disabled={busy === chore.id} onAction={() => act(chore.id, 'claim')} />) : <EmptyState title="Nothing open right now" text="New requests will appear here when seniors post them." />}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading"><div><p>Your commitments</p><h2>Claimed and completed</h2></div><span className="count-chip">{myChores.length}</span></div>
            <div className="chore-list">
              {myChores.length ? myChores.map((chore) => <ChoreCard key={chore.id} chore={chore} actionLabel={chore.status === 'claimed' ? (busy === chore.id ? 'Saving…' : 'Mark complete') : null} disabled={busy === chore.id} onAction={chore.status === 'claimed' ? () => act(chore.id, 'complete') : null} />) : <EmptyState title="No claimed chores" text="When you offer to help, the request will move here." />}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ChoreCard({ chore, actionLabel, onAction, disabled }) {
  const status = chore.status === 'done' ? 'complete' : chore.status;
  return (
    <article className="chore-card">
      <div className="chore-card-top"><span className={`status status--${status}`}>{status}</span><span className="chore-location">{chore.location || 'Location not specified'}</span></div>
      <h3>{chore.title}</h3>
      <p>{chore.description || 'No additional details provided.'}</p>
      {(chore.ai_estimated_time || chore.ai_difficulty) && <div className="chore-details"><span>{chore.ai_estimated_time || 'Time not estimated'}</span><span>{chore.ai_difficulty || 'Difficulty not rated'}</span></div>}
      {chore.ai_safety_notes && <p className="safety-note"><b>Safety:</b> {chore.ai_safety_notes}</p>}
      {actionLabel && <button className="card-action" onClick={onAction} disabled={disabled}>{actionLabel}</button>}
    </article>
  );
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><span>○</span><h3>{title}</h3><p>{text}</p></div>;
}

function Footer() {
  return <footer className="site-footer"><Brand /><p>Original team project for Young Coders&apos; Sphere.</p></footer>;
}

function App() {
  return (
    <BrowserRouter>
      <AnalyticsTracker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/senior" element={<SeniorDashboard />} />
        <Route path="/volunteer" element={<VolunteerDashboard />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
