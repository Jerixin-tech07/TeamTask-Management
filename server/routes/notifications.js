const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await query.all(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `, [req.user.id]);

    const unreadCountRow = await query.get(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND is_read = 0
    `, [req.user.id]);

    return res.json({
      success: true,
      notifications,
      unreadCount: unreadCountRow ? unreadCountRow.count : 0
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching notifications.' });
  }
});

// Mark single notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    await query.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Error updating notification:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Mark all as read
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    await query.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Clear a notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    await query.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);
    return res.json({ success: true, message: 'Notification removed.' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;
