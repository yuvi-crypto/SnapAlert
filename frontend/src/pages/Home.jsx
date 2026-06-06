import React from 'react';
import { useSnapAlert } from '../context/SnapAlertContext';
import SnapAlertBadge from '../components/SnapAlertBadge';
import SnapAlertDashboard from './SnapAlertDashboard';
import './Home.css';

export default function Home() {
  const { userId, enabled } = useSnapAlert();

  return (
    <div className="home-page">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="nav-inner">
          <a href="/" className="nav-brand">
            <div className="nav-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" />
              </svg>
            </div>
            <span className="nav-name">Snap<span className="gradient-text">homz</span></span>
          </a>

          <div className="nav-links">
            <a href="#" className="nav-link">Buy</a>
            <a href="#" className="nav-link">Rent</a>
            <a href="#" className="nav-link">Agents</a>
            <a href="/snapalert" className="nav-link snap-link">
              <span>⚡</span> SnapAlert
            </a>
          </div>

          <div className="nav-right">
            <SnapAlertBadge />
            <button className="btn-secondary nav-sign-in">Sign In</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="hero-section">
        {/* Background particles */}
        <div className="hero-bg">
          <div className="hero-orb orb-purple" />
          <div className="hero-orb orb-cyan" />
          <div className="grid-overlay" />
        </div>

        <div className="hero-content">
          <div className="hero-badge animate-fade-up">
            <span className="live-dot" /> Live alerts for CA markets
          </div>

          <h1 className="hero-title animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Never miss your<br />
            <span className="gradient-text">perfect home</span> again
          </h1>

          <p className="hero-desc animate-fade-up" style={{ animationDelay: '0.2s' }}>
            SnapAlert texts you on WhatsApp within <strong>5 minutes</strong> of a matching
            listing — before most buyers even open their email.
          </p>

          <div className="hero-actions animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <a href="/snapalert" className="btn-primary hero-cta">
              🔔 Enable SnapAlert — Free
            </a>
            <button className="btn-secondary">Browse Listings</button>
          </div>

          {/* Social proof */}
          <div className="hero-proof animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <div className="proof-avatars">
              {['👤', '👤', '👤', '👤'].map((_, i) => (
                <div key={i} className="avatar">{_}</div>
              ))}
            </div>
            <span>2,400+ buyers alerted this week</span>
          </div>
        </div>

        {/* Alert Preview Card */}
        <div className="hero-preview animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <MockAlertCard />
        </div>
      </section>

      {/* ── Feature Highlights ──────────────────────────────────────────── */}
      <section className="features-section">
        <div className="features-inner">
          <h2 className="section-heading">Why 98% of our users choose WhatsApp alerts</h2>
          <div className="features-grid">
            {[
              { icon: '⚡', title: '5-Minute SLA', desc: 'From listing to your WhatsApp in under 5 minutes. Email takes 15–60 min.' },
              { icon: '🤖', title: 'AI Match Score', desc: 'Cosine similarity on your preference vector. Not just filters — real intelligence.' },
              { icon: '💬', title: '98% Open Rate', desc: 'WhatsApp alerts get read. Email alerts get ignored. We chose the right channel.' },
              { icon: '📅', title: 'One-Tap Booking', desc: 'Schedule a showing in 30 seconds directly from the WhatsApp message.' },
              { icon: '🎯', title: 'Self-Improving', desc: 'Every shortlist and dismiss sharpens your preference vector automatically.' },
              { icon: '🔥', title: 'Urgency Signals', desc: '"12 buyers viewed this" — know when to act fast on competitive listings.' },
            ].map(f => (
              <div key={f.title} className="feature-card glass-card">
                <span className="feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard Preview ────────────────────────────────────────────── */}
      <section className="dashboard-preview-section">
        <SnapAlertDashboard />
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="nav-name">Snap<span className="gradient-text">homz</span></span>
            <p>Hyper-personalised real estate intelligence for California buyers.</p>
          </div>
          <div className="footer-links">
            <span>SnapAlert</span>
            <span>Privacy</span>
            <span>Terms</span>
            <span>Contact</span>
          </div>
          <p className="footer-copy">© 2024 Snaphomz. Powered by RealEstateAPI + Twilio.</p>
        </div>
      </footer>
    </div>
  );
}

function MockAlertCard() {
  return (
    <div className="mock-alert-wrapper">
      <div className="mock-phone">
        <div className="phone-notch" />
        <div className="phone-screen">
          <div className="wa-header">
            <div className="wa-avatar">🏠</div>
            <div>
              <div className="wa-name">SnapAlert</div>
              <div className="wa-status">Online</div>
            </div>
          </div>
          <div className="wa-messages">
            <div className="wa-bubble">
              <div className="wa-bubble-header">🏠 <strong>SnapAlert — 94% Match!</strong></div>
              <div className="wa-address">2847 Oakwood Dr, San Jose</div>
              <div className="wa-price">💰 $1.15M</div>
              <div className="wa-stats">🛏 4BR | 🛁 3BA | 2,240 sqft</div>
              <div className="wa-explain">✨ 4BR ✓ · $350K under budget · pool ✓ · great schools ✓</div>
              <div className="wa-urgency">🔥 14 buyers viewed today</div>
              <div className="wa-cta">📅 Schedule Showing →</div>
            </div>
          </div>
        </div>
      </div>
      <div className="mock-badge">Just now ⚡</div>
    </div>
  );
}
