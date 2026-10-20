const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { baseUploadDir, generalUpload, categorizeMime } = require('../utils/uploader');

// List files (Admin sees all; User sees only their own)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const isUserAdmin = req.user.role === 'admin';
    const { category, search, userId } = req.query;

    let sql = `
      SELECT f.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar, u.department as user_department,
             t.title as task_title
      FROM files f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN tasks t ON f.task_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (!isUserAdmin) {
      sql += ' AND f.user_id = ?';
      params.push(req.user.id);
    } else if (userId) {
      sql += ' AND f.user_id = ?';
      params.push(userId);
    }

    if (category && category !== 'all') {
      sql += ' AND f.category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ' AND (f.original_name LIKE ? OR f.description LIKE ? OR u.name LIKE ?)';
      params.push(q, q, q);
    }

    sql += ' ORDER BY f.created_at DESC';

    const files = await query.all(sql, params);
    return res.json({ success: true, files });
  } catch (err) {
    console.error('Error fetching files:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching files.' });
  }
});

// General file/media upload
router.post('/upload', authenticateToken, generalUpload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { description, taskId } = req.body;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file was provided for upload.' });
    }

    const relativePath = path.join('general', file.filename).replace(/\\/g, '/');
    const category = categorizeMime(file.mimetype, path.extname(file.originalname));

    const result = await query.run(`
      INSERT INTO files (user_id, task_id, original_name, stored_name, file_path, file_size, mime_type, category, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      taskId || null,
      file.originalname,
      file.filename,
      relativePath,
      file.size,
      file.mimetype,
      category,
      description || 'Direct media upload'
    ]);

    const newFile = await query.get(`
      SELECT f.*, u.name as user_name, u.email as user_email
      FROM files f
      JOIN users u ON f.user_id = u.id
      WHERE f.id = ?
    `, [result.lastID]);

    // If uploaded by user, notify admin
    if (req.user.role !== 'admin') {
      const admins = await query.all("SELECT id FROM users WHERE role = 'admin'");
      for (const admin of admins) {
        await query.run(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (?, 'New User File Upload', ?, 'system', '/files')
        `, [
          admin.id,
          `${req.user.name} uploaded a file: "${file.originalname}" (${(file.size / 1024).toFixed(1)} KB)`
        ]);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully!',
      file: newFile
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during file upload.' });
  }
});

// Protected Download Endpoint
// Ensures only the owner OR the administrator can access the file
router.get('/download/:id', authenticateToken, async (req, res) => {
  try {
    const fileId = req.params.id;
    const fileRecord = await query.get('SELECT * FROM files WHERE id = ?', [fileId]);

    if (!fileRecord) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    // Access check: Only Admin OR the user who uploaded the file can download it
    if (req.user.role !== 'admin' && fileRecord.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view or download this file.'
      });
    }

    const fullPath = path.resolve(baseUploadDir, fileRecord.file_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'File asset is missing from storage.' });
    }

    return res.download(fullPath, fileRecord.original_name);
  } catch (err) {
    console.error('Error downloading file:', err);
    return res.status(500).json({ success: false, message: 'Internal server error downloading file.' });
  }
});

// Protected Inline Preview Endpoint (for images, audio, video, pdfs)
router.get('/preview/:id', authenticateToken, async (req, res) => {
  try {
    const fileId = req.params.id;
    const fileRecord = await query.get('SELECT * FROM files WHERE id = ?', [fileId]);

    if (!fileRecord) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    if (req.user.role !== 'admin' && fileRecord.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to preview this file.'
      });
    }

    const fullPath = path.resolve(baseUploadDir, fileRecord.file_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'File asset not found.' });
    }

    res.setHeader('Content-Type', fileRecord.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileRecord.original_name)}"`);
    const stream = fs.createReadStream(fullPath);
    return stream.pipe(res);
  } catch (err) {
    console.error('Error previewing file:', err);
    return res.status(500).json({ success: false, message: 'Internal server error previewing file.' });
  }
});

// Delete file (Admin or file owner)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const fileId = req.params.id;
    const fileRecord = await query.get('SELECT * FROM files WHERE id = ?', [fileId]);

    if (!fileRecord) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    if (req.user.role !== 'admin' && fileRecord.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own files.' });
    }

    // Remove file from disk
    const fullPath = path.resolve(baseUploadDir, fileRecord.file_path);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.warn('Could not remove file from disk:', err.message);
      }
    }

    await query.run('DELETE FROM files WHERE id = ?', [fileId]);
    return res.json({ success: true, message: 'File removed successfully.' });
  } catch (err) {
    console.error('Error deleting file:', err);
    return res.status(500).json({ success: false, message: 'Internal server error deleting file.' });
  }
});

module.exports = router;
