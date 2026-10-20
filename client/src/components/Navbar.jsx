import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bell, Mail, CheckCheck, CheckCircle2, MessageSquare,
  AlertCircle, Sparkles, MoreVertical, LogOut,
  LayoutDashboard, CheckSquare, TableProperties, Users,
  FolderOpen, MessageSquare as ChatIcon, User, Settings,
  Contact, X, Shield
} from 'lucide-react';
import websiteLogo from '../assets/Website Logo.png';
import logoImg from '../assets/logo.jpg';
import LogoLightboxModal from './LogoLightboxModal';

export default function Navbar({
  activeView,
  onOpenDevMailbox,
  onOpenAdminProfile,
  isIdCardOpen,
  onToggleIdCard,
  onSetActiveView
}) {
  const {
    user,
    logout,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead
  } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [isLogoLightboxOpen, setIsLogoLightboxOpen] = useState(false);
  const dotMenuRef = useRef(null);
  const notifRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dotMenuRef.current && !dotMenuRef.current.contains(e.target)) setShowDotMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_assigned': case 'task_update': return <CheckCircle2 size={16} style={{ color: '#818cf8' }} />;
      case 'chat_message': return <MessageSquare size={16} style={{ color: '#38bdf8' }} />;
      case 'submission': return <Sparkles size={16} style={{ color: '#34d399' }} />;
      default: return <AlertCircle size={16} style={{ color: '#fbbf24' }} />;
    }
  };

  // Nav items for 3-dot menu
  const adminNavItems = [
    { id: 'dashboard', label: 'Admin Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'tasks', label: 'Tasks Management', icon: <CheckSquare size={16} /> },
    { id: 'logs', label: 'Login Activity', icon: <TableProperties size={16} /> },
    { id: 'team', label: 'Team Members', icon: <Users size={16} /> },
    { id: 'credentials', label: 'User Credentials', icon: <Shield size={16} /> },
    { id: 'files', label: 'User Files & Media', icon: <FolderOpen size={16} /> },
    { id: 'chat', label: 'Private Messages', icon: <ChatIcon size={16} /> },
  ];

  const userNavItems = [
    { id: 'tasks', label: 'My Assigned Tasks', icon: <CheckSquare size={16} /> },
    { id: 'chat', label: 'Chat with Admin', icon: <ChatIcon size={16} /> },
    { id: 'files', label: 'My Uploaded Files', icon: <FolderOpen size={16} /> },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  // Official Support & Helpdesk email
  const ADMIN_HELP_EMAIL = 'jerisonge0@gmail.com';

  const menuItemStyle = {
    display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 14px',
    background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px',
    fontWeight: 500, cursor: 'pointer', borderRadius: '8px', textAlign: 'left',
    transition: 'all 120ms'
  };

  return (
    <header className="glass-header" style={{
      position: 'sticky', top: 0, zIndex: 100,
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'
    }}>
      {/* Brand & Logo with Click-to-View Lightbox */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          type="button"
          onClick={() => setIsLogoLightboxOpen(true)}
          title="Click to view full size logo"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <img
            src={websiteLogo || "/Website Logo.png"}
            onError={(e) => { e.currentTarget.src = logoImg; }}
            alt="TeamTask Official Logo"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              objectFit: 'cover',
              boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
              border: '1.5px solid rgba(99,102,241,0.5)',
              transition: 'transform 150ms ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          />
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px', margin: 0, color: '#ffffff' }}>
              TeamTask
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600 }}>
              Enterprise Edition
            </span>
          </div>
        </button>

        <div style={{ width: '1px', height: '22px', background: 'var(--border-light)' }} />

        {/* Role Pill */}
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: isAdmin ? 'rgba(139, 92, 246, 0.16)' : 'rgba(16, 185, 129, 0.16)',
          color: isAdmin ? '#c084fc' : '#34d399',
          border: `1px solid ${isAdmin ? 'rgba(139, 92, 246, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <span className="status-dot status-dot-active" />
          {isAdmin ? 'Administrator Workspace' : 'Team Member Portal'}
        </span>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Dev Mailbox (Admin only) */}
        {isAdmin && (
          <button onClick={onOpenDevMailbox} className="btn btn-secondary btn-sm"
            style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc', padding: '7px 12px' }}
            title="Open Dev Mailbox / Inspect OTPs">
            <Mail size={15} />
            <span style={{ fontWeight: 600 }}>Mailbox & OTPs</span>
          </button>
        )}

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button onClick={() => setShowNotifications(!showNotifications)}
            className="btn btn-secondary btn-icon" style={{ position: 'relative' }} title="Notifications">
            <Bell size={18} />
            {unreadNotificationsCount > 0 && (
              <span style={{
                position: 'absolute', top: '-3px', right: '-3px',
                width: '18px', height: '18px', borderRadius: '50%',
                background: '#ef4444', color: '#ffffff', fontSize: '10px', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 8px rgba(239,68,68,0.6)'
              }}>
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute', top: '46px', right: 0, width: '360px', maxHeight: '440px',
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg), 0 0 20px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', zIndex: 1000, animation: 'scaleUp 150ms ease-out'
            }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} style={{ color: '#818cf8' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>Notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="badge badge-urgent" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      {unreadNotificationsCount} New
                    </span>
                  )}
                </div>
                {unreadNotificationsCount > 0 && (
                  <button onClick={markAllNotificationsRead} style={{
                    background: 'none', border: 'none', color: '#818cf8', fontSize: '11px',
                    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    <CheckCheck size={13} />Mark all read
                  </button>
                )}
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-faint)' }}>
                    <Bell size={24} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '12px' }}>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} onClick={() => markNotificationRead(notif.id)} style={{
                      padding: '10px 12px', borderRadius: 'var(--radius-md)',
                      background: notif.is_read ? 'transparent' : 'rgba(99,102,241,0.08)',
                      borderBottom: '1px solid var(--border-light)',
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                      cursor: 'pointer', transition: 'background 120ms'
                    }}>
                      <div style={{ marginTop: '2px' }}>{getNotificationIcon(notif.type)}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '12px', fontWeight: notif.is_read ? 500 : 700, color: notif.is_read ? 'var(--text-muted)' : '#ffffff', margin: 0 }}>
                          {notif.title}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '2px 0 0', lineHeight: 1.3 }}>{notif.message}</p>
                        <span style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px', display: 'block' }}>
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {!notif.is_read && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', marginTop: '6px' }} />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill (avatar only, no Edit label) */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'var(--bg-card)',
          border: isAdmin ? '1px solid rgba(251,191,36,0.45)' : '1px solid rgba(99,102,241,0.4)',
          padding: '4px 12px 4px 6px', borderRadius: 'var(--radius-full)',
          boxShadow: isAdmin ? '0 2px 8px rgba(245,158,11,0.15)' : '0 2px 8px rgba(99,102,241,0.15)',
        }}>
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
            alt={user?.name}
            style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-surface)' }}
          />
          <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>{user?.name}</span>
            <span style={{ fontSize: '10px', color: isAdmin ? '#fbbf24' : '#818cf8' }}>
              {user?.department || (isAdmin ? 'Administrator' : 'Team Member')}
            </span>
          </div>
        </div>

        {/* 3-Dot Menu */}
        <div style={{ position: 'relative' }} ref={dotMenuRef}>
          <button
            onClick={() => setShowDotMenu(!showDotMenu)}
            className="btn btn-secondary btn-icon"
            title="More Options"
            style={{
              background: showDotMenu ? 'rgba(99,102,241,0.2)' : undefined,
              borderColor: showDotMenu ? 'rgba(99,102,241,0.5)' : undefined
            }}
          >
            <MoreVertical size={18} />
          </button>

          {showDotMenu && (
            <div style={{
              position: 'absolute', top: '46px', right: 0, width: '260px',
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg), 0 0 24px rgba(0,0,0,0.5)',
              zIndex: 1000, animation: 'scaleUp 150ms ease-out', overflow: 'hidden'
            }}>
              {/* Navigation Section */}
              <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid var(--border-light)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '4px 8px 6px' }}>
                  Navigation
                </p>
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { onSetActiveView && onSetActiveView(item.id); setShowDotMenu(false); }}
                    style={{
                      ...menuItemStyle,
                      background: activeView === item.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                      color: activeView === item.id ? '#a5b4fc' : 'var(--text-muted)',
                      fontWeight: activeView === item.id ? 700 : 500
                    }}
                    onMouseEnter={(e) => { if (activeView !== item.id) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; } }}
                    onMouseLeave={(e) => { if (activeView !== item.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                  >
                    <span style={{ color: activeView === item.id ? 'var(--accent-primary)' : 'var(--text-faint)' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* ID Card */}
              <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-light)' }}>
                <button
                  onClick={() => { onToggleIdCard(); setShowDotMenu(false); }}
                  style={{ ...menuItemStyle, color: isIdCardOpen ? '#facc15' : 'var(--text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(234,179,8,0.08)'; e.currentTarget.style.color = '#facc15'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isIdCardOpen ? '#facc15' : 'var(--text-muted)'; }}
                >
                  <Contact size={16} style={{ color: '#facc15' }} />
                  {isIdCardOpen ? 'Hide ID Card' : 'Show ID Card'}
                </button>
              </div>

              {/* Account Settings */}
              <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-light)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '4px 8px 4px' }}>
                  Account
                </p>
                <button
                  onClick={() => { onOpenAdminProfile(); setShowDotMenu(false); }}
                  style={menuItemStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = '#a5b4fc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <User size={16} style={{ color: '#818cf8' }} />
                  Account Details
                </button>
              </div>

              {/* Sign Out */}
              <div style={{ padding: '6px 8px 8px' }}>
                <button
                  onClick={() => { logout(); setShowDotMenu(false); }}
                  style={{ ...menuItemStyle, color: '#f87171' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f87171'; }}
                >
                  <LogOut size={16} style={{ color: '#f87171' }} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-Size Interactive Logo Lightbox Modal */}
      <LogoLightboxModal
        isOpen={isLogoLightboxOpen}
        onClose={() => setIsLogoLightboxOpen(false)}
        logoSrc={websiteLogo || "/Website Logo.png"}
      />
    </header>
  );
}
