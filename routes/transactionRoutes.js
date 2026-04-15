const express = require('express');
const router = express.Router();
const {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  exportToExcel,
  getDashboardSummary,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const { transactionValidation } = require('../validations/transactionValidation');

router.get('/summary', protect, getDashboardSummary);
router.get('/export',  protect, exportToExcel);
router.route('/').get(protect, getAllTransactions).post(protect, transactionValidation, createTransaction);
router.route('/:id').get(protect, getTransactionById).put(protect, updateTransaction).delete(protect, deleteTransaction);

module.exports = router;
