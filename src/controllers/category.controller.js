const { Category } = require('../models');

// Create category
const createCategory = async (req, res) => {
    try {
        const { name, type, icon, color } = req.body;
        const userId = req.user._id;

        const category = new Category({
            name,
            type,
            userId,
            icon,
            color
        });

        await category.save();
        res.status(201).json(category);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Category already exists' });
        }
        res.status(500).json({ error: 'Error creating category' });
    }
};

// Get all categories for user
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({ userId: req.user._id });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching categories' });
    }
};

// Update category
const updateCategory = async (req, res) => {
    try {
        const { name, icon, color } = req.body;
        const category = await Category.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        if (category.isDefault) {
            return res.status(403).json({ error: 'Default categories cannot be modified' });
        }

        category.name = name || category.name;
        category.icon = icon || category.icon;
        category.color = color || category.color;

        await category.save();
        res.json(category);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Category name already exists' });
        }
        res.status(500).json({ error: 'Error updating category' });
    }
};

// Delete category
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        if (category.isDefault) {
            return res.status(403).json({ error: 'Default categories cannot be deleted' });
        }

        await category.remove();
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting category' });
    }
};

module.exports = {
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory
};