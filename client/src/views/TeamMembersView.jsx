import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Search, MessageSquare, CheckSquare, Plus, Ban, CheckCircle2, Eye } from 'lucide-react';

export default function TeamMembersView({ onStartChat, onOpenCreateTask, onViewProfile }) {
  const { token, addToast } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Are you sure you want to change status of ${user.name} to ${newStatus.toUpperCase()}?`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update user status');
      }
      addToast(`User ${user.name} is now ${newStatus}`, 'success');
      fetchUsers();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept = departmentFilter === 'all' || u.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} style={{ color: '#818cf8' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
              Team Roster ({users.length} Registered Members)
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Manage member accounts, track individual task completion rates, and initiate private support chats.
          </p>
        </div>

        <button onClick={onOpenCreateTask} className="btn btn-primary btn-sm">
          <Plus size={15} />
          <span>Assign New Task</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-faint)' }} />
          <input
            type="text"
            placeholder="Search team member by name or email..."
            className="form-input"
            style={{ paddingLeft: '32px', fontSize: '12px', padding: '7px 32px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: '180px', fontSize: '12px', padding: '7px 12px' }}
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        >
          <option value="all">All Departments</option>
          <option value="Frontend Engineering">Frontend Engineering</option>
          <option value="Backend Systems">Backend Systems</option>
          <option value="UI/UX Design">UI/UX Design</option>
          <option value="DevOps & Cloud">DevOps & Cloud</option>
          <option value="Product Quality QA">Product Quality QA</option>
          <option value="Data & Analytics">Data & Analytics</option>
          <option value="Mobile Development">Mobile Development</option>
        </select>
      </div>

      {/* Spreadsheet-style Members Table */}
      <div className="spreadsheet-container">
        <table className="spreadsheet-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Work Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Assigned Tasks</th>
              <th>Completed Tasks</th>
              <th>Task Progress</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((member) => {
              const progressPct = member.total_tasks > 0
                ? Math.round((member.completed_tasks / member.total_tasks) * 100)
                : 0;

              return (
                <tr key={member.id}>
                  <td>
                    <div
                      onClick={() => onViewProfile && onViewProfile(member)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                      title="Click to view full profile & photo"
                    >
                      <img
                        src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                        alt={member.name}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-surface)', objectFit: 'cover' }}
                      />
                      <span style={{ fontWeight: 700, color: '#f1f5f9', textDecoration: 'underline dotted' }}>
                        {member.name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: '#a5b4fc', fontSize: '12px' }}>
                      {member.email}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${member.role === 'admin' ? 'badge-urgent' : 'badge-low'}`}>
                      {member.role.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{member.department}</span>
                  </td>
                  <td>
                    <span className={`badge ${member.status === 'active' ? 'badge-completed' : 'badge-urgent'}`}>
                      {member.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{member.total_tasks || 0}</td>
                  <td style={{ color: '#34d399', fontWeight: 700 }}>{member.completed_tasks || 0}</td>
                  <td style={{ minWidth: '120px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'var(--bg-surface)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-faint)', minWidth: '30px' }}>{progressPct}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                    {member.last_login_at ? new Date(member.last_login_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => onViewProfile && onViewProfile(member)}
                        className="btn btn-secondary btn-icon btn-sm"
                        title={`View profile & photo of ${member.name}`}
                      >
                        <Eye size={13} />
                      </button>
                      {member.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => onStartChat(member)}
                            className="btn btn-secondary btn-icon btn-sm"
                            title={`Chat with ${member.name}`}
                          >
                            <MessageSquare size={13} />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(member)}
                            className={`btn ${member.status === 'active' ? 'btn-danger' : 'btn-success'} btn-icon btn-sm`}
                            title={member.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                          >
                            {member.status === 'active' ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
