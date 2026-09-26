const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { listCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categories');

router.get('/', listCategories);
router.post('/', authenticate, createCategory);
router.put('/:id', authenticate, updateCategory);
router.delete('/:id', authenticate, deleteCategory);

module.exports = router;
