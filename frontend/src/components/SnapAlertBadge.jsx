import React, { useState, useEffect, useRef } from 'react';
import { useSnapAlert } from '../context/SnapAlertContext';
import OptInModal from './OptInModal';
import './SnapAlertBadge.css';

export default function SnapAlertBadge() {
  const { enabled, unreadCount, markAllRead, alerts } = useSnapAlert();
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const dropdownRef = useRef(null);

  // Shake bell when new alerts arrive
  useEffect(() => {
    if (unreadCount > 0) {
      setIsShaking(true);
      const t = setTimeout(() => setIsShaking(false), 1000);
      return () => clearTimeout(t);
    }
  }, [unreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = () => {
    if (!enabled) {
      setShowModal(true);
    } else {
      setShowDropdown(v => !v);
      markAllRead();
    }
  };

  const recentAlerts = alerts.slice(0, 4);

  return (
    <>
      <div className="snap-badge-wrapper" ref={dropdownRef}>
        <button
          id="snapalert-bell-btn"
          className={`snap-bell-btn ${enabled ? 'enabled' : 'disabled'} ${isShaking ? 'shaking' : ''}`}
          onClick={handleClick}
          aria-label="SnapAlert notifications"
          title={enabled ? 'View your SnapAlerts' : 'Enable SnapAlert'}
        >
          {/* Pulse ring when enabled */}
          {enabled && <span className="pulse-ring" />}

          {/* Bell icon */}
          <svg className="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>

          {/* Unread badge */}
          {enabled && unreadCount > 0 && (
            <span className="unread-badge" key={unreadCount}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}

          {/* "OFF" state indicator */}
          {!enabled && (
            <span className="off-indicator">OFF</span>
          )}
        </button>

        {/* Mini dropdown */}
        {showDropdown && enabled && (
          <div className="snap-dropdown animate-fade">
            <div className="snap-dropdown-header">
              <span className="snap-dropdown-title">
                <span className="dot-green" /> SnapAlert Active
              </span>
              <a href="/snapalert" className="snap-view-all">View all →</a>
            </div>

            {recentAlerts.length === 0 ? (
              <div className="snap-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <p>Watching for new listings…</p>
                <span>You'll get alerted within 5 min</span>
              </div>
            ) : (
              <div className="snap-alert-list">
                {recentAlerts.map(alert => (
                  <a
                    key={alert.id}
                    href={alert.listing_url || '#'}
                    className="snap-alert-mini"
                    target="_blank"
                    rel="noopener"
                  >
                    <div className="snap-alert-mini-img">
                      {alert.photo_url
                        ? <img src={alert.photo_url} alt="" />
                        : <span>🏠</span>
                      }
                    </div>
                    <div className="snap-alert-mini-info">
                      <span className="mini-address">{alert.address?.split(',')[0]}</span>
                      <span className="mini-price">
                        ${alert.price >= 1000000
                          ? `${(alert.price / 1000000).toFixed(2)}M`
                          : alert.price?.toLocaleString()
                        }
                      </span>
                    </div>
                    <span className="mini-score">
                      {Math.round(alert.match_score * 100)}%
                    </span>
                  </a>
                ))}
              </div>
            )}

            <a href="/snapalert" className="snap-dashboard-btn">
              Open Dashboard
            </a>
          </div>
        )}
      </div>

      {showModal && (
        <OptInModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
