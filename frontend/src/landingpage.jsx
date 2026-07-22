import React from 'react';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();

  const styles = {
    container: { 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f8fafc', 
      padding: '20px', 
      fontFamily: 'system-ui, sans-serif' 
    },
    content: { maxWidth: '800px', width: '100%' },
    header: { marginBottom: '40px' },
    title: { fontSize: '48px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0' },
    subtitle: { fontSize: '24px', color: '#334155', margin: '0 0 16px 0', fontWeight: '500' },
    description: { fontSize: '16px', color: '#64748b', lineHeight: '1.6', maxWidth: '600px' },
    cardGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' },
    card: { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    cardTag: { fontSize: '12px', fontWeight: 'bold', color: '#064e3b', backgroundColor: '#d1fae5', padding: '4px 10px', borderRadius: '999px', display: 'inline-block', marginBottom: '12px', textTransform: 'uppercase' },
    cardTitle: { fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' },
    cardText: { fontSize: '14px', color: '#475569', lineHeight: '1.5' },
    buttonRow: { display: 'flex', gap: '16px' },
    primaryBtn: { padding: '14px 28px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
    secondaryBtn: { padding: '14px 28px', backgroundColor: 'transparent', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Help at home, reviewed with care.</h1>
          <h2 style={styles.subtitle}>A calmer way for seniors and volunteers to coordinate chores.</h2>
          <p style={styles.description}>
            Seniors post what they need, volunteers claim work and upload proof, 
            and points are awarded only after the senior approves the review.
          </p>
        </div>

        <div style={styles.cardGrid}>
          <div style={styles.card}>
            <span style={styles.cardTag}>For Seniors</span>
            <h3 style={styles.cardTitle}>Post, schedule, review</h3>
            <p style={styles.cardText}>See claimed chores and a clear review queue when a volunteer submits proof.</p>
          </div>
          <div style={styles.card}>
            <span style={styles.cardTag}>For Volunteers</span>
            <h3 style={styles.cardTitle}>Claim, prove, earn</h3>
            <p style={styles.cardText}>Upload or capture a proof photo, then track pending, approved, and not approved work.</p>
          </div>
        </div>

        <div style={styles.buttonRow}>
          <button onClick={() => navigate('/register')} style={styles.primaryBtn}>Create account</button>
          <button onClick={() => navigate('/login')} style={styles.secondaryBtn}>I already have one</button>
        </div>
      </div>
    </div>
  );
}