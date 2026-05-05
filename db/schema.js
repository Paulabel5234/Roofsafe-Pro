const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'roofsafe.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contractors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      company_name TEXT NOT NULL,
      dba TEXT,
      address TEXT NOT NULL,
      city_state_zip TEXT NOT NULL,
      phone TEXT NOT NULL,
      cslb_license TEXT,
      iipp_admin TEXT NOT NULL,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      stripe_checkout_session_id TEXT,
      stripe_price_id TEXT,
      subscription_plan TEXT DEFAULT 'roofsafe_pro',
      subscription_current_period_end TEXT,
      subscription_cancel_at_period_end INTEGER DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid',
      last_stripe_event_id TEXT,
      activation_date TEXT,
      status TEXT DEFAULT 'pending',
      iipp_filename TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS toolbox_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      filename TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contractor_id INTEGER NOT NULL,
      topic_id INTEGER,
      email_type TEXT NOT NULL,
      subject TEXT,
      status TEXT DEFAULT 'pending',
      sent_at TEXT,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contractor_id) REFERENCES contractors(id),
      FOREIGN KEY (topic_id) REFERENCES toolbox_topics(id)
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  ensureColumn('contractors', 'stripe_checkout_session_id', 'TEXT');
  ensureColumn('contractors', 'stripe_price_id', 'TEXT');
  ensureColumn('contractors', 'subscription_plan', "TEXT DEFAULT 'roofsafe_pro'");
  ensureColumn('contractors', 'subscription_current_period_end', 'TEXT');
  ensureColumn('contractors', 'subscription_cancel_at_period_end', 'INTEGER DEFAULT 0');
  ensureColumn('contractors', 'payment_status', "TEXT DEFAULT 'unpaid'");
  ensureColumn('contractors', 'last_stripe_event_id', 'TEXT');

  // Seed default admin if none exists
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count === 0) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(`INSERT INTO admins (email, password_hash) VALUES (?, ?)`)
      .run('admin@roofsafepro.com', hash);
    console.log('✅ Default admin created: admin@roofsafepro.com / ' + adminPassword);
  }
}

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

module.exports = { getDb };
