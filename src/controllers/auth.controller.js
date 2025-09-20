const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create new user
        const user = new User({
            name,
            email,
            password
        });

        await user.save();
        
        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                settings: user.settings
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error registering user' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                settings: user.settings
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error logging in' });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching profile' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const updates = req.body;
        const user = req.user;

        // Remove sensitive fields
        delete updates.password;
        delete updates.role;
        delete updates.email; // Prevent email changes through profile update

        // Handle settings updates
        if (updates.settings) {
            user.settings = {
                ...user.settings,
                ...updates.settings
            };
            delete updates.settings; // Remove from main updates
        }

        // Update other fields
        Object.assign(user, updates);
        await user.save();

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                settings: user.settings
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Error updating profile' });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = req.user;

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating password' });
    }
};

const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;
        
        // Verify the Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        // Find or create user
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                name,
                email,
                picture,
                googleId: payload.sub,
                password: Math.random().toString(36).slice(-8) // Random password for Google users
            });
            await user.save();
        }

        // Generate token
        const jwtToken = generateToken(user._id);

        res.json({
            token: jwtToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                settings: user.settings
            }
        });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(401).json({ error: 'Invalid Google token' });
    }
};

// Get user settings
const getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('settings name');
        
        const settings = user.settings || {};
        const response = {
            displayName: settings.displayName || user.name || '',
            currency: settings.currency || 'USD',
            theme: settings.theme || 'system'
        };
        
        res.json(response);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Error fetching settings' });
    }
};

// Update user settings
const updateSettings = async (req, res) => {
    try {
        const { displayName, currency, theme } = req.body;
        const user = req.user;

        // Validate theme
        if (theme && !['light', 'dark', 'system'].includes(theme)) {
            return res.status(400).json({ error: 'Invalid theme value' });
        }

        // Validate currency
        const validCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CNY'];
        if (currency && !validCurrencies.includes(currency)) {
            return res.status(400).json({ error: 'Invalid currency value' });
        }

        // Update settings
        user.settings = {
            displayName: displayName || user.settings?.displayName || user.name,
            currency: currency || user.settings?.currency || 'USD',
            theme: theme || user.settings?.theme || 'system'
        };

        await user.save();

        res.json(user.settings);
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Error updating settings' });
    }
};

module.exports = {
    register,
    login,
    googleLogin,
    getProfile,
    updateProfile,
    updatePassword,
    getSettings,
    updateSettings
};