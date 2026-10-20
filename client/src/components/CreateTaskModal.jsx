import React, { useState, useEffect } from 'react';
import { apiFetch as fetch } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Calendar, AlertCircle, Check, Search } from 'lucide-react';

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated, initialTask = null }) {
  const { token, addToast } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('Engineering');
  const [deadline, setDeadline] = useState('');
  const [assignedUserIds, setAssignedUserIds] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setPriority(initialTask.priority || 'medium');
      setCategory(initialTask.category || 'Engineering');
      setDeadline(initialTask.deadline ? initialTask.deadline.split('T')[0] : '');
      setAssignedUserIds(initialTask.assignments ? initialTask.assignments.map(a => a.user_id) : []);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('Engineering');
      setDeadline('');
      setAssignedUserIds([]);
    }
  }, [initialTask, isOpen]);

  // Fetch team members for assignment
  useEffect(() => {
    if (isOpen) {
      fetch('/api/users/team', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTeamMembers(data.team.filter(u => u.role === 'user'));
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const toggleUserAssignment = (userId) => {
    setAssignedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAllMembers = () => {
    if (assignedUserIds.length === filteredMembers.length) {
      setAssignedUserIds([]);
    } else {
      setAssignedUserIds(filteredMembers.map(m => m.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Task title is required', 'error');
      return;
    }
    if (assignedUserIds.length === 0) {
      addToast('Please assign this task to at least one team member', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = initialTask ? `/api/tasks/${initialTask.id}` : '/api/tasks';
      const method = initialTask ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          category,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          assignedUserIds
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save task');
      }

      addToast(initialTask ? 'Task updated successfully' : 'Task created and assigned!', 'success');
      onTaskCreated();
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = teamMembers.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.department.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card-subtle)'
        }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>
              {initialTask ? 'Edit Task Assignment' : 'Create & Assign New Task'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Assign work to specific team members with deadlines and priorities
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-icon btn-sm">
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '22px 24px' }}>
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Implement OAuth2 Refresh Tokens"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Task Description & Deliverables</label>
            <textarea
              placeholder="Detailed instructions, requirements, deliverables, or test conditions..."
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Priority, Category, Deadline Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Frontend Engineering">Frontend</option>
                <option value="Backend Systems">Backend</option>
                <option value="UI/UX Design">UI/UX Design</option>
                <option value="DevOps & Cloud">DevOps</option>
                <option value="Product Quality QA">QA & Testing</option>
                <option value="Data & Analytics">Analytics</option>
                <option value="Mobile Development">Mobile</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="form-label">Deadline</label>
              <input
                type="date"
                className="form-input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          {/* Assign Team Members Multi-Select */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Assign to Specific Team Members * ({assignedUserIds.length} Selected)
              </label>
              <button
                type="button"
                onClick={selectAllMembers}
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                {assignedUserIds.length === filteredMembers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Filter Search */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-faint)' }} />
              <input
                type="text"
                placeholder="Search member by name or department..."
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '12px', padding: '7px 32px' }}
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>

            {/* Team Grid */}
            <div style={{
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              padding: '6px'
            }}>
              {filteredMembers.map((member) => {
                const isSelected = assignedUserIds.includes(member.id);
                return (
                  <div
                    key={member.id}
                    onClick={() => toggleUserAssignment(member.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                      border: isSelected ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
                      cursor: 'pointer',
                      marginBottom: '4px',
                      transition: 'all 120ms'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                        alt={member.name}
                        style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                      />
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', display: 'block' }}>
                          {member.name}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                          {member.department} &bull; {member.email}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--accent-primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isSelected && <Check size={12} color="#fff" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Saving Task...' : (initialTask ? 'Update Task' : 'Publish & Assign Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
