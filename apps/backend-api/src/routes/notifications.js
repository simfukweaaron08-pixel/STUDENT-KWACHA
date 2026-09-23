const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { listNotifications, markRead, markAllRead, updatePreferences } = require('../controllers/notifications');

router.use(authenticate);

router.get('/', listNotifications);
router.put('/read-all', markAllRead);
router.put('/preferences', updatePreferences);
router.put('/:id/read', markRead);

module.exports = router;
