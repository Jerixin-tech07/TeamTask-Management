import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TableProperties, Search, Download, Filter, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function SpreadsheetLogsView({ onViewProfile }) {
  const { token, addToast } = useAuth();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let url = `/api/users/login-activity?status=${statusFilter}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleExportCsv = async () => {
    try {
      let url = `/api/users/login-activity?format=csv&status=${statusFilter}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Export failed');
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `login-activity-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      addToast('Login activity spreadsheet downloaded!', 'success');
    } catch (err) {
      addToast(err.message || 'Export failed', 'error');
    }
  };

  const successCount = logs.filter(l => l.status === 'SUCCESS').length;
  const failedCount = logs.filter(l => l.status === 'FAILED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Controls */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TableProperties size={20} style={{ color: '#38bdf8' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
              Spreadsheet Login Audit & User Activity
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Complete historical registry of user logins, IP origin, client devices, and authentication attempts
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' }}
          >
            <Download size={14} />
            <span>Export Spreadsheet (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Counters & Filter Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Metric Pills */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Records:</span>
            <strong style={{ color: '#f1f5f9' }}>{logs.length}</strong>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#34d399'
          }}>
            <CheckCircle2 size={14} />
            <span>Successful: <strong>{successCount}</strong></span>
          </div>

          {failedCount > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#f87171'
            }}>
              <ShieldAlert size={14} />
              <span>Failed / Blocked: <strong>{failedCount}</strong></span>
            </div>
          )}
        </div>

        {/* Filter controls */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-faint)' }} />
            <input
              type="text"
              placeholder="Search email, name, IP, agent..."
              className="form-input"
              style={{ paddingLeft: '32px', fontSize: '12px', padding: '6px 32px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: '130px', fontSize: '12px', padding: '6px 10px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILED">Failed Only</option>
          </select>
        </form>
      </div>

      {/* Spreadsheet Table Component */}
      <div className="spreadsheet-container" style={{ maxHeight: '65vh' }}>
        <table className="spreadsheet-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ width: '60px' }}># ID</th>
              <th>User Name</th>
              <th>Email Address</th>
              <th>Department</th>
              <th>Status</th>
              <th>IP Origin</th>
              <th>Browser & User Agent</th>
              <th>Security Note / Reason</th>
              <th>Timestamp (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)' }}>
                  No activity log records matching criteria.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-faint)', fontSize: '11px' }}>
                    #{log.id}
                  </td>
                  <td>
                    <span
                      onClick={() => onViewProfile && log.user_id && onViewProfile({ id: log.user_id, name: log.user_name })}
                      style={{
                        fontWeight: 600,
                        color: '#f1f5f9',
                        cursor: log.user_id ? 'pointer' : 'default',
                        textDecoration: log.user_id ? 'underline dotted' : 'none'
                      }}
                      title={log.user_id ? 'Click to view member profile & photo' : undefined}
                    >
                      {log.user_name || 'Anonymous Attempt'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: '#a5b4fc', fontSize: '12px' }}>
                      {log.email}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {log.user_department || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${log.status === 'SUCCESS' ? 'badge-completed' : 'badge-urgent'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      color: '#cbd5e1'
                    }}>
                      {log.ip_address}
                    </span>
                  </td>
                  <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.user_agent}>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                      {log.user_agent}
                    </span>
                  </td>
                  <td>
                    {log.failure_reason ? (
                      <span style={{ color: '#f87171', fontSize: '11px', fontWeight: 600 }}>
                        {log.failure_reason}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontSize: '11px' }}>Authenticated</span>
                    )}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
