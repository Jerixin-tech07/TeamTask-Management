const express = require('express');
const router = express.Router();
const path = require('path');
const { query } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { submissionUpload, categorizeMime } = require('../utils/uploader');
const { sendTaskAssignedEmail } = require('../mailer');

// Get all tasks (Admin sees all; User sees ONLY tasks assigned to them)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const isUserAdmin = req.user.role === 'admin';

    let tasks;
    if (isUserAdmin) {
      tasks = await query.all(`
        SELECT t.*, u.name as creator_name, u.email as creator_email
        FROM tasks t
        JOIN users u ON t.created_by = u.id
        ORDER BY t.created_at DESC
      `);
    } else {
      // User only sees tasks they are assigned to
      tasks = await query.all(`
        SELECT t.*, u.name as creator_name, u.email as creator_email,
               ta.status as user_status, ta.assigned_at, ta.completed_at
        FROM tasks t
        JOIN task_assignments ta ON t.id = ta.task_id
        JOIN users u ON t.created_by = u.id
        WHERE ta.user_id = ?
        ORDER BY t.created_at DESC
      `, [req.user.id]);
    }

    // For Admin: attach full assignments and submission counts across all users
    if (isUserAdmin) {
      const taskIds = tasks.map(t => t.id);
      if (taskIds.length === 0) {
        return res.json({ success: true, tasks: [] });
      }

      const placeholders = taskIds.map(() => '?').join(',');

      // Fetch all assignments for these tasks
      const assignments = await query.all(`
        SELECT ta.*, u.name, u.email, u.avatar, u.department
        FROM task_assignments ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.task_id IN (${placeholders})
      `, taskIds);

      const assignmentsByTaskId = {};
      assignments.forEach(a => {
        if (!assignmentsByTaskId[a.task_id]) {
          assignmentsByTaskId[a.task_id] = [];
        }
        assignmentsByTaskId[a.task_id].push(a);
      });

      const enrichedTasks = tasks.map(task => {
        const taskAssignments = assignmentsByTaskId[task.id] || [];
        const totalAssigned = taskAssignments.length;
        const completedCount = taskAssignments.filter(a => a.status === 'completed').length;
        const inProgressCount = taskAssignments.filter(a => a.status === 'in_progress').length;
        const pendingCount = taskAssignments.filter(a => a.status === 'pending').length;

        let aggregateStatus = 'pending';
        if (completedCount === totalAssigned && totalAssigned > 0) {
          aggregateStatus = 'completed';
        } else if (inProgressCount > 0 || completedCount > 0) {
          aggregateStatus = 'in_progress';
        }

        return {
          ...task,
          assignments: taskAssignments,
          aggregateStatus,
          totalAssigned,
          completedCount,
          inProgressCount,
          pendingCount
        };
      });

      return res.json({ success: true, tasks: enrichedTasks });
    } else {
      // For Normal User: Strictly isolate! User ONLY sees their own assignment details and status.
      // Zero other user names, emails, avatars, or team assignment lists are exposed.
      const safeUserTasks = tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        deadline: task.deadline,
        created_at: task.created_at,
        user_status: task.user_status,
        assigned_at: task.assigned_at,
        completed_at: task.completed_at
      }));

      return res.json({ success: true, tasks: safeUserTasks });
    }
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching tasks.' });
  }
});

// Admin creates a task and assigns to one or more team members
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, priority, category, deadline, assignedUserIds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    if (!Array.isArray(assignedUserIds) || assignedUserIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one team member to assign this task to.' });
    }

    const taskResult = await query.run(`
      INSERT INTO tasks (title, description, priority, category, deadline, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      title.trim(),
      description ? description.trim() : '',
      priority || 'medium',
      category || 'General',
      deadline || null,
      req.user.id
    ]);

    const taskId = taskResult.lastID;

    // Assign to specified users
    for (const userId of assignedUserIds) {
      await query.run(`
        INSERT OR IGNORE INTO task_assignments (task_id, user_id, status)
        VALUES (?, ?, 'pending')
      `, [taskId, userId]);

      // Create in-app notification
      await query.run(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, 'New Task Assigned', ?, 'task_assigned', '/tasks')
      `, [userId, `You have been assigned to: "${title.trim()}"`]);

      // Look up user email to send notification email
      const assignedUser = await query.get('SELECT name, email FROM users WHERE id = ?', [userId]);
      if (assignedUser) {
        sendTaskAssignedEmail(assignedUser.email, assignedUser.name, {
          title: title.trim(),
          description: description || '',
          priority: priority || 'medium',
          deadline
        }).catch(e => console.error('Error sending task email to user:', e));
      }
    }

    // Broadcast socket event if io is attached
    if (req.app.get('io')) {
      req.app.get('io').emit('task_created', { taskId, title });
    }

    return res.status(201).json({
      success: true,
      message: 'Task created and assigned successfully!',
      taskId
    });
  } catch (err) {
    console.error('Error creating task:', err);
    return res.status(500).json({ success: false, message: 'Internal server error creating task.' });
  }
});

// Admin updates task details and assignments
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, description, priority, category, deadline, assignedUserIds } = req.body;

    const existing = await query.get('SELECT id FROM tasks WHERE id = ?', [taskId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    await query.run(`
      UPDATE tasks
      SET title = ?, description = ?, priority = ?, category = ?, deadline = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title.trim(), description || '', priority || 'medium', category || 'General', deadline || null, taskId]);

    // Update assignments if provided
    if (Array.isArray(assignedUserIds)) {
      // Find existing assignments
      const currentAssignments = await query.all('SELECT user_id FROM task_assignments WHERE task_id = ?', [taskId]);
      const currentIds = currentAssignments.map(a => a.user_id);

      // Users to add
      const toAdd = assignedUserIds.filter(id => !currentIds.includes(Number(id)));
      for (const uid of toAdd) {
        await query.run(`
          INSERT INTO task_assignments (task_id, user_id, status)
          VALUES (?, ?, 'pending')
        `, [taskId, uid]);

        await query.run(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (?, 'New Task Assigned', ?, 'task_assigned', '/tasks')
        `, [uid, `You have been assigned to task: "${title.trim()}"`]);

        const assignedUser = await query.get('SELECT name, email FROM users WHERE id = ?', [uid]);
        if (assignedUser) {
          sendTaskAssignedEmail(assignedUser.email, assignedUser.name, {
            title: title.trim(),
            description: description || '',
            priority: priority || 'medium',
            deadline
          }).catch(e => console.error('Error sending task email to user:', e));
        }
      }

      // Users to remove
      const toRemove = currentIds.filter(id => !assignedUserIds.map(Number).includes(id));
      for (const uid of toRemove) {
        await query.run('DELETE FROM task_assignments WHERE task_id = ? AND user_id = ?', [taskId, uid]);
      }
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('task_updated', { taskId });
    }

    return res.json({ success: true, message: 'Task updated successfully.' });
  } catch (err) {
    console.error('Error updating task:', err);
    return res.status(500).json({ success: false, message: 'Internal server error updating task.' });
  }
});

// Admin deletes a task
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const taskId = req.params.id;
    const existing = await query.get('SELECT id, title FROM tasks WHERE id = ?', [taskId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    await query.run('DELETE FROM tasks WHERE id = ?', [taskId]);

    if (req.app.get('io')) {
      req.app.get('io').emit('task_deleted', { taskId });
    }

    return res.json({ success: true, message: `Task "${existing.title}" deleted successfully.` });
  } catch (err) {
    console.error('Error deleting task:', err);
    return res.status(500).json({ success: false, message: 'Internal server error deleting task.' });
  }
});

// User or Admin updates task assignment status ('pending', 'in_progress', 'completed')
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status, targetUserId } = req.body;

    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be pending, in_progress, or completed.' });
    }

    let userId = req.user.id;
    // Admin can update any user's assignment if targetUserId provided
    if (req.user.role === 'admin' && targetUserId) {
      userId = targetUserId;
    }

    const assignment = await query.get(
      'SELECT id, status FROM task_assignments WHERE task_id = ? AND user_id = ?',
      [taskId, userId]
    );

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Task assignment not found for this user.' });
    }

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    await query.run(`
      UPDATE task_assignments
      SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE task_id = ? AND user_id = ?
    `, [status, completedAt, taskId, userId]);

    // If a normal user marked as completed or in_progress, notify the admin
    if (req.user.role === 'user') {
      const task = await query.get('SELECT title FROM tasks WHERE id = ?', [taskId]);
      const admins = await query.all("SELECT id FROM users WHERE role = 'admin'");
      for (const admin of admins) {
        await query.run(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (?, 'Task Status Updated', ?, 'task_update', '/tasks')
        `, [
          admin.id,
          `${req.user.name} changed status of "${task ? task.title : 'Task'}" to ${status.replace('_', ' ').toUpperCase()}`
        ]);
      }
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('task_status_changed', { taskId, userId, status });
    }

    return res.json({ success: true, message: `Task status updated to ${status}.` });
  } catch (err) {
    console.error('Error updating status:', err);
    return res.status(500).json({ success: false, message: 'Internal server error updating task status.' });
  }
});

// User uploads completed work file and submission notes
router.post('/:id/submit', authenticateToken, submissionUpload.single('file'), async (req, res) => {
  try {
    const taskId = req.params.id;
    const { notes } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Please attach a submission document or file.' });
    }

    // Verify task assignment
    const assignment = await query.get(
      'SELECT id FROM task_assignments WHERE task_id = ? AND user_id = ?',
      [taskId, req.user.id]
    );

    if (!assignment && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not assigned to this task.' });
    }

    const relativePath = path.join('submissions', file.filename).replace(/\\/g, '/');

    // Save in task_submissions
    const submissionResult = await query.run(`
      INSERT INTO task_submissions (task_id, user_id, original_name, stored_name, file_path, file_size, mime_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      taskId,
      req.user.id,
      file.originalname,
      file.filename,
      relativePath,
      file.size,
      file.mimetype,
      notes || ''
    ]);

    // Also register in general files table so Admin can view it in the Media/File manager
    const category = categorizeMime(file.mimetype, path.extname(file.originalname));
    await query.run(`
      INSERT INTO files (user_id, task_id, original_name, stored_name, file_path, file_size, mime_type, category, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      taskId,
      file.originalname,
      file.filename,
      relativePath,
      file.size,
      file.mimetype,
      category,
      notes ? `Task submission: ${notes}` : 'Task proof submission'
    ]);

    // Also mark assignment status as 'completed'
    await query.run(`
      UPDATE task_assignments
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE task_id = ? AND user_id = ?
    `, [taskId, req.user.id]);

    // Notify admins
    const task = await query.get('SELECT title FROM tasks WHERE id = ?', [taskId]);
    const admins = await query.all("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await query.run(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, 'Task Work Submitted', ?, 'submission', '/tasks')
      `, [
        admin.id,
        `${req.user.name} submitted work & proof files for task: "${task ? task.title : 'Task'}"`
      ]);
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('task_status_changed', { taskId, userId: req.user.id, status: 'completed' });
    }

    return res.status(201).json({
      success: true,
      message: 'Work submitted successfully! Task marked as Completed.',
      submissionId: submissionResult.lastID
    });
  } catch (err) {
    console.error('Error submitting work:', err);
    return res.status(500).json({ success: false, message: 'Internal server error submitting work.' });
  }
});

// View submissions for a task
router.get('/:id/submissions', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;

    let submissions;
    if (req.user.role === 'admin') {
      submissions = await query.all(`
        SELECT ts.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar
        FROM task_submissions ts
        JOIN users u ON ts.user_id = u.id
        WHERE ts.task_id = ?
        ORDER BY ts.created_at DESC
      `, [taskId]);
    } else {
      submissions = await query.all(`
        SELECT ts.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar
        FROM task_submissions ts
        JOIN users u ON ts.user_id = u.id
        WHERE ts.task_id = ? AND ts.user_id = ?
        ORDER BY ts.created_at DESC
      `, [taskId, req.user.id]);
    }

    return res.json({ success: true, submissions });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    return res.status(500).json({ success: false, message: 'Internal server error fetching submissions.' });
  }
});

// Delete a specific submission (allow user to re-submit / replace)
router.delete('/:taskId/submissions/:submissionId', authenticateToken, async (req, res) => {
  try {
    const { taskId, submissionId } = req.params;

    const submission = await query.get(
      'SELECT id, user_id, file_path FROM task_submissions WHERE id = ? AND task_id = ?',
      [submissionId, taskId]
    );

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    // Only owner or admin can delete
    if (req.user.role !== 'admin' && submission.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Delete submission record
    await query.run('DELETE FROM task_submissions WHERE id = ?', [submissionId]);

    // Also remove from files table
    await query.run(
      'DELETE FROM files WHERE stored_name = (SELECT stored_name FROM task_submissions WHERE id = ?) AND task_id = ?',
      [submissionId, taskId]
    );

    // Reset assignment status back to in_progress so user can re-submit
    if (req.user.role !== 'admin') {
      await query.run(
        'UPDATE task_assignments SET status = \'in_progress\', completed_at = NULL WHERE task_id = ? AND user_id = ?',
        [taskId, req.user.id]
      );
    }

    return res.json({ success: true, message: 'Submission deleted. You can now submit new work.' });
  } catch (err) {
    console.error('Error deleting submission:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;
