import React from 'react';
import { markAlertClicked } from '../api/client';
import './AlertCard.css';

export default function AlertCard({ alert, onBook }) {
  const pct = Math.round((alert.match_score || 0) * 100);
  const price = alert.price || 0;
  const priceStr = price >= 1_000_000
    ? `$${(price / 1_000_000).toFixed(2)}M`
    : `$${price.toLocaleString()}`;

  const scoreColor =
    pct >= 90 ? '#10b981' :
    pct >= 75 ? '#a78bfa' :
    pct >= 60 ? '#f59e0b' : '#64748b';

  function handleShowingClick() {
    markAlertClicked(alert.id).catch(() => {});
    if (onBook) onBook(alert);
    else window.open(alert.listing_url || '#', '_blank');
  }

  const timeAgo = formatTimeAgo(alert.sms_sent_at);

  return (
    <article className="alert-card glass-card animate-slide">
      {/* Photo */}
      <div className="alert-photo">
        {alert.photo_url ? (
          <img src={alert.photo_url} alt={alert.address} loading="lazy" />
        ) : (
          <div className="alert-photo-placeholder">🏠</div>
        )}
        {/* Score badge overlay */}
        <div className="score-overlay" style={{ '--score-color': scoreColor }}>
          <span className="score-number">{pct}%</span>
          <span className="score-label">match</span>
        </div>
        {/* Urgency signal */}
        {alert.buyers_viewed > 0 && (
          <div className="urgency-badge">
            🔥 {alert.buyers_viewed} viewing
          </div>
        )}
      </div>

      {/* Body */}
      <div className="alert-body">
        {/* Address + Time */}
        <div className="alert-meta">
          <div className="alert-address-wrap">
            <h3 className="alert-address">{alert.address?.split(',')[0] || 'Property'}</h3>
            <span className="alert-city">{alert.city}, {alert.state}</span>
          </div>
          <span className="alert-time">{timeAgo}</span>
        </div>

        {/* Price + Stats */}
        <div className="alert-stats">
          <span className="alert-price">{priceStr}</span>
          <div className="alert-pills">
            <span className="pill">🛏 {alert.beds}BR</span>
            <span className="pill">🛁 {alert.baths}BA</span>
            {alert.sqft > 0 && <span className="pill">📐 {alert.sqft?.toLocaleString()} sqft</span>}
          </div>
        </div>

        {/* Match Score Bar */}
        <div className="alert-score-section">
          <div className="score-bar">
            <div className="score-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${scoreColor}99, ${scoreColor})` }} />
          </div>
        </div>

        {/* AI Explanation */}
        {alert.match_explanation && (
          <div className="alert-explanation">
            <span className="explanation-icon">🤖</span>
            <p>{alert.match_explanation}</p>
          </div>
        )}

        {/* Actions */}
        <div className="alert-actions">
          <button
            id={`schedule-btn-${alert.id}`}
            className="btn-primary schedule-btn"
            onClick={handleShowingClick}
          >
            📅 Schedule Showing
          </button>
          {alert.clicked && (
            <span className="viewed-tag">✓ Viewed</span>
          )}
        </div>
      </div>
    </article>
  );
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
