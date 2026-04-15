const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM admins WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length) return res.status(401).json({ message: 'Admin not found' });

    req.admin = rows[0];
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

module.exports = { protect };
