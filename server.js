const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/auth.routes');
const categoryRoutes = require('./src/routes/category.routes');
const transactionRoutes = require('./src/routes/transaction.routes');
const aiRoutes = require('./src/routes/ai.routes');

// Load environment variables
dotenv.config();

// Debug: Check if Google Client ID is loaded
console.log('Google Client ID loaded:', process.env.GOOGLE_CLIENT_ID ? 'Yes' : 'No');
if (process.env.GOOGLE_CLIENT_ID) {
    console.log('Google Client ID starts with:', process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...');
}

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
