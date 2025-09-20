const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

// Validation rules for creating categories
const createCategoryValidation = [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('type')
        .isIn(['income', 'expense'])
        .withMessage('Type must be either income or expense'),
    body('icon').optional(),
    body('color').optional().isHexColor().withMessage('Invalid color format')
];

// Validation rules for updating categories (type is not required)
const updateCategoryValidation = [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('type').optional().isIn(['income', 'expense']).withMessage('Type must be either income or expense'),
    body('icon').optional(),
    body('color').optional().isHexColor().withMessage('Invalid color format')
];

// Routes
router.post('/', 
    auth, 
    validate(createCategoryValidation), 
    categoryController.createCategory
);

router.get('/', 
    auth, 
    categoryController.getCategories
);

router.put('/:id', 
    auth, 
    validate(updateCategoryValidation), 
    categoryController.updateCategory
);

router.delete('/:id', 
    auth, 
    categoryController.deleteCategory
);

module.exports = router;