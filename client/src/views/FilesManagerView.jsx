import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FolderOpen, UploadCloud, Search, Filter, FileText, Image as ImageIcon,
  Film, Music, Archive, Download, Eye, Trash2, Plus, Calendar, User
} from 'lucide-react';

export default function FilesManagerView({ onPreviewFile }) {
  const { token, user, addToast } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDescription, setUploadDescription] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      let url = `/api/files?category=${categoryFilter}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [token, categoryFilter]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUploadFile) {
      addToast('Please select a file to upload', 'error');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedUploadFile);
    formData.append('description', uploadDescription);

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to upload file');
      }

      addToast('File uploaded successfully!', 'success');
      setShowUploadModal(false);
      setSelectedUploadFile(null);
      setUploadDescription('');
      fetchFiles();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Are you sure you want to delete file "${file.original_name}"?`)) return;

    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete file');
      }

      addToast('File deleted successfully', 'success');
      fetchFiles();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const getFileIcon = (category) => {
    switch (category) {
      case 'image': return <ImageIcon size={20} style={{ color: '#38bdf8' }} />;
      case 'video': return <Film size={20} style={{ color: '#c084fc' }} />;
      case 'audio': return <Music size={20} style={{ color: '#f472b6' }} />;
      case 'archive': return <Archive size={20} style={{ color: '#fbbf24' }} />;
      default: return <FileText size={20} style={{ color: '#818cf8' }} />;
    }
  };

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
        gap: '14px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={20} style={{ color: '#c084fc' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
              {isAdmin ? 'All Users Uploaded Media & Files' : 'My Uploaded Media & Documents'}
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {isAdmin
              ? 'Central storage repository for all deliverables, work submissions, and chat attachments'
              : 'Secure isolated storage accessible only by you and the Administrator'}
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary btn-sm"
        >
          <UploadCloud size={15} />
          <span>Upload File / Media</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-faint)' }} />
            <input
              type="text"
              placeholder="Search files by name..."
              className="form-input"
              style={{ paddingLeft: '32px', fontSize: '12px', padding: '6px 32px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: '150px', fontSize: '12px', padding: '6px 10px' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All File Types</option>
            <option value="image">Images</option>
            <option value="document">Documents & PDFs</option>
            <option value="video">Videos</option>
            <option value="archive">Zip Archives</option>
            <option value="general">General</option>
          </select>
        </div>

        <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
          Showing <strong>{files.length}</strong> items
        </span>
      </div>

      {/* Files Grid View */}
      {files.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-faint)' }}>
          <FolderOpen size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600 }}>No files found</p>
          <p style={{ fontSize: '12px', maxWidth: '320px', margin: '4px auto 0' }}>
            Upload files showing work progress, deliverables, or media attachments.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px'
        }}>
          {files.map((file) => {
            const isImg = file.category === 'image';
            const previewUrl = `/api/files/preview/${file.id}?token=${token}`;
            const downloadUrl = `/api/files/download/${file.id}?token=${token}`;

            return (
              <div
                key={file.id}
                className="interactive-card"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Thumbnail / Header Area */}
                <div
                  onClick={() => onPreviewFile(file)}
                  style={{
                    height: '140px',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {isImg ? (
                    <img
                      src={previewUrl}
                      alt={file.original_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      {getFileIcon(file.category)}
                      <span style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginTop: '6px',
                        textTransform: 'uppercase'
                      }}>
                        {file.category}
                      </span>
                    </div>
                  )}

                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(4px)',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: '#e2e8f0'
                  }}>
                    {(file.file_size / 1024).toFixed(1)} KB
                  </span>
                </div>

                {/* Details Area */}
                <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4
                    onClick={() => onPreviewFile(file)}
                    title={file.original_name}
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#f1f5f9',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                  >
                    {file.original_name}
                  </h4>

                  {file.description && (
                    <p style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      margin: 0,
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {file.description}
                    </p>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <img
                        src={file.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${file.user_name}`}
                        alt={file.user_name}
                        style={{ width: '18px', height: '18px', borderRadius: '50%' }}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-faint)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isAdmin ? file.user_name : 'You'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <a
                        href={downloadUrl}
                        download={file.original_name}
                        className="btn btn-secondary btn-icon btn-sm"
                        style={{ width: '28px', height: '28px' }}
                        title="Download file"
                      >
                        <Download size={12} />
                      </a>
                      <button
                        onClick={() => onPreviewFile(file)}
                        className="btn btn-secondary btn-icon btn-sm"
                        style={{ width: '28px', height: '28px' }}
                        title="Preview file"
                      >
                        <Eye size={12} />
                      </button>
                      {(isAdmin || file.user_id === user.id) && (
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="btn btn-danger btn-icon btn-sm"
                          style={{ width: '28px', height: '28px' }}
                          title="Delete file"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-card-subtle)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                Upload File or Media
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="btn btn-secondary btn-icon btn-sm">
                X
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ padding: '22px' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '28px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--bg-input)'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setSelectedUploadFile(e.target.files ? e.target.files[0] : null)}
                  style={{ display: 'none' }}
                />
                {selectedUploadFile ? (
                  <div>
                    <FileText size={32} style={{ color: '#818cf8', margin: '0 auto 6px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                      {selectedUploadFile.name}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                      {(selectedUploadFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ) : (
                  <div>
                    <UploadCloud size={36} style={{ color: '#818cf8', opacity: 0.8, margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
                      Choose file or drag & drop
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>
                      All media, PDFs, presentations, documents & zips
                    </p>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Description / Context (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Design assets, test report, API schema"
                  className="form-input"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowUploadModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isUploading || !selectedUploadFile} className="btn btn-primary">
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
