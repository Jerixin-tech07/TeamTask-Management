import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  TableProperties,
  Users,
  FolderOpen,
  MessageSquare,
  ShieldAlert,
  UserCog
} from 'lucide-react';

export default function Sidebar({ activeView, setActiveView, onOpenProfile }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const adminNavItems = [
    { id: 'dashboard', label: 'Admin Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'tasks', label: 'Tasks Management', icon: <CheckSquare size={18} /> },
    { id: 'logs', label: 'Login Activity Spreadsheet', icon: <TableProperties size={18} /> },
    { id: 'team', label: 'Team Members (15-20)', icon: <Users size={18} /> },
    { id: 'files', label: 'User Files & Media', icon: <FolderOpen size={18} /> },
    { id: 'chat', label: 'Private Messages', icon: <MessageSquare size={18} /> }
  ];

  const userNavItems = [
    { id: 'tasks', label: 'My Assigned Tasks', icon: <CheckSquare size={18} /> },
    { id: 'chat', label: 'Chat with Admin', icon: <MessageSquare size={18} /> },
    { id: 'files', label: 'My Uploaded Files', icon: <FolderOpen size={18} /> }
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <aside style={{
      width: '260px',
      flexShrink: 0,
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border-light)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 14px',
      gap: '20px'
    }}>
      {/* Navigation Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          padding: '0 12px 8px'
        }}>
          {isAdmin ? 'Administration' : 'Member Workspace'}
        </p>

        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(139, 92, 246, 0.12) 100%)' : 'transparent',
                color: isActive ? '#a5b4fc' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
                borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#ffffff';
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-muted)';
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-faint)' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Dedicated Profile Navigation Button in Sidebar */}
        <button
          onClick={onOpenProfile}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontWeight: 500,
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all var(--transition-fast)',
            marginTop: '4px',
            borderLeft: '3px solid transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#a5b4fc';
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
          title={isAdmin ? 'Edit administrator name, photo, and settings' : 'Edit my name, photo, and settings'}
        >
          <span style={{ color: '#818cf8' }}>
            <UserCog size={18} />
          </span>
          <span>{isAdmin ? 'Edit Admin Profile' : 'Edit My Profile'}</span>
        </button>
      </div>

      {/* User Profile Quick Card with Instant Edit Button */}
      <div style={{
        marginTop: 'auto',
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.22)',
        borderRadius: 'var(--radius-md)',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
            alt={user?.name}
            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', background: 'var(--bg-surface)' }}
          />
          <div style={{ minWidth: 0 }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#f8fafc',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {user?.name}
            </span>
            <span style={{ fontSize: '10px', color: isAdmin ? '#fbbf24' : '#818cf8', display: 'block' }}>
              {user?.department || (isAdmin ? 'Administrator' : 'Team Member')}
            </span>
          </div>
        </div>
      </div>

      {/* Workspace Quick Summary Card */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.04)',
        border: '1px solid rgba(99, 102, 241, 0.12)',
        borderRadius: 'var(--radius-md)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={15} style={{ color: '#818cf8' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#f1f5f9' }}>
            Protected Workspace
          </span>
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-faint)', lineHeight: 1.4, margin: 0 }}>
          Tasks and media uploads are isolated and strictly accessible only to you and the Administrator.
        </p>
      </div>
    </aside>
  );
}
