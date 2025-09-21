const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const transactionController = require('../controllers/transaction.controller');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and PDF files are allowed.'));
    }
});

// Validation rules
const transactionValidation = [
    body('type')
        .isIn(['income', 'expense'])
        .withMessage('Type must be either income or expense'),
    body('amount')
        .custom((value) => {
            const num = Number(value);
            if (isNaN(num) || num < 0) {
                throw new Error('Amount must be a positive number');
            }
            return true;
        }),
    body('date')
        .custom((value) => {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date format');
            }
            return true;
        }),
    body('categoryId')
        .custom((value) => {
            if (!value || value.trim() === '') {
                throw new Error('Category is required');
            }
            if (!value.match(/^[0-9a-fA-F]{24}$/)) {
                throw new Error('Invalid category ID format');
            }
            return true;
        }),
    body('notes').optional().trim(),
    body('tags').optional().custom((value) => {
        // Handle both array and JSON string formats
        if (typeof value === 'string') {
            try {
                JSON.parse(value);
                return true;
            } catch {
                throw new Error('Tags must be a valid JSON array');
            }
        }
        if (Array.isArray(value)) {
            return true;
        }
        throw new Error('Tags must be an array');
    }),
    body('recurringType')
        .optional()
        .isIn(['none', 'daily', 'weekly', 'monthly', 'yearly'])
];

// Routes
router.post('/',
    auth,
    upload.single('attachment'),
    validate(transactionValidation),
    transactionController.createTransaction
);

router.get('/',
    auth,
    transactionController.getTransactions
);

router.get('/stats',
    auth,
    transactionController.getTransactionStats
);

router.get('/:id',
    auth,
    transactionController.getTransactionById
);

router.put('/:id',
    auth,
    upload.single('attachment'),
    validate(transactionValidation),
    transactionController.updateTransaction
);

router.delete('/:id',
    auth,
    transactionController.deleteTransaction
);

module.exports = router;