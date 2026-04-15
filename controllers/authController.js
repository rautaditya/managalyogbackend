const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const generateToken = require('../utils/generateToken');
const { validationResult } = require('express-validator');

// POST /api/auth/login
const loginAdmin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid email or password' });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    res.json({
      id:    admin.id,
      name:  admin.name,
      email: admin.email,
      token: generateToken(admin.id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/register
const registerAdmin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;
  try {
    const [exists] = await pool.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (exists.length) return res.status(400).json({ message: 'Admin already exists' });

    const hashed = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO admins (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashed]
    );

    res.status(201).json({
      id:    result.insertId,
      name,
      email,
      token: generateToken(result.insertId),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/profile
const getProfile = async (req, res) => {
  res.json(req.admin);
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE id = ?', [req.admin.id]);
    const admin = rows[0];

    const match = await bcrypt.compare(currentPassword, admin.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE admins SET password = ? WHERE id = ?', [hashed, req.admin.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { loginAdmin, registerAdmin, getProfile, changePassword };
