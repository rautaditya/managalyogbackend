const express = require('express');
const router = express.Router();
const {
  getAllSites,
  getSiteById,
  getSiteDashboard,
  createSite,
  updateSite,
  deleteSite,
} = require('../controllers/siteController');
const { protect } = require('../middleware/authMiddleware');
const { siteValidation } = require('../validations/siteValidation');

router.route('/').get(protect, getAllSites).post(protect, siteValidation, createSite);
router.get('/:id/dashboard', protect, getSiteDashboard);
router.route('/:id').get(protect, getSiteById).put(protect, updateSite).delete(protect, deleteSite);

module.exports = router;
