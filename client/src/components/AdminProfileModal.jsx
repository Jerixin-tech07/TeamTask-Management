import React, { useState, useRef, useEffect } from 'react';
import { apiFetch as fetch } from '../api.js';
import { useAuth } from '../context/AuthContext';
import {
  X, Crown, Camera, Lock, CheckCircle2, Upload, Sparkles,
  User, Save, Loader2, KeyRound, Mail, LogOut, ShieldCheck, Briefcase
} from 'lucide-react';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminBoss',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=FelixAdmin',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=PrestigeDirector',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=CyberChief',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexandriaMaster',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=VanguardLead',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=StudentPro',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=TechEnthusiast'
];

export default function AdminProfileModal({ isOpen, onClose }) {
  const { user, updateUserProfile, addToast, logout } = useAuth();
  const fileInputRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  // Form states - fully editable at anytime!
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [avatar, setAvatar] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setDepartment(user.department || (user.role === 'admin' ? 'Administrator' : 'Team Member'));
      setAvatar(user.avatar || AVATAR_PRESETS[0]);
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      addToast('Please upload a JPG, PNG, GIF, or WebP image', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      addToast('Profile images must be 2 MB or smaller', 'error');
      e.target.value = '';
      return;
    }
    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await fetch('/api/users/upload-avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('teamtask_token')}` },
        body: formData
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to upload photo');
      setAvatar(data.avatar || AVATAR_PRESETS[0]);
      addToast('Photo uploaded and saved. Save All Changes to apply other profile edits.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to upload image', 'error');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();

    // For regular users, only save avatar changes
    if (!isAdmin) {
      setIsSavingAll(true);
      try {
        await updateUserProfile({
          avatar: avatar,
        });
        addToast('Profile photo updated successfully!', 'success');
        onClose();
      } catch (err) {
        addToast(err.message || 'Failed to update photo', 'error');
      } finally {
        setIsSavingAll(false);
      }
      return;
    }

    if (!name.trim()) {
      addToast('Display name is required', 'error');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      addToast('Please enter a valid email address', 'error');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        addToast('New password must be at least 6 characters long', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        addToast('New password and confirmation do not match', 'error');
        return;
      }
    }

    setIsSavingAll(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        email: cleanEmail,
        department: department.trim() || (isAdmin ? 'Administrator' : 'Team Member'),
        avatar: avatar,
        newPassword: newPassword ? newPassword.trim() : undefined
      });
      addToast(isAdmin ? 'Administrator details updated successfully!' : 'Account details updated successfully!', 'success');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to update details', 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          maxHeight: '92vh',
          borderRadius: '24px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card, #0f172a)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
        }}
      >
        {/* Banner */}
        <div style={{
          background: isAdmin
            ? 'linear-gradient(135deg, rgba(245,158,11,0.28) 0%, rgba(139,92,246,0.28) 100%)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.28) 0%, rgba(16,185,129,0.28) 100%)',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.08))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: isAdmin ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', boxShadow: isAdmin ? '0 4px 14px rgba(245,158,11,0.45)' : '0 4px 14px rgba(99,102,241,0.45)'
            }}>
              {isAdmin ? <Crown size={20} /> : <User size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.2px' }}>
                {isAdmin ? 'Administrator Settings' : 'Account Settings'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                {isAdmin ? 'Edit your name, email, role, avatar, and password anytime' : 'Update your profile photo'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-icon btn-sm" style={{ borderRadius: '10px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSaveAll} style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* === SECTION 1: Profile Photo === */}
          <div style={{
            background: 'var(--bg-card-subtle, rgba(255,255,255,0.02))',
            border: '1px solid var(--border-light, rgba(255,255,255,0.08))',
            borderRadius: '16px', padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Camera size={15} style={{ color: isAdmin ? '#fbbf24' : '#818cf8' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>Profile Photo & Avatar</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={avatar || AVATAR_PRESETS[0]}
                  alt="Avatar Preview"
                  onError={() => setAvatar(AVATAR_PRESETS[0])}
                  style={{
                    width: '68px', height: '68px', borderRadius: '18px', objectFit: 'cover',
                    border: isAdmin ? '3px solid #fbbf24' : '3px solid #6366f1',
                    background: 'var(--bg-surface, #1e293b)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  title="Upload new image"
                  style={{
                    position: 'absolute', bottom: '-4px', right: '-4px',
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: '#6366f1', color: '#fff', border: '2px solid #0f172a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <Camera size={12} />
                </button>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    <Upload size={12} />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Image'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=User_${Date.now()}`)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    <Sparkles size={12} />
                    <span>Randomize</span>
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-faint, #64748b)' }}>Click any preset avatar below to apply instantly:</span>
              </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }} />

            {/* Presets */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {AVATAR_PRESETS.map((p, idx) => (
                <img
                  key={idx}
                  src={p}
                  alt={`Preset ${idx + 1}`}
                  onClick={() => setAvatar(p)}
                  style={{
                    width: '42px', height: '42px', borderRadius: '12px', cursor: 'pointer', flexShrink: 0,
                    border: avatar === p ? '2px solid #fbbf24' : '1px solid var(--border-light, rgba(255,255,255,0.1))',
                    padding: '2px', background: avatar === p ? 'rgba(251,191,36,0.18)' : 'var(--bg-surface, #1e293b)',
                    transition: 'all 120ms'
                  }}
                />
              ))}
            </div>
          </div>


          {/* === SECTION 2: Identity & Contact Details (Admin only) === */}
          {isAdmin && (
          <div style={{
            background: 'var(--bg-card-subtle, rgba(255,255,255,0.02))',
            border: '1px solid var(--border-light, rgba(255,255,255,0.08))',
            borderRadius: '16px', padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <User size={15} style={{ color: isAdmin ? '#fbbf24' : '#818cf8' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>Personal & Organization Details</span>
              <span style={{ fontSize: '10px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '1px 7px', borderRadius: '4px', fontWeight: 600 }}>
                Editable Anytime
              </span>
            </div>

            {/* Full Name */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint, #94a3b8)', display: 'block', marginBottom: '5px' }}>
                Full Display Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '36px', fontSize: '13px', height: '40px', borderRadius: '10px' }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint, #94a3b8)', display: 'block', marginBottom: '5px' }}>
                Email Address (Login & Notifications) *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '36px', fontSize: '13px', height: '40px', borderRadius: '10px' }}
                />
              </div>
              <span style={{ fontSize: '10px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                Note: Updating this will change the email address required for logging into your account.
              </span>
            </div>

            {/* Department / Role Title */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint, #94a3b8)', display: 'block', marginBottom: '5px' }}>
                Department / Role Title
              </label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Lead Administrator & Security"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ paddingLeft: '36px', fontSize: '13px', height: '40px', borderRadius: '10px' }}
                />
              </div>
            </div>
          </div>
          )}

          {/* === SECTION 2b: Read-only info for non-admin users === */}
          {!isAdmin && (
          <div style={{
            background: 'var(--bg-card-subtle, rgba(255,255,255,0.02))',
            border: '1px solid var(--border-light, rgba(255,255,255,0.08))',
            borderRadius: '16px', padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <User size={15} style={{ color: '#818cf8' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>Account Information</span>
              <span style={{ fontSize: '10px', background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '1px 7px', borderRadius: '4px', fontWeight: 600 }}>
                Read Only
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Only your profile photo can be changed. Contact your administrator to update other details.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-faint)' }}>Name:</span>
                <strong style={{ color: '#f1f5f9' }}>{user?.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-faint)' }}>Email:</span>
                <strong style={{ color: '#f1f5f9' }}>{user?.email}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-faint)' }}>Role:</span>
                <strong style={{ color: '#818cf8' }}>{user?.department || 'Team Member'}</strong>
              </div>
            </div>
          </div>
          )}

          {/* === SECTION 3: Change Password (Admin only) === */}
          {isAdmin && (
          <div style={{
            background: 'var(--bg-card-subtle, rgba(255,255,255,0.02))',
            border: '1px solid var(--border-light, rgba(255,255,255,0.08))',
            borderRadius: '16px', padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Lock size={15} style={{ color: isAdmin ? '#fbbf24' : '#818cf8' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>Change Password (Optional)</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', margin: '0 0 12px' }}>
              Leave blank if you don't wish to change your password. Enter 6+ characters to update immediately.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-faint, #64748b)', display: 'block', marginBottom: '4px' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ paddingLeft: '30px', fontSize: '12px', height: '36px', borderRadius: '8px' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-faint, #64748b)', display: 'block', marginBottom: '4px' }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      paddingLeft: '30px', fontSize: '12px', height: '36px', borderRadius: '8px',
                      borderColor: confirmPassword && newPassword !== confirmPassword ? '#ef4444' : undefined
                    }}
                  />
                </div>
              </div>
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <span style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginTop: '6px' }}>
                Passwords do not match.
              </span>
            )}
          </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1, height: '42px', fontSize: '13px', borderRadius: '12px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingAll}
              className="btn btn-primary"
              style={{
                flex: 2, height: '42px', fontSize: '13px', borderRadius: '12px',
                background: isAdmin ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: isAdmin ? '0 4px 14px rgba(245,158,11,0.35)' : '0 4px 14px rgba(99,102,241,0.35)'
              }}
            >
              {isSavingAll ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{isAdmin ? 'Save All Details' : 'Save Profile Photo'}</span>
                </>
              )}
            </button>
          </div>

          {/* Sign Out Link */}
          <div style={{ borderTop: '1px solid var(--border-light, rgba(255,255,255,0.08))', paddingTop: '12px' }}>
            <button
              type="button"
              onClick={() => { logout(); onClose(); }}
              className="btn btn-secondary"
              style={{
                width: '100%', height: '38px', fontSize: '12px',
                color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)',
                borderRadius: '10px'
              }}
            >
              <LogOut size={14} style={{ color: '#f87171' }} />
              <span>Sign Out of Workspace</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
