import React from 'react';
import { apiUrl } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { X, Download, FileText, Film, Image as ImageIcon, Archive, Calendar, User, HardDrive } from 'lucide-react';

export default function FilePreviewModal({ isOpen, onClose, file }) {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (!isOpen || !file) return null;

  const downloadUrl = apiUrl(`/api/files/download/${file.id}?token=${token}`);
  const previewUrl = apiUrl(`/api/files/preview/${file.id}?token=${token}`);

  const isImage = file.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.original_name);
  const isVideo = file.mime_type?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.original_name);
  const isAudio = file.mime_type?.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(file.original_name);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: isImage || isVideo ? '780px' : '560px' }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isImage ? <ImageIcon size={18} /> : isVideo ? <Film size={18} /> : <FileText size={18} />}
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
                {file.original_name}
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                {(file.file_size / 1024).toFixed(1)} KB &bull; {file.category?.toUpperCase() || 'DOCUMENT'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={downloadUrl}
              download={file.original_name}
              className="btn btn-primary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              <Download size={14} />
              <span>Download</span>
            </a>
            <button onClick={onClose} className="btn btn-secondary btn-icon btn-sm">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Media Preview Stage */}
        <div style={{
          padding: '20px',
          background: 'var(--bg-main)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '220px',
          maxHeight: '480px',
          overflow: 'hidden'
        }}>
          {isImage ? (
            <img
              src={previewUrl}
              alt={file.original_name}
              style={{
                maxWidth: '100%',
                maxHeight: '440px',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)'
              }}
            />
          ) : isVideo ? (
            <video
              controls
              src={previewUrl}
              style={{
                maxWidth: '100%',
                maxHeight: '440px',
                borderRadius: 'var(--radius-md)'
              }}
            />
          ) : isAudio ? (
            <audio controls src={previewUrl} style={{ width: '100%' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                {file.original_name}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '4px' }}>
                Preview not directly available in browser. Click Download to open on your device.
              </p>
            </div>
          )}
        </div>

        {/* Metadata Details */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-light)',
          background: 'var(--bg-card)',
          fontSize: '12px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <User size={14} style={{ color: 'var(--text-faint)' }} />
              <span>Owner: <strong style={{ color: '#f1f5f9' }}>{isAdmin ? (file.user_name || 'Team Member') : 'You'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Calendar size={14} style={{ color: 'var(--text-faint)' }} />
              <span>Uploaded: <strong style={{ color: '#f1f5f9' }}>{new Date(file.created_at).toLocaleString()}</strong></span>
            </div>
            {file.task_title && (
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <FileText size={14} style={{ color: '#818cf8' }} />
                <span>Associated Task: <strong style={{ color: '#a5b4fc' }}>{file.task_title}</strong></span>
              </div>
            )}
            {file.description && (
              <div style={{ gridColumn: 'span 2', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-faint)', display: 'block', fontSize: '11px' }}>Notes / Context:</span>
                <span style={{ color: 'var(--text-main)' }}>{file.description}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
