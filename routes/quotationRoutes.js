const express = require('express');
const router = express.Router();
const {
  getAllQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  convertToInvoice,
  downloadPDF,
} = require('../controllers/quotationController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getAllQuotations).post(protect, createQuotation);
router.get('/:id/pdf',     protect, downloadPDF);
router.post('/:id/convert', protect, convertToInvoice);
router.route('/:id').get(protect, getQuotationById).put(protect, updateQuotation).delete(protect, deleteQuotation);

module.exports = router;
