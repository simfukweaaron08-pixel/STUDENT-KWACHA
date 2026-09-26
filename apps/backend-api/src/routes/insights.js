const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { listInsights, markInsightRead, getPersonalizedTips } = require('../controllers/insights');

router.use(authenticate);

router.get('/', listInsights);
router.get('/tips', getPersonalizedTips);
router.put('/:id/read', markInsightRead);

module.exports = router;
