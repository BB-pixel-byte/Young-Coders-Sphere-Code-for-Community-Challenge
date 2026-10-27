import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token');
  if (token && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
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
  id: localStorage.getItem('user_token') ? localStorage.getItem('user_id') : null,
  name: localStorage.getItem('name'),
  role: localStorage.getItem('role'),
});

const saveSession = ({ user_id, name, role, token }) => {
  localStorage.setItem('user_id', user_id);
  localStorage.setItem('name', name);
  localStorage.setItem('role', role);
  localStorage.setItem('user_token', token);
};

const clearUserSession = () => {
  localStorage.removeItem('user_id');
  localStorage.removeItem('name');
  localStorage.removeItem('role');
  localStorage.removeItem('user_token');
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
            <p className="project-label">A student-built project on women's skills</p>
            <h1>Make room for women's skills.<br />Create flexible ways to contribute.</h1>
            <p className="hero-text">
              Chore4More is designed to connect women with short, flexible community opportunities that let them use skills and experience they already have. Hosts post clear roles; women choose what fits their abilities and availability.
            </p>
            <div className="hero-actions">
              <Link className="primary-button" to="/register">Get started</Link>
              <a className="secondary-button" href="#how-it-works">See how it works</a>
            </div>
            <p className="prototype-note">Invitation-only demo · Exploring women's underutilized skills</p>
          </div>

          <div className="demo-panel" aria-label="Sample community opportunity; not a live opening">
            <div className="demo-topbar">
              <span className="demo-logo">C4</span>
              <span>Sample opportunity</span>
              <span className="status status--open">Example</span>
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
                <p className="demo-kicker">Community garden · Skill sharing</p>
                <h2>Plan a balcony garden</h2>
              </div>
              <span className="time-chip">About 30 min</span>
              <p>A neighborhood group needs a planting plan for a small container garden.</p>
              <div className="demo-meta">
                <span>📍 General area</span>
                <span>🌱 Plant knowledge</span>
              </div>
            </div>
          </div>
        </section>

        <section className="steps-section" id="how-it-works">
          <div className="section-heading">
            <p className="project-label">How it works</p>
            <h2>Small opportunities. Skills put to use.</h2>
          </div>
          <div className="steps-grid">
            <article>
              <span className="step-number">1</span>
              <h3>Share an opportunity</h3>
              <p>A community host posts a small role, a general area and a time estimate. The coordinator arranges details privately.</p>
            </article>
            <article>
              <span className="step-number">2</span>
              <h3>Women choose what fits</h3>
              <p>Women review available opportunities and choose one that matches their skills, interests and availability.</p>
            </article>
            <article>
              <span className="step-number">3</span>
              <h3>Contributions are recognized</h3>
              <p>The contributor reports finishing, and the community host confirms it before it counts as complete.</p>
            </article>
          </div>
        </section>

        <section className="project-strip">
          <div>
            <p className="project-label">About this build</p>
            <h2>Making women's underused skills easier to see and use.</h2>
          </div>
          <p>
            The prototype was developed for the Young Coders&apos; Sphere competition and is now focused on the underutilization of women&apos;s skills. It explores whether short, flexible community opportunities can make it easier for women to contribute what they know. This invitation-only demo is an early prototype, not evidence of measured impact.
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
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'volunteer', invite_code: '' });
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
        navigate(data.role === 'senior' ? '/host' : '/contributor');
      } else {
        const payload = { ...form, email: form.email.trim() };
        const { data } = await api.post('/users/register', payload);
        if (data.error) throw new Error(data.error);
        saveSession(data);
        navigate(form.role === 'senior' ? '/host' : '/contributor');
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
          <p>{isLogin ? 'Enter the details you used when registering.' : 'Pilot participants need an invitation code from their coordinator.'}</p>
        </div>

        <form onSubmit={submit}>
          {!isLogin && (
            <div className="role-selector" aria-label="Choose your role">
              <button type="button" className={form.role === 'volunteer' ? 'selected' : ''} onClick={() => setForm({ ...form, role: 'volunteer' })}>
                <strong>I want to use my skills</strong><span>Women contributor</span>
              </button>
              <button type="button" className={form.role === 'senior' ? 'selected' : ''} onClick={() => setForm({ ...form, role: 'senior' })}>
                <strong>I can offer an opportunity</strong><span>Community host</span>
              </button>
            </div>
          )}
          {!isLogin && <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} placeholder="Your name" />}
          <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} placeholder="you@example.com" />
          <Field label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} placeholder="Enter a password" />
          {!isLogin && <Field label="Pilot invitation code" value={form.invite_code} onChange={(invite_code) => setForm({ ...form, invite_code })} placeholder="Code from your coordinator" />}
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
          <span>Anonymized evidence of reach, participation and verified community contributions.</span>
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
              <MetricCard label="Registered accounts" value={data.users.registered} detail={`${data.users.volunteers} women contributors · ${data.users.seniors} community hosts`} tone="navy" />
              <MetricCard label="Activated accounts" value={data.users.activated} detail="Posted or selected an opportunity" tone="green" />
              <MetricCard label="Host-confirmed contributions" value={data.chores.completed} detail={`${data.rates.chore_completion}% of requests`} tone="orange" />
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
                <FunnelRow label="Posted or joined an opportunity" value={data.users.activated} max={data.traffic.unique_visitors} />
                <FunnelRow label="Contributions confirmed" value={data.chores.completed} max={data.traffic.unique_visitors} />
                <div className="rate-row">
                  <div><strong>{data.rates.visitor_to_account}%</strong><span>visitor → account</span></div>
                  <div><strong>{data.rates.account_activation}%</strong><span>account activation</span></div>
                </div>
              </article>

              <article className="analytics-panel">
                <div className="analytics-panel-heading"><div><p>Core workflow</p><h2>Opportunity activity</h2></div></div>
                <div className="workflow-stats">
                  <div><span>Opportunities posted</span><strong>{data.chores.posted}</strong></div>
                  <div><span>Opportunities selected</span><strong>{data.chores.claimed}</strong></div>
                  <div><span>Contributions confirmed</span><strong>{data.chores.completed}</strong></div>
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

function HostDashboard() {
  const session = getSession();
  const [form, setForm] = useState({ title: '', description: '', location: '' });
  const [chores, setChores] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState('');
  const [confirming, setConfirming] = useState(null);

  const loadChores = useCallback(async () => {
    try {
      const { data } = await api.get(`/chores/senior/${session.id}`);
      setChores(data);
    } catch { setMessage({ type: 'error', text: 'Could not load your opportunities.' }); }
  }, [session.id]);

  useEffect(() => { loadChores(); }, [loadChores]);

  if (!session.id || session.role !== 'senior') return <Navigate to="/login" replace />;

  const post = async (event) => {
    event.preventDefault();
    setBusy('post');
    setMessage({ type: '', text: '' });
    const data = new FormData();
    data.append('senior_id', session.id);
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    try {
      await api.post('/chores/post', data);
      setForm({ title: '', description: '', location: '' });
      setMessage({ type: 'success', text: 'Your opportunity is now visible to women contributors invited to the pilot.' });
      await loadChores();
    } catch (error) {
      setMessage({ type: 'error', text: messageFrom(error, 'The opportunity could not be posted.') });
    } finally { setBusy(''); }
  };

  const confirm = async (choreId) => {
    setConfirming(choreId);
    setMessage({ type: '', text: '' });
    try {
      await api.post(`/chores/${choreId}/confirm`);
      setMessage({ type: 'success', text: 'Thank you. This contribution is now confirmed.' });
      await loadChores();
    } catch (error) {
      setMessage({ type: 'error', text: messageFrom(error, 'Could not confirm this contribution.') });
    } finally { setConfirming(null); }
  };

  return (
    <div className="dashboard-page">
      <DashboardHeader eyebrow="Community host" title={`Hello, ${session.name || 'there'}`} description="Post a small opportunity and confirm each completed contribution." />
      <main className="dashboard-grid">
        <section className="panel request-panel">
          <div className="panel-heading"><div><p>New opportunity</p><h2>What could someone contribute?</h2></div><span className="panel-icon">＋</span></div>
          <form onSubmit={post}>
            <Field label="Opportunity title" value={form.title} onChange={(title) => setForm({ ...form, title })} placeholder="e.g. Plan a community garden" />
            <label className="field"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the skills involved and the time commitment" required /></label>
            <Field label="General location" value={form.location} onChange={(location) => setForm({ ...form, location })} placeholder="e.g. a neighborhood in Tokyo" />
            <p className="safety-note">Use only a general area. Do not enter an address, phone number, or sensitive details here. Your coordinator will arrange any meeting details privately.</p>
            {message.text && <p className={`form-message form-message--${message.type}`}>{message.text}</p>}
            <button className="primary-button form-submit" disabled={Boolean(busy)}>{busy === 'post' ? 'Posting…' : 'Post opportunity'}</button>
          </form>
        </section>

        <section className="panel activity-panel">
          <div className="panel-heading"><div><p>Your activity</p><h2>Published opportunities</h2></div><span className="count-chip">{chores.length}</span></div>
          <div className="chore-list">
            {chores.length ? chores.map((chore) => <ChoreCard key={chore.id} chore={chore} actionLabel={chore.status === 'awaiting_confirmation' ? (confirming === chore.id ? 'Saving…' : 'Confirm it was done') : null} disabled={confirming === chore.id} onAction={() => confirm(chore.id)} />) : <EmptyState title="No opportunities yet" text="Your first published opportunity will appear here." />}
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
      <small>Review these suggestions before sharing them with a woman contributor.</small>
    </div>
  );
}

function ContributorDashboard() {
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
    } catch (err) { setError(messageFrom(err, `Could not ${action} this opportunity.`)); }
    finally { setBusy(null); }
  };

  return (
    <div className="dashboard-page">
      <DashboardHeader eyebrow="Women contributor" title={`Ready to contribute, ${session.name || 'there'}?`} description="Choose a short local opportunity that fits your skills, interests and availability." />
      <main className="volunteer-layout">
        <section className="stats-row" aria-label="Contributor summary">
          <div><span>Available opportunities</span><strong>{openChores.length}</strong></div>
          <div><span>In progress</span><strong>{myChores.filter((item) => item.status === 'claimed').length}</strong></div>
          <div><span>Host-confirmed</span><strong>{stats.completed_chores || 0}</strong></div>
          <div><span>Recognition points</span><strong>{stats.points || 0}</strong></div>
        </section>
        {error && <p className="form-message form-message--error dashboard-message">{error}</p>}
        <div className="volunteer-columns">
          <section className="panel">
            <div className="panel-heading"><div><p>Community board</p><h2>Open opportunities</h2></div><span className="count-chip">{openChores.length}</span></div>
            <div className="chore-list">
              {openChores.length ? openChores.map((chore) => <ChoreCard key={chore.id} chore={chore} actionLabel={busy === chore.id ? 'Selecting…' : 'Select opportunity'} disabled={busy === chore.id} onAction={() => act(chore.id, 'claim')} />) : <EmptyState title="Nothing open right now" text="New opportunities will appear here when community hosts post them." />}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading"><div><p>Your contributions</p><h2>Selected and confirmed</h2></div><span className="count-chip">{myChores.length}</span></div>
            <div className="chore-list">
              {myChores.length ? myChores.map((chore) => <ChoreCard key={chore.id} chore={chore} actionLabel={chore.status === 'claimed' ? (busy === chore.id ? 'Saving…' : 'Mark contribution complete') : null} disabled={busy === chore.id} onAction={chore.status === 'claimed' ? () => act(chore.id, 'complete') : null} />) : <EmptyState title="No opportunities yet" text="When you choose an opportunity, it will appear here." />}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ChoreCard({ chore, actionLabel, onAction, disabled }) {
  const status = chore.status === 'done' ? 'complete' : chore.status === 'awaiting_confirmation' ? 'awaiting host confirmation' : chore.status === 'claimed' ? 'selected' : chore.status;
  return (
    <article className="chore-card">
      <div className="chore-card-top"><span className={`status status--${chore.status === 'awaiting_confirmation' || chore.status === 'claimed' ? 'claimed' : chore.status === 'done' ? 'complete' : status}`}>{status}</span><span className="chore-location">{chore.location || 'Location not specified'}</span></div>
      <h3>{chore.title}</h3>
      <p>{chore.description || 'No additional details provided.'}</p>
      {(chore.ai_estimated_time || chore.ai_difficulty) && <div className="chore-details"><span>{chore.ai_estimated_time || 'Time commitment not set'}</span><span>{chore.ai_difficulty || 'Level not specified'}</span></div>}
      {chore.ai_safety_notes && <p className="safety-note"><b>Safety:</b> {chore.ai_safety_notes}</p>}
      {actionLabel && <button className="card-action" onClick={onAction} disabled={disabled}>{actionLabel}</button>}
    </article>
  );
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><span>○</span><h3>{title}</h3><p>{text}</p></div>;
}

function Footer() {
  return <footer className="site-footer"><Brand /><p>A student-built prototype exploring women's underutilized skills.</p></footer>;
}

function App() {
  return (
    <BrowserRouter>
      <AnalyticsTracker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/host" element={<HostDashboard />} />
        <Route path="/contributor" element={<ContributorDashboard />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
