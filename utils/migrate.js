const { pool, connectDB } = require('../config/db');
require('dotenv').config();

const migrate = async () => {
  try {
    await connectDB();
    console.log('\n🔧 Running migrations...\n');

    // ── Admins ────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        email       VARCHAR(150) NOT NULL UNIQUE,
        password    VARCHAR(255) NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Table: admins');

    // ── Sites ─────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        name          VARCHAR(150) NOT NULL,
        address       TEXT NOT NULL,
        owner_name    VARCHAR(100),
        phone         VARCHAR(20),
        gst_number    VARCHAR(50),
        project_name  VARCHAR(150),
        status        ENUM('active','inactive') DEFAULT 'active',
        notes         TEXT,
        created_by    INT,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Table: sites');

    // ── Transactions ──────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        type          ENUM('IN','OUT') NOT NULL,
        amount        DECIMAL(12,2) NOT NULL,
        site_id       INT NOT NULL,
        name          VARCHAR(150) NOT NULL,
        description   TEXT,
        note          TEXT,
        payment_mode  ENUM('Cash','UPI','Bank') DEFAULT 'Cash',
        date          DATE NOT NULL,
        created_by    INT,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id)    REFERENCES sites(id)  ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Table: transactions');

    // ── Invoices ──────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number  VARCHAR(20) NOT NULL UNIQUE,
        site_id         INT NOT NULL,
        subtotal        DECIMAL(12,2) DEFAULT 0,
        tax_rate        DECIMAL(5,2) DEFAULT 0,
        tax_amount      DECIMAL(12,2) DEFAULT 0,
        total           DECIMAL(12,2) NOT NULL,
        status          ENUM('paid','unpaid','cancelled') DEFAULT 'unpaid',
        due_date        DATE,
        notes           TEXT,
        date            DATE DEFAULT (CURDATE()),
        created_by      INT,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id)    REFERENCES sites(id)  ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Table: invoices');

    // ── Invoice Items ─────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id    INT NOT NULL,
        description   VARCHAR(255) NOT NULL,
        quantity      DECIMAL(10,2) NOT NULL DEFAULT 1,
        rate          DECIMAL(12,2) NOT NULL,
        amount        DECIMAL(12,2) NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Table: invoice_items');

    // ── Quotations ────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        quotation_number    VARCHAR(20) NOT NULL UNIQUE,
        site_id             INT NOT NULL,
        subtotal            DECIMAL(12,2) DEFAULT 0,
        tax_rate            DECIMAL(5,2) DEFAULT 0,
        tax_amount          DECIMAL(12,2) DEFAULT 0,
        total               DECIMAL(12,2) NOT NULL,
        status              ENUM('draft','sent','converted','cancelled') DEFAULT 'draft',
        valid_until         DATE,
        notes               TEXT,
        date                DATE DEFAULT (CURDATE()),
        converted_invoice_id INT DEFAULT NULL,
        created_by          INT,
        created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id)              REFERENCES sites(id)    ON DELETE CASCADE,
        FOREIGN KEY (converted_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by)           REFERENCES admins(id)   ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Table: quotations');

    // ── Quotation Items ───────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quotation_items (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        quotation_id    INT NOT NULL,
        description     VARCHAR(255) NOT NULL,
        quantity        DECIMAL(10,2) NOT NULL DEFAULT 1,
        rate            DECIMAL(12,2) NOT NULL,
        amount          DECIMAL(12,2) NOT NULL,
        FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Table: quotation_items');

    console.log('\n🎉 All migrations completed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

migrate();
