const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

// Validation rules
const categoryValidation = [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('type')
        .isIn(['income', 'expense'])
        .withMessage('Type must be either income or expense'),
    body('icon').optional(),
    body('color').optional().isHexColor().withMessage('Invalid color format')
];

// Routes
router.post('/', 
    auth, 
    validate(categoryValidation), 
    categoryController.createCategory
);

router.get('/', 
    auth, 
    categoryController.getCategories
);

router.put('/:id', 
    auth, 
    validate(categoryValidation), 
    categoryController.updateCategory
);

router.delete('/:id', 
    auth, 
    categoryController.deleteCategory
);

module.exports = router;