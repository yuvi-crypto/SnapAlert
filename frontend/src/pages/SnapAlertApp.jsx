import React, { useState, useEffect } from 'react';
import { useSnapAlert } from '../context/SnapAlertContext';
import { getStats, mockTrigger } from '../api/client';
import AlertCard from '../components/AlertCard';
import OptInModal from '../components/OptInModal';
import './SnapAlertApp.css';
import '../index.css';

const VIEWS = ['alerts', 'how', 'settings'];

export default function SnapAlertApp() {
  const { userId, enabled, alerts, settings, refreshAlerts, refreshSettings } = useSnapAlert();
  const [stats, setStats] = useState(null);
  const [view, setView] = useState('alerts');
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
    if (!userId) { setShowOptIn(true); return; }
    setTriggering(true);
    setTriggerResult(null);
    try {
      const result = await mockTrigger(userId);
      setTriggerResult(result);
      await refreshAlerts();
      getStats(userId).then(setStats).catch(console.error);
    } catch (e) {
      setTriggerResult({ error: e?.response?.data?.detail || 'Trigger failed. Check backend.' });
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
    <div className="app-root">
      {/* Ambient background */}
      <div className="ambient" aria-hidden>
        <div className="amb orb-a" />
        <div className="amb orb-b" />
        <div className="amb orb-c" />
        <div className="grid-bg" />
      </div>

      {/* ── Top Nav ────────────────────────────────────────────────────── */}
      <header className="top-nav">
        <div className="nav-wrap">
          {/* Brand */}
          <div className="brand">
            <div className="brand-icon">
              <BellIcon />
            </div>
            <div>
              <span className="brand-name">Snap<span className="g">Alert</span></span>
              <span className="brand-tag">by Snaphomz</span>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="nav-tabs">
            <button id="tab-alerts" className={`nav-tab ${view === 'alerts' ? 'active' : ''}`} onClick={() => setView('alerts')}>
              <span>🏠</span> Alerts
              {alerts.length > 0 && <span className="tab-badge">{alerts.length}</span>}
            </button>
            <button id="tab-how" className={`nav-tab ${view === 'how' ? 'active' : ''}`} onClick={() => setView('how')}>
              <span>⚡</span> How it Works
            </button>
            <button id="tab-settings" className={`nav-tab ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
              <span>⚙️</span> Settings
            </button>
          </nav>

          {/* Status + CTA */}
          <div className="nav-right">
            {enabled ? (
              <div className="status-active">
                <span className="pulse-dot" />
                <span>Active</span>
              </div>
            ) : (
              <button id="nav-enable-btn" className="btn-primary btn-sm" onClick={() => setShowOptIn(true)}>
                Enable SnapAlert
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero strip ─────────────────────────────────────────────────── */}
      {!userId && (
        <section className="hero-strip animate-fade-up">
          <div className="hero-strip-inner">
            <div className="hero-text">
              <div className="live-chip"><span className="live-dot" /> Live for California markets</div>
              <h1>Never miss your <span className="g">perfect home</span></h1>
              <p>Get a WhatsApp alert within <strong>5 minutes</strong> of a matching listing — before most buyers even open their email.</p>
              <div className="hero-btns">
                <button id="hero-enable-btn" className="btn-primary btn-lg" onClick={() => setShowOptIn(true)}>
                  🔔 Enable Free WhatsApp Alerts
                </button>
              </div>
            </div>
            <div className="hero-preview-wrap">
              <WhatsAppPreview />
            </div>
          </div>
        </section>
      )}

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <main className="main-content">

        {/* ── ALERTS VIEW ──────────────────────────────────────────────── */}
        {view === 'alerts' && (
          <div className="view-alerts animate-fade">

            {/* Stats bar (only when user exists) */}
            {userId && stats && (
              <div className="stats-row animate-fade-up">
                <StatBadge icon="📨" val={stats.total_alerts} label="Alerts" color="purple" />
                <StatBadge icon="🎯" val={`${Math.round((stats.avg_match_score || 0) * 100)}%`} label="Avg Match" color="cyan" />
                <StatBadge icon="👆" val={`${Math.round((stats.response_rate || 0) * 100)}%`} label="Response" color="green" />
                <StatBadge icon="📅" val={stats.showing_booked} label="Bookings" color="orange" />

                <div className="stats-spacer" />

                {/* Demo trigger button */}
                <button
                  id="trigger-btn"
                  className="trigger-btn"
                  onClick={handleMockTrigger}
                  disabled={triggering}
                  title="Fetch a real listing from RealEstateAPI and fire a live WhatsApp alert"
                >
                  {triggering
                    ? <><LoadSpinner /> Searching RealEstateAPI…</>
                    : <><span>⚡</span> Trigger Demo Alert</>
                  }
                </button>
              </div>
            )}

            {/* Trigger result banner */}
            {triggerResult && (
              <div className={`trigger-banner ${triggerResult.error ? 'err' : 'ok'} animate-slide`}>
                {triggerResult.error ? (
                  <><span>❌</span><span>{triggerResult.error}</span></>
                ) : (
                  <>
                    <span>✅</span>
                    <div className="trigger-info">
                      <strong>WhatsApp {triggerResult.whatsapp_sent ? 'sent!' : 'logged (check Twilio sandbox)'}</strong>
                      {triggerResult.alert && (
                        <span>{triggerResult.alert.address} · {Math.round(triggerResult.alert.match_score * 100)}% match</span>
                      )}
                    </div>
                  </>
                )}
                <button className="btn-ghost" onClick={() => setTriggerResult(null)}>✕</button>
              </div>
            )}

            {/* No user — CTA */}
            {!userId && (
              <div className="cta-card glass-card animate-fade-up">
                <div className="cta-icon animate-float">🔔</div>
                <h2>Enable SnapAlert to receive live alerts</h2>
                <p>We'll watch California MLS every 5 minutes and WhatsApp you the moment a matching home lists.</p>
                <button id="cta-enable-btn" className="btn-primary btn-lg" onClick={() => setShowOptIn(true)}>
                  🚀 Get Started — It's Free
                </button>

                {/* Demo trigger even without account */}
                <div className="divider" />
                <button
                  id="demo-trigger-guest-btn"
                  className="trigger-btn"
                  onClick={handleMockTrigger}
                  disabled={triggering}
                >
                  {triggering
                    ? <><LoadSpinner /> Searching…</>
                    : <><span>⚡</span> Try Demo Alert (no account needed)</>
                  }
                </button>
              </div>
            )}

            {/* Alert feed */}
            {userId && (
              <div className="feed-section">
                <div className="feed-header">
                  <h2>Your Alerts
                    <span className="alert-count">{alerts.length}</span>
                  </h2>
                  <div className="filter-row">
                    {[['all','All'],['high','80%+ Match'],['booked','Booked']].map(([id, label]) => (
                      <button
                        key={id}
                        id={`filter-${id}`}
                        className={`filter-pill ${filter === id ? 'active' : ''}`}
                        onClick={() => setFilter(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredAlerts.length === 0 ? (
                  <div className="feed-empty glass-card">
                    <span className="animate-float" style={{fontSize:48}}>🏠</span>
                    <h3>No alerts yet</h3>
                    <p>Click <strong>⚡ Trigger Demo Alert</strong> above to fire a live match, or wait for the 5-min poller to catch new listings.</p>
                  </div>
                ) : (
                  <div className="feed-grid">
                    {filteredAlerts.map((alert, i) => (
                      <div key={alert.id} style={{ animationDelay: `${i * 0.05}s` }} className="animate-fade-up">
                        <AlertCard alert={alert} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── HOW IT WORKS VIEW ─────────────────────────────────────────── */}
        {view === 'how' && (
          <div className="view-how animate-fade">
            <div className="section-head">
              <h2 className="g">How SnapAlert Works</h2>
              <p>Hyper-personalised deal alerts powered by AI preference matching</p>
            </div>

            <div className="flow-steps">
              {[
                { n:'1', icon:'🔍', title:'MLS Watcher', desc:'Polls RealEstateAPI every 5 minutes for newly listed properties across California markets.' },
                { n:'2', icon:'🤖', title:'Vector Matching', desc:'Computes cosine similarity between your 64-dimensional preference vector and each new listing.' },
                { n:'3', icon:'💬', title:'WhatsApp Alert', desc:'When score > 65%, fires a rich WhatsApp message with match % + AI explanation within 5 minutes.' },
                { n:'4', icon:'📅', title:'One-Tap Booking', desc:'A single tap schedules a showing. No forms, no login, no friction — 30-second booking.' },
              ].map(s => (
                <div key={s.n} className="flow-card glass-card">
                  <div className="flow-num">{s.n}</div>
                  <div className="flow-icon">{s.icon}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Comparison table */}
            <div className="compare-box glass-card">
              <h3>SnapAlert vs. the competition</h3>
              <div className="compare-grid">
                <div className="compare-head"><span>Feature</span><span>Zillow / Redfin</span><span className="g">SnapAlert</span></div>
                {[
                  ['Channel', 'Email (5% open)', 'WhatsApp (98% open) 💬'],
                  ['Alert Speed', '15–60 min', '< 5 minutes ⚡'],
                  ['Match Explanation', 'None', 'AI-generated 🤖'],
                  ['Booking Steps', '5+ steps', '1 tap 👆'],
                  ['Personalisation', 'Basic filters', 'Preference vector 🎯'],
                  ['Self-Improving', 'Never', 'Every interaction ♻️'],
                ].map(([f,t,u]) => (
                  <div key={f} className="compare-row">
                    <span className="cf">{f}</span>
                    <span className="ct">{t}</span>
                    <span className="cu">{u}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech stack */}
            <div className="stack-box glass-card">
              <h3>🔧 Tech Stack</h3>
              <div className="stack-chips">
                {['RealEstateAPI.com','Twilio WhatsApp','PropGPT AI','FastAPI','SQLite + numpy','APScheduler (5-min poll)','React + Vite'].map(t => (
                  <span key={t} className="stack-chip">{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS VIEW ─────────────────────────────────────────────── */}
        {view === 'settings' && (
          <div className="view-settings animate-fade">
            {!userId ? (
              <div className="cta-card glass-card animate-fade-up">
                <div className="cta-icon animate-float">⚙️</div>
                <h2>No account yet</h2>
                <p>Enable SnapAlert to configure your preferences and start receiving alerts.</p>
                <button id="settings-enable-btn" className="btn-primary btn-lg" onClick={() => setShowOptIn(true)}>Enable SnapAlert</button>
              </div>
            ) : (
              <SettingsPanel settings={settings} onUpdate={refreshSettings} onEnable={() => setShowOptIn(true)} />
            )}
          </div>
        )}

      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="app-footer">
        <span className="brand-name" style={{fontSize:14}}>Snap<span className="g">Alert</span></span>
        <span>·</span>
        <span>Powered by RealEstateAPI.com + Twilio WhatsApp</span>
        <span>·</span>
        <span>© 2024 Snaphomz</span>
      </footer>

      {showOptIn && <OptInModal onClose={() => setShowOptIn(false)} />}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBadge({ icon, val, label, color }) {
  const colors = {
    purple:{ bg:'rgba(124,58,237,0.12)', border:'rgba(124,58,237,0.25)', text:'#a78bfa' },
    cyan:  { bg:'rgba(6,182,212,0.10)',  border:'rgba(6,182,212,0.22)',  text:'#22d3ee' },
    green: { bg:'rgba(16,185,129,0.10)', border:'rgba(16,185,129,0.22)', text:'#34d399' },
    orange:{ bg:'rgba(245,158,11,0.10)', border:'rgba(245,158,11,0.22)', text:'#fbbf24' },
  };
  const c = colors[color] || colors.purple;
  return (
    <div className="stat-badge" style={{background:c.bg, borderColor:c.border}}>
      <span className="sb-icon">{icon}</span>
      <span className="sb-val" style={{color:c.text}}>{val ?? '–'}</span>
      <span className="sb-lbl">{label}</span>
    </div>
  );
}

function SettingsPanel({ settings, onUpdate, onEnable }) {
  if (!settings) return <div className="loading-box"><LoadSpinner />Loading settings…</div>;
  const pref = settings.preference;
  return (
    <div className="settings-panel animate-fade-up">
      <div className="settings-card glass-card">
        <h3>SnapAlert Status</h3>
        <div className="settings-row">
          <span>Status</span>
          {settings.enabled
            ? <span className="badge badge-green">🟢 Active</span>
            : <span className="badge badge-red">🔴 Inactive</span>
          }
        </div>
        <div className="settings-row">
          <span>Phone</span>
          <span className="mono">{settings.phone_number || '–'}</span>
        </div>
        <div className="settings-row">
          <span>Alerts sent</span>
          <span className="badge badge-purple">{settings.alert_count}</span>
        </div>
        {!settings.enabled && (
          <button id="settings-reactivate-btn" className="btn-primary w-full mt-12" onClick={onEnable}>
            🔔 Reactivate SnapAlert
          </button>
        )}
      </div>

      {pref && (
        <div className="settings-card glass-card">
          <h3>Your Preferences</h3>
          <div className="settings-row"><span>City</span><span>{pref.city}, {pref.state}</span></div>
          <div className="settings-row"><span>Price Range</span><span>${(pref.min_price/1e6).toFixed(2)}M – ${(pref.max_price/1e6).toFixed(2)}M</span></div>
          <div className="settings-row"><span>Min Beds</span><span>{pref.min_beds} BR</span></div>
          <div className="settings-row"><span>Min Baths</span><span>{pref.min_baths} BA</span></div>
          <div className="settings-row"><span>Property Types</span><span>{pref.property_types?.join(', ')}</span></div>
          <div className="settings-row top"><span>Keywords</span>
            <div className="tag-group">
              {pref.keywords?.map(k => <span key={k} className="tag active">{k}</span>)}
            </div>
          </div>
          <button id="settings-update-btn" className="btn-secondary w-full mt-12" onClick={onEnable}>
            ✏️ Update Preferences
          </button>
        </div>
      )}
    </div>
  );
}

function WhatsAppPreview() {
  return (
    <div className="wa-preview">
      <div className="wa-phone">
        <div className="wa-notch" />
        <div className="wa-screen">
          <div className="wa-top-bar">
            <div className="wa-avatar-wrap">
              <span>🏠</span>
            </div>
            <div>
              <div className="wa-contact">SnapAlert</div>
              <div className="wa-online">● Online</div>
            </div>
          </div>
          <div className="wa-body">
            <div className="wa-msg">
              <div className="wa-msg-header">🏠 <strong>SnapAlert — 94% Match!</strong></div>
              <div className="wa-msg-addr">2847 Oakwood Dr, San Jose</div>
              <div className="wa-msg-price">💰 $1.15M</div>
              <div className="wa-msg-stats">🛏 4BR  |  🛁 3BA  |  2,240 sqft</div>
              <div className="wa-msg-why">✨ 4BR ✓ · $350K under budget · pool ✓</div>
              <div className="wa-msg-urgency">🔥 14 buyers viewed today — act fast!</div>
              <div className="wa-msg-cta">📅 Schedule Showing (30 sec) →</div>
            </div>
          </div>
        </div>
      </div>
      <div className="wa-now-badge">Just now ⚡</div>
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:22,height:22}}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function LoadSpinner() {
  return (
    <svg style={{width:16,height:16,animation:'spin 0.8s linear infinite'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
    </svg>
  );
}
