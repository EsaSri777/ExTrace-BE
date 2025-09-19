const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    icon: {
        type: String,
        default: 'category' // Default material icon name
    },
    color: {
        type: String,
        default: '#000000'
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound index to ensure unique categories per user
categorySchema.index({ name: 1, userId: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;