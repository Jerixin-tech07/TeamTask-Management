import React, { useState, useEffect } from 'react';
import { apiFetch as fetch, apiUrl } from '../api.js';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare, Plus, Search, Filter, Calendar, User, FileText,
  Clock, CheckCircle2, AlertCircle, Edit, Trash2, UploadCloud,
  Columns, List, ChevronRight, Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function TasksBoardView({
  onOpenCreateTask,
  onOpenEditTask,
  onOpenSubmitWork,
  onPreviewFile,
  refreshTrigger
}) {
  const { token, user, addToast } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [submissionsModalTask, setSubmissionsModalTask] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token, refreshTrigger]);

  useEffect(() => {
    const handleUpdate = () => fetchTasks();
    window.addEventListener('tasks_updated', handleUpdate);
    return () => window.removeEventListener('tasks_updated', handleUpdate);
  }, [token]);

  // Update Status directly (for user or admin)
  const handleStatusChange = async (taskId, newStatus, targetUserId = null) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, targetUserId })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update status');
      }

      if (newStatus === 'completed') {
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore
        }
      }

      addToast(`Status updated to ${newStatus.replace('_', ' ').toUpperCase()}`, 'success');
      fetchTasks();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Delete Task (Admin only)
  const handleDeleteTask = async (taskId, title) => {
    if (!window.confirm(`Are you sure you want to delete task: "${title}"?`)) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete task');
      }
      addToast('Task deleted successfully', 'success');
      fetchTasks();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // View Submissions for a task
  const openSubmissionsModal = async (task) => {
    setSubmissionsModalTask(task);
    try {
      const res = await fetch(`/api/tasks/${task.id}/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubmissionsList(data.submissions || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(search.toLowerCase()));
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
    return matchesSearch && matchesPriority && matchesCategory;
  });

  // Categorize for Kanban
  const pendingTasks = filteredTasks.filter(t => (isAdmin ? t.aggregateStatus : t.user_status) === 'pending');
  const inProgressTasks = filteredTasks.filter(t => (isAdmin ? t.aggregateStatus : t.user_status) === 'in_progress');
  const completedTasks = filteredTasks.filter(t => (isAdmin ? t.aggregateStatus : t.user_status) === 'completed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* View Header with Filters and Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        background: 'var(--bg-card)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-faint)' }} />
          <input
            type="text"
            placeholder="Search tasks by title or deliverable..."
            className="form-input"
            style={{ paddingLeft: '38px', paddingRight: '12px', fontSize: '13px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Priority & Category Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: '140px', fontSize: '13px', padding: '8px 12px' }}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            className="form-select"
            style={{ width: '160px', fontSize: '13px', padding: '8px 12px' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="Frontend Engineering">Frontend</option>
            <option value="Backend Systems">Backend</option>
            <option value="UI/UX Design">UI/UX Design</option>
            <option value="DevOps & Cloud">DevOps</option>
            <option value="Product Quality QA">QA & Testing</option>
            <option value="Data & Analytics">Analytics</option>
            <option value="Mobile Development">Mobile</option>
          </select>

          {/* Kanban / List Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setViewMode('kanban')}
              className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none', padding: '6px 10px' }}
              title="Kanban Board View"
            >
              <Columns size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none', padding: '6px 10px' }}
              title="Table List View"
            >
              <List size={14} />
            </button>
          </div>

          {/* Admin Create Task Button */}
          {isAdmin && (
            <button onClick={onOpenCreateTask} className="btn btn-primary" style={{ padding: '8px 16px' }}>
              <Plus size={16} />
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '18px',
          alignItems: 'flex-start'
        }}>
          {/* Column 1: Pending */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="status-dot status-dot-busy" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Pending
                </h3>
              </div>
              <span className="badge badge-pending">{pendingTasks.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px' }}>
              {pendingTasks.map(task => renderTaskCard(task))}
              {pendingTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-faint)', fontSize: '12px' }}>
                  No pending tasks
                </div>
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  In Progress
                </h3>
              </div>
              <span className="badge badge-in_progress">{inProgressTasks.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px' }}>
              {inProgressTasks.map(task => renderTaskCard(task))}
              {inProgressTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-faint)', fontSize: '12px' }}>
                  No tasks currently in progress
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="status-dot status-dot-active" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Completed
                </h3>
              </div>
              <span className="badge badge-completed">{completedTasks.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px' }}>
              {completedTasks.map(task => renderTaskCard(task))}
              {completedTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-faint)', fontSize: '12px' }}>
                  No completed tasks yet
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="spreadsheet-container">
          <table className="spreadsheet-table">
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                {isAdmin && <th>Assigned Members</th>}
                <th>Deadline</th>
                <th>Submissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => {
                const currentStatus = isAdmin ? task.aggregateStatus : task.user_status;
                return (
                  <tr key={task.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{task.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-faint)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.description}
                      </div>
                    </td>
                    <td><span style={{ fontSize: '12px', color: '#94a3b8' }}>{task.category}</span></td>
                    <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                    <td><span className={`badge badge-${currentStatus}`}>{currentStatus?.replace('_', ' ')}</span></td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {task.assignments?.slice(0, 3).map((a, i) => (
                            <img
                              key={i}
                              src={a.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.name}`}
                              title={a.name}
                              alt={a.name}
                              style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}
                            />
                          ))}
                          {task.assignments?.length > 3 && (
                            <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>+{task.assignments.length - 3}</span>
                          )}
                        </div>
                      </td>
                    )}
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'None'}
                    </td>
                    <td>
                      <button
                        onClick={() => openSubmissionsModal(task)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                      >
                        <Eye size={12} />
                        <span>Submissions</span>
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {!isAdmin && (
                          <button
                            onClick={() => onOpenSubmitWork(task)}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            <UploadCloud size={12} />
                            <span>Submit Work</span>
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => onOpenEditTask(task)}
                              className="btn btn-secondary btn-icon btn-sm"
                              title="Edit Task"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id, task.title)}
                              className="btn btn-danger btn-icon btn-sm"
                              title="Delete Task"
                            >
                              <Trash2 size={13} />
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
      )}

      {/* Submissions Modal */}
      {submissionsModalTask && (
        <div className="modal-overlay" onClick={() => setSubmissionsModalTask(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-card-subtle)'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  Work Deliverables & Submissions
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Task: <strong>{submissionsModalTask.title}</strong>
                </p>
              </div>
              <button onClick={() => setSubmissionsModalTask(null)} className="btn btn-secondary btn-icon btn-sm">
                X
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              {submissionsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-faint)' }}>
                  <FileText size={36} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>No files submitted yet</p>
                  <p style={{ fontSize: '11px' }}>When a team member uploads work files for this task, they will appear here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {submissionsList.map(sub => (
                    <div
                      key={sub.id}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <img
                          src={sub.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.user_name}`}
                          alt={sub.user_name}
                          style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{sub.user_name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                              {new Date(sub.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#818cf8', margin: '4px 0 2px' }}>
                            📄 {sub.original_name} ({(sub.file_size / 1024).toFixed(1)} KB)
                          </p>
                          {sub.notes && (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
                              "{sub.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <a
                        href={apiUrl(`/api/files/download/${sub.id}?token=${token}`)}
                        download={sub.original_name}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render an interactive Kanban card
  function renderTaskCard(task) {
    const currentStatus = isAdmin ? task.aggregateStatus : task.user_status;

    return (
      <div
        key={task.id}
        className="interactive-card"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        {/* Header: Priority + Category */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600 }}>{task.category}</span>
        </div>

        {/* Title & Description */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', margin: 0, lineHeight: 1.3 }}>
            {task.title}
          </h4>
          {task.description && (
            <p style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              margin: '6px 0 0',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {task.description}
            </p>
          )}
        </div>

        {/* Deadline & Assigned Members */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {task.deadline ? (
            <span style={{ fontSize: '11px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} />
              {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          ) : <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>No deadline</span>}

          {isAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '-6px' }}>
              {task.assignments?.slice(0, 3).map((a, i) => (
                <img
                  key={i}
                  src={a.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.name}`}
                  alt={a.name}
                  title={`${a.name} (${a.status})`}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: `2px solid ${a.status === 'completed' ? '#10b981' : a.status === 'in_progress' ? '#6366f1' : 'var(--border-subtle)'}`,
                    marginLeft: i > 0 ? '-6px' : 0
                  }}
                />
              ))}
              {task.assignments?.length > 3 && (
                <span style={{ fontSize: '10px', color: 'var(--text-faint)', marginLeft: '4px' }}>
                  +{task.assignments.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>
              Assigned to You
            </span>
          )}
        </div>

        {/* Status Switcher & Submissions Action Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          {/* Quick status 3-state radio / dropdown for member */}
          {!isAdmin ? (
            <select
              className="form-select"
              style={{ fontSize: '11px', padding: '4px 8px', width: 'auto', flex: 1 }}
              value={task.user_status}
              onChange={(e) => handleStatusChange(task.id, e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
              {task.completedCount}/{task.totalAssigned} completed
            </div>
          )}

          <div style={{ display: 'flex', gap: '4px' }}>
            {!isAdmin && (
              <button
                onClick={() => onOpenSubmitWork(task)}
                className="btn btn-primary btn-sm"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                title="Upload completed proof file"
              >
                <UploadCloud size={12} />
                <span>Submit Work</span>
              </button>
            )}

            <button
              onClick={() => openSubmissionsModal(task)}
              className="btn btn-secondary btn-icon btn-sm"
              title="View Deliverables & Submissions"
            >
              <Eye size={13} />
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => onOpenEditTask(task)}
                  className="btn btn-secondary btn-icon btn-sm"
                  title="Edit Task"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id, task.title)}
                  className="btn btn-danger btn-icon btn-sm"
                  title="Delete Task"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}
