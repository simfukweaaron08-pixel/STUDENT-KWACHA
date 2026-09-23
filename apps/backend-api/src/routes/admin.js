const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  listUsers,
  getUser,
  updateUserStatus,
  getAuditLogs,
  getStats,
  updateCategories,
  getSystemConfig,
  updateSystemConfig,
} = require('../controllers/admin');

router.use(authenticate, requireAdmin);

router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.put('/users/:id/status', updateUserStatus);
router.get('/audit-logs', getAuditLogs);
router.get('/stats', getStats);
router.put('/categories', updateCategories);
router.get('/system', getSystemConfig);
router.put('/system', updateSystemConfig);

module.exports = router;
