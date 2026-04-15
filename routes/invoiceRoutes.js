const express = require('express');
const router = express.Router();
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  downloadPDF,
} = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getAllInvoices).post(protect, createInvoice);
router.get('/:id/pdf', protect, downloadPDF);
router.route('/:id').get(protect, getInvoiceById).put(protect, updateInvoice).delete(protect, deleteInvoice);

module.exports = router;
