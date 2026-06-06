import React, { useState } from 'react';
import { useSnapAlert } from '../context/SnapAlertContext';
import { createUser, enableSnapAlert, verifySnapAlert, updatePreferences } from '../api/client';
import './OptInModal.css';

const STEPS = ['register', 'phone', 'verify', 'preferences', 'success'];

const CITIES = ['San Jose', 'San Francisco', 'Los Angeles', 'San Diego', 'Oakland', 'Sacramento'];
const KEYWORDS = ['pool', 'garage', 'modern', 'renovated', 'solar', 'smart home', 'view', 'school district', 'new construction', 'quiet street'];
const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family'];

export default function OptInModal({ onClose }) {
  const { userId, setUserId, setEnabled, refreshSettings, refreshAlerts } = useSnapAlert();

  const [step, setStep] = useState(userId ? 'phone' : 'register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [prefs, setPrefs] = useState({
    city: 'San Jose',
    state: 'CA',
    min_price: 800000,
    max_price: 1500000,
    min_beds: 3,
    min_baths: 2,
    property_types: ['Single Family'],
    keywords: ['garage', 'schools'],
  });

  const currentStepIndex = STEPS.indexOf(step);
  const progress = ((currentStepIndex) / (STEPS.length - 1)) * 100;

  // Step 1: Register
  async function handleRegister() {
    setError('');
    if (!email.trim()) return setError('Please enter your email');
    setLoading(true);
    try {
      const user = await createUser({ email: email.trim(), name: name.trim() });
      setUserId(user.id);
      setStep('phone');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Send OTP
  async function handleSendOTP() {
    setError('');
    if (!phone.replace('+', '').trim()) return setError('Please enter your phone number');
    if (!userId) return setError('Please register first');
    setLoading(true);
    try {
      const result = await enableSnapAlert(userId, `whatsapp:${phone.trim()}`);
      setDemoCode(result.demo_code || '');
      setStep('verify');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to send verification. Check your phone number.');
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Verify OTP
  async function handleVerify() {
    setError('');
    if (!code.trim()) return setError('Please enter the verification code');
    setLoading(true);
    try {
      await verifySnapAlert(userId, code.trim());
      setEnabled(true);
      setStep('preferences');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // Step 4: Save preferences
  async function handleSavePrefs() {
    setLoading(true);
    try {
      await updatePreferences(userId, prefs);
      await refreshSettings();
      await refreshAlerts();
      setStep('success');
    } catch (e) {
      setError('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  }

  function toggleKeyword(kw) {
    setPrefs(p => ({
      ...p,
      keywords: p.keywords.includes(kw)
        ? p.keywords.filter(k => k !== kw)
        : [...p.keywords, kw],
    }));
  }

  function togglePropertyType(pt) {
    setPrefs(p => ({
      ...p,
      property_types: p.property_types.includes(pt)
        ? p.property_types.filter(t => t !== pt)
        : [...p.property_types, pt],
    }));
  }

  return (
    <div className="modal-overlay animate-fade" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card animate-fade-up">

        {/* Header */}
        <div className="modal-header">
          <div className="modal-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <h2 className="modal-title">Enable <span className="gradient-text">SnapAlert</span></h2>
            <p className="modal-subtitle">Get WhatsApp alerts when your perfect home lists</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Progress bar */}
        {step !== 'success' && (
          <div className="modal-progress">
            <div className="modal-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="modal-body">
          {error && (
            <div className="modal-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* ── Step: Register ─────────────────────────────────────────── */}
          {step === 'register' && (
            <div className="step-content animate-fade-up">
              <div className="step-icon">📧</div>
              <h3>Create your account</h3>
              <p className="step-desc">We'll match listings to your personal preferences</p>
              <div className="form-group">
                <label>Full Name</label>
                <input id="register-name" className="input" placeholder="John Smith" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input id="register-email" className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()} />
              </div>
              <button id="register-btn" className="btn-primary w-full" onClick={handleRegister} disabled={loading}>
                {loading ? <Spinner /> : null}
                {loading ? 'Creating account…' : 'Continue →'}
              </button>
            </div>
          )}

          {/* ── Step: Phone ────────────────────────────────────────────── */}
          {step === 'phone' && (
            <div className="step-content animate-fade-up">
              <div className="step-icon">📱</div>
              <h3>Add your WhatsApp number</h3>
              <p className="step-desc">We'll send instant alerts on WhatsApp — 98% open rate</p>
              <div className="form-group">
                <label>WhatsApp Number</label>
                <input
                  id="phone-input"
                  className="input"
                  type="tel"
                  placeholder="+919346460532"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                />
                <span className="input-hint">Include country code (e.g. +91 for India)</span>
              </div>
              <div className="whatsapp-note">
                <span>💬</span>
                <span>Make sure you've joined the Twilio WhatsApp sandbox by sending <strong>"join record-brain"</strong> to <strong>+1 415 523 8886</strong></span>
              </div>
              <button id="send-otp-btn" className="btn-primary w-full" onClick={handleSendOTP} disabled={loading}>
                {loading ? <Spinner /> : '💬'}
                {loading ? 'Sending code…' : 'Send Verification Code'}
              </button>
            </div>
          )}

          {/* ── Step: Verify ───────────────────────────────────────────── */}
          {step === 'verify' && (
            <div className="step-content animate-fade-up">
              <div className="step-icon">🔐</div>
              <h3>Enter verification code</h3>
              <p className="step-desc">Check your WhatsApp for the 6-digit code</p>
              {demoCode && (
                <div className="demo-code-hint">
                  <span>🎯 Demo code: <strong>{demoCode}</strong></span>
                </div>
              )}
              <div className="form-group">
                <label>Verification Code</label>
                <input
                  id="otp-input"
                  className="input otp-input"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                />
              </div>
              <button id="verify-btn" className="btn-primary w-full" onClick={handleVerify} disabled={loading || code.length < 6}>
                {loading ? <Spinner /> : '✓'}
                {loading ? 'Verifying…' : 'Verify Code'}
              </button>
              <button className="btn-ghost w-full mt-8" onClick={() => setStep('phone')}>
                ← Resend code
              </button>
            </div>
          )}

          {/* ── Step: Preferences ──────────────────────────────────────── */}
          {step === 'preferences' && (
            <div className="step-content animate-fade-up">
              <div className="step-icon">🎯</div>
              <h3>Set your search preferences</h3>
              <p className="step-desc">We'll build your AI preference vector from these</p>

              <div className="prefs-grid">
                <div className="form-group">
                  <label>Target City</label>
                  <select id="pref-city" className="input" value={prefs.city} onChange={e => setPrefs(p => ({ ...p, city: e.target.value }))}>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Min Beds</label>
                  <select id="pref-beds" className="input" value={prefs.min_beds} onChange={e => setPrefs(p => ({ ...p, min_beds: Number(e.target.value) }))}>
                    {[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Min Price ($)</label>
                  <input id="pref-min-price" className="input" type="number" step="50000"
                    value={prefs.min_price} onChange={e => setPrefs(p => ({ ...p, min_price: Number(e.target.value) }))} />
                </div>

                <div className="form-group">
                  <label>Max Price ($)</label>
                  <input id="pref-max-price" className="input" type="number" step="50000"
                    value={prefs.max_price} onChange={e => setPrefs(p => ({ ...p, max_price: Number(e.target.value) }))} />
                </div>
              </div>

              <div className="form-group">
                <label>Property Type</label>
                <div className="tag-group">
                  {PROPERTY_TYPES.map(pt => (
                    <button key={pt} id={`pt-${pt.replace(/\s/g,'-').toLowerCase()}`}
                      className={`tag ${prefs.property_types.includes(pt) ? 'active' : ''}`}
                      onClick={() => togglePropertyType(pt)}>{pt}</button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Must-Have Features</label>
                <div className="tag-group">
                  {KEYWORDS.map(kw => (
                    <button key={kw} id={`kw-${kw.replace(/\s/g,'-')}`}
                      className={`tag ${prefs.keywords.includes(kw) ? 'active' : ''}`}
                      onClick={() => toggleKeyword(kw)}>{kw}</button>
                  ))}
                </div>
              </div>

              <button id="save-prefs-btn" className="btn-primary w-full" onClick={handleSavePrefs} disabled={loading}>
                {loading ? <Spinner /> : '🚀'}
                {loading ? 'Saving…' : 'Activate SnapAlert'}
              </button>
            </div>
          )}

          {/* ── Step: Success ──────────────────────────────────────────── */}
          {step === 'success' && (
            <div className="step-content success-step animate-fade-up">
              <div className="success-animation">
                <div className="success-ring" />
                <div className="success-ring delay" />
                <div className="success-icon-wrapper">
                  <span>🔔</span>
                </div>
              </div>
              <h3 className="success-title">SnapAlert is <span className="gradient-text">ON</span>!</h3>
              <p className="step-desc">You'll get WhatsApp alerts within 5 minutes of matching listings</p>
              <div className="success-features">
                <div className="feature-item"><span>⚡</span><span>5-minute alert SLA</span></div>
                <div className="feature-item"><span>🤖</span><span>AI-powered match explanation</span></div>
                <div className="feature-item"><span>📅</span><span>One-tap showing booking</span></div>
              </div>
              <button id="success-done-btn" className="btn-primary w-full" onClick={onClose}>
                🎉 Start Searching
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
    </svg>
  );
}
