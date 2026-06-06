import React, { useState, useEffect } from 'react';
import { useSnapAlert } from '../context/SnapAlertContext';
import { getStats, mockTrigger } from '../api/client';
import AlertCard from '../components/AlertCard';
import OptInModal from '../components/OptInModal';
import './SnapAlertDashboard.css';

export default function SnapAlertDashboard() {
  const { userId, enabled, alerts, refreshAlerts } = useSnapAlert();
  const [stats, setStats] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);
  const [showOptIn, setShowOptIn] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (userId) {
      getStats(userId).then(setStats).catch(console.error);
      refreshAlerts();
    }
  }, [userId]);

  async function handleMockTrigger() {
    if (!userId) return setShowOptIn(true);
    setTriggering(true);
    setTriggerResult(null);
    try {
      const result = await mockTrigger(userId);
      setTriggerResult(result);
      await refreshAlerts();
      const newStats = await getStats(userId);
      setStats(newStats);
    } catch (e) {
      setTriggerResult({ error: e?.response?.data?.detail || 'Trigger failed' });
    } finally {
      setTriggering(false);
    }
  }

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'high') return Math.round(a.match_score * 100) >= 80;
    if (filter === 'booked') return a.showing_booked;
    return true;
  });

  return (
    <div className="dashboard-page">
      {/* Ambient background */}
      <div className="dash-ambient">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
      </div>

      <div className="dash-container">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="dash-header animate-fade-up">
          <div className="dash-header-left">
            <div className="dash-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <h1>SnapAlert <span className="gradient-text">Dashboard</span></h1>
              <p className="dash-subtitle">
                {enabled
                  ? <><span className="status-dot active" /> Watching for new listings</>
                  : <><span className="status-dot inactive" /> SnapAlert is off</>
                }
              </p>
            </div>
          </div>

          {/* Demo Trigger */}
          <button
            id="demo-trigger-btn"
            className="trigger-btn"
            onClick={handleMockTrigger}
            disabled={triggering}
          >
            {triggering
              ? <><span className="trigger-spinner" />Searching…</>
              : <><span>⚡</span> Trigger Demo Alert</>
            }
          </button>
        </header>

        {/* ── Stats Strip ─────────────────────────────────────────────── */}
        {stats && (
          <div className="stats-strip animate-fade-up">
            <StatCard icon="📨" label="Alerts Sent" value={stats.total_alerts} color="purple" />
            <StatCard icon="🎯" label="Avg Match Score" value={`${Math.round((stats.avg_match_score || 0) * 100)}%`} color="cyan" />
            <StatCard icon="👆" label="Response Rate" value={`${Math.round((stats.response_rate || 0) * 100)}%`} color="green" />
            <StatCard icon="📅" label="Showings Booked" value={stats.showing_booked} color="orange" />
          </div>
        )}

        {/* ── Trigger Result Toast ─────────────────────────────────────── */}
        {triggerResult && (
          <div className={`trigger-result animate-slide ${triggerResult.error ? 'error' : 'success'}`}>
            {triggerResult.error ? (
              <><span>❌</span> {triggerResult.error}</>
            ) : (
              <>
                <span>✅</span>
                <div>
                  <strong>WhatsApp {triggerResult.whatsapp_sent ? 'sent!' : 'logged'}</strong>
                  {triggerResult.alert && (
                    <span className="trigger-detail">
                      {triggerResult.alert.address} — {Math.round(triggerResult.alert.match_score * 100)}% match
                    </span>
                  )}
                </div>
              </>
            )}
            <button className="btn-ghost" onClick={() => setTriggerResult(null)}>✕</button>
          </div>
        )}

        {/* ── No User State ────────────────────────────────────────────── */}
        {!userId && (
          <div className="empty-state glass-card animate-fade-up">
            <div className="empty-icon animate-float">🔔</div>
            <h2>Enable SnapAlert to start receiving alerts</h2>
            <p>Get WhatsApp alerts within 5 minutes when your perfect home lists in California</p>
            <button id="enable-cta-btn" className="btn-primary" onClick={() => setShowOptIn(true)}>
              🚀 Enable SnapAlert
            </button>
          </div>
        )}

        {/* ── Alert Feed ───────────────────────────────────────────────── */}
        {userId && (
          <div className="alerts-section">
            <div className="alerts-header">
              <h2>Your Alerts <span className="alert-count">{alerts.length}</span></h2>
              <div className="filter-tabs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'high', label: '80%+ Match' },
                  { id: 'booked', label: 'Booked' },
                ].map(f => (
                  <button
                    key={f.id}
                    id={`filter-${f.id}`}
                    className={`filter-tab ${filter === f.id ? 'active' : ''}`}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="no-alerts glass-card">
                <div className="animate-float" style={{ fontSize: 48, textAlign: 'center' }}>🏠</div>
                <h3>No alerts yet</h3>
                <p>Click <strong>"Trigger Demo Alert"</strong> to see a live match, or wait for the 5-min poller to find listings.</p>
              </div>
            ) : (
              <div className="alerts-grid">
                {filteredAlerts.map((alert, i) => (
                  <div key={alert.id} style={{ animationDelay: `${i * 0.06}s` }}>
                    <AlertCard alert={alert} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── How It Works ─────────────────────────────────────────────── */}
        <div className="how-it-works animate-fade-up">
          <h2 className="section-title">How SnapAlert Works</h2>
          <div className="steps-row">
            <Step n="1" icon="🔍" title="Watches MLS" desc="Polls RealEstateAPI every 5 minutes for new CA listings" />
            <div className="step-arrow">→</div>
            <Step n="2" icon="🤖" title="AI Matching" desc="Computes cosine similarity against your preference vector" />
            <div className="step-arrow">→</div>
            <Step n="3" icon="💬" title="WhatsApp Alert" desc="Fires rich WhatsApp message with match score + explanation" />
            <div className="step-arrow">→</div>
            <Step n="4" icon="📅" title="1-Tap Booking" desc="Schedule a showing in 30 seconds from the message" />
          </div>
        </div>

        {/* ── Competitor Comparison ────────────────────────────────────── */}
        <div className="comparison-section glass-card animate-fade-up">
          <h2 className="section-title">Why SnapAlert Wins</h2>
          <div className="compare-table">
            <div className="compare-header">
              <span>Feature</span>
              <span>Zillow / Redfin</span>
              <span className="snap-col">SnapAlert</span>
            </div>
            {[
              ['Alert Channel', 'Email (5% open)', 'WhatsApp (98% open)'],
              ['Alert Speed', '15–60 minutes', '< 5 minutes ⚡'],
              ['Match Explanation', '❌ None', '✅ AI-generated'],
              ['Booking Steps', '5+ steps', '1 tap'],
              ['Personalisation', 'Basic filters', 'Preference vector 🤖'],
            ].map(([feat, them, us]) => (
              <div className="compare-row" key={feat}>
                <span className="compare-feat">{feat}</span>
                <span className="compare-them">{them}</span>
                <span className="compare-us">{us}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {showOptIn && <OptInModal onClose={() => setShowOptIn(false)} />}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    purple: { bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)', text: '#a78bfa' },
    cyan:   { bg: 'rgba(6,182,212,0.1)',  border: 'rgba(6,182,212,0.2)',  text: '#22d3ee' },
    green:  { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', text: '#34d399' },
    orange: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
  };
  const c = colors[color] || colors.purple;

  return (
    <div className="stat-card" style={{ background: c.bg, borderColor: c.border }}>
      <span className="stat-icon">{icon}</span>
      <span className="stat-value" style={{ color: c.text }}>{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function Step({ n, icon, title, desc }) {
  return (
    <div className="step-card glass-card">
      <div className="step-num">{n}</div>
      <div className="step-emoji">{icon}</div>
      <h4>{title}</h4>
      <p>{desc}</p>
    </div>
  );
}
