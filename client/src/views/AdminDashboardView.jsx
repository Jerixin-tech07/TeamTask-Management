import React, { useState, useEffect } from 'react';
import { apiFetch as fetch } from '../api.js';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare, Users, FolderOpen, TableProperties,
  ArrowUpRight, Clock, Plus, Download, ShieldCheck
} from 'lucide-react';

export default function AdminDashboardView({ onNavigate, onOpenCreateTask }) {
  const { token, addToast } = useAuth();
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    totalUsers: 0,
    totalFiles: 0,
    totalLogins: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, usersRes, filesRes, logsRes] = await Promise.all([
          fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/files', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/users/login-activity?limit=5', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const tasksData = await tasksRes.json();
        const usersData = await usersRes.json();
        const filesData = await filesRes.json();
        const logsData = await logsRes.json();

        if (tasksData.success) {
          const tasks = tasksData.tasks || [];
          setRecentTasks(tasks.slice(0, 5));
          const completed = tasks.filter(t => t.aggregateStatus === 'completed').length;
          const inProgress = tasks.filter(t => t.aggregateStatus === 'in_progress').length;
          const pending = tasks.filter(t => t.aggregateStatus === 'pending').length;

          setStats(prev => ({
            ...prev,
            totalTasks: tasks.length,
            completedTasks: completed,
            inProgressTasks: inProgress,
            pendingTasks: pending
          }));
        }

        if (usersData.success) {
          setStats(prev => ({
            ...prev,
            totalUsers: (usersData.users || []).length
          }));
        }

        if (filesData.success) {
          setStats(prev => ({
            ...prev,
            totalFiles: (filesData.files || []).length
          }));
        }

        if (logsData.success) {
          setRecentLogs((logsData.logs || []).slice(0, 5));
          setStats(prev => ({
            ...prev,
            totalLogins: (logsData.logs || []).length
          }));
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner with Quick Actions */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#a5b4fc',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            background: 'rgba(99, 102, 241, 0.2)',
            padding: '3px 8px',
            borderRadius: '4px',
            display: 'inline-block',
            marginBottom: '6px'
          }}>
            Administrator Command Center
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
            Team Workspace Operations
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Managing 16 team members, tasks assignments, secure file submissions, and activity logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/users/login-activity?format=csv', {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `login-activity-${Date.now()}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                addToast('Login activity CSV exported!', 'success');
              } catch (err) {
                addToast(err.message || 'Export failed', 'error');
              }
            }}
            className="btn btn-secondary"
            title="Download complete spreadsheet CSV of user accounts & logins"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenCreateTask}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Create & Assign Task</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px'
      }}>
        {/* Total Tasks */}
        <div className="glass-panel interactive-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Tasks</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckSquare size={17} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '12px 0 4px' }}>
            {stats.totalTasks}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-faint)' }}>
            <span style={{ color: '#34d399', fontWeight: 600 }}>{stats.completedTasks} completed</span> &bull; <span>{stats.inProgressTasks} in progress</span>
          </div>
        </div>

        {/* Completion Velocity */}
        <div className="glass-panel interactive-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Velocity & Completion</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={17} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '12px 0 4px' }}>
            {completionRate}%
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-surface)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${completionRate}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #6366f1)', borderRadius: '3px' }} />
          </div>
        </div>

        {/* Team Members */}
        <div className="glass-panel interactive-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Team Members</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={17} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '12px 0 4px' }}>
            {stats.totalUsers}
          </div>
          <span style={{ fontSize: '12px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="status-dot status-dot-active" /> All Verified & Active
          </span>
        </div>

        {/* Uploaded Files & Media */}
        <div className="glass-panel interactive-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Files & Proofs</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderOpen size={17} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '12px 0 4px' }}>
            {stats.totalFiles}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
            Protected isolated uploads
          </span>
        </div>
      </div>

      {/* Two Column Section: Recent Tasks + Login Activity Spreadsheet Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
        {/* Recent Tasks List */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={17} style={{ color: '#818cf8' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Active Task Pipeline</h3>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              <span>View All Tasks</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentTasks.map(task => (
              <div
                key={task.id}
                style={{
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{task.category}</span>
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', margin: '4px 0 2px' }}>
                    {task.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-faint)' }}>
                    <span>{task.totalAssigned} assigned</span> &bull; 
                    <span style={{ color: task.completedCount > 0 ? '#34d399' : 'inherit' }}>
                      {task.completedCount} completed
                    </span>
                  </div>
                </div>

                <span className={`badge badge-${task.aggregateStatus}`}>
                  {task.aggregateStatus.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Spreadsheet Activity Logs Snapshot */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TableProperties size={17} style={{ color: '#38bdf8' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Spreadsheet Login Audit</h3>
            </div>
            <button
              onClick={() => onNavigate('logs')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              <span>Open Spreadsheet</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="spreadsheet-container">
            <table className="spreadsheet-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{log.user_name || 'Anonymous'}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>{log.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${log.status === 'SUCCESS' ? 'badge-completed' : 'badge-urgent'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>
                      {log.ip_address}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
