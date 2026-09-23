const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateProfileSchema } = require('../validators/users');
const { getProfile, updateProfile, updatePreferences, deleteAccount } = require('../controllers/users');

router.use(authenticate);

router.get('/me', getProfile);
router.put('/me', validate(updateProfileSchema), updateProfile);
router.put('/me/preferences', updatePreferences);
router.delete('/me', deleteAccount);

module.exports = router;
