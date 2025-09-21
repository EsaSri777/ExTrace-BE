const { Transaction, Category } = require('../models');

// Create transaction
const createTransaction = async (req, res) => {
    try {
        let { type, amount, date, categoryId, notes, tags, recurringType } = req.body;
        const userId = req.user._id;

        // Parse tags if it's a JSON string (from FormData)
        if (typeof tags === 'string') {
            try {
                tags = JSON.parse(tags);
            } catch (e) {
                tags = [];
            }
        }

        // Verify category belongs to user
        const category = await Category.findOne({ _id: categoryId, userId });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const transaction = new Transaction({
            type,
            amount: Number(amount),
            date: new Date(date),
            categoryId,
            userId,
            notes,
            tags: tags || [],
            recurringType: recurringType || 'none'
        });

        if (req.file) {
            transaction.attachment = {
                filename: req.file.originalname,
                path: req.file.path,
                mimetype: req.file.mimetype
            };
        }

        await transaction.save();
        const newTransaction = await Transaction.findById(transaction._id).populate('categoryId', 'name icon color');
        res.status(201).json(newTransaction);
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Error creating transaction' });
    }
};

// Get all transactions for user with filters
const getTransactions = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            type,
            categoryId,
            minAmount,
            maxAmount,
            search,
            sortBy,
            sortOrder,
            page = 1,
            limit = 10
        } = req.query;

        const query = { userId: req.user._id };

        // Apply filters
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (type) query.type = type;
        if (categoryId) query.categoryId = categoryId;
        if (minAmount || maxAmount) {
            query.amount = {};
            if (minAmount) query.amount.$gte = Number(minAmount);
            if (maxAmount) query.amount.$lte = Number(maxAmount);
        }
        if (search) {
            query.$or = [
                { notes: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Build sort object
        const sort = {};
        if (sortBy) {
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        } else {
            sort.date = -1; // Default sort by date descending
        }

        const transactions = await Transaction.find(query)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .populate('categoryId', 'name icon color');

        const total = await Transaction.countDocuments(query);

        res.json({
            transactions,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching transactions' });
    }
};

// Get transaction by ID
const getTransactionById = async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            _id: req.params.id,
            userId: req.user._id
        }).populate('categoryId', 'name icon color');

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching transaction' });
    }
};

// Update transaction
const updateTransaction = async (req, res) => {
    try {
        let { type, amount, date, categoryId, notes, tags, recurringType } = req.body;
        
        // Parse tags if it's a JSON string (from FormData)
        if (typeof tags === 'string') {
            try {
                tags = JSON.parse(tags);
            } catch (e) {
                tags = [];
            }
        }
        
        const transaction = await Transaction.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (categoryId) {
            // Verify category belongs to user
            const category = await Category.findOne({ _id: categoryId, userId: req.user._id });
            if (!category) {
                return res.status(404).json({ error: 'Category not found' });
            }
        }

        // Update fields (only if provided)
        if (type) transaction.type = type;
        if (amount) transaction.amount = Number(amount);
        if (date) transaction.date = new Date(date);
        if (categoryId) transaction.categoryId = categoryId;
        if (notes !== undefined) transaction.notes = notes;
        if (tags !== undefined) transaction.tags = tags;
        if (recurringType) transaction.recurringType = recurringType;

        if (req.file) {
            transaction.attachment = {
                filename: req.file.originalname,
                path: req.file.path,
                mimetype: req.file.mimetype
            };
        }

        await transaction.save();
        const updatedTransaction = await Transaction.findById(transaction._id).populate('categoryId', 'name icon color');
        res.json(updatedTransaction);
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ error: 'Error updating transaction' });
    }
};

// Delete transaction
const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting transaction' });
    }
};

// Get transaction statistics
const getTransactionStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const userId = req.user._id;

        const dateQuery = {};
        if (startDate && endDate) {
            dateQuery.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const stats = await Transaction.aggregate([
            { $match: { userId, ...dateQuery } },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const categoryStats = await Transaction.aggregate([
            { $match: { userId, ...dateQuery } },
            {
                $group: {
                    _id: {
                        type: '$type',
                        category: '$categoryId'
                    },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' }
        ]);

        const response = {
            summary: {
                income: stats.find(s => s._id === 'income')?.total || 0,
                expense: stats.find(s => s._id === 'expense')?.total || 0
            },
            categoryBreakdown: categoryStats.map(stat => ({
                type: stat._id.type,
                category: {
                    id: stat.category._id,
                    name: stat.category.name,
                    icon: stat.category.icon,
                    color: stat.category.color
                },
                total: stat.total,
                count: stat.count
            }))
        };

        // Calculate balance
        response.summary.balance = response.summary.income - response.summary.expense;

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching transaction statistics' });
    }
};

module.exports = {
    createTransaction,
    getTransactions,
    getTransactionById,
    updateTransaction,
    deleteTransaction,
    getTransactionStats
};