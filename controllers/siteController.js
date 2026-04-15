const { pool } = require('../config/db');
const { validationResult } = require('express-validator');

// GET /api/sites
const getAllSites = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM sites';
    const params = [];
    if (status) { sql += ' WHERE status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/sites/:id
const getSiteById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sites WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Site not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/sites/:id/dashboard
const getSiteDashboard = async (req, res) => {
  try {
    const id = req.params.id;
    const [sites] = await pool.query('SELECT * FROM sites WHERE id = ?', [id]);
    if (!sites.length) return res.status(404).json({ message: 'Site not found' });

    const [txns] = await pool.query(
      'SELECT * FROM transactions WHERE site_id = ? ORDER BY date DESC',
      [id]
    );

    const totalIn  = txns.filter(t => t.type === 'IN').reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalOut = txns.filter(t => t.type === 'OUT').reduce((s, t) => s + parseFloat(t.amount), 0);

    res.json({
      site: sites[0],
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      recentTransactions: txns.slice(0, 10),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/sites
const createSite = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, address, owner_name, phone, gst_number, project_name, status, notes } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO sites (name, address, owner_name, phone, gst_number, project_name, status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, address, owner_name || null, phone || null, gst_number || null,
       project_name || null, status || 'active', notes || null, req.admin.id]
    );
    const [rows] = await pool.query('SELECT * FROM sites WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/sites/:id
const updateSite = async (req, res) => {
  const { name, address, owner_name, phone, gst_number, project_name, status, notes } = req.body;
  try {
    const [check] = await pool.query('SELECT id FROM sites WHERE id = ?', [req.params.id]);
    if (!check.length) return res.status(404).json({ message: 'Site not found' });

    await pool.query(
      `UPDATE sites SET name=?, address=?, owner_name=?, phone=?, gst_number=?,
       project_name=?, status=?, notes=? WHERE id=?`,
      [name, address, owner_name || null, phone || null, gst_number || null,
       project_name || null, status || 'active', notes || null, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM sites WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/sites/:id
const deleteSite = async (req, res) => {
  try {
    const [check] = await pool.query('SELECT id FROM sites WHERE id = ?', [req.params.id]);
    if (!check.length) return res.status(404).json({ message: 'Site not found' });
    await pool.query('DELETE FROM sites WHERE id = ?', [req.params.id]);
    res.json({ message: 'Site deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getAllSites, getSiteById, getSiteDashboard, createSite, updateSite, deleteSite };
