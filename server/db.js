const { createClient } = require('@libsql/client');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN?.trim();
const isVercel = Boolean(process.env.VERCEL);
const isProduction = process.env.NODE_ENV === 'production';
const forceLocal = process.env.FORCE_LOCAL_DB === 'true' || process.env.OFFLINE_MODE === 'true';

let client = null;
let isOfflineFallback = false;

function createDbClient() {
  if (forceLocal) {
    console.log(`📦 [DB] Offline mode forced. Connected to local SQLite database at: ${dbPath}`);
    return createClient({ url: `file:${dbPath}` });
  }

  if (tursoUrl && tursoAuthToken) {
    return createClient({ url: tursoUrl, authToken: tursoAuthToken });
  }

  if (isVercel) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured in Vercel environment variables.');
  }

  console.log(`📦 [DB] Turso credentials not provided. Connected to local SQLite database at: ${dbPath}`);
  return createClient({ url: `file:${dbPath}` });
}

client = createDbClient();

function getActiveClient() {
  return client;
}

function canFallbackToLocal(err) {
  if (isVercel || isOfflineFallback || forceLocal) return false;
  const msg = (err?.message || String(err)).toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('timeout') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('eai_again') ||
    msg.includes('und_err') ||
    msg.includes('network')
  );
}

function switchToLocalSqlite(reasonErr) {
  console.warn('⚠️  [DB] Network/Turso communication issue:', reasonErr?.message);
  console.log(`📦 [DB] Auto-switching session to local SQLite database at: ${dbPath}`);
  client = createClient({ url: `file:${dbPath}` });
  isOfflineFallback = true;
}

// Helper functions for Promises with automatic offline resilience
const query = {
  get: async (sql, params = []) => {
    try {
      const result = await getActiveClient().execute({ sql, args: params });
      return result.rows[0];
    } catch (err) {
      if (canFallbackToLocal(err)) {
        switchToLocalSqlite(err);
        const result = await getActiveClient().execute({ sql, args: params });
        return result.rows[0];
      }
      throw err;
    }
  },
  all: async (sql, params = []) => {
    try {
      const result = await getActiveClient().execute({ sql, args: params });
      return result.rows;
    } catch (err) {
      if (canFallbackToLocal(err)) {
        switchToLocalSqlite(err);
        const result = await getActiveClient().execute({ sql, args: params });
        return result.rows;
      }
      throw err;
    }
  },
  run: async (sql, params = []) => {
    try {
      const result = await getActiveClient().execute({ sql, args: params });
      return {
        lastID: Number(result.lastInsertRowid ?? 0),
        changes: Number(result.rowsAffected)
      };
    } catch (err) {
      if (canFallbackToLocal(err)) {
        switchToLocalSqlite(err);
        const result = await getActiveClient().execute({ sql, args: params });
        return {
          lastID: Number(result.lastInsertRowid ?? 0),
          changes: Number(result.rowsAffected)
        };
      }
      throw err;
    }
  },
  exec: async (sql) => {
    try {
      return await getActiveClient().executeMultiple(sql);
    } catch (err) {
      if (canFallbackToLocal(err)) {
        switchToLocalSqlite(err);
        return await getActiveClient().executeMultiple(sql);
      }
      throw err;
    }
  }
};

async function addColumnIfMissing(sql) {
  try {
    await query.run(sql);
  } catch (err) {
    if (!/duplicate column name/i.test(err?.message || String(err))) {
      throw err;
    }
  }
}

async function initDatabase() {
  // Test connection to Turso if configured, or fall back to local SQLite if offline
  if (!forceLocal && tursoUrl && tursoAuthToken) {
    try {
      await client.execute('SELECT 1');
      console.log('✅ [DB] Connected to Turso cloud database.');
    } catch (err) {
      if (isVercel) {
        console.error('❌ [DB] Turso connection failed in Vercel environment:', err.message);
        throw err;
      }
      switchToLocalSqlite(err);
    }
  }

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

  await addColumnIfMissing('ALTER TABLE users ADD COLUMN active_session_token TEXT;');
  await addColumnIfMissing('ALTER TABLE users ADD COLUMN date_of_birth TEXT;');

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

  await addColumnIfMissing("ALTER TABLE email_otps ADD COLUMN purpose TEXT DEFAULT 'registration';");

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

  // Task Assignments table
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

  // Login Activity table
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

  // Seed designated Admin account (jerison1539@gmail.com / JeriADM07#)
  await seedInitialData();
}

async function seedInitialData() {
  const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'jerison1539@gmail.com').trim().toLowerCase();
  const rawAdminPass = process.env.DEFAULT_ADMIN_PASSWORD;
  const adminPassword = (rawAdminPass && rawAdminPass !== 'JeriADM07' ? rawAdminPass : 'JeriADM07#');
  const adminName = process.env.DEFAULT_ADMIN_NAME || 'Jerison (Admin)';

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash(adminPassword, salt);

  const existingAdmin = await query.get(
    'SELECT id, password_hash, role, status FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))',
    [adminEmail]
  );

  if (existingAdmin) {
    const isPasswordValid = await bcrypt.compare(adminPassword, existingAdmin.password_hash);
    if (!isPasswordValid || existingAdmin.role !== 'admin' || existingAdmin.status !== 'active') {
      await query.run(
        'UPDATE users SET password_hash = ?, role = ?, status = ? WHERE id = ?',
        [adminHash, 'admin', 'active', existingAdmin.id]
      );
      console.log(`[SEED] Admin credentials & role synchronized for: ${adminEmail}`);
    } else {
      console.log(`[SEED] Designated admin account verified & ready: ${adminEmail}`);
    }
    return;
  }

  await query.run(`
    INSERT INTO users (name, email, password_hash, role, department, status, avatar)
    VALUES (?, ?, ?, 'admin', 'Management', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
  `, [adminName, adminEmail, adminHash]);
  console.log(`[SEED] Designated admin account created: ${adminEmail}`);
}

module.exports = {
  get db() {
    return getActiveClient();
  },
  query,
  initDatabase,
  isOffline: () => isOfflineFallback || forceLocal
};
