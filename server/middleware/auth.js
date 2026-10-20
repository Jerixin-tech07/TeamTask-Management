const jwt = require('jsonwebtoken');
const { query } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_team_task_management_2026_secure!';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    // For direct authenticated file downloads or stream links
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await query.get('SELECT id, name, email, role, department, avatar, status, active_session_token FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account has been suspended. Please contact administrator.' });
    }

    // Enforce single-device login: reject old session if logged in on a second device
    if (decoded.sessionId && user.active_session_token && decoded.sessionId !== user.active_session_token) {
      return res.status(401).json({
        success: false,
        sessionTerminated: true,
        message: 'Your account was logged in from another device. Simultaneous logins are not permitted.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Administrator privileges required.' });
  }
  next();
}

// Log user activity into spreadsheet-style table
async function logLoginActivity(req, { userId = null, email, status, failureReason = null }) {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';

    await query.run(`
      INSERT INTO login_activity (user_id, email, status, ip_address, user_agent, failure_reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, email, status, ip, userAgent, failureReason]);
  } catch (err) {
    console.error('Failed to log login activity:', err.message);
  }
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireAdmin,
  logLoginActivity
};
