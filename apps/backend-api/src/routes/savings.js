const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
  addSavingsEntrySchema,
} = require('../validators/savings');
const {
  listSavingsGoals,
  getSavingsGoal,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  addSavingsEntry,
  getSavingsPrediction,
} = require('../controllers/savings');

router.use(authenticate);

router.get('/', listSavingsGoals);
router.get('/:id', getSavingsGoal);
router.post('/', validate(createSavingsGoalSchema), createSavingsGoal);
router.put('/:id', validate(updateSavingsGoalSchema), updateSavingsGoal);
router.delete('/:id', deleteSavingsGoal);
router.post('/:id/entries', validate(addSavingsEntrySchema), addSavingsEntry);
router.get('/:id/predictions', getSavingsPrediction);

module.exports = router;
