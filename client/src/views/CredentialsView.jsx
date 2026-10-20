import React, { useState, useEffect } from 'react';
import { apiFetch as fetch } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Search, RefreshCw, Download, Copy, CheckCircle2, Users } from 'lucide-react';

export default function CredentialsView() {
  const { token, addToast } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPasswords, setShowPasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const fetchCredentials = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users/credentials', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        addToast(data.message || 'Failed to load credentials', 'error');
      }
    } catch (err) {
      addToast('Error loading credentials', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCredentials(); }, [token]);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleShowPassword = (id) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      addToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'DOB', 'Status', 'Password Hash', 'Registered At'];
    const rows = filteredUsers.map(u => [
      u.id,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${u.email}"`,
      u.role,
      `"${u.department || ''}"`,
      `"${u.date_of_birth || ''}"`,
      u.status,
      `"${u.password_hash}"`,
      `"${u.created_at}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-credentials-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Credentials CSV exported!', 'success');
  };

  // Default passwords for seeded users (known)
  const getKnownPassword = (role) => {
    return role === 'admin' ? 'Admin@123456' : 'User@123456';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} style={{ color: '#f59e0b' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>User Credentials Database</h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Secure view of all registered user accounts — Admin access only
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchCredentials} disabled={isLoading} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={handleExportCsv} className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div style={{
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: 'var(--radius-md)', padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '10px'
      }}>
        <Shield size={16} style={{ color: '#f87171', flexShrink: 0 }} />
        <p style={{ fontSize: '12px', color: '#f87171', margin: 0 }}>
          <strong>Administrator Access Only.</strong> Passwords in the database are bcrypt-hashed (one-way encryption).
          Default seeded accounts use: Admin → <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '3px' }}>Admin@123456</code>,
          Users → <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '3px' }}>User@123456</code>
        </p>
      </div>

      {/* Stats + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <Users size={14} style={{ color: '#818cf8' }} />
            <span style={{ color: 'var(--text-muted)' }}>Total Users:</span>
            <strong style={{ color: '#f1f5f9' }}>{users.length}</strong>
          </div>
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-md)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#fbbf24' }}>
            <Shield size={14} />
            <span>Admins: <strong>{users.filter(u => u.role === 'admin').length}</strong></span>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius-md)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#34d399' }}>
            <Users size={14} />
            <span>Members: <strong>{users.filter(u => u.role === 'user').length}</strong></span>
          </div>
        </div>
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-faint)' }} />
          <input type="text" placeholder="Search name, email, department..." className="form-input"
            style={{ paddingLeft: '32px', fontSize: '12px', padding: '8px 12px 8px 32px' }}
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Credentials Table */}
      <div className="spreadsheet-container" style={{ maxHeight: '65vh' }}>
        <table className="spreadsheet-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Name</th>
              <th>Email Address</th>
              <th>Password</th>
              <th>Role</th>
              <th>Department</th>
              <th>Date of Birth</th>
              <th>Status</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)' }}>Loading credentials...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)' }}>No users found.</td></tr>
            ) : (
              filteredUsers.map((u) => {
                const knownPw = getKnownPassword(u.role);
                const isShowing = showPasswords[u.id];
                return (
                  <tr key={u.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-faint)', fontSize: '11px' }}>#{u.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                          alt={u.name} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-surface)' }} />
                        <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '13px' }}>{u.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'monospace', color: '#a5b4fc', fontSize: '12px' }}>{u.email}</span>
                        <button
                          onClick={() => copyToClipboard(u.email, `email-${u.id}`)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: copiedId === `email-${u.id}` ? '#34d399' : 'var(--text-faint)' }}
                          title="Copy email"
                        >
                          {copiedId === `email-${u.id}` ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'monospace', color: '#fbbf24', fontSize: '12px', letterSpacing: isShowing ? '0' : '2px' }}>
                          {isShowing ? knownPw : '••••••••••'}
                        </span>
                        <button
                          onClick={() => toggleShowPassword(u.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-faint)' }}
                          title={isShowing ? 'Hide password' : 'Show default password'}
                        >
                          {isShowing ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        {isShowing && (
                          <button
                            onClick={() => copyToClipboard(knownPw, `pw-${u.id}`)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: copiedId === `pw-${u.id}` ? '#34d399' : 'var(--text-faint)' }}
                            title="Copy password"
                          >
                            {copiedId === `pw-${u.id}` ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: '9px', color: 'var(--text-faint)', display: 'block', marginTop: '2px' }}>
                        (default seed password)
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                        background: u.role === 'admin' ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.15)',
                        color: u.role === 'admin' ? '#fbbf24' : '#818cf8'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.department || '—'}</span></td>
                    <td><span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{u.date_of_birth || '—'}</span></td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-completed' : 'badge-urgent'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
