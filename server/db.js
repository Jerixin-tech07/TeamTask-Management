const { createClient } = require('@libsql/client');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN?.trim();
const isVercel = Boolean(process.env.VERCEL);

if (Boolean(tursoUrl) !== Boolean(tursoAuthToken)) {
  throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must both be configured.');
}

if (isVercel && (!tursoUrl || !tursoAuthToken)) {
  throw new Error('Turso is required on Vercel. Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
}

if (isVercel && tursoUrl.toLowerCase().startsWith('file:')) {
  throw new Error('TURSO_DATABASE_URL must point to a remote Turso database on Vercel.');
}

const db = createClient(
  tursoUrl && tursoAuthToken
    ? { url: tursoUrl, authToken: tursoAuthToken }
    : { url: `file:${dbPath}` }
);

console.log(tursoUrl && !tursoUrl.toLowerCase().startsWith('file:')
  ? 'Connected to Turso database.'
  : `Connected to local SQLite database at: ${dbPath}`);

// Helper functions for Promises
const query = {
  get: async (sql, params = []) => {
    const result = await db.execute({ sql, args: params });
    return result.rows[0];
  },
  all: async (sql, params = []) => {
    const result = await db.execute({ sql, args: params });
    return result.rows;
  },
  run: async (sql, params = []) => {
    const result = await db.execute({ sql, args: params });
    return {
      lastID: Number(result.lastInsertRowid ?? 0),
      changes: Number(result.rowsAffected)
    };
  },
  exec: (sql) => db.executeMultiple(sql)
};

async function initDatabase() {
  // Enable foreign keys
  await query.run('PRAGMA foreign_keys = ON;');

  // Users table
  await query.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar TEXT,
      department TEXT DEFAULT 'Product',
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME,
      active_session_token TEXT
    );
  `);

  try {
    await query.run('ALTER TABLE users ADD COLUMN active_session_token TEXT;');
  } catch (err) {
    // Column already exists
  }

  // Add date_of_birth column if not exists
  try {
    await query.run('ALTER TABLE users ADD COLUMN date_of_birth TEXT;');
  } catch (err) {
    // Column already exists
  }

  // Email OTPs table
  await query.exec(`
    CREATE TABLE IF NOT EXISTS email_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      verified INTEGER DEFAULT 0,
      purpose TEXT DEFAULT 'registration',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_otps_email ON email_otps(email);
  `);

  // Add purpose column to email_otps if not exists (migration for existing DBs)
  try {
    await query.run("ALTER TABLE email_otps ADD COLUMN purpose TEXT DEFAULT 'registration';");
  } catch (err) {
    // Column already exists
  }

  // Tasks table
  await query.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      category TEXT DEFAULT 'General',
      deadline DATETIME,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Task Assignments table (many-to-many or specific user assignment)
  await query.exec(`
    CREATE TABLE IF NOT EXISTS task_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(task_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_assignments_user ON task_assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_task ON task_assignments(task_id);
  `);

  // Task Submissions / Proof of Work
  await query.exec(`
    CREATE TABLE IF NOT EXISTS task_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Messages table (Private Chat between User and Admin)
  await query.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT,
      attachment_original_name TEXT,
      attachment_stored_name TEXT,
      attachment_path TEXT,
      attachment_size INTEGER,
      attachment_type TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id);
  `);

  // Files / Media Uploads
  await query.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      category TEXT DEFAULT 'general',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
  `);

  // Login Activity table (Spreadsheet-style tracking)
  await query.exec(`
    CREATE TABLE IF NOT EXISTS login_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      email TEXT NOT NULL,
      status TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      failure_reason TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_activity_timestamp ON login_activity(timestamp DESC);
  `);

  // Notifications table
  await query.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  `);

// Seed designated Admin account if not present (jerison1539@gmail.com)
  await seedInitialData();
}

async function seedInitialData() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'jerison1539@gmail.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'JeriAD07#';
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash(adminPassword, salt);

  const existingAdmin = await query.get('SELECT id FROM users WHERE email = ?', [adminEmail]);

  if (!existingAdmin) {
    await query.run(`
      INSERT INTO users (name, email, password_hash, role, department, status, avatar)
      VALUES (?, ?, ?, 'admin', 'Management', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
    `, [process.env.DEFAULT_ADMIN_NAME || 'Jerison (Admin)', adminEmail, adminHash]);
    console.log(`[SEED] Designated admin account created: ${adminEmail}`);
  } else {
    // Keep password and role synchronized
    await query.run(`
      UPDATE users SET password_hash = ?, role = 'admin', status = 'active' WHERE id = ?
    `, [adminHash, existingAdmin.id]);
    console.log(`[SEED] Admin account verified & synchronized: ${adminEmail}`);
  }
}

module.exports = {
  db,
  query,
  initDatabase
};
