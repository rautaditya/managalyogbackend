const { pool } = require('../config/db');
const { generatePDF } = require('../utils/invoicePDF');

// Helper: generate quotation number
const genQuotationNumber = async () => {
  const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM quotations');
  return `QUO-${String(rows[0].cnt + 1).padStart(5, '0')}`;
};

// Helper: generate invoice number (for convert)
const genInvoiceNumber = async (conn) => {
  const [rows] = await conn.query('SELECT COUNT(*) AS cnt FROM invoices');
  return `INV-${String(rows[0].cnt + 1).padStart(5, '0')}`;
};

// Helper: get full quotation with items + site
const getFullQuotation = async (id) => {
  const [rows] = await pool.query(
    `SELECT q.*, s.name, s.address, s.owner_name, s.phone, s.gst_number, s.project_name
     FROM quotations q LEFT JOIN sites s ON q.site_id = s.id WHERE q.id = ?`,
    [id]
  );
  if (!rows.length) return null;

  const quot = rows[0];
  const [items] = await pool.query(
    'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY id', [id]
  );

  return {
    ...quot,
    site: {
      id: quot.site_id, name: quot.name, address: quot.address,
      owner_name: quot.owner_name, phone: quot.phone,
      gst_number: quot.gst_number, project_name: quot.project_name,
    },
    items,
  };
};

// GET /api/quotations
const getAllQuotations = async (req, res) => {
  try {
    const { site_id, status } = req.query;
    let sql = `SELECT q.*, s.name AS site_name FROM quotations q
               LEFT JOIN sites s ON q.site_id = s.id WHERE 1=1`;
    const params = [];
    if (site_id) { sql += ' AND q.site_id = ?'; params.push(site_id); }
    if (status)  { sql += ' AND q.status = ?';  params.push(status); }
    sql += ' ORDER BY q.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/quotations/:id
const getQuotationById = async (req, res) => {
  try {
    const quot = await getFullQuotation(req.params.id);
    if (!quot) return res.status(404).json({ message: 'Quotation not found' });
    res.json(quot);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/quotations
const createQuotation = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { site_id, items = [], tax_rate = 0, status, valid_until, notes, date } = req.body;

    const processedItems = items.map(item => ({
      ...item, amount: parseFloat(item.quantity) * parseFloat(item.rate),
    }));

    const subtotal  = processedItems.reduce((s, i) => s + i.amount, 0);
    const taxAmount = (subtotal * parseFloat(tax_rate)) / 100;
    const total     = subtotal + taxAmount;
    const quotNum   = await genQuotationNumber();

    const [result] = await conn.query(
      `INSERT INTO quotations (quotation_number, site_id, subtotal, tax_rate, tax_amount, total, status, valid_until, notes, date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [quotNum, site_id, subtotal, tax_rate, taxAmount, total,
       status || 'draft', valid_until || null, notes || null,
       date || new Date().toISOString().split('T')[0], req.admin.id]
    );

    const quotId = result.insertId;
    for (const item of processedItems) {
      await conn.query(
        'INSERT INTO quotation_items (quotation_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)',
        [quotId, item.description, item.quantity, item.rate, item.amount]
      );
    }

    await conn.commit();
    const quot = await getFullQuotation(quotId);
    res.status(201).json(quot);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally { conn.release(); }
};

// PUT /api/quotations/:id
const updateQuotation = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { items, tax_rate, status, valid_until, notes, date } = req.body;
    const id = req.params.id;

    const [check] = await conn.query('SELECT id FROM quotations WHERE id = ?', [id]);
    if (!check.length) { await conn.rollback(); return res.status(404).json({ message: 'Quotation not found' }); }

    if (items) {
      const processedItems = items.map(item => ({
        ...item, amount: parseFloat(item.quantity) * parseFloat(item.rate),
      }));
      const subtotal  = processedItems.reduce((s, i) => s + i.amount, 0);
      const tr        = parseFloat(tax_rate || 0);
      const taxAmount = (subtotal * tr) / 100;
      const total     = subtotal + taxAmount;

      await conn.query(
        'UPDATE quotations SET subtotal=?, tax_rate=?, tax_amount=?, total=?, status=?, valid_until=?, notes=?, date=? WHERE id=?',
        [subtotal, tr, taxAmount, total, status || 'draft', valid_until || null,
         notes || null, date || new Date().toISOString().split('T')[0], id]
      );
      await conn.query('DELETE FROM quotation_items WHERE quotation_id = ?', [id]);
      for (const item of processedItems) {
        await conn.query(
          'INSERT INTO quotation_items (quotation_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)',
          [id, item.description, item.quantity, item.rate, item.amount]
        );
      }
    } else {
      await conn.query(
        'UPDATE quotations SET status=?, valid_until=?, notes=? WHERE id=?',
        [status, valid_until || null, notes || null, id]
      );
    }

    await conn.commit();
    const quot = await getFullQuotation(id);
    res.json(quot);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally { conn.release(); }
};

// DELETE /api/quotations/:id
const deleteQuotation = async (req, res) => {
  try {
    const [check] = await pool.query('SELECT id FROM quotations WHERE id = ?', [req.params.id]);
    if (!check.length) return res.status(404).json({ message: 'Quotation not found' });
    await pool.query('DELETE FROM quotations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Quotation deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/quotations/:id/convert
const convertToInvoice = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [quotRows] = await conn.query('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    if (!quotRows.length) { await conn.rollback(); return res.status(404).json({ message: 'Quotation not found' }); }

    const quot = quotRows[0];
    if (quot.status === 'converted') {
      await conn.rollback();
      return res.status(400).json({ message: 'Already converted to invoice' });
    }

    const [items] = await conn.query('SELECT * FROM quotation_items WHERE quotation_id = ?', [quot.id]);
    const invNumber = await genInvoiceNumber(conn);

    const [invResult] = await conn.query(
      `INSERT INTO invoices (invoice_number, site_id, subtotal, tax_rate, tax_amount, total, status, notes, date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'unpaid', ?, ?, ?)`,
      [invNumber, quot.site_id, quot.subtotal, quot.tax_rate, quot.tax_amount,
       quot.total, quot.notes, new Date().toISOString().split('T')[0], req.admin.id]
    );

    const invoiceId = invResult.insertId;
    for (const item of items) {
      await conn.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, item.description, item.quantity, item.rate, item.amount]
      );
    }

    await conn.query(
      'UPDATE quotations SET status="converted", converted_invoice_id=? WHERE id=?',
      [invoiceId, quot.id]
    );

    await conn.commit();

    const inv = await (async () => {
      const [r] = await pool.query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      return r[0];
    })();

    res.status(201).json({ invoice: inv, message: 'Quotation converted to invoice successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally { conn.release(); }
};

// GET /api/quotations/:id/pdf
const downloadPDF = async (req, res) => {
  try {
    const quot = await getFullQuotation(req.params.id);
    if (!quot) return res.status(404).json({ message: 'Quotation not found' });

    const doc = generatePDF(quot, 'Quotation');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${quot.quotation_number}.pdf`);
    doc.pipe(res);
    doc.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getAllQuotations, getQuotationById, createQuotation,
  updateQuotation, deleteQuotation, convertToInvoice, downloadPDF,
};
