const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} = require('../validators/auth');
const {
  register,
  login,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/auth');

// Public authentication endpoints validate incoming data before calling their controllers.
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refresh);
router.post('/logout', authenticate, logout);
// These account-management endpoints require an authenticated user.
router.put('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
