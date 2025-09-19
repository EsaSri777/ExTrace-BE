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
        .isFloat({ min: 0 })
        .withMessage('Amount must be a positive number'),
    body('date')
        .isISO8601()
        .withMessage('Invalid date format'),
    body('categoryId')
        .isMongoId()
        .withMessage('Invalid category ID'),
    body('notes').optional().trim(),
    body('tags').optional().isArray(),
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