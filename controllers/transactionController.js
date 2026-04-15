const { pool } = require('../config/db');
const { exportTransactionsToExcel } = require('../utils/excelExport');
const { validationResult } = require('express-validator');

// GET /api/transactions
const getAllTransactions = async (req, res) => {
  try {
    const { site_id, type, payment_mode, start_date, end_date } = req.query;
    let sql = `
      SELECT t.*, s.name AS site_name, s.address AS site_address
      FROM transactions t
      LEFT JOIN sites s ON t.site_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (site_id)    { sql += ' AND t.site_id = ?';       params.push(site_id); }
    if (type)       { sql += ' AND t.type = ?';           params.push(type); }
    if (payment_mode) { sql += ' AND t.payment_mode = ?'; params.push(payment_mode); }
    if (start_date) { sql += ' AND t.date >= ?';          params.push(start_date); }
    if (end_date)   { sql += ' AND t.date <= ?';          params.push(end_date); }

    sql += ' ORDER BY t.date DESC, t.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/transactions/summary
const getDashboardSummary = async (req, res) => {
  try {
    const [totals] = await pool.query(`
      SELECT
        SUM(CASE WHEN type='IN'  THEN amount ELSE 0 END) AS totalIn,
        SUM(CASE WHEN type='OUT' THEN amount ELSE 0 END) AS totalOut
      FROM transactions
    `);

    const [recent] = await pool.query(`
      SELECT t.*, s.name AS site_name
      FROM transactions t
      LEFT JOIN sites s ON t.site_id = s.id
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 10
    `);

    const totalIn  = parseFloat(totals[0].totalIn  || 0);
    const totalOut = parseFloat(totals[0].totalOut || 0);

    res.json({
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      recentTransactions: recent,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/transactions/:id
const getTransactionById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, s.name AS site_name FROM transactions t
       LEFT JOIN sites s ON t.site_id = s.id WHERE t.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Transaction not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/transactions
const createTransaction = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { type, amount, site_id, name, description, note, payment_mode, date } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO transactions (type, amount, site_id, name, description, note, payment_mode, date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [type, amount, site_id, name, description || null, note || null,
       payment_mode || 'Cash', date, req.admin.id]
    );
    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/transactions/:id
const updateTransaction = async (req, res) => {
  const { type, amount, site_id, name, description, note, payment_mode, date } = req.body;
  try {
    const [check] = await pool.query('SELECT id FROM transactions WHERE id = ?', [req.params.id]);
    if (!check.length) return res.status(404).json({ message: 'Transaction not found' });

    await pool.query(
      `UPDATE transactions SET type=?, amount=?, site_id=?, name=?, description=?,
       note=?, payment_mode=?, date=? WHERE id=?`,
      [type, amount, site_id, name, description || null, note || null,
       payment_mode || 'Cash', date, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    const [check] = await pool.query('SELECT id FROM transactions WHERE id = ?', [req.params.id]);
    if (!check.length) return res.status(404).json({ message: 'Transaction not found' });
    await pool.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/transactions/export
const exportToExcel = async (req, res) => {
  try {
    const { site_id } = req.query;
    let sql = `SELECT t.*, s.name AS site_name FROM transactions t
               LEFT JOIN sites s ON t.site_id = s.id`;
    const params = [];
    if (site_id) { sql += ' WHERE t.site_id = ?'; params.push(site_id); }
    sql += ' ORDER BY t.date DESC';

    const [transactions] = await pool.query(sql, params);

    let siteName = 'All Sites';
    if (site_id) {
      const [s] = await pool.query('SELECT name FROM sites WHERE id = ?', [site_id]);
      if (s.length) siteName = s[0].name;
    }

    const workbook = await exportTransactionsToExcel(transactions, siteName);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${siteName.replace(/\s+/g, '_')}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getAllTransactions, getTransactionById, createTransaction,
  updateTransaction, deleteTransaction, exportToExcel, getDashboardSummary,
};
