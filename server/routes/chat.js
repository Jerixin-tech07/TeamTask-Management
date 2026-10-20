const express = require('express');
const router = express.Router();
const path = require('path');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { chatUpload, categorizeMime } = require('../utils/uploader');

// Get active conversations list
// Admin gets list of all users with unread badge & last message
// Normal user gets admin conversation
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const isUserAdmin = req.user.role === 'admin';

    if (isUserAdmin) {
      // Find all users (role='user') and get their last message with this admin
      const users = await query.all(`
        SELECT u.id, u.name, u.email, u.avatar, u.department, u.status,
               (
                 SELECT content FROM messages 
                 WHERE (sender_id = u.id AND receiver_id = ?) 
                    OR (sender_id = ? AND receiver_id = u.id)
                 ORDER BY created_at DESC LIMIT 1
               ) as last_message,
               (
                 SELECT created_at FROM messages 
                 WHERE (sender_id = u.id AND receiver_id = ?) 
                    OR (sender_id = ? AND receiver_id = u.id)
                 ORDER BY created_at DESC LIMIT 1
               ) as last_message_time,
               (
                 SELECT COUNT(*) FROM messages 
                 WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0
               ) as unread_count
        FROM users u
        WHERE u.role = 'user'
        ORDER BY (last_message_time IS NOT NULL) DESC, last_message_time DESC, u.name ASC
      `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);

      return res.json({ success: true, conversations: users });
    } else {
      // Normal user: find all admin contacts
      const admins = await query.all(`
        SELECT u.id, u.name, u.email, u.avatar, u.department, u.role, u.status,
               (
                 SELECT content FROM messages 
                 WHERE (sender_id = u.id AND receiver_id = ?) 
                    OR (sender_id = ? AND receiver_id = u.id)
                 ORDER BY created_at DESC LIMIT 1
               ) as last_message,
               (
                 SELECT created_at FROM messages 
                 WHERE (sender_id = u.id AND receiver_id = ?) 
                    OR (sender_id = ? AND receiver_id = u.id)
                 ORDER BY created_at DESC LIMIT 1
               ) as last_message_time,
               (
                 SELECT COUNT(*) FROM messages 
                 WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0
               ) as unread_count
        FROM users u
        WHERE u.role = 'admin'
        ORDER BY u.id ASC
      `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);

      return res.json({ success: true, conversations: admins });
    }
  } catch (err) {
    console.error('Error fetching conversations:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching conversations.' });
  }
});

// Get message history between current user and specified other user
router.get('/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const otherUserId = parseInt(req.params.otherUserId, 10);
    const currentUserId = req.user.id;

    // Permissions check:
    // If current user is not admin, they are ONLY allowed to chat with an admin!
    if (req.user.role !== 'admin') {
      const targetUser = await query.get('SELECT role FROM users WHERE id = ?', [otherUserId]);
      if (!targetUser || targetUser.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Direct messaging is only permitted between team members and the administrator.'
        });
      }
    }

    const messages = await query.all(`
      SELECT m.*, 
             s.name as sender_name, s.avatar as sender_avatar, s.role as sender_role,
             r.name as receiver_name
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `, [currentUserId, otherUserId, otherUserId, currentUserId]);

    return res.json({ success: true, messages });
  } catch (err) {
    console.error('Error fetching messages:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching messages.' });
  }
});

// Send a private message (with optional file/media attachment)
router.post('/messages', authenticateToken, chatUpload.single('attachment'), async (req, res) => {
  try {
    let { receiverId, content } = req.body;
    const file = req.file;

    if (!content && !file) {
      return res.status(400).json({ success: false, message: 'Message content or file attachment is required.' });
    }

    // If user is normal member, find default admin if receiverId not provided
    if (!receiverId) {
      if (req.user.role !== 'admin') {
        const defaultAdmin = await query.get("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
        if (!defaultAdmin) {
          return res.status(400).json({ success: false, message: 'No administrator available to message.' });
        }
        receiverId = defaultAdmin.id;
      } else {
        return res.status(400).json({ success: false, message: 'Receiver ID is required.' });
      }
    } else {
      receiverId = parseInt(receiverId, 10);
    }

    // Permission enforcement: normal user can ONLY message an admin
    if (req.user.role !== 'admin') {
      const targetUser = await query.get('SELECT role FROM users WHERE id = ?', [receiverId]);
      if (!targetUser || targetUser.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only communicate directly with the Administrator.'
        });
      }
    }

    let attachmentOrigName = null;
    let attachmentStoredName = null;
    let attachmentPath = null;
    let attachmentSize = null;
    let attachmentType = null;

    if (file) {
      attachmentOrigName = file.originalname;
      attachmentStoredName = file.filename;
      attachmentPath = path.join('chat', file.filename).replace(/\\/g, '/');
      attachmentSize = file.size;
      attachmentType = file.mimetype;

      // Register file in files table so Admin can manage all user uploads
      const category = categorizeMime(file.mimetype, path.extname(file.originalname));
      await query.run(`
        INSERT INTO files (user_id, original_name, stored_name, file_path, file_size, mime_type, category, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Uploaded via private chat')
      `, [
        req.user.id,
        file.originalname,
        file.filename,
        attachmentPath,
        file.size,
        file.mimetype,
        category
      ]);
    }

    const result = await query.run(`
      INSERT INTO messages (
        sender_id, receiver_id, content,
        attachment_original_name, attachment_stored_name, attachment_path, attachment_size, attachment_type,
        is_read
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      req.user.id,
      receiverId,
      content ? content.trim() : '',
      attachmentOrigName,
      attachmentStoredName,
      attachmentPath,
      attachmentSize,
      attachmentType
    ]);

    const messageId = result.lastID;

    // Fetch the newly created message with sender info
    const newMessage = await query.get(`
      SELECT m.*, 
             s.name as sender_name, s.avatar as sender_avatar, s.role as sender_role,
             r.name as receiver_name
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      WHERE m.id = ?
    `, [messageId]);

    // Send real-time Socket.IO event if available
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`user_${receiverId}`).emit('new_message', newMessage);
      io.to(`user_${req.user.id}`).emit('message_sent', newMessage);
    }

    // Add in-app notification for receiver
    await query.run(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, 'New Private Message', ?, 'chat_message', '/chat')
    `, [
      receiverId,
      `${req.user.name}: ${content ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : 'Attached a file'}`
    ]);

    return res.status(201).json({ success: true, message: newMessage });
  } catch (err) {
    console.error('Error sending message:', err);
    return res.status(500).json({ success: false, message: 'Internal server error sending message.' });
  }
});

// Mark messages from other user as read
router.patch('/read/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const otherUserId = parseInt(req.params.otherUserId, 10);
    const currentUserId = req.user.id;

    await query.run(`
      UPDATE messages 
      SET is_read = 1 
      WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    `, [otherUserId, currentUserId]);

    if (req.app.get('io')) {
      req.app.get('io').to(`user_${otherUserId}`).emit('messages_read', { readBy: currentUserId });
    }

    return res.json({ success: true, message: 'Messages marked as read.' });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    return res.status(500).json({ success: false, message: 'Internal server error marking messages read.' });
  }
});

module.exports = router;
