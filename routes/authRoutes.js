const express = require('express');
const router = express.Router();
const { loginAdmin, registerAdmin, getProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { loginValidation, registerValidation } = require('../validations/authValidation');

router.post('/login',           loginValidation,    loginAdmin);
router.post('/register', protect, registerValidation, registerAdmin);
router.get('/profile',   protect, getProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
