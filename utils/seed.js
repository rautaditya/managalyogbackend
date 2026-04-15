const { pool, connectDB } = require('../config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seed = async () => {
  try {
    await connectDB();
    console.log('\n🌱 Seeding database...\n');

    // Delete existing admins
    await pool.query('DELETE FROM admins');

    const hashed = await bcrypt.hash('admin123', 12);
    await pool.query(
      'INSERT INTO admins (name, email, password) VALUES (?, ?, ?)',
      ['Super Admin', 'admin@mangalyog.com', hashed]
    );

    console.log('✅ Default admin created:');
    console.log('   Email   : admin@mangalyog.com');
    console.log('   Password: admin123');
    console.log('\n⚠️  Change the password after first login!\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
