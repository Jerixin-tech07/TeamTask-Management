const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { JWT_SECRET, authenticateToken, logLoginActivity } = require('../middleware/auth');
const {
  sendOtpEmail,
  sendWelcomeEmail,
  sendAdminNewUserAlert,
  sendLoginNotificationEmail,
  getRecentEmails,
  getMailerStatus
} = require('../mailer');

const DESIGNATED_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || 'jerison1539@gmail.com').trim().toLowerCase();

// Check if name already exists in database
router.post('/check-name', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.json({ success: true, available: true });
    const existing = await query.get('SELECT id FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))', [name.trim()]);
    if (existing) {
      return res.json({ success: false, available: false, message: 'This name already exist' });
    }
    return res.json({ success: true, available: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error checking name.' });
  }
});

// Send OTP to email during registration
router.post('/send-otp', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Prevent registering admin email as a user
    if (normalizedEmail === DESIGNATED_ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'This email is reserved for Administrator login. Please sign in via the Admin portal.'
      });
    }

    // Check if name already taken by another user
    if (name && name.trim()) {
      const existingName = await query.get('SELECT id FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))', [name.trim()]);
      if (existingName) {
        return res.status(400).json({
          success: false,
          message: 'This name already exist'
        });
      }
    }

    // Check if user already exists
    const existingUser = await query.get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address is already registered. Creating multiple accounts with the same email is not permitted. Please log in.'
      });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Delete any old OTPs for this email
    await query.run('DELETE FROM email_otps WHERE email = ?', [normalizedEmail]);

    // Save new OTP
    await query.run(
      'INSERT INTO email_otps (email, otp, expires_at, verified) VALUES (?, ?, ?, 0)',
      [normalizedEmail, otp, expiresAt]
    );

    // Send email via configured transporter
    const mailResult = await sendOtpEmail(normalizedEmail, otp);

    const message = mailResult.realEmailDelivered
      ? `A 6-digit verification code has been dispatched via SMTP to ${normalizedEmail}. Please check your inbox.`
      : `A 6-digit verification code was generated. Notice: Real external SMTP credentials (SMTP_USER & SMTP_PASS) are not yet configured in .env. Code is viewable in Dev Mailbox & server terminal.`;

    return res.json({
      success: true,
      message,
      email: normalizedEmail,
      realEmailDelivered: !!mailResult.realEmailDelivered,
      needsSmtpConfig: !!mailResult.needsSmtpConfig,
      expiresInMinutes: 10
    });
  } catch (err) {
    console.error('Error in send-otp:', err);
    return res.status(500).json({ success: false, message: 'Internal server error sending OTP.' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const record = await query.get(
      'SELECT id, otp, expires_at FROM email_otps WHERE email = ? ORDER BY id DESC LIMIT 1',
      [normalizedEmail]
    );

    if (!record) {
      return res.status(400).json({ success: false, message: 'No OTP request found for this email. Please request a new code.' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'This OTP has expired. Please request a new one.' });
    }

    if (record.otp !== cleanOtp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please enter the correct 6-digit code.' });
    }

    // Mark as verified
    await query.run('UPDATE email_otps SET verified = 1 WHERE id = ?', [record.id]);

    return res.json({
      success: true,
      message: 'Email verified successfully! You may now complete account registration.'
    });
  } catch (err) {
    console.error('Error in verify-otp:', err);
    return res.status(500).json({ success: false, message: 'Internal server error verifying OTP.' });
  }
});

// Register new user (only allowed with verified OTP)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, otp, department, date_of_birth } = req.body;

    if (!name || !email || !password || !otp) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and OTP are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify OTP record
    const otpRecord = await query.get(
      'SELECT id, verified, expires_at FROM email_otps WHERE email = ? AND otp = ? ORDER BY id DESC LIMIT 1',
      [normalizedEmail, otp.toString().trim()]
    );

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please verify your email first.' });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    if (!otpRecord.verified) {
      return res.status(400).json({ success: false, message: 'Please verify the OTP before completing registration.' });
    }

    // Check if user already exists
    const existing = await query.get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Creating multiple accounts with the same email is not permitted.'
      });
    }

    // Check if name already taken by another user
    const existingName = await query.get('SELECT id FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))', [name.trim()]);
    if (existingName) {
      return res.status(400).json({
        success: false,
        message: 'This name already exist'
      });
    }

    if (normalizedEmail === DESIGNATED_ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'This email is reserved for Administrator login. Please sign in via the Admin portal.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Random stylish avatar generator
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`;
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);

    // Insert user
    const userResult = await query.run(`
      INSERT INTO users (name, email, password_hash, role, department, avatar, status, active_session_token, last_login_at, date_of_birth)
      VALUES (?, ?, ?, 'user', ?, ?, 'active', ?, CURRENT_TIMESTAMP, ?)
    `, [name.trim(), normalizedEmail, passwordHash, department || 'Student', avatar, sessionId, date_of_birth || null]);

    const newUserId = userResult.lastID;

    // Clean up OTPs
    await query.run('DELETE FROM email_otps WHERE email = ?', [normalizedEmail]);

    // Send Welcome Email
    sendWelcomeEmail(normalizedEmail, name.trim()).catch(e => console.error('Welcome email error:', e));

    // Send login notification email to registered user
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Web Browser';
    sendLoginNotificationEmail(normalizedEmail, name.trim(), ip, userAgent).catch(e => console.error('Login notification email error:', e));

    // Notify Admins
    const admins = await query.all("SELECT id, email FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      // In-app notification
      await query.run(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, 'New Team Member Registered', ?, 'user_registered', '/users')
      `, [admin.id, `${name.trim()} (${normalizedEmail}) has successfully joined the workspace.`]);

      // Email notification to admin
      sendAdminNewUserAlert(admin.email, {
        name: name.trim(),
        email: normalizedEmail,
        department: department || 'Student'
      }).catch(e => console.error('Admin alert error:', e));
    }

    // Record login activity
    await logLoginActivity(req, {
      userId: newUserId,
      email: normalizedEmail,
      status: 'SUCCESS'
    });

    // Generate JWT
    const token = jwt.sign(
      { id: newUserId, email: normalizedEmail, role: 'user', sessionId },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const user = {
      id: newUserId,
      name: name.trim(),
      email: normalizedEmail,
      role: 'user',
      department: department || 'Engineering',
      avatar,
      status: 'active'
    };

    return res.status(201).json({
      success: true,
      message: 'Account registered and verified successfully!',
      token,
      user
    });
  } catch (err) {
    console.error('Error in register:', err);
    return res.status(500).json({ success: false, message: 'Internal server error registering account.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, portalRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isDesignatedAdmin = normalizedEmail === DESIGNATED_ADMIN_EMAIL.toLowerCase();

    // Portal Access Restrictions:
    // 1. User Sign In option: Only for users to login. DO NOT allow the admin to login in user's options.
    if (portalRole !== 'admin') {
      if (isDesignatedAdmin) {
        await logLoginActivity(req, {
          userId: null,
          email: normalizedEmail,
          status: 'FAILED',
          failureReason: 'Admin attempted to login via User portal'
        });
        return res.status(403).json({
          success: false,
          message: 'Administrator accounts must use the Admin Sign In portal, not the Team Member portal.'
        });
      }
    }

    // 2. Admin Sign In option: ONLY allowed for the admin (jerison1539@gmail.com).
    if (portalRole === 'admin') {
      if (!isDesignatedAdmin) {
        await logLoginActivity(req, {
          userId: null,
          email: normalizedEmail,
          status: 'FAILED',
          failureReason: 'Unauthorized Admin Portal access attempt'
        });
        return res.status(403).json({
          success: false,
          message: `Access Denied: Only the designated administrator (${DESIGNATED_ADMIN_EMAIL}) is permitted to sign in as Administrator.`
        });
      }
    }

    let user = await query.get('SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))', [normalizedEmail]);

    if (!user) {
      // If designated admin is logging in for the first time before seed
      if (isDesignatedAdmin && portalRole === 'admin') {
        const masterAdminPass = process.env.DEFAULT_ADMIN_PASSWORD || 'JeriADM07#';
        if (password === masterAdminPass) {
          const salt = await bcrypt.genSalt(10);
          const adminHash = await bcrypt.hash(password, salt);
          const insResult = await query.run(`
            INSERT INTO users (name, email, password_hash, role, department, status, avatar)
            VALUES (?, ?, ?, 'admin', 'Management', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
          `, [process.env.DEFAULT_ADMIN_NAME || 'Jerison (Admin)', normalizedEmail, adminHash]);
          const createdAdmin = await query.get('SELECT * FROM users WHERE id = ?', [insResult.lastID]);
          if (createdAdmin) {
            user = createdAdmin;
          }
        }
      }
      
      if (!user) {
        await logLoginActivity(req, {
          userId: null,
          email: normalizedEmail,
          status: 'FAILED',
          failureReason: 'Unregistered email attempt - access rejected'
        });
        return res.status(401).json({
          success: false,
          unregistered: true,
          message: 'This email is not registered in our system. Only verified registered accounts are allowed to sign in. Please register first with OTP.'
        });
      }
    }

    // Prevent any admin account from logging in through user portal
    if (portalRole !== 'admin' && user.role === 'admin') {
      await logLoginActivity(req, {
        userId: user.id,
        email: normalizedEmail,
        status: 'FAILED',
        failureReason: 'Admin attempted to login via User portal'
      });
      return res.status(403).json({
        success: false,
        message: 'Administrator accounts must use the Admin Sign In portal, not the Team Member portal.'
      });
    }

    if (portalRole === 'admin' && user.role !== 'admin') {
      await logLoginActivity(req, {
        userId: user.id,
        email: normalizedEmail,
        status: 'FAILED',
        failureReason: 'Non-admin attempted to login via Admin portal'
      });
      return res.status(403).json({
        success: false,
        message: 'Access Denied: This account does not have Administrator privileges.'
      });
    }

    if (user.status !== 'active') {
      await logLoginActivity(req, {
        userId: user.id,
        email: normalizedEmail,
        status: 'FAILED',
        failureReason: 'Account suspended'
      });
      return res.status(403).json({ success: false, message: 'Account is suspended. Please contact your administrator.' });
    }

    let isMatch = await bcrypt.compare(password, user.password_hash);
    const rawEnvPass = process.env.DEFAULT_ADMIN_PASSWORD;
    const masterAdminPass = (rawEnvPass && rawEnvPass !== 'JeriADM07' ? rawEnvPass : 'JeriADM07#');
    if (!isMatch && isDesignatedAdmin && password === masterAdminPass) {
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(password, salt);
      await query.run('UPDATE users SET password_hash = ?, role = "admin", status = "active" WHERE id = ?', [newHash, user.id]);
      user.password_hash = newHash;
      user.role = 'admin';
      user.status = 'active';
      isMatch = true;
    }

    if (!isMatch) {
      await logLoginActivity(req, {
        userId: user.id,
        email: normalizedEmail,
        status: 'FAILED',
        failureReason: 'Invalid password'
      });
      return res.status(401).json({
        success: false,
        message: 'Incorrect password entered. Only verified registered account credentials are accepted. Please try again or use Forgot Password.'
      });
    }

    // Generate fresh session ID to enforce single-device login
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);

    // Terminate any previous device session for this user by broadcasting socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${user.id}`).emit('session_terminated', {
        message: 'Your account was logged in from another device. Simultaneous logins are not permitted.'
      });
    }

    // Update last_login_at and active_session_token in users table
    await query.run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP, active_session_token = ? WHERE id = ?', [sessionId, user.id]);

    // Capture IP and User Agent
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Web Browser';

    // Send login notification email to registered user
    sendLoginNotificationEmail(user.email, user.name, ip, userAgent).catch(e => console.error('Login notification email error:', e));

    // Log successful login
    await logLoginActivity(req, {
      userId: user.id,
      email: normalizedEmail,
      status: 'SUCCESS'
    });

    // Generate JWT containing sessionId
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, sessionId },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      avatar: user.avatar,
      status: user.status
    };

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Error in login:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

// Dev endpoint: recent emails (allows instant inspection of OTPs and welcome emails in development)
router.get('/dev-emails', (req, res) => {
  const emails = getRecentEmails();
  return res.json({
    success: true,
    emails
  });
});

// Mailer Service Status endpoint
router.get('/mailer-status', (req, res) => {
  const status = getMailerStatus();
  return res.json({
    success: true,
    mailer: status
  });
});

// ============================================================
// FORGOT PASSWORD FLOW
// ============================================================

// Step 1: Send OTP to email for password reset
router.post('/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await query.get('SELECT id, name FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete any old OTPs for this email (password reset purpose)
    await query.run('DELETE FROM email_otps WHERE email = ? AND purpose = ?', [normalizedEmail, 'password_reset']);
    await query.run(
      'INSERT INTO email_otps (email, otp, expires_at, verified, purpose) VALUES (?, ?, ?, 0, ?)',
      [normalizedEmail, otp, expiresAt, 'password_reset']
    );

    const mailResult = await sendOtpEmail(normalizedEmail, otp);

    const message = mailResult.realEmailDelivered
      ? `A 6-digit password reset code has been sent to ${normalizedEmail}.`
      : `A 6-digit reset code was generated. View it in Dev Mailbox (SMTP not configured).`;

    return res.json({
      success: true,
      message,
      realEmailDelivered: !!mailResult.realEmailDelivered,
      needsSmtpConfig: !!mailResult.needsSmtpConfig
    });
  } catch (err) {
    console.error('Error in forgot-password send-otp:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Step 2: Verify OTP for password reset
router.post('/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    // Check both with and without purpose column for backward compat
    const record = await query.get(
      `SELECT id, otp, expires_at FROM email_otps WHERE email = ? AND (purpose = 'password_reset' OR purpose IS NULL) ORDER BY id DESC LIMIT 1`,
      [normalizedEmail]
    );

    if (!record) {
      return res.status(400).json({ success: false, message: 'No password reset request found. Please request a new code.' });
    }
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'This OTP has expired. Please request a new one.' });
    }
    if (record.otp !== cleanOtp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please enter the correct 6-digit code.' });
    }

    await query.run('UPDATE email_otps SET verified = 1 WHERE id = ?', [record.id]);

    return res.json({ success: true, message: 'OTP verified! You may now set your new password.' });
  } catch (err) {
    console.error('Error in forgot-password verify-otp:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Step 3: Reset password
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    }
    if (newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const record = await query.get(
      `SELECT id, verified, expires_at FROM email_otps WHERE email = ? AND otp = ? AND (purpose = 'password_reset' OR purpose IS NULL) ORDER BY id DESC LIMIT 1`,
      [normalizedEmail, otp.toString().trim()]
    );

    if (!record || !record.verified) {
      return res.status(400).json({ success: false, message: 'Invalid or unverified OTP. Please start the reset process again.' });
    }
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword.trim(), salt);

    await query.run('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, normalizedEmail]);
    await query.run('DELETE FROM email_otps WHERE email = ? AND (purpose = \'password_reset\' OR purpose IS NULL)', [normalizedEmail]);

    return res.json({ success: true, message: 'Password reset successfully! You can now log in with your new password.' });
  } catch (err) {
    console.error('Error in forgot-password reset:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Password change with OTP verification (for authenticated users in Account Details)
router.post('/change-password/send-otp', authenticateToken, async (req, res) => {
  try {
    const user = await query.get('SELECT id, email, name FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await query.run('DELETE FROM email_otps WHERE email = ? AND purpose = ?', [user.email, 'change_password']);
    await query.run(
      'INSERT INTO email_otps (email, otp, expires_at, verified, purpose) VALUES (?, ?, ?, 0, ?)',
      [user.email, otp, expiresAt, 'change_password']
    );

    const mailResult = await sendOtpEmail(user.email, otp);
    const message = mailResult.realEmailDelivered
      ? `A 6-digit verification code has been sent to ${user.email}.`
      : `Code generated. View in Dev Mailbox (SMTP not configured).`;

    return res.json({ success: true, message });
  } catch (err) {
    console.error('Error in change-password send-otp:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

router.post('/change-password/reset', authenticateToken, async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    if (!otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'OTP and new password are required.' });
    }
    if (newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const user = await query.get('SELECT id, email FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const record = await query.get(
      `SELECT id, verified, expires_at FROM email_otps WHERE email = ? AND otp = ? AND purpose = 'change_password' ORDER BY id DESC LIMIT 1`,
      [user.email, otp.toString().trim()]
    );

    if (!record) return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
    if (new Date(record.expires_at) < new Date()) return res.status(400).json({ success: false, message: 'OTP has expired.' });
    if (!record.verified) {
      // Auto-verify if code matches
      await query.run('UPDATE email_otps SET verified = 1 WHERE id = ?', [record.id]);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword.trim(), salt);
    await query.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
    await query.run(`DELETE FROM email_otps WHERE email = ? AND purpose = 'change_password'`, [user.email]);

    return res.json({ success: true, message: 'Password changed successfully!' });
  } catch (err) {
    console.error('Error in change-password reset:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;
