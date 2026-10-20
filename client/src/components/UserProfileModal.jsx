import React, { useState, useEffect } from 'react';
import { apiFetch as fetch } from '../api.js';
import { useAuth } from '../context/AuthContext';
import {
  X, User, Mail, Calendar, Clock, CheckCircle2, AlertCircle,
  Briefcase, MessageSquare, Plus, Shield, Award, ExternalLink, Activity
} from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose, userId, onStartChat, onAssignTask }) {
  const { token, user: currentUser, addToast } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchUserProfile = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/users/${userId}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setProfile(data.profile);
        } else {
          addToast(data.message || 'Failed to load profile', 'error');
        }
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [isOpen, userId, token]);

  if (!isOpen) return null;

  const handleToggleStatus = async () => {
    if (!profile) return;
    const newStatus = profile.status === 'active' ? 'suspended' : 'active';
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/users/${profile.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setProfile(prev => ({ ...prev, status: newStatus }));
      addToast(`User account status updated to ${newStatus}`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getDepartmentBadge = (dept) => {
    const d = (dept || '').toLowerCase();
    if (d.includes('student')) return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.4)' };
    if (d.includes('working') || d.includes('profession')) return { bg: 'rgba(129, 140, 248, 0.15)', color: '#818cf8', border: 'rgba(129, 140, 248, 0.4)' };
    if (d.includes('job') || d.includes('seeker')) return { bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: 'rgba(52, 211, 153, 0.4)' };
    if (d.includes('vip')) return { bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: 'rgba(236, 72, 153, 0.4)' };
    return { bg: 'rgba(167, 139, 250, 0.15)', color: '#c084fc', border: 'rgba(167, 139, 250, 0.4)' };
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px', borderRadius: '20px', overflow: 'hidden' }}
      >
        {/* Modal Header Cover */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.35) 0%, rgba(139, 92, 246, 0.25) 100%)',
          padding: '24px 24px 16px',
          borderBottom: '1px solid var(--border-light)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} style={{ color: '#818cf8' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#c7d2fe', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Team Member Profile Overview
              </span>
            </div>
            <button onClick={onClose} className="btn btn-secondary btn-icon btn-sm">
              <X size={16} />
            </button>
          </div>
        </div>

        {isLoading || !profile ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-faint)' }}>
            <Activity className="animate-spin" size={28} style={{ margin: '0 auto 12px', color: '#6366f1' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>Loading member profile...</p>
          </div>
        ) : (
          <div style={{ padding: '24px' }}>
            {/* Top Identity Card */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
              {/* Profile Photo with Click to Zoom */}
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setIsPhotoExpanded(!isPhotoExpanded)}>
                <img
                  src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.name)}`}
                  alt={profile.name}
                  style={{
                    width: isPhotoExpanded ? '110px' : '84px',
                    height: isPhotoExpanded ? '110px' : '84px',
                    borderRadius: '20px',
                    objectFit: 'cover',
                    border: '3px solid rgba(99, 102, 241, 0.5)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    background: 'var(--bg-surface)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  title="Click to zoom profile photo"
                />
                <span style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: profile.status === 'active' ? '#10b981' : '#ef4444',
                  border: '2px solid #0f172a'
                }} />
              </div>

              {/* Name & Primary Role */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                    {profile.name}
                  </h3>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '12px',
                    ...getDepartmentBadge(profile.department)
                  }}>
                    {profile.department || 'Student'}
                  </span>
                </div>

                <p style={{ margin: '4px 0 10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {profile.email}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: profile.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: profile.status === 'active' ? '#34d399' : '#f87171'
                  }}>
                    Status: {profile.status ? profile.status.toUpperCase() : 'ACTIVE'}
                  </span>

                  <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                    Member #{String(profile.id).padStart(4, '0')}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Metric Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '22px'
            }}>
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: '14px',
                padding: '14px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600 }}>Total Assigned</span>
                <h4 style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 0', color: '#818cf8' }}>
                  {profile.total_tasks || 0}
                </h4>
              </div>

              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: '14px',
                padding: '14px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600 }}>Completed</span>
                <h4 style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 0', color: '#34d399' }}>
                  {profile.completed_tasks || 0}
                </h4>
              </div>

              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: '14px',
                padding: '14px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600 }}>Completion Rate</span>
                <h4 style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 0', color: '#fbbf24' }}>
                  {profile.total_tasks > 0 ? Math.round((profile.completed_tasks / profile.total_tasks) * 100) : 0}%
                </h4>
              </div>
            </div>

            {/* Account Audit Details */}
            <div style={{
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: '14px',
              padding: '16px',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} style={{ color: '#818cf8' }} /> Account Registered:
                </span>
                <strong style={{ color: '#f1f5f9' }}>
                  {profile.created_at ? new Date(profile.created_at).toLocaleString() : 'N/A'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} style={{ color: '#34d399' }} /> Last Login Session:
                </span>
                <strong style={{ color: '#f1f5f9' }}>
                  {profile.last_login_at ? new Date(profile.last_login_at).toLocaleString() : 'Never logged in'}
                </strong>
              </div>
            </div>

            {/* Admin Action Buttons */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {onStartChat && (
                  <button
                    onClick={() => {
                      onStartChat(profile);
                      onClose();
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '6px' }}
                  >
                    <MessageSquare size={14} />
                    <span>Send Message</span>
                  </button>
                )}

                {onAssignTask && (
                  <button
                    onClick={() => {
                      onAssignTask(profile);
                      onClose();
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '6px' }}
                  >
                    <Plus size={14} />
                    <span>Assign Task</span>
                  </button>
                )}

                {profile.role !== 'admin' && (
                  <button
                    onClick={handleToggleStatus}
                    disabled={isUpdatingStatus}
                    className={`btn btn-sm ${profile.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                    style={{ gap: '6px' }}
                  >
                    <AlertCircle size={14} />
                    <span>{profile.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
