const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
    try {
        console.log('🔐 Auth middleware - Headers:', req.headers.authorization);
        
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            console.log('❌ No token provided');
            throw new Error('No authentication token provided');
        }

        console.log('🔑 Token found:', token.substring(0, 20) + '...');
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('📝 Decoded token:', decoded);
        
        const user = await User.findById(decoded.userId);

        if (!user) {
            console.log('❌ User not found for ID:', decoded.userId);
            throw new Error('User not found');
        }

        console.log('✅ User authenticated:', user.email);
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.log('🚫 Auth failed:', error.message);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

const isAdmin = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    next();
};

module.exports = { auth, isAdmin };