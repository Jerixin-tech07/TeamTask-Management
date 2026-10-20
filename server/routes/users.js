const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { generalUpload } = require('../utils/uploader');

// Get all registered users (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await query.all(`
      SELECT u.id, u.name, u.email, u.role, u.department, u.avatar, u.status, u.created_at, u.last_login_at,
             COUNT(DISTINCT ta.task_id) as total_tasks,
             SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
      FROM users u
      LEFT JOIN task_assignments ta ON u.id = ta.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    return res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching users.' });
  }
});

// Get team members for assignment dropdowns (Admin only)
router.get('/team', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const team = await query.all(`
      SELECT id, name, email, department, avatar, role, status, created_at
      FROM users
      WHERE status = 'active'
      ORDER BY created_at DESC, id DESC
    `);

    return res.json({ success: true, team });
  } catch (err) {
    console.error('Error fetching team:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching team.' });
  }
});

// Spreadsheet-style Login Activity Table (Admin only)
router.get('/login-activity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { search, status, format } = req.query;

    let sql = `
      SELECT la.*, u.name as user_name, u.role as user_role, u.department as user_department
      FROM login_activity la
      LEFT JOIN users u ON la.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      sql += ' AND la.status = ?';
      params.push(status.toUpperCase());
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ' AND (la.email LIKE ? OR la.ip_address LIKE ? OR u.name LIKE ? OR la.user_agent LIKE ?)';
      params.push(q, q, q, q);
    }

    sql += ' ORDER BY la.timestamp DESC LIMIT 300';

    const logs = await query.all(sql, params);

    // If format is CSV, output spreadsheet file
    if (format === 'csv') {
      const headers = ['ID', 'User Name', 'Email', 'Role', 'Status', 'IP Address', 'User Agent', 'Failure Reason', 'Timestamp'];
      const csvRows = [headers.join(',')];

      logs.forEach(log => {
        const row = [
          log.id,
          `"${(log.user_name || 'N/A').replace(/"/g, '""')}"`,
          `"${log.email.replace(/"/g, '""')}"`,
          log.user_role || 'N/A',
          log.status,
          `"${log.ip_address || 'N/A'}"`,
          `"${(log.user_agent || 'N/A').replace(/"/g, '""')}"`,
          `"${(log.failure_reason || '').replace(/"/g, '""')}"`,
          `"${log.timestamp}"`
        ];
        csvRows.push(row.join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="login-activity-${Date.now()}.csv"`);
      return res.send(csvRows.join('\r\n'));
    }

    return res.json({ success: true, logs });
  } catch (err) {
    console.error('Error fetching login activity:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching login activity.' });
  }
});

// Update user status (active/suspended)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be active or suspended.' });
    }

    const targetUser = await query.get('SELECT id, role, email FROM users WHERE id = ?', [userId]);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.role === 'admin' && status === 'suspended') {
      return res.status(400).json({ success: false, message: 'Cannot suspend primary administrator account.' });
    }

    await query.run('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

    return res.json({ success: true, message: `User status changed to ${status}.` });
  } catch (err) {
    console.error('Error updating user status:', err);
    return res.status(500).json({ success: false, message: 'Internal server error updating user status.' });
  }
});

// Get user profile details (Admin can view any user; User can view own)
router.get('/:id/profile', authenticateToken, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    if (req.user.role !== 'admin' && req.user.id !== targetId) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only view your own profile.' });
    }

    const userProfile = await query.get(`
      SELECT u.id, u.name, u.email, u.role, u.department, u.avatar, u.status, u.created_at, u.last_login_at,
             COUNT(DISTINCT ta.task_id) as total_tasks,
             SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
             SUM(CASE WHEN ta.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
             SUM(CASE WHEN ta.status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
             COUNT(DISTINCT ts.id) as total_submissions
      FROM users u
      LEFT JOIN task_assignments ta ON u.id = ta.user_id
      LEFT JOIN task_submissions ts ON u.id = ts.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `, [targetId]);

    if (!userProfile) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Get recent 5 tasks for this user (if Admin)
    let recentTasks = [];
    if (req.user.role === 'admin') {
      recentTasks = await query.all(`
        SELECT t.id, t.title, t.priority, t.deadline, ta.status as user_status, ta.completed_at
        FROM task_assignments ta
        JOIN tasks t ON ta.task_id = t.id
        WHERE ta.user_id = ?
        ORDER BY t.created_at DESC LIMIT 5
      `, [targetId]);
    }

    return res.json({
      success: true,
      profile: {
        ...userProfile,
        recentTasks
      }
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching user profile.' });
  }
});

// Update user profile (Avatar only for regular users; Full access for admin)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, avatar, department, newPassword } = req.body;

    // Regular users can ONLY update their avatar/profile picture
    if (req.user.role !== 'admin') {
      // Only accept avatar changes for non-admin users
      const avatarToSave = avatar || req.user.avatar;
      await query.run(
        'UPDATE users SET avatar = ? WHERE id = ?',
        [avatarToSave, req.user.id]
      );
      const updatedUser = await query.get(
        'SELECT id, name, email, role, department, avatar, status FROM users WHERE id = ?',
        [req.user.id]
      );
      return res.json({
        success: true,
        message: 'Profile photo updated successfully!',
        user: updatedUser
      });
    }

    // Admin can update all fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Display name is required.' });
    }

    let targetEmail = req.user.email;
    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      }

      // Check if email is already taken by another user
      const existing = await query.get('SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, req.user.id]);
      if (existing) {
        return res.status(400).json({ success: false, message: 'This email address is already in use by another user.' });
      }
      targetEmail = cleanEmail;
    }

    let passwordSql = '';
    const params = [
      name.trim(),
      targetEmail,
      avatar || req.user.avatar,
      department !== undefined ? department.trim() : (req.user.department || 'Administrator')
    ];

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword.trim(), salt);
      passwordSql = ', password_hash = ?';
      params.push(passwordHash);
    }

    params.push(req.user.id);

    await query.run(`
      UPDATE users
      SET name = ?, email = ?, avatar = ?, department = ? ${passwordSql}
      WHERE id = ?
    `, params);

    const updatedUser = await query.get(
      'SELECT id, name, email, role, department, avatar, status FROM users WHERE id = ?',
      [req.user.id]
    );

    return res.json({
      success: true,
      message: 'Profile details updated successfully!',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating user profile:', err);
    return res.status(500).json({ success: false, message: 'Internal server error updating user profile.' });
  }
});

// Admin updates admin profile (Admin only!)
router.put('/admin-profile', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, avatar, department, newPassword } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Admin name is required.' });
    }

    let targetEmail = req.user.email;
    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      }

      const existing = await query.get('SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, req.user.id]);
      if (existing) {
        return res.status(400).json({ success: false, message: 'This email address is already in use by another user.' });
      }
      targetEmail = cleanEmail;
    }

    let passwordSql = '';
    const params = [
      name.trim(),
      targetEmail,
      avatar || req.user.avatar,
      department !== undefined ? department.trim() : (req.user.department || 'Administrator')
    ];

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword.trim(), salt);
      passwordSql = ', password_hash = ?';
      params.push(passwordHash);
    }

    params.push(req.user.id);

    await query.run(`
      UPDATE users
      SET name = ?, email = ?, avatar = ?, department = ? ${passwordSql}
      WHERE id = ? AND role = 'admin'
    `, params);

    const updatedUser = await query.get(
      'SELECT id, name, email, role, department, avatar, status FROM users WHERE id = ?',
      [req.user.id]
    );

    return res.json({
      success: true,
      message: 'Admin profile updated successfully!',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating admin profile:', err);
    return res.status(500).json({ success: false, message: 'Internal server error updating admin profile.' });
  }
});

// Upload profile photo
router.post('/upload-avatar', authenticateToken, generalUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }
    const avatarUrl = `/uploads/general/${req.file.filename}`;
    return res.json({
      success: true,
      message: 'Profile photo uploaded successfully!',
      avatarUrl
    });
  } catch (err) {
    console.error('Error uploading avatar:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload profile photo.' });
  }
});

// Admin Credentials View (Admin only - shows all user emails and PLAIN passwords)
// NOTE: Passwords are hashed in DB. This returns the raw password_hash (bcrypt).
// To display "readable" credentials, we show email + a note that passwords are bcrypt-hashed.
// For the admin to see what users set, we store a plain-text hint in a separate field (optional).
// Per requirement: show email and password. Since passwords are hashed, we return hashes with a UI note.
router.get('/credentials', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await query.all(`
      SELECT id, name, email, password_hash, role, department, status, date_of_birth, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    return res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching credentials:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching credentials.' });
  }
});

module.exports = router;
