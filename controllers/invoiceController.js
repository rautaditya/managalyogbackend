const { pool } = require('../config/db');
const { generatePDF } = require('../utils/invoicePDF');

// Helper: generate invoice number
const genInvoiceNumber = async () => {
  const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM invoices');
  return `INV-${String(rows[0].cnt + 1).padStart(5, '0')}`;
};

// Helper: get invoice with items and site
const getFullInvoice = async (id) => {
  const [invRows] = await pool.query(
    `SELECT i.*, COALESCE(s.name, i.client_name) AS display_name,
            s.address, s.owner_name, s.phone, s.gst_number, s.project_name
     FROM invoices i 
     LEFT JOIN sites s ON i.site_id = s.id 
     WHERE i.id = ?`,
    [id]
  );

  if (!invRows.length) return null;

  const inv = invRows[0];

  const [items] = await pool.query(
    'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id',
    [id]
  );

  return {
    ...inv,
    advance_amount: Number(inv.advance_amount || 0),
    site: {
      id: inv.site_id,
      name: inv.display_name,
      address: inv.address,
      owner_name: inv.owner_name,
      phone: inv.phone,
      gst_number: inv.gst_number,
      project_name: inv.project_name,
    },
    items,
  };
};

// GET ALL
const getAllInvoices = async (req, res) => {
  try {
    const { site_id, status } = req.query;

    let sql = `SELECT i.*, COALESCE(s.name, i.client_name) AS site_name
               FROM invoices i 
               LEFT JOIN sites s ON i.site_id = s.id 
               WHERE 1=1`;

    const params = [];

    if (site_id) {
      sql += ' AND i.site_id = ?';
      params.push(site_id);
    }

    if (status) {
      sql += ' AND i.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY i.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET BY ID
const getInvoiceById = async (req, res) => {
  try {
    const inv = await getFullInvoice(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Invoice not found' });
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE
const createInvoice = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const {
      site_id,
      client_name,
      items = [],
      tax_rate = 0,
      status,
      due_date,
      notes,
      date,
      advance_amount = 0,
    } = req.body;

    const processedItems = items.map(item => ({
      ...item,
      amount: Number(item.quantity || 0) * Number(item.rate || 0),
    }));

    const itemsTotal = processedItems.reduce((s, i) => s + Number(i.amount || 0), 0);
    const taxAmount = (itemsTotal * Number(tax_rate || 0)) / 100;
    const total = itemsTotal + taxAmount;

    const invNumber = await genInvoiceNumber();

    const [result] = await conn.query(
      `INSERT INTO invoices
        (invoice_number, site_id, client_name, subtotal, tax_rate, tax_amount, total, advance_amount, status, due_date, notes, date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invNumber,
        site_id || null,
        client_name || null,
        itemsTotal,
        Number(tax_rate || 0),
        taxAmount,
        total,
        Number(advance_amount || 0),
(status && status.trim()) ? status.trim() : 'Tax Invoice',,
        due_date || null,
        notes || null,
        date || new Date().toISOString().split('T')[0],
        req.admin?.id || null,

      ]
    );

    const invoiceId = result.insertId;

    for (const item of processedItems) {
      await conn.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, item.description, item.quantity, item.rate, item.amount]
      );
    }

    await conn.commit();

    const inv = await getFullInvoice(invoiceId);
    res.status(201).json(inv);

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// UPDATE
const updateInvoice = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const {
      items,
      tax_rate,
      status,
      due_date,
      notes,
      date,
      client_name,
      advance_amount = 0,
    } = req.body;

    const id = req.params.id;

    const [check] = await conn.query('SELECT id FROM invoices WHERE id = ?', [id]);

    if (!check.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (items) {
      const processedItems = items.map(item => ({
        ...item,
        amount: Number(item.quantity || 0) * Number(item.rate || 0),
      }));

      const itemsTotal = processedItems.reduce((s, i) => s + Number(i.amount || 0), 0);
      const tr = Number(tax_rate || 0);
      const taxAmount = (itemsTotal * tr) / 100;
      const total = itemsTotal + taxAmount;

      await conn.query(
        `UPDATE invoices
         SET subtotal=?, tax_rate=?, tax_amount=?, total=?, status=?,
             due_date=?, notes=?, date=?, client_name=?, advance_amount=?
         WHERE id=?`,
        [
          itemsTotal,
          tr,
          taxAmount,
          total,
(status && status.trim()) ? status.trim() : 'Tax Invoice',,
          due_date || null,
          notes || null,
          date || new Date().toISOString().split('T')[0],
          client_name || null,
          Number(advance_amount || 0),
          id,
        ]
      );

      await conn.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);

      for (const item of processedItems) {
        await conn.query(
          'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)',
          [id, item.description, item.quantity, item.rate, item.amount]
        );
      }

    } else {
      await conn.query(
        `UPDATE invoices 
         SET status=?, due_date=?, notes=?, advance_amount=? 
         WHERE id=?`,
        [
          status,
          due_date || null,
          notes || null,
          Number(advance_amount || 0),
          id,
        ]
      );
    }

    await conn.commit();

    const inv = await getFullInvoice(id);
    res.json(inv);

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// DELETE
const deleteInvoice = async (req, res) => {
  try {
    const [check] = await pool.query('SELECT id FROM invoices WHERE id = ?', [req.params.id]);

    if (!check.length) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await pool.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);

    res.json({ message: 'Invoice deleted' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PDF
const downloadPDF = async (req, res) => {
  try {
    const inv = await getFullInvoice(req.params.id);

    if (!inv) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const doc = generatePDF(inv, 'Invoice');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${inv.invoice_number}.pdf`);

    doc.pipe(res);
    doc.end();

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  downloadPDF,
};