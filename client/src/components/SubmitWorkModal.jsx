import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, UploadCloud, File, CheckCircle2, AlertCircle, Eye, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SubmitWorkModal({ isOpen, onClose, task, onWorkSubmitted }) {
  const { token, addToast } = useAuth();
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingSubmissions, setExistingSubmissions] = useState([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [mode, setMode] = useState('view'); // 'view' | 'new'
  const fileInputRef = useRef(null);

  // Fetch existing submissions when modal opens
  useEffect(() => {
    if (isOpen && task) {
      fetchSubmissions();
    }
  }, [isOpen, task]);

  const fetchSubmissions = async () => {
    if (!task) return;
    setIsLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExistingSubmissions(data.submissions || []);
        setMode(data.submissions?.length > 0 ? 'view' : 'new');
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm('Delete this submission? You can then submit a new file.')) return;
    setIsDeletingId(submissionId);
    try {
      const res = await fetch(`/api/tasks/${task.id}/submissions/${submissionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to delete submission');
      addToast('Submission removed. You can now upload a new file.', 'success');
      await fetchSubmissions();
      onWorkSubmitted();
      setMode('new');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      addToast('Please select a work submission file or document', 'error');
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('notes', notes);

    try {
      const res = await fetch(`/api/tasks/${task.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to submit work');

      try {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      } catch { /* ignore */ }

      addToast('🎉 Work submitted successfully! Status updated to Completed.', 'success');
      onWorkSubmitted();
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--border-light)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-card-subtle)'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              {mode === 'view' ? 'Submitted Work' : 'Submit Completed Work'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Task: <strong>{task.title}</strong>
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-icon btn-sm"><X size={16} /></button>
        </div>

        <div style={{ padding: '22px' }}>
          {/* Loading */}
          {isLoadingSubmissions && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-faint)' }}>
              <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
              <span style={{ fontSize: '13px' }}>Loading submissions...</span>
            </div>
          )}

          {/* View Existing Submissions */}
          {!isLoadingSubmissions && mode === 'view' && existingSubmissions.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <CheckCircle2 size={18} style={{ color: '#34d399' }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#34d399' }}>
                  {existingSubmissions.length} Submission{existingSubmissions.length > 1 ? 's' : ''} Uploaded
                </span>
              </div>

              {existingSubmissions.map((sub) => (
                <div key={sub.id} style={{
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: '12px', padding: '14px', marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <File size={22} style={{ color: '#818cf8', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sub.original_name}
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                          {sub.file_size ? `${(sub.file_size / 1024).toFixed(1)} KB` : ''} • {new Date(sub.created_at).toLocaleString()}
                        </span>
                        {sub.notes && (
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0', fontStyle: 'italic' }}>
                            Note: {sub.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <a href={`/uploads/${sub.file_path}`} target="_blank" rel="noreferrer"
                        className="btn btn-secondary btn-icon btn-sm" title="Preview file">
                        <Eye size={14} />
                      </a>
                      <button
                        onClick={() => handleDeleteSubmission(sub.id)}
                        disabled={isDeletingId === sub.id}
                        className="btn btn-secondary btn-icon btn-sm"
                        style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                        title="Delete & re-submit"
                      >
                        {isDeletingId === sub.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Option to add another submission */}
              <button
                onClick={() => setMode('new')}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '8px' }}
              >
                <UploadCloud size={15} />
                <span>Submit Another File / Replace</span>
              </button>
            </div>
          )}

          {/* New Submission Form */}
          {!isLoadingSubmissions && mode === 'new' && (
            <form onSubmit={handleSubmit}>
              {existingSubmissions.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <button type="button" onClick={() => setMode('view')} className="btn btn-secondary btn-sm">
                    ← View Existing Submissions
                  </button>
                </div>
              )}

              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-lg)',
                  padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                  background: 'var(--bg-input)', transition: 'border-color 150ms'
                }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]); }}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <File size={26} style={{ color: '#818cf8' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{file.name}</p>
                      <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                        {(file.size / 1024).toFixed(1)} KB • Click to change
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <UploadCloud size={36} style={{ color: '#818cf8', opacity: 0.8, margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
                      Click to select proof file or drag & drop
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>
                      PDFs, docs, images, spreadsheets, zip archives (up to 50MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Submission Notes & Summary</label>
                <textarea
                  placeholder="Briefly describe the work completed, link to PRs, or special notes..."
                  className="form-textarea" rows={3}
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: '10px',
                fontSize: '12px', color: '#34d399', marginBottom: '18px'
              }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>Submitting will advance task status to <strong>Completed</strong>.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting || !file} className="btn btn-primary">
                  {isSubmitting ? 'Uploading & Submitting...' : 'Submit Work & Mark Completed'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
