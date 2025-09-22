// Load environment variables FIRST
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/auth.routes');
const categoryRoutes = require('./src/routes/category.routes');
const transactionRoutes = require('./src/routes/transaction.routes');
const aiRoutes = require('./src/routes/ai.routes');
const emailRoutes = require('./src/routes/email.routes');

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
app.use('/api/email', emailRoutes);
app.use('/api/test', require('./src/routes/test.routes'));

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
    
    // Start email scheduler service
    if (process.env.NODE_ENV !== 'test') {
        const SchedulerService = require('./src/services/schedulerService');
        SchedulerService.start();
        console.log('📧 Email scheduler service started');
    }
});
