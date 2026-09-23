const { Category } = require('../models');

// GET /api/v1/categories
const listCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      order: [['name', 'ASC']],
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/categories
const createCategory = async (req, res, next) => {
  try {
    const { name, icon, color } = req.body;
    const category = await Category.create({
      name,
      icon: icon || 'label',
      color: color || '#AEB6BF',
      is_system: false,
      created_by: req.userId,
    });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      });
    }

    const { name, icon, color } = req.body;
    if (name) category.name = name;
    if (icon) category.icon = icon;
    if (color) category.color = color;
    await category.save();

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      });
    }

    if (category.is_system) {
      return res.status(400).json({
        success: false,
        error: { code: 'SYSTEM_CATEGORY', message: 'Cannot delete system categories' },
      });
    }

    await category.destroy();
    res.json({ success: true, data: { message: 'Category deleted' } });
  } catch (error) {
    next(error);
  }
};

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
